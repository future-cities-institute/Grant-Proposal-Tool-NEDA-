from api.main import _export_blocks


def test_export_blocks_preserve_prompt_ids_in_question_labels():
    blocks = _export_blocks(
        "4.1: Describe the community need.\n"
        "The project addresses reliable access to clean drinking water.\n\n"
        "4.2: Identify supporting evidence.\n"
        "- Boil-water advisories\n"
        "- Community feedback"
    )

    assert blocks == [
        {
            "label": "4.1: Describe the community need",
            "body": "The project addresses reliable access to clean drinking water.",
        },
        {
            "label": "4.2: Identify supporting evidence",
            "body": "- Boil-water advisories\n- Community feedback",
        },
    ]
