from backend.app.llm.llm_utils import _compose_narrative_sections, _prompt_blocks_to_narrative


def test_prompt_blocks_to_narrative_removes_missing_placeholders_and_labels():
    section = {"key": "need", "title": "Community Need"}
    text = """4.1: Describe the community need
The project responds to repeated water service disruptions that affect households and municipal facilities.

4.2: Explain who identified the need
[Missing information needed]

4.3: Explain expected benefits
Reliable water access will improve household confidence, reduce emergency maintenance pressure, and support public facilities."""

    narrative = _prompt_blocks_to_narrative(section, text)

    assert "4.1:" not in narrative
    assert "4.2:" not in narrative
    assert "Missing information" not in narrative
    assert "water service disruptions" in narrative
    assert "Reliable water access" in narrative


def test_compose_narrative_sections_only_rewrites_prompt_sections():
    sections = [
        {"key": "need", "title": "Community Need", "prompt_items": [{"prompt_id": "4.1"}]},
        {"key": "summary", "title": "Summary", "prompt_items": []},
    ]
    structured = {
        "need": "4.1: Describe need\nThe project improves reliable access to clean drinking water.",
        "summary": "This long-form summary should be preserved.",
    }

    narrative = _compose_narrative_sections(sections, structured)

    assert narrative["need"] == "The project improves reliable access to clean drinking water."
    assert narrative["summary"] == "This long-form summary should be preserved."
