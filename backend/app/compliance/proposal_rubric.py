"""Versioned, auditable scoring rubric for proposal-readiness reviews."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple


RUBRIC_VERSION = "proposal-readiness-v1"


@dataclass(frozen=True)
class CategorySpec:
    id: str
    label: str
    weight: float
    description: str


@dataclass(frozen=True)
class MetricSpec:
    id: str
    label: str
    category_id: str
    weight: float
    description: str
    evidence_expectations: Tuple[str, ...]


CATEGORY_SPECS = (
    CategorySpec("need_rationale", "Need and Rationale", 0.16, "How convincingly the proposal establishes the need and its local relevance."),
    CategorySpec("project_design", "Project Design", 0.17, "How clearly the proposed activities, responsibilities, timeline, and delivery approach are defined."),
    CategorySpec("outcomes_measurement", "Outcomes and Measurement", 0.15, "How clearly the proposal connects activities to measurable outputs, outcomes, and evaluation."),
    CategorySpec("budget_value", "Budget and Value", 0.13, "How clearly costs support eligible activities and demonstrate value for money."),
    CategorySpec("funding_alignment", "Funding Alignment", 0.16, "How directly the proposal responds to program priorities, eligibility, and required components."),
    CategorySpec("writing_readiness", "Writing and Submission Readiness", 0.11, "How complete, clear, well structured, and polished the application is."),
    CategorySpec("community_delivery", "Community Governance and Responsible Delivery", 0.12, "How credibly the proposal addresses engagement, governance, ethics, risk, and culturally responsible delivery."),
)


METRIC_SPECS = (
    MetricSpec("community_need_problem_framing", "Community Need / Problem Framing", "need_rationale", 1.25, "Checks whether the proposal explains the problem, need, causal context, and local relevance persuasively.", ("Clearly stated need", "Relevant supporting evidence", "Connection to affected communities")),
    MetricSpec("clarity_specificity", "Clarity & Specificity", "need_rationale", 1.00, "Looks for specific, concrete statements instead of broad or generic claims.", ("Named context", "Specific facts or examples", "Defensible scope")),
    MetricSpec("deliverables_activities_fit", "Activities and Deliverables", "project_design", 1.20, "Evaluates whether activities, deliverables, roles, and milestones form a credible implementation approach.", ("Defined activities", "Concrete deliverables", "Roles or responsibilities", "Milestones or timeline")),
    MetricSpec("structural_readiness", "Implementation Readiness", "project_design", 1.10, "Assesses whether the delivery approach is coherent and sufficiently developed for submission.", ("Logical sequencing", "Feasible delivery plan", "Operational detail")),
    MetricSpec("quantifiable_impact", "Measurable Outcomes", "outcomes_measurement", 1.25, "Assesses whether the draft includes defensible outputs, indicators, targets, or other measurable outcomes.", ("Measurable outputs", "Outcome indicators", "Evidence or baseline where available")),
    MetricSpec("budget_alignment", "Budget Alignment and Value", "budget_value", 1.25, "Checks whether costs are clear, internally consistent, and tied to eligible project activities.", ("Costs connected to activities", "Clear rationale", "Consistent totals", "Value-for-money explanation")),
    MetricSpec("program_alignment", "Program Alignment", "funding_alignment", 1.25, "Measures how clearly the draft connects the project to the funder's stated goals and priorities.", ("Direct priority alignment", "Program language supported by project facts", "Clear funding rationale")),
    MetricSpec("eligibility_requirements_fit", "Eligibility / Requirements Fit", "funding_alignment", 1.25, "Looks for evidence that the applicant and project respond to eligibility rules and application requirements.", ("Applicant eligibility", "Project eligibility", "Required conditions addressed")),
    MetricSpec("missing_required_components", "Required Components", "funding_alignment", 1.15, "Flags expected application components that are missing or materially underdeveloped.", ("Required responses present", "Supporting detail included", "Application instructions followed")),
    MetricSpec("section_completeness", "Section Completeness", "writing_readiness", 1.20, "Evaluates whether proposal sections contain substantive responses rather than blanks or placeholders.", ("All required sections present", "Substantive responses", "No unresolved placeholders")),
    MetricSpec("repetition_redundancy", "Repetition / Redundancy", "writing_readiness", 0.85, "Flags repeated ideas or phrasing that weaken readability and efficient use of space.", ("Distinct section purpose", "Minimal duplication", "Efficient wording")),
    MetricSpec("grammar_writing_quality", "Grammar / Writing Quality", "writing_readiness", 0.90, "Highlights sentence-level issues that affect readability, professionalism, or meaning.", ("Readable sentences", "Consistent grammar", "Professional tone")),
    MetricSpec("community_engagement", "Community Engagement", "community_delivery", 1.25, "Assesses whether community members and partners have meaningful, defined roles.", ("Engagement approach", "Defined community roles", "Feedback or decision-making process")),
    MetricSpec("ocap_data_governance", "OCAP / Data Governance", "community_delivery", 1.20, "Checks how ownership, control, access, possession, consent, and data responsibilities are addressed where applicable.", ("Data ownership", "Access and control", "Consent or governance process")),
    MetricSpec("tcps2_ethical_research", "Ethical Research Alignment", "community_delivery", 1.05, "Assesses ethical research and respectful partnership commitments where research activities are proposed.", ("Ethical oversight", "Consent and participant protection", "Respectful partnership")),
    MetricSpec("inuit_specific_alignment", "Inuit-specific Alignment / IQ Principles", "community_delivery", 1.20, "Applies Inuit-specific governance and Inuit Qaujimajatuqangit expectations when the proposal context requires them.", ("Inuit governance", "Community benefit", "Relevant IQ principles")),
)


SCORE_BANDS = (
    (85, "Strong readiness"),
    (70, "Generally ready with targeted revisions"),
    (55, "Substantive revisions recommended"),
    (0, "Significant development required"),
)


CATEGORY_BY_ID: Dict[str, CategorySpec] = {spec.id: spec for spec in CATEGORY_SPECS}
METRIC_BY_ID: Dict[str, MetricSpec] = {spec.id: spec for spec in METRIC_SPECS}


def score_label(score: int | float) -> str:
    bounded = max(0, min(100, float(score)))
    return next(label for minimum, label in SCORE_BANDS if bounded >= minimum)


def rubric_metadata() -> dict:
    """Serializable definitions saved with and displayed alongside review reports."""
    return {
        "version": RUBRIC_VERSION,
        "score_bands": [{"minimum": minimum, "label": label} for minimum, label in SCORE_BANDS],
        "categories": [
            {
                "id": category.id,
                "label": category.label,
                "weight": category.weight,
                "description": category.description,
                "metrics": [
                    {
                        "id": metric.id,
                        "label": metric.label,
                        "weight": metric.weight,
                        "description": metric.description,
                        "evidence_expectations": list(metric.evidence_expectations),
                    }
                    for metric in METRIC_SPECS
                    if metric.category_id == category.id
                ],
            }
            for category in CATEGORY_SPECS
        ],
    }
