import json
from pathlib import Path

from api.main import ExportDraftPdfRequest, GenerateDraftRequest, _export_blocks
from backend.app.parsers.grant_parsers import _normalize_sections
from backend.app.workspace_store import create_proposal, get_proposal, get_or_create_user


FIXTURE_PATH = Path(__file__).parent / "fixtures" / "proposal_workflow.json"


def _fixture() -> dict:
    return json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))


def _model_dump(model) -> dict:
    """Support both Pydantic v1 and v2 in local and deployment environments."""
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def test_extracted_section_contract_preserves_prompt_structure() -> None:
    expected = _fixture()["requirements"]["sections"]

    normalized = _normalize_sections(expected)

    assert [section["key"] for section in normalized] == ["community_need"]
    assert [section["title"] for section in normalized] == ["4. Community Need"]
    prompts = normalized[0]["prompt_items"]
    assert [prompt["prompt_id"] for prompt in prompts] == ["4.1", "4.2"]
    assert [prompt["prompt_text"] for prompt in prompts] == [
        "Describe the community need this project addresses.",
        "Explain the expected community benefit.",
    ]
    assert all(prompt["required"] is True for prompt in prompts)


def test_generation_request_preserves_profile_requirements_and_budget() -> None:
    fixture = _fixture()
    request_payload = {
        "profile": fixture["profile"],
        "requirements": fixture["requirements"],
        "requested_budget": fixture["profile"]["requested_budget"],
    }

    request = GenerateDraftRequest(**request_payload)
    serialized = _model_dump(request)

    assert serialized["requirements"] == request_payload["requirements"]
    assert serialized["requested_budget"] == 425000
    for key, value in request_payload["profile"].items():
        assert serialized["profile"][key] == value


def test_saved_proposal_round_trip_does_not_transform_generated_content(tmp_path, monkeypatch) -> None:
    database_path = tmp_path / "proposal-workspace.sqlite3"
    monkeypatch.setenv("PROPOSAL_WORKSPACE_DB", str(database_path))
    monkeypatch.delenv("DATABASE_URL", raising=False)
    fixture = _fixture()
    user_id = "workflow-regression-user"
    get_or_create_user(user_id, "regression@example.com", "Regression User")

    saved = create_proposal(
        user_id,
        {
            "id": "workflow-regression-proposal",
            "title": fixture["requirements"]["grant_name"],
            "community_name": fixture["profile"]["community_name"],
            "grant_name": fixture["requirements"]["grant_name"],
            "status": "ready_to_export",
            "current_step": 5,
            **fixture,
        },
    )
    loaded = get_proposal(user_id, saved["id"])

    assert loaded is not None
    for field in (
        "requirements",
        "profile",
        "draft",
        "enhanced",
        "structured_answers",
        "prompt_coverage",
        "validation",
        "final_sections",
    ):
        assert loaded[field] == fixture[field]


def test_export_contract_preserves_final_section_content_and_question_labels() -> None:
    fixture = _fixture()
    profile = fixture["profile"]
    payload = ExportDraftPdfRequest(
        grant_name=fixture["requirements"]["grant_name"],
        community_name=profile["community_name"],
        region=profile["region"],
        local_priority=profile["local_priority"],
        requested_budget=profile["requested_budget"],
        sections=fixture["final_sections"],
    )

    assert _model_dump(payload)["sections"] == fixture["final_sections"]
    blocks = _export_blocks(payload.sections[0].body)
    assert blocks == [
        {
            "label": "4.1: Describe the community need this project addresses",
            "body": "Repeated service disruptions affect households and community facilities.",
        },
        {
            "label": "4.2: Explain the expected community benefit",
            "body": "The project will improve service reliability and strengthen local maintenance capacity.",
        },
    ]
