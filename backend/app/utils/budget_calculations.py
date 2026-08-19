"""Deterministic, auditable calculations for proposal budget context."""

from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any, Dict, List, Optional


MONEY_QUANTUM = Decimal("0.01")
PERCENT_QUANTUM = Decimal("0.01")


def calculate_budget_outputs(profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Return only calculations supported by explicit structured inputs."""
    requested = _non_negative_decimal(profile.get("requested_budget"))
    total = _positive_decimal(profile.get("total_project_cost"))
    line_items = _line_item_amounts(profile.get("budget_line_items"))
    outputs: List[Dict[str, Any]] = []

    if line_items:
        outputs.append(_money_result(
            formula_id="budget_line_item_total",
            label="Budget line-item total",
            value=sum(line_items, Decimal("0")),
            formula="sum(budget line-item amounts)",
            inputs={"line_item_amounts": [_money(value) for value in line_items]},
        ))

    if requested is not None and total is not None:
        if requested <= total:
            outputs.append(_money_result(
                formula_id="applicant_contribution",
                label="Applicant and other contribution",
                value=total - requested,
                formula="total project cost - requested funding",
                inputs={"total_project_cost": _money(total), "requested_budget": _money(requested)},
            ))
        outputs.append(_percent_result(
            formula_id="requested_funding_share",
            label="Requested funding share",
            value=(requested / total) * Decimal("100"),
            formula="requested funding / total project cost x 100",
            inputs={"requested_budget": _money(requested), "total_project_cost": _money(total)},
        ))

    line_total = sum(line_items, Decimal("0")) if line_items else None
    if line_items and total is not None:
        outputs.append(_money_result(
            formula_id="line_item_variance",
            label="Difference between project cost and line-item total",
            value=total - line_total,
            formula="total project cost - budget line-item total",
            inputs={"total_project_cost": _money(total), "line_item_total": _money(line_total)},
        ))

    base = line_total or total
    outputs.extend(_rate_outputs(profile, base))

    participant_count = _positive_decimal(profile.get("budget_participant_count"))
    if total is not None and participant_count is not None:
        outputs.append(_money_result(
            formula_id="cost_per_participant",
            label="Cost per participant or unit",
            value=total / participant_count,
            formula="total project cost / participant or unit count",
            inputs={"total_project_cost": _money(total), "participant_count": _plain(participant_count)},
        ))

    return outputs


def _rate_outputs(profile: Dict[str, Any], base: Optional[Decimal]) -> List[Dict[str, Any]]:
    if base is None:
        return []
    definitions = (
        ("contingency_amount", "Calculated contingency amount", "budget_contingency_rate"),
        ("administration_amount", "Calculated administration amount", "budget_admin_rate"),
    )
    outputs = []
    for formula_id, label, field in definitions:
        rate = _non_negative_decimal(profile.get(field))
        if rate is None:
            continue
        outputs.append(_money_result(
            formula_id=formula_id,
            label=label,
            value=base * rate / Decimal("100"),
            formula="eligible budget base x rate / 100",
            inputs={"eligible_budget_base": _money(base), "rate_percent": _percent(rate)},
        ))
    return outputs


def _line_item_amounts(raw_items: Any) -> List[Decimal]:
    if not isinstance(raw_items, list):
        return []
    amounts = []
    for item in raw_items:
        if not isinstance(item, dict):
            return []
        amount = _non_negative_decimal(item.get("amount"))
        if amount is None:
            return []
        amounts.append(amount)
    return amounts


def _decimal(value: Any) -> Optional[Decimal]:
    if value is None or value == "" or isinstance(value, bool):
        return None
    try:
        result = Decimal(str(value).replace(",", "").strip())
    except (InvalidOperation, AttributeError, ValueError):
        return None
    return result if result.is_finite() else None


def _non_negative_decimal(value: Any) -> Optional[Decimal]:
    result = _decimal(value)
    return result if result is not None and result >= 0 else None


def _positive_decimal(value: Any) -> Optional[Decimal]:
    result = _decimal(value)
    return result if result is not None and result > 0 else None


def _money_result(*, formula_id: str, label: str, value: Decimal, formula: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    return {"formula_id": formula_id, "label": label, "value": _money(value), "unit": "CAD", "formula": formula, "inputs": inputs}


def _percent_result(*, formula_id: str, label: str, value: Decimal, formula: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
    return {"formula_id": formula_id, "label": label, "value": _percent(value), "unit": "percent", "formula": formula, "inputs": inputs}


def _money(value: Decimal) -> str:
    return format(value.quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP), "f")


def _percent(value: Decimal) -> str:
    return format(value.quantize(PERCENT_QUANTUM, rounding=ROUND_HALF_UP), "f")


def _plain(value: Decimal) -> str:
    return format(value.normalize(), "f")
