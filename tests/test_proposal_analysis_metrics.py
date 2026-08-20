import pytest


pytest.importorskip("pydantic")

from backend.app.compliance.proposal_analysis import _build_metric_categories


def test_clean_metrics_use_their_own_labels_in_maintenance_suggestions() -> None:
    categories = _build_metric_categories([], grant_context_available=False)

    metrics = [metric for category in categories for metric in category.metrics]
    assert metrics
    assert all(metric.suggestions == [f"Maintain strong {metric.label.lower()}."] for metric in metrics)

    funding_alignment = next(category for category in categories if category.id == "funding_alignment")
    assert funding_alignment.assessed is False
