from backend.app.llm import llm_utils


def test_keyword_rag_context_returns_ranked_local_snippet(tmp_path, monkeypatch):
    library = tmp_path / "app_library"
    library.mkdir()
    source = library / "successful_proposal.txt"
    source.write_text(
        "Clean water infrastructure projects in northern communities often require "
        "seasonal shipping plans, operator training, and maintenance capacity.",
        encoding="utf-8",
    )
    monkeypatch.setattr(llm_utils, "APP_LIBRARY_DIR", library)

    context = llm_utils._get_keyword_rag_context(
        "northern clean water infrastructure operator training",
        top_k=1,
    )

    assert "successful_proposal.txt" in context
    assert "operator training" in context


def test_candidate_rag_collections_fall_back_to_base_library():
    assert llm_utils._candidate_rag_collections("grant_library_indigenous") == [
        "grant_library_indigenous",
        "grant_library",
    ]
    assert llm_utils._candidate_rag_collections("grant_library") == ["grant_library"]


def test_build_rag_query_includes_project_context_and_prompts():
    query = llm_utils._build_rag_query(
        grant_name="Indigenous Infrastructure Fund",
        requirements={"raw_text": "Applicants must describe outcomes and community benefit."},
        profile={
            "community_name": "Kinngait",
            "region": "Nunavut",
            "local_priority": "Improve reliable year-round access to clean drinking water",
            "project_summary": "Upgrade water infrastructure and train local operators.",
            "expected_outcomes": "Fewer service disruptions and stronger maintenance capacity.",
        },
        sections=[
            {
                "title": "Community Need",
                "prompt_items": [
                    {"prompt_text": "Describe the community need."},
                    {"prompt_text": "Explain how residents will benefit."},
                ],
            }
        ],
    )

    assert "Kinngait" in query
    assert "clean drinking water" in query
    assert "train local operators" in query
    assert "Describe the community need" in query
