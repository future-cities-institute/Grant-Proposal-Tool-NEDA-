from backend.app.utils.budget_calculations import calculate_budget_outputs


def _by_id(profile):
    return {item["formula_id"]: item for item in calculate_budget_outputs(profile)}


def test_calculates_supported_core_budget_values() -> None:
    results = _by_id({"requested_budget": 350000, "total_project_cost": 390000})

    assert results["applicant_contribution"]["value"] == "40000.00"
    assert results["requested_funding_share"]["value"] == "89.74"
    assert results["requested_funding_share"]["inputs"] == {
        "requested_budget": "350000.00",
        "total_project_cost": "390000.00",
    }


def test_uses_decimal_rounding_for_currency_and_percentages() -> None:
    results = _by_id({"requested_budget": "1.00", "total_project_cost": "3.00"})

    assert results["applicant_contribution"]["value"] == "2.00"
    assert results["requested_funding_share"]["value"] == "33.33"


def test_omits_calculations_when_required_inputs_are_missing_or_invalid() -> None:
    assert calculate_budget_outputs({"requested_budget": 100}) == []
    assert calculate_budget_outputs({"requested_budget": 100, "total_project_cost": 0}) == []
    assert calculate_budget_outputs({"requested_budget": "unknown", "total_project_cost": 500}) == []


def test_does_not_describe_a_negative_applicant_contribution() -> None:
    results = _by_id({"requested_budget": 1200, "total_project_cost": 1000})

    assert "applicant_contribution" not in results
    assert results["requested_funding_share"]["value"] == "120.00"


def test_calculates_only_fully_structured_line_items() -> None:
    complete = _by_id({
        "total_project_cost": 1000,
        "budget_line_items": [{"category": "Personnel", "amount": "600.10"}, {"category": "Travel", "amount": "399.90"}],
    })
    incomplete = _by_id({
        "total_project_cost": 1000,
        "budget_line_items": [{"category": "Personnel", "amount": 600}, {"category": "Travel"}],
    })

    assert complete["budget_line_item_total"]["value"] == "1000.00"
    assert complete["line_item_variance"]["value"] == "0.00"
    assert "budget_line_item_total" not in incomplete


def test_optional_rate_and_unit_formulas_require_explicit_inputs() -> None:
    results = _by_id({
        "total_project_cost": 1000,
        "budget_contingency_rate": "5",
        "budget_admin_rate": "7.5",
        "budget_participant_count": 8,
    })

    assert results["contingency_amount"]["value"] == "50.00"
    assert results["administration_amount"]["value"] == "75.00"
    assert results["cost_per_participant"]["value"] == "125.00"
