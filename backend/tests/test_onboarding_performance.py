import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from pydantic import ValidationError

from app.schemas.brand_dna import SaveSectionsRequest
from app.services.brand_dna import BRAND_DNA_PROMPT, brand_dna_input_hash, sanitize_for_llm
from app.services.onboarding_service import get_current_stage, save_questionnaire_sections


@pytest.mark.asyncio
@pytest.mark.parametrize("previously_marked_complete", [False, True])
async def test_incomplete_legacy_answers_cannot_bypass_onboarding_requirements(previously_marked_complete):
    from datetime import UTC, datetime
    import uuid
    from app.core.errors import Conflict
    from app.services.onboarding_service import complete_onboarding

    now = datetime.now(UTC)
    profile = SimpleNamespace(onboarding_completed_at=None, terms_accepted_at=now)
    quest = SimpleNamespace(answers={f"unrelated_{i}": "value" for i in range(5)},
        core_completed_at=now if previously_marked_complete else None, submitted_at=None,
        **{f"section_{key}": {} for key in "abcdefg"})
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        SimpleNamespace(scalar_one_or_none=lambda: profile),
        SimpleNamespace(scalar_one_or_none=lambda: quest),
    ]), commit=AsyncMock())
    with patch("app.services.subscription_guard.check_client_subscription", new=AsyncMock(return_value={"is_active": True})):
        with pytest.raises(Conflict) as failure:
            await complete_onboarding(db, uuid.uuid4())
    assert failure.value.code == "QUESTIONNAIRE_REQUIRED"
    db.commit.assert_not_awaited()


def answers():
    return {
        "a": {"brand_name": "Creo"}, "b": {"ideal_customer": "Founders"},
        "c": {"humour": 0}, "d": {"visual_direction": "Minimal"},
        "e": {"on_camera": "no"},
        "f": {"what_failed": "Generic posts", "best_posts": [{"post_url": "private", "why": "Useful demos"}]},
        "g": {"origin": "Built by founders", "vision": "Better creative work"},
    }


def test_all_seven_sections_reach_sanitized_ai_input():
    clean = sanitize_for_llm(answers())
    assert set(clean) == set("abcdefg")
    assert clean["f"]["what_failed"] == "Generic posts"
    assert clean["g"]["vision"] == "Better creative work"
    assert clean["f"]["best_posts"] == [{"why": "Useful demos"}]
    assert "F" in BRAND_DNA_PROMPT and "G" in BRAND_DNA_PROMPT


def test_input_hash_tracks_extended_answers_and_ignores_roster_order():
    data = answers()
    roster = [{"name": "A", "role": "editor"}, {"name": "B", "role": "lead"}]
    initial = brand_dna_input_hash(data, roster)
    assert initial == brand_dna_input_hash(data, list(reversed(roster)))
    data["g"]["vision"] = "Changed vision"
    assert initial != brand_dna_input_hash(data, roster)


def test_batch_schema_rejects_unknown_sections():
    with pytest.raises(ValidationError):
        SaveSectionsRequest(sections={"h": {}})
    with pytest.raises(ValidationError):
        SaveSectionsRequest(sections={})


def test_batch_save_persists_all_sections_in_one_commit():
    user = SimpleNamespace(agency_id=None)
    quest = SimpleNamespace(version=1, answers={}, core_completed_at=None,
                            extended_completed_at=None, submitted_at=None,
                            **{f"section_{key}": {} for key in "abcdefg"})
    profile = SimpleNamespace(company_name=None, instagram_handle=None)
    results = [SimpleNamespace(scalar_one_or_none=lambda item=item: item) for item in [user, quest, profile]]
    db = SimpleNamespace(execute=AsyncMock(side_effect=results), commit=AsyncMock(), add=lambda obj: None)
    result = asyncio.run(save_questionnaire_sections(db, __import__("uuid").uuid4(), answers(), "g"))
    assert result["core_completed"] is True
    assert quest.section_f["what_failed"] == "Generic posts"
    assert quest.section_g["origin"] == "Built by founders"
    assert quest.version == 2
    assert db.commit.await_count == 1


def test_stage_lookup_uses_one_database_round_trip():
    db = SimpleNamespace(execute=AsyncMock(return_value=SimpleNamespace(fetchone=lambda: (8,))))
    assert asyncio.run(get_current_stage(db, __import__("uuid").uuid4())) == 8
    assert db.execute.await_count == 1


def test_gemini_failover_has_a_total_deadline():
    from app.services import gemini_client
    calls = []
    class SlowClient:
        def __init__(self, **kwargs): pass
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        async def post(self, url, **kwargs):
            calls.append((url, kwargs))
            await asyncio.sleep(1)
    async def run():
        with patch.object(gemini_client, "get_gemini_key_pool", return_value=["private-key"]), \
             patch.object(gemini_client, "is_key_usable_today", new=AsyncMock(return_value=True)), \
             patch.object(gemini_client.httpx, "AsyncClient", SlowClient):
            result = await gemini_client.generate_gemini_content({}, total_timeout=0.02)
            assert result == (None, None)
    asyncio.run(asyncio.wait_for(run(), timeout=0.2))
    assert len(calls) == 1
    assert "private-key" not in calls[0][0]
    assert calls[0][1]["headers"]["x-goog-api-key"] == "private-key"


