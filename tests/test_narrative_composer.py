from backend.app.llm.llm_utils import (
    _build_structured_answers_map,
    _compose_narrative_sections,
    _prompt_blocks_to_narrative,
)


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


def test_build_structured_answers_map_preserves_question_traceability():
    sections = [
        {
            "key": "need",
            "title": "Community Need",
            "prompt_items": [
                {
                    "prompt_id": "4.1",
                    "prompt_text": "Describe the need.",
                    "answer_type": "narrative_long",
                    "required": True,
                }
            ],
        }
    ]
    structured = {
        "need": "4.1: Describe the need.\nThe project addresses water service reliability.",
    }

    answers = _build_structured_answers_map(sections, structured)

    answer = answers["need"]["answers"][0]
    assert answer["prompt_id"] == "4.1"
    assert answer["prompt_text"] == "Describe the need."
    assert answer["answer"] == "The project addresses water service reliability."
    assert answer["answered"] is True
    assert answer["required"] is True


def test_prompt_blocks_to_narrative_formats_short_facts_without_scaffold_text():
    section = {"key": "eligibility", "title": "Eligibility and Applicant Authority"}
    text = """1.1: Select the category that best describes the legal applicant.
Inuit government or organization

1.2: Confirm the applicant declarations.
['Information in this application is accurate to the best of our knowledge.', 'The applicant has authority to apply and enter a funding agreement.']"""

    narrative = _prompt_blocks_to_narrative(section, text)

    assert "Key eligibility" not in narrative
    assert "Select the category" not in narrative
    assert "['" not in narrative
    assert "The legal applicant category is Inuit government or organization." in narrative
    assert "The applicant confirms Information in this application is accurate" in narrative


def test_prompt_blocks_to_narrative_formats_priority_area_lists():
    section = {"key": "glance", "title": "Project at a Glance"}
    text = """3.2: Priority area(s)
['Housing, infrastructure or community spaces', 'Health, healing and well-being']

3.3: Plain-language project summary
The project will upgrade critical water infrastructure and strengthen local maintenance capacity."""

    narrative = _prompt_blocks_to_narrative(section, text)

    assert "['" not in narrative
    assert "The selected categories are Housing, infrastructure or community spaces and Health, healing and well-being." in narrative
    assert "The project will upgrade critical water infrastructure" in narrative
