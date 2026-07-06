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