def test_production_requires_configured_jwt_secret():
    from app.config import Settings
    with pytest.raises(ValidationError):
        Settings(_env_file=None, ENVIRONMENT="production", JWT_SECRET="", SECRET_KEY="")


def test_google_mock_code_is_not_a_live_login():
    from app.routers.auth import _process_google_code
    from fastapi import HTTPException
    from app.config import settings
    with patch.object(settings, "ENVIRONMENT", "production"), pytest.raises(HTTPException) as exc:
        asyncio.run(_process_google_code("mock_code", "https://example.test", None))
    assert exc.value.status_code == 400


def test_ai_cannot_override_camera_legal_or_pod_constraints():
    from app.services.brand_dna import enforce_brand_constraints, generate_deterministic_brand_dna
    from app.schemas.brand_dna import PodAlignment, TeamBrief
    data = answers()
    data["e"] = {"on_camera": ["voiceover_only"], "legal_constraints": "Never promise guaranteed returns"}
    dna = generate_deterministic_brand_dna(data)
    invented = dna.model_copy(update={
        "production": dna.production.model_copy(update={"founder_on_camera": True,
            "can_shoot_people": True, "default_reel_style": "talking_head"}),
        "tone": dna.tone.model_copy(update={"humour": 10}),
        "team_brief": TeamBrief(brand_summary="Brief", tone_profile=["clear", "warm"],
            production_directives=["A", "B", "C"], pod_alignment=[
                PodAlignment(member_name="Invented member", role="editor", match_score=100, rationale="Invented")]),
    })
    result = enforce_brand_constraints(data, invented, [])
    assert result.production.founder_on_camera is False
    assert result.production.can_shoot_people is False
    assert result.production.default_reel_style != "talking_head"
    assert result.tone.humour == 0
    assert "Never promise guaranteed returns" in result.do_not
    assert result.team_brief.pod_alignment == []


def test_actual_gemini_request_contains_all_sections_and_dedicated_prompt():
    import json
    from app.services import brand_dna
    data = answers()
    response_text = json.dumps(brand_dna.generate_deterministic_brand_dna(data).model_dump())
    midpoint = len(response_text) // 2
    fake = AsyncMock(return_value=({"candidates": [{"content": {"parts": [
        {"text": "hidden reasoning", "thought": True},
        {"text": response_text[:midpoint]}, {"text": response_text[midpoint:]}
    ]}}]}, "masked"))
    with patch.object(brand_dna, "generate_gemini_content", fake):
        result, source = asyncio.run(brand_dna.synthesize_brand_dna(data, []))
    assert source == "gemini"
    payload = fake.call_args.args[0]
    assert payload["systemInstruction"]["parts"][0]["text"] == BRAND_DNA_PROMPT
    sent = payload["contents"][0]["parts"][0]["text"]
    section_json = sent.split("<<<CLIENT_ANSWERS_BEGIN>>>\n")[1].split("\n<<<CLIENT_ANSWERS_END>>>")[0]
    assert set(json.loads(section_json)) == set("abcdefg")
    assert "Generic posts" in sent and "Better creative work" in sent
    assert result.team_brief is not None


def test_worker_tenant_context_preserves_transaction_ownership_and_restores_identity():
    from app.db.session import current_agency_ctx, is_platform_admin_ctx, tenant_session
    agency_before = current_agency_ctx.get()
    admin_before = is_platform_admin_ctx.get()
    db = SimpleNamespace(begin=lambda: pytest.fail("Tenant scope must not own transaction boundaries"))
    async def run():
        async with tenant_session(db, "test-agency", True):
            assert current_agency_ctx.get() == "test-agency"
            assert is_platform_admin_ctx.get() is True
        assert current_agency_ctx.get() == agency_before
        assert is_platform_admin_ctx.get() == admin_before
    asyncio.run(run())


def test_ai_releases_transaction_and_rejects_changed_questionnaire():
    from app.services import brand_dna, onboarding_service
    from app.core.errors import AppError
    data = answers()
    quest = SimpleNamespace(**{f"section_{key}": value for key, value in data.items()})
    db = SimpleNamespace(execute=AsyncMock(side_effect=[
        SimpleNamespace(scalar_one_or_none=lambda: quest), None,
        SimpleNamespace(scalar_one=lambda: quest)]), rollback=AsyncMock(), commit=AsyncMock())
    async def synthesize(*args, **kwargs):
        assert db.rollback.await_count == 1
        quest.section_g = {"vision": "New answers while Gemini was working"}
        return brand_dna.generate_deterministic_brand_dna(data), "gemini"
    with patch.object(onboarding_service, "load_pod_roster", new=AsyncMock(return_value=[])), \
         patch.object(brand_dna, "synthesize_brand_dna", side_effect=synthesize), \
         pytest.raises(AppError) as exc:
        asyncio.run(brand_dna.run_brand_dna_pipeline(db, __import__("uuid").uuid4()))
    assert exc.value.code == "BRAND_INPUT_CHANGED"
    assert db.commit.await_count == 0
