from scripts.evaluate_proposal_pipeline import (
    missing_info_count,
    numbered_heading_count,
    prompt_label_count,
    section_metrics,
    summarize_output,
    word_count,
)


def test_text_quality_metrics_count_common_failure_shapes():
    text = """4.1: Describe need
[Missing information needed]

4.2: Explain benefits
Needs additional information.

This final paragraph has useful content."""

    assert word_count(text) == 20
    assert missing_info_count(text) == 2
    assert prompt_label_count(text) == 2


def test_numbered_heading_count_detects_nested_questions():
    text = """4. Community Need
4.1 Describe the issue
4.2 Explain who benefits
4.2.a Optional follow-up
5. Budget"""

    assert numbered_heading_count(text) == 3


def test_section_metrics_and_summary_roll_up_outputs():
    sections = [
        {
            "key": "need",
            "title": "Need",
            "guidance": "Describe the community need.",
            "prompt_items": [{"prompt_id": "4.1"}, {"prompt_id": "4.2"}],
        },
        {
            "key": "budget",
            "title": "Budget",
            "guidance": "Explain the budget.",
            "prompt_items": [{"prompt_id": "8.1"}],
        },
    ]
    enhanced = {
        "need": "4.1: Describe need\nNeeds additional information.\n\n4.2: Explain benefits\nStrong benefits text.",
        "budget": "A polished budget paragraph with no prompt label.",
    }

    rows = section_metrics(sections, enhanced)
    assert rows[0]["prompt_count"] == 2
    assert rows[0]["missing_info_count"] == 1
    assert rows[0]["prompt_label_count"] == 2
    assert rows[1]["prompt_label_count"] == 0

    summary = summarize_output(sections, enhanced)
    assert summary["total_missing_info_count"] == 1
    assert summary["total_prompt_label_count"] == 2
