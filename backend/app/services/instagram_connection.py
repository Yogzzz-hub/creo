"""Client-owned Facebook Login authorization and encrypted credential lifecycle."""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode, urlparse

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.errors import Conflict, Forbidden
from app.core.logging import get_logger
from app.core.rbac import Actor
from app.models.enums import AccountStatus, UserRole
from app.models.ops import AuditLog, Notification
from app.models.publishing import InstagramOAuth, PublishingJob
from app.models.user import ClientProfile, User
from app.services.instagram_client import SCOPES, InstagramError, get_instagram_client
from app.services.instagram_login import LOGIN_SCOPES, client_for_provider

logger = get_logger(__name__)


def cipher() -> Fernet:
    try:
        return Fernet(settings.ENCRYPTION_KEY.strip().encode())
    except (ValueError, TypeError):
        raise Conflict(
            "Instagram encryption is not configured. Contact your administrator.",
            code="INSTAGRAM_NOT_CONFIGURED",
        ) from None


def seal(value: object) -> bytes:
    return cipher().encrypt(json.dumps(value).encode())


def unseal(value: bytes | None):
    if not value:
        raise InstagramError(
            "Reconnect Instagram to authorize publishing.", "RECONNECT_REQUIRED", reconnect=True
        )
    try:
        return json.loads(cipher().decrypt(value))
    except (InvalidToken, ValueError):
        raise InstagramError(
            "Instagram authorization cannot be read. Reconnect your account.",
            "RECONNECT_REQUIRED",
            reconnect=True,
        ) from None


def configured(provider: str = "facebook") -> bool:
    try:
        uri = urlparse(settings.INSTAGRAM_REDIRECT_URI.strip())
        callback_is_safe = (
            uri.path == "/portal/account/instagram"
            and not uri.query
            and not uri.fragment
            and not uri.username
            and not uri.password
            and (
                (uri.scheme == "https" and bool(uri.hostname))
                or (
                    settings.ENVIRONMENT != "production"
                    and uri.scheme == "http"
                    and uri.hostname in ("localhost", "127.0.0.1")
                )
            )
        )
        app_id = (
            settings.INSTAGRAM_LOGIN_APP_ID
            if provider == "instagram"
            else settings.INSTAGRAM_APP_ID
        )
        secret = (
            settings.INSTAGRAM_LOGIN_APP_SECRET
            if provider == "instagram"
            else settings.INSTAGRAM_APP_SECRET
        )
        if provider not in ("facebook", "instagram") or not app_id.strip() or not secret.strip():
            return False
        if not callback_is_safe:
            return False
        Fernet(settings.ENCRYPTION_KEY.strip().encode())
        return True
    except (AttributeError, TypeError, ValueError):
        return False


def require_configuration(provider: str = "facebook") -> None:
    if not configured(provider):
        logger.error(
            "instagram_not_configured",
            provider=provider,
            hint="Set the selected login provider app ID/secret, a Fernet ENCRYPTION_KEY, "
            "and the exact HTTPS INSTAGRAM_REDIRECT_URI registered with Meta.",
        )
        raise Conflict(
            "Instagram authorization is not configured. Contact your administrator.",
            code="INSTAGRAM_NOT_CONFIGURED",
        )
    cipher()


