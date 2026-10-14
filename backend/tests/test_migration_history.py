"""Resolve deployed migration histories without connecting to any database."""

from pathlib import Path

import pytest
from alembic.script import ScriptDirectory

MIGRATIONS = Path(__file__).resolve().parents[1] / "alembic"
HEAD = "0016_merge_legacy_enhancements"


@pytest.fixture
def scripts():
    return ScriptDirectory(str(MIGRATIONS))


def test_deploy_has_one_unambiguous_head(scripts):
    assert scripts.get_heads() == [HEAD]


@pytest.mark.parametrize(
    "current, expected",
    [
        ("0014_enhancements", {"0015_payment_state_constraints", HEAD}),
        ("0015_payment_state_constraints", {"0014_enhancements", HEAD}),
        (
            "0014_manual_payment_requests",
            {"0014_enhancements", "0015_payment_state_constraints", HEAD},
        ),
    ],
)
def test_existing_histories_only_run_the_missing_branch(scripts, current, expected):
    steps = scripts._upgrade_revs("head", current)
    assert {step.revision.revision for step in steps} == expected
    assert steps[-1].revision.revision == HEAD


def test_fresh_database_still_has_a_complete_upgrade_path(scripts):
    steps = scripts._upgrade_revs("head", "base")
    revisions = [step.revision.revision for step in steps]
    assert revisions[0] == "0001_initial_schema"
    assert revisions[-1] == HEAD
    assert "0014_manual_payment_requests" in revisions
    assert "0015_payment_state_constraints" in revisions
