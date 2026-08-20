from backend.app.workspace_store import (
    create_feedback_report,
    create_proposal,
    delete_feedback_report,
    get_feedback_report,
    get_or_create_user,
    list_feedback_reports,
)


def _prepare_users(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("PROPOSAL_WORKSPACE_DB", str(tmp_path / "feedback-reports.sqlite3"))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    get_or_create_user("user-a", "a@example.com", "User A")
    get_or_create_user("user-b", "b@example.com", "User B")


def test_feedback_reports_are_user_scoped_and_listed_as_summaries(tmp_path, monkeypatch) -> None:
    _prepare_users(tmp_path, monkeypatch)
    proposal = create_proposal("user-a", {"title": "Community Project"})
    created = create_feedback_report(
        "user-a",
        {
            "title": "Community Project Review",
            "source_proposal_id": proposal["id"],
            "source_filename": "community-project.docx",
            "rubric_version": "proposal-readiness-v1",
            "overall_score": 82,
            "priority_issue_count": 3,
            "category_scores": {"project_design": 84, "budget_value": 78},
            "report": {"strengths": ["Clear activities"]},
            "extracted_sections": [{"key": "summary", "body": "Proposal text"}],
            "grant_context": {"file_name": "guidelines.pdf", "text": "Extracted requirements"},
        },
    )

    summaries = list_feedback_reports("user-a")
    assert summaries[0]["id"] == created["id"]
    assert summaries[0]["overall_score"] == 82
    assert summaries[0]["category_scores"]["budget_value"] == 78
    assert "report" not in summaries[0]
    assert "extracted_sections" not in summaries[0]
    assert get_feedback_report("user-b", created["id"]) is None
    assert list_feedback_reports("user-b") == []


def test_feedback_report_detail_preserves_extracted_content_without_original_file(tmp_path, monkeypatch) -> None:
    _prepare_users(tmp_path, monkeypatch)
    created = create_feedback_report(
        "user-a",
        {
            "title": "Uploaded Draft Review",
            "source_filename": "uploaded.pdf",
            "rubric_version": "proposal-readiness-v1",
            "category_scores": {},
            "report": {"summary": "Review summary"},
            "extracted_sections": [{"key": "need", "body": "Extracted text"}],
        },
    )

    loaded = get_feedback_report("user-a", created["id"])
    assert loaded is not None
    assert loaded["source_filename"] == "uploaded.pdf"
    assert loaded["extracted_sections"][0]["body"] == "Extracted text"
    assert loaded["report"]["summary"] == "Review summary"
    assert "file_bytes" not in loaded


def test_reanalysis_creates_a_separate_timestamped_snapshot(tmp_path, monkeypatch) -> None:
    _prepare_users(tmp_path, monkeypatch)
    first = create_feedback_report(
        "user-a",
        {"title": "First Review", "overall_score": 61, "rubric_version": "proposal-readiness-v1"},
    )
    second = create_feedback_report(
        "user-a",
        {
            "title": "Re-analysis",
            "parent_report_id": first["id"],
            "overall_score": 74,
            "rubric_version": "proposal-readiness-v1",
        },
    )

    assert second["id"] != first["id"]
    assert second["parent_report_id"] == first["id"]
    assert get_feedback_report("user-a", first["id"])["overall_score"] == 61
    assert get_feedback_report("user-a", second["id"])["overall_score"] == 74


def test_feedback_report_deletion_is_user_scoped(tmp_path, monkeypatch) -> None:
    _prepare_users(tmp_path, monkeypatch)
    report = create_feedback_report(
        "user-a",
        {"title": "Private Review", "rubric_version": "proposal-readiness-v1"},
    )

    assert delete_feedback_report("user-b", report["id"]) is False
    assert get_feedback_report("user-a", report["id"]) is not None
    assert delete_feedback_report("user-a", report["id"]) is True
    assert get_feedback_report("user-a", report["id"]) is None