async def owner(db: AsyncSession, actor: Actor) -> tuple[User, ClientProfile]:
    # Super-admin bypass in the general role helper must NOT allow controlling client consent.
    if actor.role != UserRole.CLIENT or (actor.client_id and actor.client_id != actor.user_id):
        raise Forbidden("Only the client account holder can control Instagram authorization.")
    user = await db.get(User, actor.user_id)
    if (
        not user
        or user.account_status != AccountStatus.ACTIVE
        or not user.agency_id
        or user.agency_id != actor.agency_id
    ):
        raise Forbidden("An active client account in this agency is required.")
    if (
        user.role != UserRole.CLIENT
        or user.must_reset_password
        or (actor.token_version is not None and actor.token_version != user.token_version)
    ):
        raise Forbidden("Your session changed. Sign in again.")
    profile = (
        await db.execute(
            select(ClientProfile)
            .where(ClientProfile.user_id == user.id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
    ).scalar_one_or_none()
    if not profile:
        raise Conflict("Complete your account profile before connecting Instagram.")
    return user, profile


def public_status(profile: ClientProfile) -> dict:
    meta = profile.ig_metadata or {}
    return {
        "status": profile.ig_connection_status,
        "connected": profile.ig_connection_status == "connected",
        "account_id": profile.instagram_user_id if profile.ig_connection_id else None,
        "username": meta.get("username"),
        "picture": meta.get("picture"),
        "page_name": meta.get("page_name"),
        "last_verified_at": meta.get("verified_at"),
        "error": meta.get("error"),
        "expires_at": profile.ig_token_expires_at.isoformat()
        if profile.ig_token_expires_at
        else None,
        "timezone": profile.timezone,
        "configured": configured(),
        "instagram_login_configured": configured("instagram"),
        "provider": meta.get("provider", "facebook"),
        "publishing_enabled": settings.INSTAGRAM_PUBLISHING_ENABLED
        and settings.INSTAGRAM_CLIENT_MODE == "real",
    }


async def notify_connection(
    db: AsyncSession, profile: ClientProfile, action: str, message: str
) -> None:
    from app.models.work import ClientAssignment

    user = await db.get(User, profile.user_id)
    recipients = {profile.user_id}
    recipients.update(
        (
            await db.execute(
                select(User.id).where(
                    User.agency_id == user.agency_id,
                    User.role.in_([UserRole.ADMIN, UserRole.SUPER_ADMIN]),
                )
            )
        )
        .scalars()
        .all()
    )
    recipients.update(
        (
            await db.execute(
                select(ClientAssignment.user_id).where(
                    ClientAssignment.client_id == profile.user_id
                )
            )
        )
        .scalars()
        .all()
    )
    from app.models.user import StaffProfile

    recipients.update(
        (
            await db.execute(
                select(StaffProfile.team_lead_id).where(
                    StaffProfile.user_id.in_(recipients), StaffProfile.team_lead_id.is_not(None)
                )
            )
        )
        .scalars()
        .all()
    )
    recipient_roles = dict(
        (
            await db.execute(
                select(User.id, User.role).where(
                    User.id.in_(recipients), User.agency_id == user.agency_id
                )
            )
        ).all()
    )
    for recipient, role in recipient_roles.items():
        link = (
            "/admin/calendar"
            if role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
            else ("/team-lead/dashboard" if role == UserRole.TEAM_LEAD else "/workstation/tasks")
        )
        db.add(
            Notification(
                agency_id=user.agency_id,
                user_id=recipient,
                title=action,
                message=message,
                link="/portal/account/instagram" if recipient == profile.user_id else link,
            )
        )
    db.add(
        AuditLog(
            agency_id=user.agency_id,
            actor_id=profile.user_id,
            entity="instagram_connection",
            entity_id=profile.user_id,
            action=action,
            to_value={"account_id": profile.instagram_user_id},
        )
    )


async def pause_jobs(db: AsyncSession, profile: ClientProfile, reason: str) -> None:
    jobs = (
        (
            await db.execute(
                select(PublishingJob)
                .where(
                    PublishingJob.client_id == profile.user_id,
                    PublishingJob.status.notin_(["published", "canceled"]),
                )
                .with_for_update()
            )
        )
        .scalars()
        .all()
    )
    for job in jobs:
        if job.stage == "submitting" or job.status == "uncertain":
            job.status = "uncertain"
        else:
            job.status = "paused"
        job.last_error, job.error_code = reason, "RECONNECT_REQUIRED"
        job.lease_id, job.lease_until = None, None


def authorization_url(state: str, provider: str = "facebook") -> str:
    """Build the matching provider dialog without exposing app secrets."""
    if provider == "instagram":
        return "https://www.instagram.com/oauth/authorize?" + urlencode(
            {
                "client_id": settings.INSTAGRAM_LOGIN_APP_ID,
                "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
                "response_type": "code",
                "scope": ",".join(sorted(LOGIN_SCOPES)),
                "state": state,
                "enable_fb_login": "0",
            }
        )
    params = {
        "client_id": settings.INSTAGRAM_APP_ID,
        "redirect_uri": settings.INSTAGRAM_REDIRECT_URI,
        "response_type": "code",
        "state": state,
    }
    if settings.META_LOGIN_CONFIG_ID:
        params["config_id"] = settings.META_LOGIN_CONFIG_ID
    else:
        params["scope"] = ",".join(sorted(SCOPES))
        params["auth_type"] = "rerequest"
    return f"https://www.facebook.com/{settings.META_GRAPH_API_VERSION}/dialog/oauth?{urlencode(params)}"


async def start(db: AsyncSession, actor: Actor, provider: str = "facebook") -> dict:
    require_configuration(provider)
    user, _ = await owner(db, actor)
    # Each browser flow is short lived; reconnect invalidates previous attempts.
    await db.execute(delete(InstagramOAuth).where(InstagramOAuth.client_id == user.id))
    state, verifier = (
        ("ig:" if provider == "instagram" else "fb:") + secrets.token_urlsafe(32),
        secrets.token_urlsafe(32),
    )
    db.add(
        InstagramOAuth(
            agency_id=user.agency_id,
            client_id=user.id,
            state_hash=hashlib.sha256(state.encode()).hexdigest(),
            verifier_hash=hashlib.sha256(verifier.encode()).hexdigest(),
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
        )
    )
    await db.commit()
    return {
        "url": authorization_url(state, provider),
        "state": state,
        "verifier": verifier,
    }


async def callback(
    db: AsyncSession, actor: Actor, *, state: str, verifier: str, code: str | None, denied: bool
) -> dict:
    user, _ = await owner(db, actor)
    flow = (
        await db.execute(
            select(InstagramOAuth)
            .where(
                InstagramOAuth.client_id == user.id,
                InstagramOAuth.state_hash == hashlib.sha256(state.encode()).hexdigest(),
            )
            .with_for_update()
        )
    ).scalar_one_or_none()
    if (
        not flow
        or flow.consumed
        or flow.expires_at <= datetime.now(UTC)
        or not hmac.compare_digest(
            flow.verifier_hash, hashlib.sha256(verifier.encode()).hexdigest()
        )
    ):
        raise Forbidden(
            "Instagram authorization expired or its state is invalid. Start again.",
            code="INVALID_OAUTH_STATE",
        )
    flow.consumed = True
    await db.commit()  # Single-use even when code exchange fails.
    if denied or not code:
        raise Conflict(
            "Instagram authorization was declined. Your existing connection is unchanged.",
            code="OAUTH_DENIED",
        )
    provider = "instagram" if state.startswith("ig:") else "facebook"
    require_configuration(provider)
    client = client_for_provider(provider) if provider == "instagram" else get_instagram_client()
    accounts = await client.discover_accounts(code)
    flow = (
        await db.execute(
            select(InstagramOAuth).where(InstagramOAuth.id == flow.id).with_for_update()
        )
    ).scalar_one_or_none()
    if not flow or flow.expires_at <= datetime.now(UTC):
        raise Conflict("Authorization expired. Connect again.")
    flow.candidates_encrypted = seal(accounts)
    await db.commit()
    if len(accounts) == 1:
        return await select_account(db, actor, flow.id, accounts[0]["id"])
    return {
        "selection_id": str(flow.id),
        "accounts": [
            {key: account.get(key) for key in ("id", "username", "picture", "page_name")}
            for account in accounts
        ],
    }


async def select_account(
    db: AsyncSession, actor: Actor, selection_id: uuid.UUID, account_id: str
) -> dict:
    _, profile = await owner(db, actor)
    flow = (
        await db.execute(
            select(InstagramOAuth)
            .where(InstagramOAuth.id == selection_id, InstagramOAuth.client_id == actor.user_id)
            .with_for_update()
        )
    ).scalar_one_or_none()
    if not flow or flow.expires_at <= datetime.now(UTC) or not flow.candidates_encrypted:
        raise Forbidden("Account selection expired. Connect again.")
    account = next((a for a in unseal(flow.candidates_encrypted) if a["id"] == account_id), None)
    if not account:
        raise Forbidden("This account was not authorized by this client.")
    credentials = {k: account[k] for k in ("page_token", "user_token")}
    credentials["provider"] = account.get("provider", "facebook")
    client = (
        client_for_provider("instagram")
        if credentials["provider"] == "instagram"
        else get_instagram_client()
    )
    await client.verify_account(account_id, account["page_id"], credentials)
    await pause_jobs(
        db,
        profile,
        "Instagram reconnected. Review and resume future schedules; reschedule overdue posts.",
    )
    profile.ig_connection_id = uuid.uuid4()
    profile.instagram_user_id = account_id
    profile.instagram_username = account["username"]
    profile.ig_token_encrypted = seal(credentials)
    profile.ig_connection_status = "connected"
    expiries = [
        int(account.get(k) or 0) for k in ("expires_at", "data_access_expires_at") if account.get(k)
    ]
    profile.ig_token_expires_at = datetime.fromtimestamp(min(expiries), UTC) if expiries else None
    profile.ig_metadata = {
        k: v for k, v in account.items() if k not in ("page_token", "user_token")
    }
    profile.ig_metadata = {**profile.ig_metadata, "verified_at": datetime.now(UTC).isoformat()}
    await db.delete(flow)
    await notify_connection(
        db,
        profile,
        "Instagram connected",
        "Your account is connected. Existing paused posts require schedule review.",
    )
    await db.commit()
    return public_status(profile)


async def verify(db: AsyncSession, profile: ClientProfile) -> dict:
    if profile.ig_connection_status == "disconnected":
        return public_status(profile)
    try:
        if profile.ig_token_expires_at and profile.ig_token_expires_at <= datetime.now(UTC):
            raise InstagramError(
                "Instagram authorization expired. Reconnect.", "RECONNECT_REQUIRED", reconnect=True
            )
        credentials = unseal(profile.ig_token_encrypted)
        client = (
            client_for_provider("instagram")
            if credentials.get("provider") == "instagram"
            else get_instagram_client()
        )
        await client.verify_account(
            profile.instagram_user_id or "",
            (profile.ig_metadata or {}).get("page_id", ""),
            credentials,
        )
        profile.ig_metadata = {
            **(profile.ig_metadata or {}),
            "verified_at": datetime.now(UTC).isoformat(),
            "error": None,
        }
    except InstagramError as exc:
        if exc.reconnect:
            changed = profile.ig_connection_status != "reconnect_required"
            profile.ig_connection_status = "reconnect_required"
            await pause_jobs(db, profile, str(exc))
            if changed:
                await notify_connection(db, profile, "Instagram reconnection required", str(exc))
        profile.ig_metadata = {**(profile.ig_metadata or {}), "error": str(exc)}
    await db.commit()
    return public_status(profile)


async def disconnect(db: AsyncSession, actor: Actor) -> dict:
    _, profile = await owner(db, actor)
    credentials = None
    try:
        credentials = unseal(profile.ig_token_encrypted)
    except InstagramError:
        pass
    await pause_jobs(db, profile, "Client disconnected Instagram. Reconnect and review schedules.")
    profile.ig_token_encrypted, profile.ig_token_expires_at = None, None
    profile.ig_connection_status = "disconnected"
    await db.execute(delete(InstagramOAuth).where(InstagramOAuth.client_id == actor.user_id))
    await notify_connection(
        db,
        profile,
        "Instagram disconnected",
        "Future automatic publishing is paused. Published posts are retained.",
    )
    await db.commit()  # Local credentials become unusable even if Meta is unavailable.
    revoked = True
    if credentials:
        try:
            client = (
                client_for_provider("instagram")
                if credentials.get("provider") == "instagram"
                else get_instagram_client()
            )
            await client.revoke(credentials)
        except InstagramError:
            revoked = False
    return {**public_status(profile), "provider_revoked": revoked}
