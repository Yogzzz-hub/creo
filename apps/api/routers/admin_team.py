import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import RequireAdmin
from models.enums import AccountStatus, UserRole
from models.team import TeamMember
from models.user import User
from schemas.admin import (
    TeamMemberAdminCreate,
    TeamMemberAdminResponse,
    TeamMemberAdminUpdate,
)

router = APIRouter(prefix="/api/v1/admin/team", tags=["admin-team"])


@router.get("", response_model=list[TeamMemberAdminResponse])
async def list_team_members(
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User, TeamMember)
        .join(TeamMember, TeamMember.user_id == User.id)
        .where(
            User.role.in_([UserRole.team_member, UserRole.team_lead]),
            User.deleted_at.is_(None),
        )
        .order_by(User.full_name.asc())
    )
    rows = result.all()

    return [
        TeamMemberAdminResponse(
            team_member_id=tm.id,
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            role=u.role.value,
            department=tm.department.value,
            daily_cap_posters=tm.daily_cap_posters,
            daily_cap_reels=tm.daily_cap_reels,
            daily_cap_stories=tm.daily_cap_stories,
            is_active=tm.is_active,
            joined_at=tm.joined_at,
        )
        for u, tm in rows
    ]


@router.post("", response_model=TeamMemberAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_team_member(
    payload: TeamMemberAdminCreate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    if payload.role not in (UserRole.team_member, UserRole.team_lead):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Role must be team_member or team_lead",
        )

    existing_user = await db.execute(
        select(User).where(User.email == payload.email)
    )
    if existing_user.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    placeholder_auth_id = str(uuid.uuid4())

    new_user = User(
        auth_id=placeholder_auth_id,
        email=payload.email,
        full_name=payload.full_name,
        role=payload.role,
        account_status=AccountStatus.active,
        deleted_at=None,
    )
    db.add(new_user)
    await db.flush()

    new_team_member = TeamMember(
        user_id=new_user.id,
        department=payload.department,
        daily_cap_posters=payload.daily_poster_cap,
        daily_cap_reels=payload.daily_reel_cap,
        daily_cap_stories=payload.daily_story_cap,
        is_active=True,
        joined_at=date.today(),
    )
    db.add(new_team_member)
    await db.commit()
    await db.refresh(new_team_member)

    return TeamMemberAdminResponse(
        team_member_id=new_team_member.id,
        user_id=new_user.id,
        full_name=new_user.full_name,
        email=new_user.email,
        role=new_user.role.value,
        department=new_team_member.department.value,
        daily_cap_posters=new_team_member.daily_cap_posters,
        daily_cap_reels=new_team_member.daily_cap_reels,
        daily_cap_stories=new_team_member.daily_cap_stories,
        is_active=new_team_member.is_active,
        joined_at=new_team_member.joined_at,
    )


@router.patch("/{team_member_id}", response_model=TeamMemberAdminResponse)
async def update_team_member(
    team_member_id: str,
    payload: TeamMemberAdminUpdate,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamMember, User)
        .join(User, User.id == TeamMember.user_id)
        .where(TeamMember.id == team_member_id)
    )
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    tm, user = row

    # --- ADD THESE TWO LINES TO UPDATE THE USER TABLE ---
    if getattr(payload, "full_name", None) is not None:
        user.full_name = payload.full_name
    if getattr(payload, "role", None) is not None:
        user.role = payload.role
    # ----------------------------------------------------

    if payload.department is not None:
        tm.department = payload.department
    if payload.daily_poster_cap is not None:
        tm.daily_cap_posters = payload.daily_poster_cap
    if payload.daily_reel_cap is not None:
        tm.daily_cap_reels = payload.daily_reel_cap
    if payload.daily_story_cap is not None:
        tm.daily_cap_stories = payload.daily_story_cap
    if payload.is_active is not None:
        tm.is_active = payload.is_active

    await db.commit()
    await db.refresh(tm)

    return TeamMemberAdminResponse(
        team_member_id=tm.id,
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        role=user.role.value,
        department=tm.department.value,
        daily_cap_posters=tm.daily_cap_posters,
        daily_cap_reels=tm.daily_cap_reels,
        daily_cap_stories=tm.daily_cap_stories,
        is_active=tm.is_active,
        joined_at=tm.joined_at,
    )


@router.delete("/{team_member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team_member(
    team_member_id: str,
    _current_user: RequireAdmin,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TeamMember).where(TeamMember.id == team_member_id)
    )
    tm = result.scalar_one_or_none()

    if tm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team member not found",
        )

    user_result = await db.execute(
        select(User).where(User.id == tm.user_id)
    )
    user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user not found",
        )

    user.deleted_at = datetime.now(timezone.utc)
    tm.is_active = False

    await db.commit()

    try:
        from services.storage import delete_user_files
        delete_user_files(str(user.id))
    except Exception:
        pass
