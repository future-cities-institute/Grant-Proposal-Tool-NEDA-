from backend.app.parsers.grant_parsers import _normalize_sections


def test_normalize_sections_preserves_nested_prompt_schema():
    sections = _normalize_sections(
        [
            {
                "key": "community_need",
                "title": "4. Community Need",
                "guidance": "Explain the need and benefits.",
                "prompt_items": [
                    {
                        "prompt_id": "4.1",
                        "prompt_text": "Describe the community need this project addresses.",
                        "detail_text": "Include evidence and who identified the need.",
                        "answer_type": "narrative_long",
                        "required": True,
                    },
                    {
                        "prompt_id": "4.2.a",
                        "prompt_text": "Explain how benefits will be shared.",
                        "answer_type": "narrative_short",
                        "parent_prompt_id": "4.2",
                    },
                ],
            }
        ]
    )

    assert len(sections) == 1
    prompts = sections[0]["prompt_items"]
    assert [prompt["prompt_id"] for prompt in prompts] == ["4.1", "4.2.a"]
    assert prompts[0]["answer_type"] == "narrative_long"
    assert prompts[0]["response_style"] == "narrative_long"
    assert prompts[0]["required"] is True
    assert prompts[1]["sub_prompt"] is True
    assert prompts[1]["parent_prompt_id"] == "4.2"
