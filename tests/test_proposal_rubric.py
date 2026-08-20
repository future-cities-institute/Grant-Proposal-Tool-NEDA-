from backend.app.compliance.proposal_rubric import (
    CATEGORY_SPECS,
    METRIC_SPECS,
    RUBRIC_VERSION,
    rubric_metadata,
    score_label,
)


def test_rubric_has_stable_version_and_normalized_category_weights() -> None:
    assert RUBRIC_VERSION == "proposal-readiness-v1"
    assert round(sum(category.weight for category in CATEGORY_SPECS), 8) == 1.0
    assert len(CATEGORY_SPECS) == 7


def test_every_metric_has_one_valid_category_and_evidence_expectations() -> None:
    category_ids = {category.id for category in CATEGORY_SPECS}
    metric_ids = [metric.id for metric in METRIC_SPECS]

    assert len(metric_ids) == len(set(metric_ids))
    assert all(metric.category_id in category_ids for metric in METRIC_SPECS)
    assert all(metric.weight > 0 for metric in METRIC_SPECS)
    assert all(metric.description.strip() for metric in METRIC_SPECS)
    assert all(metric.evidence_expectations for metric in METRIC_SPECS)
    assert all(any(metric.category_id == category.id for metric in METRIC_SPECS) for category in CATEGORY_SPECS)


def test_score_labels_cover_readiness_scale_boundaries() -> None:
    assert score_label(100) == "Strong readiness"
    assert score_label(85) == "Strong readiness"
    assert score_label(84) == "Generally ready with targeted revisions"
    assert score_label(70) == "Generally ready with targeted revisions"
    assert score_label(55) == "Substantive revisions recommended"
    assert score_label(0) == "Significant development required"


def test_serialized_rubric_contains_auditable_weights_and_criteria() -> None:
    metadata = rubric_metadata()

    assert metadata["version"] == RUBRIC_VERSION
    assert len(metadata["categories"]) == len(CATEGORY_SPECS)
    assert sum(len(category["metrics"]) for category in metadata["categories"]) == len(METRIC_SPECS)
    budget_metric = next(
        metric
        for category in metadata["categories"]
        for metric in category["metrics"]
        if metric["id"] == "budget_alignment"
    )
    assert "Consistent totals" in budget_metric["evidence_expectations"]
