from backend.app.workspace_store import (
    create_proposal,
    duplicate_proposal,
    get_community_profile,
    get_or_create_user,
    get_proposal,
    upsert_community_profile,
    update_proposal,
)


def test_community_profile_upsert_is_reusable_and_user_scoped(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("PROPOSAL_WORKSPACE_DB", str(tmp_path / "community-profile.sqlite3"))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_or_create_user("user-a", "a@example.com", "User A")
    get_or_create_user("user-b", "b@example.com", "User B")

    created = upsert_community_profile(
        "user-a",
        {"community_name": "Example Community", "region": "Nunavut"},
    )
    updated = upsert_community_profile(
        "user-a",
        {"community_name": "Example Community", "region": "Northern Canada"},
    )

    assert updated["id"] == created["id"]
    assert updated["profile"]["region"] == "Northern Canada"
    assert get_community_profile("user-b") is None


def test_proposal_keeps_profile_snapshot_and_application_details(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("PROPOSAL_WORKSPACE_DB", str(tmp_path / "proposal-snapshot.sqlite3"))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    user_id = "snapshot-user"
    get_or_create_user(user_id, "snapshot@example.com", "Snapshot User")
    reusable = upsert_community_profile(
        user_id,
        {"community_name": "Example Community", "legal_name": "Example Applicant"},
    )

    saved = create_proposal(
        user_id,
        {
            "title": "Example Application",
            "community_profile_id": reusable["id"],
            "community_profile_snapshot": reusable["profile"],
            "application_details": {
                "project_title": "Water Reliability Project",
                "requested_budget": 250000,
            },
            "profile": {
                **reusable["profile"],
                "project_title": "Water Reliability Project",
                "requested_budget": 250000,
            },
        },
    )

    upsert_community_profile(user_id, {"community_name": "Renamed Community"})
    loaded = get_proposal(user_id, saved["id"])

    assert loaded is not None
    assert loaded["community_profile_id"] == reusable["id"]
    assert loaded["community_profile_snapshot"] == reusable["profile"]
    assert loaded["application_details"]["project_title"] == "Water Reliability Project"
    assert loaded["profile"]["community_name"] == "Example Community"


def test_duplicate_proposal_is_independent_and_resets_export_history(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("PROPOSAL_WORKSPACE_DB", str(tmp_path / "proposal-copy.sqlite3"))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    user_id = "copy-user"
    get_or_create_user(user_id, "copy@example.com", "Copy User")
    original = create_proposal(
        user_id,
        {
            "title": "Original Proposal",
            "status": "exported",
            "current_step": 5,
            "last_exported_at": "2026-07-28T12:00:00+00:00",
            "requirements": {"grant_name": "Example Grant", "sections": []},
            "profile": {"community_name": "Example Community"},
            "final_sections": [{"key": "summary", "title": "Summary", "body": "Original text."}],
        },
    )

    copied = duplicate_proposal(user_id, original["id"])

    assert copied is not None
    assert copied["id"] != original["id"]
    assert copied["title"] == "Original Proposal - Copy"
    assert copied["status"] == "ready_to_export"
    assert copied["last_exported_at"] is None
    assert copied["final_sections"] == original["final_sections"]

    update_proposal(
        user_id,
        copied["id"],
        {"final_sections": [{"key": "summary", "title": "Summary", "body": "Changed copy."}]},
    )
    reloaded_original = get_proposal(user_id, original["id"])
    assert reloaded_original is not None
    assert reloaded_original["final_sections"][0]["body"] == "Original text."
