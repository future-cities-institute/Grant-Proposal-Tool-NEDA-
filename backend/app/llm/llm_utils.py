# utils/llm_utils.py
from __future__ import annotations

import os
import json
import logging
import importlib.util
import re
from typing import Dict, Any, Optional, List

from backend.app.rag.use_cases import collection_for_use_case, normalize_use_case

_RAG_AVAILABLE: Optional[bool] = None
logger = logging.getLogger(__name__)
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")


def _openai_sdk_available() -> bool:
    return importlib.util.find_spec("openai") is not None


def _get_rag_context(
    query: str,
    top_k: int = 6,
    persist_dir: Optional[str] = None,
    collection_name: str = "grant_library",
    where: Optional[Dict[str, Any]] = None,
) -> str:
    """Retrieve relevant grant-library excerpts for the query. Returns empty string if RAG unavailable."""
    global _RAG_AVAILABLE
    if _RAG_AVAILABLE is False:
        return ""
    try:
        from backend.app.rag.retrieve import retrieve
        _RAG_AVAILABLE = True
        out = retrieve(
            query=query,
            top_k=top_k,
            persist_dir=persist_dir,
            collection_name=collection_name,
            where=where,
        )
        return (out or "").strip()
    except Exception:
        _RAG_AVAILABLE = False
        return ""


def _build_payload(
    draft: Dict[str, Any],
    requirements: Dict[str, Any],
    profile: Dict[str, Any],
) -> Dict[str, Any]:
    sections = draft.get("sections", []) or []

    grant_name = (
        requirements.get("grant_name")
        or requirements.get("program_name")
        or requirements.get("name")
        or ""
    )
    raw_req_text = (requirements.get("raw_text") or "")[:6000]

    payload = {
        "grant_name": grant_name,
        "community_profile": {
            "community_name": profile.get("community_name", ""),
            "region": profile.get("region", ""),
            "local_priority": profile.get("local_priority", ""),
            "legal_name": profile.get("legal_name", ""),
            "operating_name": profile.get("operating_name", ""),
            "applicant_profile": profile.get("applicant_profile", ""),
            "registration_number": profile.get("registration_number", ""),
            "year_established": profile.get("year_established", ""),
            "contact_name": profile.get("contact_name", ""),
            "contact_title": profile.get("contact_title", ""),
            "contact_email": profile.get("contact_email", ""),
            "contact_phone": profile.get("contact_phone", ""),
            "mailing_address": profile.get("mailing_address", ""),
            "website": profile.get("website", ""),
            "indigenous_communities": profile.get("indigenous_communities", ""),
            "population_served": profile.get("population_served", ""),
            "demographic_context": profile.get("demographic_context", ""),
            "existing_services": profile.get("existing_services", ""),
            "service_gaps": profile.get("service_gaps", ""),
            "remoteness_context": profile.get("remoteness_context", ""),
            "governance_context": profile.get("governance_context", ""),
            "project_title": profile.get("project_title", ""),
            "project_location": profile.get("project_location", ""),
            "timeline": profile.get("timeline", ""),
            "challenges": profile.get("challenges", ""),
            "strengths": profile.get("strengths", ""),
            "partners": profile.get("partners", ""),
            "applicant_type": profile.get("applicant_type", ""),
            "project_type": profile.get("project_type", ""),
            "project_stage": profile.get("project_stage", ""),
            "community_support_status": profile.get("community_support_status", ""),
            "other_funding_status": profile.get("other_funding_status", ""),
            "project_summary": profile.get("project_summary", ""),
            "project_objectives": profile.get("project_objectives", ""),
            "target_beneficiaries": profile.get("target_beneficiaries", ""),
            "direct_beneficiaries": profile.get("direct_beneficiaries", ""),
            "indirect_beneficiaries": profile.get("indirect_beneficiaries", ""),
            "project_activities": profile.get("project_activities", ""),
            "expected_outputs": profile.get("expected_outputs", ""),
            "staffing_plan": profile.get("staffing_plan", ""),
            "project_management_approach": profile.get("project_management_approach", ""),
            "expected_outcomes": profile.get("expected_outcomes", ""),
            "quantitative_indicators": profile.get("quantitative_indicators", ""),
            "qualitative_indicators": profile.get("qualitative_indicators", ""),
            "baseline_conditions": profile.get("baseline_conditions", ""),
            "baseline_data_collection": profile.get("baseline_data_collection", ""),
            "success_measurement": profile.get("success_measurement", ""),
            "community_engagement": profile.get("community_engagement", ""),
            "approvals_status": profile.get("approvals_status", ""),
            "elders_involvement": profile.get("elders_involvement", ""),
            "knowledge_keepers_involvement": profile.get("knowledge_keepers_involvement", ""),
            "youth_involvement": profile.get("youth_involvement", ""),
            "data_governance": profile.get("data_governance", ""),
            "cultural_safety": profile.get("cultural_safety", ""),
            "evidence_note": (profile.get("evidence_note") or "").strip(),
            "why_now": profile.get("why_now", ""),
            "total_project_cost": profile.get("total_project_cost", None),
            "budget_personnel": profile.get("budget_personnel", ""),
            "budget_professional_services": profile.get("budget_professional_services", ""),
            "budget_equipment_materials": profile.get("budget_equipment_materials", ""),
            "budget_travel_logistics": profile.get("budget_travel_logistics", ""),
            "budget_training": profile.get("budget_training", ""),
            "budget_evaluation": profile.get("budget_evaluation", ""),
            "budget_admin": profile.get("budget_admin", ""),
            "budget_contingency": profile.get("budget_contingency", ""),
            "budget_breakdown": profile.get("budget_breakdown", ""),
            "budget_assumptions": profile.get("budget_assumptions", ""),
            "other_funding": profile.get("other_funding", ""),
            "risks_and_mitigation": profile.get("risks_and_mitigation", ""),
            "risk_likelihood": profile.get("risk_likelihood", ""),
            "risk_impact": profile.get("risk_impact", ""),
            "mitigation_plan": profile.get("mitigation_plan", ""),
            "sustainability_plan": profile.get("sustainability_plan", ""),
            "maintenance_requirements": profile.get("maintenance_requirements", ""),
            "ownership_model": profile.get("ownership_model", ""),
            "future_funding_sources": profile.get("future_funding_sources", ""),
            "scaling_plan": profile.get("scaling_plan", ""),
            "supporting_documents_text": (profile.get("supporting_documents_text", "") or "")[:12000],
            "indicators_before": profile.get("indicators_before", {}) or {},
            "indicators_after": profile.get("indicators_after", {}) or {},
            "scenario": profile.get("scenario", {}) or {},
            "requested_budget": profile.get("requested_budget", None),
        },
        "requirements_text_snippet": raw_req_text,
        "sections_to_improve": [
            {
                "key": s.get("key"),
                "title": s.get("title"),
                "current_body": s.get("body", ""),
                "guidance_from_application": s.get("guidance", ""),
                "word_limit": s.get("word_limit", None),
                "prompt_items": s.get("prompt_items", []) or [],
            }
            for s in sections
        ],
        "instructions": [
            """Rewrite EACH section into a grant-ready, detailed version aligned to the uploaded grant posting.
            You are a senior Canadian grant writer with experience supporting Indigenous,
            rural, and community-led economic development initiatives.
            Write content that is submission-ready with minimal editing.

            For sections without prompt_items, write in long-form paragraphs only.
            Each section should be 2–5 well-developed paragraphs with clear transitions.
            For sections with prompt_items, do not write a single blended section response.
            Instead, produce one distinct answer block per prompt.

            Use respectful, strengths-based, plain-language writing.
            Avoid academic jargon, corporate buzzwords, or generic claims.

            When prompt_items are provided for a section, return structured answers
            instead of preformatted section text. Provide exactly one answer object
            for each prompt_item, using the prompt_id exactly as provided.
            Try to draft a useful answer from available community profile and grant context.
            If a fact is uncertain, answer cautiously without adding confidence labels
            or review notes in the answer text.
            Use [Missing information needed] only when there is no defensible basis for a draft answer.
            Do not reuse the same answer for different prompts unless the questions truly ask
            for the same fact. If a prompt asks for a specific field such as registration number,
            organization type, legal status, demographics, challenges, priorities, or supporting data,
            answer that specific field or mark it missing.
            Treat "To confirm", "Unknown", and "TBD" as not yet verified. Do not turn those
            into completed claims. It is acceptable to answer "N/A" when the user has explicitly
            provided N/A for a field.

            Ground all writing strictly in the provided information.
            Do NOT invent facts, partners, legal status, timelines, funding amounts,
            or commitments that were not explicitly provided.
            Do NOT invent population counts, beneficiary counts, baseline numbers, total project
            cost, CRA/business numbers, contact details, Elders involvement, Knowledge Keepers
            involvement, Youth involvement, OCAP/data governance, letters of support, approvals,
            future revenue sources, or community ownership models.

            If an evidence note, indicators, or before/after metrics are provided,
            use them to:
            - justify the need,
            - explain expected change,
            - and support outcomes in a realistic, defensible way.

            Add practical implementation detail where appropriate, including:
            - phased activities (e.g., planning → implementation → evaluation),
            - who is responsible for what,
            - how community engagement will occur,
            - and key risks with reasonable mitigation approaches.

            Follow standard Canadian grant application norms:
            - clearly distinguish needs, activities, outputs, and outcomes,
            - describe feasibility and readiness,
            - and ensure alignment with funder priorities stated in the application.

            Respect any provided word_limit for each section where possible.
            Prioritize clarity and completeness over verbosity.

            Return JSON ONLY in this exact format:
            {"sections":[{"key":"<section_key>","text":"<rewritten section text for sections without prompt_items>","answers":[{"prompt_id":"<prompt_id>","answer":"<answer text only>","confidence":"high|medium|low","review_note":"<optional note>"}]}]}
            """
        ],
    }
    return payload


def _prompt_answered_in_text(prompt_item: Dict[str, Any], section_text: str) -> bool:
    prompt_id = str(prompt_item.get("prompt_id") or "").strip()
    response_value = str(prompt_item.get("response_value") or "").strip()
    if response_value:
        return True
    if not prompt_id:
        return False

    pattern = re.compile(
        rf"(?im)^\s*{re.escape(prompt_id)}\s*:\s*(.*?)\s*$([\s\S]*?)(?=^\s*(?:Q?\d[\w.-]*|prompt_\d+)\s*:|\Z)"
    )
    match = pattern.search(section_text or "")
    if not match:
        return False
    answer = (match.group(2) or "").strip()
    return bool(
        answer
        and "[No answer generated]" not in answer
        and "[Missing information needed]" not in answer
    )


def _prompt_answer_state(prompt_item: Dict[str, Any], section_text: str) -> Dict[str, Any]:
    prompt_id = str(prompt_item.get("prompt_id") or "").strip()
    if not prompt_id:
        return {"status": "missing", "confidence": "low", "review_note": "Prompt identifier was not available."}
    if str(prompt_item.get("response_value") or "").strip():
        return {"status": "answered", "confidence": "high", "review_note": ""}

    match = _prompt_block_pattern(prompt_id).search(section_text or "")
    if not match:
        return {"status": "missing", "confidence": "low", "review_note": "No answer block was generated for this prompt."}

    block = match.group(0).strip()
    answer_lines = block.splitlines()[1:]
    answer = "\n".join(answer_lines).strip()
    if not answer or "[No answer generated]" in answer or "[Missing information needed]" in answer:
        return {"status": "missing", "confidence": "low", "review_note": "No defensible draft answer was generated."}

    confidence_match = re.search(r"(?im)^\s*Confidence:\s*(high|medium|low)\s*$", block)
    confidence = (
        confidence_match.group(1).lower()
        if confidence_match
        else _prompt_confidence_from_context(prompt_item, answer)
    )
    review_match = re.search(r"(?im)^\s*Needs review:\s*(.+)$", block)
    review_note = review_match.group(1).strip() if review_match else _prompt_review_note_from_context(prompt_item)
    status = "needs_review" if confidence == "low" else "answered"
    return {"status": status, "confidence": confidence, "review_note": review_note}


def _prompt_block_pattern(prompt_id: str) -> re.Pattern[str]:
    return re.compile(
        rf"(?ims)^\s*{re.escape(prompt_id)}\s*:\s*.*?(?=^\s*(?:Q?\d[\w.-]*|prompt_\d+)\s*:|\Z)"
    )


def _strip_prompt_metadata_lines(text: str) -> str:
    lines = []
    for line in (text or "").splitlines():
        if re.match(r"(?i)^\s*(Confidence|Needs review):\s*", line):
            continue
        lines.append(line)
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


_UNKNOWN_FIELD_VALUES = {"", "to confirm", "unknown", "tbd", "to be confirmed"}


def _profile_text(profile: Dict[str, Any], key: str) -> str:
    return str(profile.get(key) or "").strip()


def _usable_profile_text(profile: Dict[str, Any], key: str) -> str:
    value = _profile_text(profile, key)
    return "" if value.lower() in _UNKNOWN_FIELD_VALUES else value


def _prompt_review_note_from_context(prompt_item: Dict[str, Any]) -> str:
    prompt_text = str(prompt_item.get("prompt_text") or "").lower()
    if re.search(r"\b(legal name|applicant|organization|community|communities)\b", prompt_text):
        return "Confirm the formal applicant name and whether additional communities or partners should be named."
    if re.search(r"\b(country|province|territory|region|location|headquarter)\b", prompt_text):
        return "Confirm the official jurisdiction or headquarters wording required by the application form."
    if re.search(r"\b(demographic|population|profile)\b", prompt_text):
        return "Add verified demographic details such as population, language, service area, or other funder-requested data."
    if re.search(r"\b(priority|priorities|project|need|problem|challenge)\b", prompt_text):
        return "Confirm this fully captures the funder's requested framing."
    if re.search(r"\b(strength|asset|capacity|readiness)\b", prompt_text):
        return "Confirm these strengths are the ones most relevant to this question."
    if re.search(r"\b(partner|collaborat|stakeholder)\b", prompt_text):
        return "Confirm each partner's role and whether formal commitments exist."
    if re.search(r"\b(timeline|schedule|timeframe|milestone)\b", prompt_text):
        return "Confirm dates and milestones before submission."
    if re.search(r"\b(budget|funding|amount|cost)\b", prompt_text):
        return "Confirm eligible costs and any required budget breakdown."
    return "Confirm this drafted answer before submission."


def _prompt_confidence_from_context(prompt_item: Dict[str, Any], answer: str) -> str:
    if str(prompt_item.get("response_value") or "").strip():
        return "high"
    if not answer or "[No answer generated]" in answer or "[Missing information needed]" in answer:
        return "low"
    prompt_text = str(prompt_item.get("prompt_text") or "").lower()
    if re.search(r"\b(demographic|population|profile)\b", prompt_text):
        return "low"
    return "medium"


def _prompt_answer_from_context(prompt_item: Dict[str, Any], profile: Dict[str, Any]) -> str:
    prompt_text = str(prompt_item.get("prompt_text") or "").lower()
    response_value = str(prompt_item.get("response_value") or "").strip()
    if response_value:
        return response_value

    community_name = _usable_profile_text(profile, "community_name")
    region = _usable_profile_text(profile, "region")
    local_priority = _usable_profile_text(profile, "local_priority")
    legal_name = _usable_profile_text(profile, "legal_name")
    operating_name = _usable_profile_text(profile, "operating_name")
    applicant_profile = _usable_profile_text(profile, "applicant_profile")
    registration_number = _usable_profile_text(profile, "registration_number")
    year_established = _usable_profile_text(profile, "year_established")
    contact_name = _usable_profile_text(profile, "contact_name")
    contact_title = _usable_profile_text(profile, "contact_title")
    contact_email = _usable_profile_text(profile, "contact_email")
    contact_phone = _usable_profile_text(profile, "contact_phone")
    mailing_address = _usable_profile_text(profile, "mailing_address")
    website = _usable_profile_text(profile, "website")
    indigenous_communities = _usable_profile_text(profile, "indigenous_communities")
    population_served = _usable_profile_text(profile, "population_served")
    demographic_context = _usable_profile_text(profile, "demographic_context")
    existing_services = _usable_profile_text(profile, "existing_services")
    service_gaps = _usable_profile_text(profile, "service_gaps")
    remoteness_context = _usable_profile_text(profile, "remoteness_context")
    governance_context = _usable_profile_text(profile, "governance_context")
    project_title = _usable_profile_text(profile, "project_title")
    project_location = _usable_profile_text(profile, "project_location")
    challenges = _usable_profile_text(profile, "challenges")
    strengths = _usable_profile_text(profile, "strengths")
    partners = _usable_profile_text(profile, "partners")
    applicant_type = _usable_profile_text(profile, "applicant_type")
    project_type = _usable_profile_text(profile, "project_type")
    project_stage = _usable_profile_text(profile, "project_stage")
    community_support_status = _usable_profile_text(profile, "community_support_status")
    other_funding_status = _usable_profile_text(profile, "other_funding_status")
    timeline = _usable_profile_text(profile, "timeline")
    project_summary = _usable_profile_text(profile, "project_summary")
    project_objectives = _usable_profile_text(profile, "project_objectives")
    target_beneficiaries = _usable_profile_text(profile, "target_beneficiaries")
    direct_beneficiaries = _usable_profile_text(profile, "direct_beneficiaries")
    indirect_beneficiaries = _usable_profile_text(profile, "indirect_beneficiaries")
    project_activities = _usable_profile_text(profile, "project_activities")
    expected_outputs = _usable_profile_text(profile, "expected_outputs")
    staffing_plan = _usable_profile_text(profile, "staffing_plan")
    project_management_approach = _usable_profile_text(profile, "project_management_approach")
    expected_outcomes = _usable_profile_text(profile, "expected_outcomes")
    quantitative_indicators = _usable_profile_text(profile, "quantitative_indicators")
    qualitative_indicators = _usable_profile_text(profile, "qualitative_indicators")
    baseline_conditions = _usable_profile_text(profile, "baseline_conditions")
    baseline_data_collection = _usable_profile_text(profile, "baseline_data_collection")
    success_measurement = _usable_profile_text(profile, "success_measurement")
    community_engagement = _usable_profile_text(profile, "community_engagement")
    approvals_status = _usable_profile_text(profile, "approvals_status")
    elders_involvement = _usable_profile_text(profile, "elders_involvement")
    knowledge_keepers_involvement = _usable_profile_text(profile, "knowledge_keepers_involvement")
    youth_involvement = _usable_profile_text(profile, "youth_involvement")
    data_governance = _usable_profile_text(profile, "data_governance")
    cultural_safety = _usable_profile_text(profile, "cultural_safety")
    evidence_note = _usable_profile_text(profile, "evidence_note")
    why_now = _usable_profile_text(profile, "why_now")
    budget_personnel = _usable_profile_text(profile, "budget_personnel")
    budget_professional_services = _usable_profile_text(profile, "budget_professional_services")
    budget_equipment_materials = _usable_profile_text(profile, "budget_equipment_materials")
    budget_travel_logistics = _usable_profile_text(profile, "budget_travel_logistics")
    budget_training = _usable_profile_text(profile, "budget_training")
    budget_evaluation = _usable_profile_text(profile, "budget_evaluation")
    budget_admin = _usable_profile_text(profile, "budget_admin")
    budget_contingency = _usable_profile_text(profile, "budget_contingency")
    budget_breakdown = _usable_profile_text(profile, "budget_breakdown")
    budget_assumptions = _usable_profile_text(profile, "budget_assumptions")
    other_funding = _usable_profile_text(profile, "other_funding")
    risks_and_mitigation = _usable_profile_text(profile, "risks_and_mitigation")
    risk_likelihood = _usable_profile_text(profile, "risk_likelihood")
    risk_impact = _usable_profile_text(profile, "risk_impact")
    mitigation_plan = _usable_profile_text(profile, "mitigation_plan")
    sustainability_plan = _usable_profile_text(profile, "sustainability_plan")
    maintenance_requirements = _usable_profile_text(profile, "maintenance_requirements")
    ownership_model = _usable_profile_text(profile, "ownership_model")
    future_funding_sources = _usable_profile_text(profile, "future_funding_sources")
    scaling_plan = _usable_profile_text(profile, "scaling_plan")
    supporting_documents_text = _usable_profile_text(profile, "supporting_documents_text")
    requested_budget = profile.get("requested_budget") or profile.get("requested_funding")
    total_project_cost = profile.get("total_project_cost")
    indicators_before = profile.get("indicators_before") or {}
    indicators_after = profile.get("indicators_after") or {}

    if re.search(r"\b(cra|registration number|charitable number|business number|incorporation number)\b", prompt_text):
        return registration_number or "[Missing information needed]"
    if re.search(r"\b(organization type|applicant type|legal status|classification|classifications)\b", prompt_text):
        return applicant_type or "[Missing information needed]"
    if re.search(r"\b(operating name|legal name|registered name|full registered)\b", prompt_text):
        if "operating" in prompt_text:
            return operating_name or legal_name or community_name or "[Missing information needed]"
        return legal_name or community_name or "[Missing information needed]"
    if re.search(r"\b(year established|established|incorporated|founded)\b", prompt_text):
        return year_established or "[Missing information needed]"
    if re.search(r"\b(contact|email|phone|mailing|address|website)\b", prompt_text):
        contact_details = [
            f"Contact: {contact_name}" if contact_name else "",
            f"Title: {contact_title}" if contact_title else "",
            f"Email: {contact_email}" if contact_email else "",
            f"Phone: {contact_phone}" if contact_phone else "",
            f"Mailing address: {mailing_address}" if mailing_address else "",
            f"Website: {website}" if website else "",
        ]
        answer = "; ".join(detail for detail in contact_details if detail)
        return answer or "[Missing information needed]"
    if re.search(r"\b(applicant profile|organization profile|organisation profile|about the applicant|about the organization|about the organisation|mandate|mission|experience|capacity|right lead|qualified)\b", prompt_text):
        parts = [value for value in [applicant_profile, applicant_type, strengths] if value]
        return " ".join(parts) if parts else "[Missing information needed]"
    if re.search(r"\b(country|province|territory|region|location|headquarter)\b", prompt_text) and region:
        details = [f"The provided location context is {region}."]
        if project_location and re.search(r"\b(project|site|location)\b", prompt_text):
            details.append(f"The project location is {project_location}.")
        return " ".join(details)
    if re.search(r"\b(demographic|demographics|population|profile)\b", prompt_text):
        parts = [value for value in [population_served, demographic_context, remoteness_context] if value]
        if parts:
            return " ".join(parts)
        return "[Missing information needed]"
    if re.search(r"\b(existing service|existing services|current service|current services|programs)\b", prompt_text):
        return existing_services or "[Missing information needed]"
    if re.search(r"\b(gap|gaps|unmet need|service gap|service gaps)\b", prompt_text):
        return service_gaps or "[Missing information needed]"
    if re.search(r"\b(indigenous communit|nation|first nation|inuit|metis)\b", prompt_text):
        return indigenous_communities or community_name or "[Missing information needed]"
    if re.search(r"\b(governance|leadership|decision-making|decision making)\b", prompt_text):
        return governance_context or "[Missing information needed]"
    if re.search(r"\b(duration|timeline|schedule|timeframe|milestone|milestones)\b", prompt_text) and timeline:
        return timeline
    if re.search(r"\b(funding requested|amount requested|requested funding|funding amount|request amount)\b", prompt_text) and requested_budget:
        return f"The requested funding amount is ${int(requested_budget):,}."
    if re.search(r"\b(total project cost|total cost)\b", prompt_text):
        if total_project_cost:
            return f"The total project cost is ${int(total_project_cost):,}."
        return "[Missing information needed]"
    if re.search(r"\b(executive summary|summary|overview)\b", prompt_text) and project_summary:
        return project_summary
    if re.search(r"\b(problem statement|statement of need|need statement)\b", prompt_text):
        return why_now or challenges or service_gaps or "[Missing information needed]"
    if re.search(r"\b(proposed solution|solution|approach)\b", prompt_text):
        parts = [value for value in [project_summary, project_activities] if value]
        return " ".join(parts) if parts else "[Missing information needed]"
    if re.search(r"\b(rate likelihood|likelihood)\b", prompt_text):
        return risk_likelihood or risks_and_mitigation or "[Missing information needed]"
    if re.search(r"\b(risk impact|impact of.*risk|financial impact|operational impact|financial.*impact)\b", prompt_text):
        return risk_impact or risks_and_mitigation or "[Missing information needed]"
    if re.search(r"\b(mitigation strategies|contingency plans|mitigation|contingency)\b", prompt_text):
        return mitigation_plan or risks_and_mitigation or budget_contingency or "[Missing information needed]"
    if re.search(r"\b(maintenance requirement|maintenance requirements|maintenance)\b", prompt_text):
        return maintenance_requirements or sustainability_plan or budget_training or budget_contingency or "[Missing information needed]"
    if re.search(r"\b(community ownership model|ownership model|community ownership)\b", prompt_text):
        return ownership_model or governance_context or data_governance or "[Missing information needed]"
    if (
        re.search(r"\b(project title|^title\b|\btitle\b)", prompt_text)
        and not re.search(r"\b(duration|funding|requested|cost|summary|problem|solution)\b", prompt_text)
        and project_title
    ):
        return project_title
    if re.search(r"\b(expected output|expected outputs|outputs|deliverables)\b", prompt_text):
        return expected_outputs or project_activities or "[Missing information needed]"
    if re.search(r"\b(implementation plan|workplan|work plan|implementation)\b", prompt_text):
        parts = [value for value in [project_activities, timeline, project_management_approach] if value]
        return " ".join(parts) if parts else "[Missing information needed]"
    if re.search(r"\b(project management|management methodology|management approach|methodology|oversight)\b", prompt_text):
        return project_management_approach or "[Missing information needed]"
    if (
        re.search(r"\b(staff|staffing|team|personnel|roles|responsible)\b", prompt_text)
        and not re.search(r"\bcost|costs|budget|breakdown\b", prompt_text)
        and staffing_plan
    ):
        return staffing_plan
    if re.search(r"\b(activity|activities|deliverable|deliverables|scope)\b", prompt_text) and project_activities:
        return project_activities
    if re.search(r"\b(scaling opportunities|scaling opportunity|scaling|replication|replicate)\b", prompt_text):
        return scaling_plan or "[Missing information needed]"
    if re.search(r"\b(future revenue sources|future revenue|future funding|revenue source|funding source)\b", prompt_text):
        return future_funding_sources or "[Missing information needed]"
    if re.search(r"\b(anticipated long-term outcomes|long-term outcomes|long term outcomes)\b", prompt_text):
        return expected_outcomes or sustainability_plan or "[Missing information needed]"
    if re.search(r"\b(benefits will continue|continue after funding|after funding ends)\b", prompt_text):
        return sustainability_plan or expected_outcomes or "[Missing information needed]"
    if re.search(r"\b(anticipated outcome|outcome|outcomes|impact|impacts|result|results|benefit|benefits)\b", prompt_text):
        return expected_outcomes or sustainability_plan or "[Missing information needed]"
    if re.search(r"\b(objective|objectives)\b", prompt_text):
        parts = [value for value in [project_objectives, local_priority] if value]
        return " ".join(parts) if parts else "[Missing information needed]"
    if re.search(r"\b(success measurement|measure success|success will be measured|success.*measur|measurement|monitor|evaluation)\b", prompt_text):
        return success_measurement or baseline_data_collection or "[Missing information needed]"
    if re.search(r"\b(baseline data collection|baseline collection)\b", prompt_text):
        return baseline_data_collection or baseline_conditions or "[Missing information needed]"
    if re.search(r"\b(baseline condition|baseline data|baseline)\b", prompt_text):
        return baseline_conditions or baseline_data_collection or "[Missing information needed]"
    if re.search(r"\b(quantitative|list quantitative|number|count|target|indicator)\b", prompt_text):
        return quantitative_indicators or "[Missing information needed]"
    if re.search(r"\b(qualitative|performance indicators|feedback|perception|confidence|indicator)\b", prompt_text):
        return qualitative_indicators or "[Missing information needed]"
    if re.search(r"\b(direct benefic\w*|directly benefit|estimate direct)\b", prompt_text):
        return direct_beneficiaries or target_beneficiaries or "[Missing information needed]"
    if re.search(r"\b(indirect benefic\w*|indirectly benefit)\b", prompt_text):
        return indirect_beneficiaries or "[Missing information needed]"
    if re.search(r"\b(beneficiary|beneficiaries|target group|target population|who benefits)\b", prompt_text) and target_beneficiaries:
        return target_beneficiaries
    if re.search(r"\b(operational)\b", prompt_text):
        details = [value for value in [risks_and_mitigation, remoteness_context, staffing_plan] if value]
        return " ".join(details) if details else "[Missing information needed]"
    if re.search(r"\b(stakeholder)\b", prompt_text):
        details = [value for value in [partners, community_engagement, governance_context] if value]
        return " ".join(details) if details else "[Missing information needed]"
    if re.search(r"\b(regulatory|permit|permitting|approval)\b", prompt_text):
        return approvals_status or risks_and_mitigation or "[Missing information needed]"
    if re.search(r"\b(environmental risks?|environmental)\b", prompt_text):
        return risks_and_mitigation or "[Missing information needed]"
    if re.search(r"\b(financial)\b", prompt_text):
        details = [value for value in [budget_assumptions, budget_contingency, other_funding] if value]
        return " ".join(details) if details else risks_and_mitigation or "[Missing information needed]"
    if re.search(r"\b(other budgetary items|other budget items|other budget|additional budget|remaining budget)\b", prompt_text):
        parts = [
            value
            for value in [
                budget_equipment_materials,
                budget_travel_logistics,
                budget_training,
                budget_evaluation,
                budget_admin,
                budget_contingency,
                budget_breakdown,
            ]
            if value
        ]
        return " ".join(parts) if parts else "[Missing information needed]"
    if re.search(r"\b(personnel cost|personnel costs|staff cost|staffing cost)\b", prompt_text):
        if re.search(r"\bprofessional services\b", prompt_text):
            parts = [value for value in [budget_personnel, budget_professional_services] if value]
            return " ".join(parts) if parts else staffing_plan or "[Missing information needed]"
        return budget_personnel or staffing_plan or "[Missing information needed]"
    if re.search(r"\b(professional services|consultant|engineering|technical advisor)\b", prompt_text):
        return budget_professional_services or "[Missing information needed]"
    if re.search(r"\b(equipment|materials|supplies)\b", prompt_text):
        return budget_equipment_materials or "[Missing information needed]"
    if re.search(r"\b(travel|shipping|freight|logistics)\b", prompt_text):
        return budget_travel_logistics or remoteness_context or "[Missing information needed]"
    if re.search(r"\b(training|capacity building)\b", prompt_text):
        return budget_training or "[Missing information needed]"
    if re.search(r"\b(evaluation|reporting|monitoring)\b", prompt_text):
        return budget_evaluation or success_measurement or "[Missing information needed]"
    if re.search(r"\b(admin|administration|overhead)\b", prompt_text):
        return budget_admin or "[Missing information needed]"
    if re.search(r"\b(contingency|contingencies)\b", prompt_text):
        return budget_contingency or "[Missing information needed]"
    if re.search(r"\b(supporting data|evidence|indicator|metric|baseline|outcome data)\b", prompt_text):
        if evidence_note:
            return evidence_note
        if supporting_documents_text:
            return supporting_documents_text[:1200]
        if indicators_before or indicators_after:
            return "The proposal includes indicator data that should be summarized here with confirmed baseline and target values."
        return "[Missing information needed]"
    if re.search(r"\b(priority|priorities|need|problem)\b", prompt_text):
        basis = local_priority or why_now or challenges
        if basis:
            return f"The proposal priority is {basis}."
        return "[Missing information needed]"
    if re.search(r"\b(challenge|challenges|barrier|barriers|issue|issues|problem|problems)\b", prompt_text):
        if challenges:
            return challenges
        return "[Missing information needed]"
    if re.search(r"\b(description|what will the project do)\b", prompt_text) and project_summary:
        return project_summary
    if re.search(r"\b(type|sector|category|focus area)\b", prompt_text) and project_type:
        return project_type
    if re.search(r"\b(stage|readiness|ready|status)\b", prompt_text) and project_stage:
        return project_stage
    if re.search(r"\b(activity|activities|deliverable|deliverables|workplan|work plan|scope)\b", prompt_text) and project_activities:
        return project_activities
    if re.search(r"\b(outcome|outcomes|impact|impacts|result|results|benefit|benefits)\b", prompt_text) and expected_outcomes:
        return expected_outcomes
    if re.search(r"\b(elder|elders)\b", prompt_text):
        return elders_involvement or "[Missing information needed]"
    if re.search(r"\b(knowledge keeper|knowledge keepers|traditional knowledge)\b", prompt_text):
        return knowledge_keepers_involvement or "[Missing information needed]"
    if re.search(r"\b(youth|young people)\b", prompt_text):
        return youth_involvement or "[Missing information needed]"
    if re.search(r"\b(ocap|data governance|ownership|control|access|possession)\b", prompt_text):
        return data_governance or "[Missing information needed]"
    if re.search(r"\b(cultural safety|protocol|privacy|trauma-informed|language access)\b", prompt_text):
        return cultural_safety or "[Missing information needed]"
    if re.search(r"\b(ongoing participation|ongoing engagement|continued participation|participation)\b", prompt_text) and community_engagement:
        return community_engagement
    if re.search(r"\b(truth and reconciliation|truth|reconciliation|trc|calls to action)\b", prompt_text):
        details = [value for value in [community_engagement, elders_involvement, knowledge_keepers_involvement, youth_involvement, cultural_safety] if value]
        return " ".join(details) if details else "[Missing information needed]"
    if re.search(r"\b(engagement|consultation|support|community input|co-design|approval)\b", prompt_text) and community_engagement:
        details = [community_engagement]
        if community_support_status:
            details.append(f"Support status: {community_support_status}.")
        if approvals_status:
            details.append(f"Approvals/supporting documents: {approvals_status.rstrip('.')}.")
        return " ".join(details)
    if re.search(r"\b(strength|asset|capacity|readiness)\b", prompt_text) and strengths:
        return strengths
    if re.search(r"\b(partner|collaborat|stakeholder)\b", prompt_text) and partners:
        return partners
    if re.search(r"\b(timeline|schedule|timeframe|milestone)\b", prompt_text) and timeline:
        return timeline
    if re.search(r"\b(budget|funding|amount|cost)\b", prompt_text) and requested_budget:
        details = []
        details.append(f"The requested funding amount is ${int(requested_budget):,}.")
        if total_project_cost:
            details.append(f"The total project cost is ${int(total_project_cost):,}.")
        if budget_breakdown:
            details.append(f"Major cost categories include: {budget_breakdown}")
        if budget_assumptions:
            details.append(f"Budget assumptions: {budget_assumptions}")
        if other_funding:
            details.append(f"Other funding or in-kind support includes: {other_funding}")
        if other_funding_status:
            details.append(f"Funding status: {other_funding_status}.")
        return " ".join(details)
    if re.search(r"\b(risk|risks|mitigation|delay|delays)\b", prompt_text) and risks_and_mitigation:
        return risks_and_mitigation
    if re.search(r"\b(sustainability|sustain|maintain|maintenance|after funding|long-term)\b", prompt_text) and sustainability_plan:
        return sustainability_plan
    if re.search(r"\b(project|initiative|proposal)\b", prompt_text) and project_summary:
        return project_summary
    if re.search(r"\b(funding|cost)\b", prompt_text) and requested_budget:
        return f"The requested funding amount is ${int(requested_budget):,}."
    if re.search(r"\b(community|communities|applicant)\b", prompt_text) and community_name:
        answer = f"{community_name} is the named community/applicant context provided for this proposal."
        if region:
            answer += f" The community is located in {region}."
        return answer

    return "[Missing information needed]"


def _normalize_generated_answer(answer: str) -> str:
    normalized = re.sub(r"\s+", " ", (answer or "").strip().lower())
    normalized = re.sub(r"[^\w\s$.-]", "", normalized)
    return normalized


def _is_missing_answer(answer: str) -> bool:
    value = (answer or "").strip()
    return (
        not value
        or "[No answer generated]" in value
        or "[Missing information needed]" in value
    )


def _is_generic_answer_for_specific_prompt(prompt_item: Dict[str, Any], answer: str) -> bool:
    if _is_missing_answer(answer):
        return False

    prompt_text = str(prompt_item.get("prompt_text") or "").lower()
    answer_text = answer.lower()
    asks_for_specific_field = bool(
        re.search(
            r"\b(cra|registration number|charitable number|business number|incorporation number|"
            r"organization type|applicant type|legal status|classification|classifications|"
            r"demographic|demographics|population|supporting data|evidence|indicator|metric|"
            r"baseline|outcome data|priority|priorities|challenge|challenges|barrier|barriers)\b",
            prompt_text,
        )
    )
    looks_like_generic_profile = bool(
        re.search(r"\bnamed community/applicant context\b|\bis located in\b", answer_text)
    )
    return asks_for_specific_field and looks_like_generic_profile


def _profile_number_tokens(profile: Dict[str, Any]) -> set[str]:
    profile_text = json.dumps(profile or {}, ensure_ascii=False)
    return {token.replace(",", "").replace("%", "") for token in re.findall(r"\b\d[\d,]*(?:\.\d+)?%?\b", profile_text)}


def _has_unsupported_numeric_claim(answer: str, profile: Dict[str, Any]) -> bool:
    answer_tokens = {
        token.replace(",", "").replace("%", "")
        for token in re.findall(r"\b\d[\d,]*(?:\.\d+)?%?\b", answer or "")
    }
    if not answer_tokens:
        return False
    profile_tokens = _profile_number_tokens(profile)
    return any(token not in profile_tokens for token in answer_tokens)


def _lacks_required_source_field(prompt_item: Dict[str, Any], answer: str, profile: Dict[str, Any]) -> bool:
    if _is_missing_answer(answer):
        return False
    prompt_text = str(prompt_item.get("prompt_text") or "").lower()
    source_rules = [
        (r"\b(elder|elders)\b", "elders_involvement"),
        (r"\b(knowledge keeper|knowledge keepers|traditional knowledge)\b", "knowledge_keepers_involvement"),
        (r"\b(youth|young people)\b", "youth_involvement"),
        (r"\b(community ownership model|ownership model|community ownership)\b", "ownership_model"),
        (r"\b(ocap|data governance|control|access|possession)\b", "data_governance"),
        (r"\b(cultural safety|protocol|privacy|trauma-informed|language access)\b", "cultural_safety"),
        (r"\b(future revenue|future funding|revenue source|funding source)\b", "future_funding_sources"),
        (r"\b(scale|scaling|replicate|replication)\b", "scaling_plan"),
        (r"\b(maintenance requirement|maintenance requirements|maintenance)\b", "maintenance_requirements"),
        (r"\b(total project cost|total cost)\b", "total_project_cost"),
        (r"\b(direct beneficiar|estimate direct)\b", "direct_beneficiaries"),
        (r"\b(indirect beneficiar)\b", "indirect_beneficiaries"),
    ]
    for pattern, field_name in source_rules:
        if not re.search(pattern, prompt_text):
            continue
        raw_value = _profile_text(profile, field_name).lower()
        answer_lower = (answer or "").lower()
        if raw_value in {"n/a", "na", "not applicable"} and not re.search(r"\bn/?a\b|not applicable", answer_lower):
            return True
        if not _usable_profile_text(profile, field_name):
            return True
    return False


def _answer_fails_safety(prompt_item: Dict[str, Any], answer: str, profile: Dict[str, Any]) -> bool:
    return (
        _is_generic_answer_for_specific_prompt(prompt_item, answer)
        or _has_unsupported_numeric_claim(answer, profile)
        or _lacks_required_source_field(prompt_item, answer, profile)
    )


def _render_prompt_answer_blocks(
    section: Dict[str, Any],
    answers: List[Dict[str, Any]],
    profile: Dict[str, Any],
    requirements: Dict[str, Any] | None = None,
) -> str:
    section_key = str(section.get("key") or "")
    requirements_by_key = {
        str(req_section.get("key") or ""): req_section
        for req_section in (requirements or {}).get("sections", []) or []
    }
    prompt_items = (
        section.get("prompt_items")
        or requirements_by_key.get(section_key, {}).get("prompt_items", [])
        or []
    )
    prompt_items = [
        item
        for item in prompt_items
        if str(item.get("prompt_id") or "").strip()
        and str(item.get("prompt_text") or "").strip()
    ]
    if not prompt_items:
        return ""

    answers_by_id = {
        str(item.get("prompt_id") or "").strip(): str(item.get("answer") or "").strip()
        for item in answers or []
        if str(item.get("prompt_id") or "").strip()
    }

    seen_answers: Dict[str, str] = {}
    blocks: List[str] = []
    for prompt_item in prompt_items:
        prompt_id = str(prompt_item.get("prompt_id") or "").strip()
        prompt_text = str(prompt_item.get("prompt_text") or "").strip()
        answer = _strip_prompt_metadata_lines(answers_by_id.get(prompt_id, ""))

        if _is_missing_answer(answer):
            answer = _prompt_answer_from_context(prompt_item, profile)

        normalized = _normalize_generated_answer(answer)
        previous_prompt_id = seen_answers.get(normalized)
        if (
            normalized
            and previous_prompt_id
            and previous_prompt_id != prompt_id
            and not str(prompt_item.get("response_value") or "").strip()
        ):
            answer = "[Missing information needed]"
            normalized = _normalize_generated_answer(answer)

        if _answer_fails_safety(prompt_item, answer, profile):
            fallback_answer = _prompt_answer_from_context(prompt_item, profile)
            answer = (
                fallback_answer
                if not _is_missing_answer(fallback_answer)
                and not _answer_fails_safety(prompt_item, fallback_answer, profile)
                else "[Missing information needed]"
            )
            normalized = _normalize_generated_answer(answer)

        if normalized and not _is_missing_answer(answer):
            seen_answers[normalized] = prompt_id

        blocks.append(f"{prompt_id}: {prompt_text}\n{answer}")

    return _strip_prompt_metadata_lines("\n\n".join(blocks))


def _answer_from_prompt_block(block: str) -> str:
    return "\n".join((block or "").splitlines()[1:]).strip()


def _ensure_prompt_structured_sections(
    sections: List[Dict[str, Any]],
    enhanced: Dict[str, str],
    profile: Dict[str, Any] | None = None,
    requirements: Dict[str, Any] | None = None,
) -> Dict[str, str]:
    requirements_by_key = {
        str(section.get("key") or ""): section
        for section in (requirements or {}).get("sections", []) or []
    }
    out = dict(enhanced or {})
    for section in sections or []:
        section_key = str(section.get("key") or "")
        prompt_items = (
            section.get("prompt_items")
            or requirements_by_key.get(section_key, {}).get("prompt_items", [])
            or []
        )
        prompt_items = [
            item
            for item in prompt_items
            if str(item.get("prompt_id") or "").strip()
            and str(item.get("prompt_text") or "").strip()
        ]
        if not section_key or not prompt_items:
            continue

        current_text = _strip_prompt_metadata_lines(str(out.get(section_key) or section.get("body") or ""))
        blocks: List[str] = []
        seen_answers: Dict[str, str] = {}
        for item in prompt_items:
            prompt_id = str(item.get("prompt_id") or "").strip()
            prompt_text = str(item.get("prompt_text") or "").strip()
            existing = _prompt_block_pattern(prompt_id).search(current_text)
            if existing:
                block = _strip_prompt_metadata_lines(existing.group(0).strip())
                answer = _answer_from_prompt_block(block)
            else:
                answer = _prompt_answer_from_context(item, profile or {})

            normalized = _normalize_generated_answer(answer)
            previous_prompt_id = seen_answers.get(normalized)
            if (
                normalized
                and previous_prompt_id
                and previous_prompt_id != prompt_id
                and not str(item.get("response_value") or "").strip()
            ):
                answer = "[Missing information needed]"
                normalized = _normalize_generated_answer(answer)

            if _answer_fails_safety(item, answer, profile or {}):
                fallback_answer = _prompt_answer_from_context(item, profile or {})
                answer = (
                    fallback_answer
                    if not _is_missing_answer(fallback_answer)
                    and not _answer_fails_safety(item, fallback_answer, profile or {})
                    else "[Missing information needed]"
                )
                normalized = _normalize_generated_answer(answer)

            if normalized and not _is_missing_answer(answer):
                seen_answers[normalized] = prompt_id

            blocks.append(f"{prompt_id}: {prompt_text}\n{answer}")
        out[section_key] = _strip_prompt_metadata_lines("\n\n".join(blocks).strip())
    return out


def _build_prompt_coverage_map(
    sections: List[Dict[str, Any]],
    enhanced: Dict[str, str],
    requirements: Dict[str, Any] | None = None,
) -> Dict[str, Dict[str, Any]]:
    requirements_by_key = {
        str(section.get("key") or ""): section
        for section in (requirements or {}).get("sections", []) or []
    }
    coverage: Dict[str, Dict[str, Any]] = {}
    for section in sections or []:
        section_key = str(section.get("key") or "")
        prompt_items = (
            section.get("prompt_items")
            or requirements_by_key.get(section_key, {}).get("prompt_items", [])
            or []
        )
        if not prompt_items:
            continue
        section_text = enhanced.get(section_key) or str(section.get("body") or "")
        coverage[section_key] = {
            "section_key": section_key,
            "section_title": str(section.get("title") or ""),
            "prompts": [
                {
                    "prompt_id": str(item.get("prompt_id") or ""),
                    "prompt_text": str(item.get("prompt_text") or ""),
                    "response_style": str(item.get("response_style") or ""),
                    **_prompt_answer_state(item, section_text),
                    "answered": _prompt_answered_in_text(item, section_text),
                    "options": item.get("options") or [],
                    "response_value": item.get("response_value"),
                    "conditional_on_previous": item.get("conditional_on_previous"),
                    "parent_prompt_id": item.get("parent_prompt_id"),
                }
                for item in prompt_items
                if str(item.get("prompt_id") or "").strip() and str(item.get("prompt_text") or "").strip()
            ],
        }
    return coverage


def enhance_sections_with_metadata(
    draft: Dict[str, Any],
    requirements: Dict[str, Any] | None = None,
    profile: Dict[str, Any] | None = None,
    *,
    use_rag: bool = True,
    rag_top_k: int = 6,
    rag_persist_dir: Optional[str] = None,
    rag_collection_name: str = "grant_library",
    use_case: Optional[str] = None,
) -> Dict[str, Any]:
    sections = draft.get("sections", []) or []
    try:
        enhanced = enhance_sections(
            draft=draft,
            requirements=requirements,
            profile=profile,
            use_rag=use_rag,
            rag_top_k=rag_top_k,
            rag_persist_dir=rag_persist_dir,
            rag_collection_name=rag_collection_name,
            use_case=use_case,
        )
    except Exception as exc:
        logger.warning(
            "Section enhancement failed; returning baseline draft with prompt coverage: %s",
            type(exc).__name__,
        )
        enhanced = {
            str(section.get("key") or ""): str(section.get("body") or "")
            for section in sections
            if str(section.get("key") or "")
        }
    enhanced = _ensure_prompt_structured_sections(
        sections=sections,
        enhanced=enhanced,
        profile=profile or {},
        requirements=requirements,
    )
    return {
        "enhanced": enhanced,
        "prompt_coverage": _build_prompt_coverage_map(
            sections=sections,
            enhanced=enhanced,
            requirements=requirements,
        ),
    }


def _retrieve_rag_references(
    query: str,
    top_k: int = 5,
    persist_dir: Optional[str] = None,
    collection_name: str = "grant_library",
    where: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """Return structured RAG references for UI side panels."""
    try:
        from backend.app.rag.retrieve import embed_query
        from backend.app.rag.store import get_collection
    except Exception:
        return []

    q = (query or "").strip()
    if not q:
        return []

    try:
        col = get_collection(persist_dir=persist_dir, collection_name=collection_name)
        q_emb = embed_query(q)
        res = col.query(
            query_embeddings=[q_emb],
            n_results=top_k,
            include=["documents", "metadatas", "distances"],
            where=where,
        )
    except Exception:
        return []

    docs = (res.get("documents") or [[]])[0]
    metas = (res.get("metadatas") or [[]])[0]
    dists = (res.get("distances") or [[]])[0]

    refs: List[Dict[str, Any]] = []
    for idx, (doc, meta, dist) in enumerate(zip(docs, metas, dists), start=1):
        m = meta or {}
        refs.append(
            {
                "rank": idx,
                "source": m.get("source", "unknown"),
                "chunk_index": m.get("chunk_index"),
                "distance": dist,
                "snippet": (doc or "").strip()[:500],
            }
        )
    return refs


def enhance_sections(
    draft: Dict[str, Any],
    requirements: Dict[str, Any] | None = None,
    profile: Dict[str, Any] | None = None,
    *,
    use_rag: bool = True,
    rag_top_k: int = 6,
    rag_persist_dir: Optional[str] = None,
    rag_collection_name: str = "grant_library",
    use_case: Optional[str] = None,
) -> Dict[str, str]:
    """
    Returns dict mapping section_key -> improved body text
    ex: {"need_statement": "...", "budget_justification": "..."}
    When use_rag is True, retrieves relevant grant-library excerpts and injects them into the prompt.
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        # fail gracefully (app still works)
        return {}
    if not _openai_sdk_available():
        logger.warning("OpenAI SDK not installed; skipping section enhancement")
        return {}

    requirements = requirements or {}
    profile = profile or {}

    sections = draft.get("sections", []) or []
    if not sections:
        return {}

    payload = _build_payload(draft=draft, requirements=requirements, profile=profile)
    use_case_norm = normalize_use_case(use_case)
    rag_collection = collection_for_use_case(use_case_norm, base_collection=rag_collection_name)
    payload["rag_use_case"] = use_case_norm

    # RAG: retrieve relevant grant-library context and add to payload when available
    if use_rag:
        grant_name = (
            requirements.get("grant_name")
            or requirements.get("program_name")
            or requirements.get("name")
            or ""
        )
        raw_req = (requirements.get("raw_text") or "")[:2000]
        rag_query = f"{grant_name}\n\n{raw_req}".strip() or "grant application community economic development"
        rag_context = _get_rag_context(
            query=rag_query,
            top_k=rag_top_k,
            persist_dir=rag_persist_dir,
            collection_name=rag_collection,
        )
        if rag_context:
            payload["grant_library_excerpts"] = rag_context
            payload["instructions"].append(
                "Use the attached grant_library_excerpts when relevant to strengthen your writing with "
                "evidence, phrasing, or structure from successful grant materials. Do not copy verbatim; "
                "adapt to the current application. Cite or echo themes where they align with the requirements."
            )

    system_msg = (
        """You are a senior Canadian grant writer with 10+ years of experience writing successful federal, provincial, and Indigenous community infrastructure and CED grant applications.
        You write in clear, professional, funder-facing language. Your output should be ready for submission with minimal editing. Write with concrete implementation detail.
        Follow the grant posting requirements and do not invent facts.
        When the user payload includes grant_library_excerpts, use them as reference material to inform phrasing and structure where relevant; do not copy verbatim."""
    )
    user_msg = json.dumps(payload, ensure_ascii=False)

    # --- Prefer OpenAI Python SDK v1+ ---
    try:
        from openai import OpenAI  # v1+
        client = OpenAI(api_key=api_key)

        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )

        content = resp.choices[0].message.content or "{}"
        data = json.loads(content)

    except Exception as e_v1:
        # --- Fallback for legacy openai<1.0 ---
        try:
            import openai  # legacy
            openai.api_key = api_key

            r = openai.ChatCompletion.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.3,
            )
            content = r["choices"][0]["message"]["content"] or "{}"
            data = json.loads(content)

        except Exception as e_legacy:
            # IMPORTANT: don't silently swallow both failures
            raise RuntimeError(
                "LLM call failed in both OpenAI SDK v1+ and legacy modes."
                f"\n\nv1+ error: {repr(e_v1)}"
                f"\nlegacy error: {repr(e_legacy)}"
            )

    sections_by_key = {
        str(section.get("key") or ""): section
        for section in sections
        if str(section.get("key") or "")
    }
    requirements_by_key = {
        str(section.get("key") or ""): section
        for section in (requirements or {}).get("sections", []) or []
        if str(section.get("key") or "")
    }
    out: Dict[str, str] = {}
    for item in (data.get("sections", []) or []):
        key = str(item.get("key") or "").strip()
        if not key:
            continue
        section = sections_by_key.get(key) or requirements_by_key.get(key) or {"key": key}
        prompt_items = (
            section.get("prompt_items")
            or requirements_by_key.get(key, {}).get("prompt_items", [])
            or []
        )
        if prompt_items and isinstance(item.get("answers"), list):
            rendered = _render_prompt_answer_blocks(
                section=section,
                answers=item.get("answers") or [],
                profile=profile,
                requirements=requirements,
            )
            if rendered:
                out[key] = rendered
                continue
        text = item.get("text")
        if text:
            out[key] = str(text)

    return out


def rewrite_section_with_instruction(
    *,
    section_key: str,
    section_title: str,
    current_text: str,
    instruction: str,
    requirements: Optional[Dict[str, Any]] = None,
    profile: Optional[Dict[str, Any]] = None,
    use_rag: bool = True,
    rag_top_k: int = 5,
    rag_persist_dir: Optional[str] = None,
    rag_collection_name: str = "grant_library",
    use_case: Optional[str] = None,
) -> Dict[str, Any]:
    """Rewrite a single section using user instruction; returns text + structured references."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"text": (current_text or "").strip(), "references": []}
    if not _openai_sdk_available():
        logger.warning("OpenAI SDK not installed; skipping section rewrite")
        return {"text": (current_text or "").strip(), "references": []}

    requirements = requirements or {}
    profile = profile or {}

    use_case_norm = normalize_use_case(use_case)
    rag_collection = collection_for_use_case(use_case_norm, base_collection=rag_collection_name)

    grant_name = (
        requirements.get("grant_name")
        or requirements.get("program_name")
        or requirements.get("name")
        or ""
    )
    rag_query = "\n\n".join(
        [
            grant_name,
            section_title or section_key,
            instruction or "",
            (current_text or "")[:1200],
            (requirements.get("raw_text") or "")[:1200],
        ]
    ).strip()

    references: List[Dict[str, Any]] = []
    excerpts = ""
    if use_rag:
        references = _retrieve_rag_references(
            query=rag_query,
            top_k=rag_top_k,
            persist_dir=rag_persist_dir,
            collection_name=rag_collection,
        )
        excerpt_blocks = []
        for ref in references:
            source = ref.get("source", "unknown")
            chunk_index = ref.get("chunk_index", "—")
            snippet = ref.get("snippet", "")
            excerpt_blocks.append(
                f"Source: {source} (chunk {chunk_index})\n{snippet}"
            )
        excerpts = "\n\n---\n\n".join(excerpt_blocks)

    payload = {
        "grant_name": grant_name,
        "section": {
            "key": section_key,
            "title": section_title,
            "current_text": current_text or "",
        },
        "instruction": (instruction or "").strip(),
        "community_profile": profile,
        "requirements_text_snippet": (requirements.get("raw_text") or "")[:3000],
        "rag_use_case": use_case_norm,
        "grant_library_excerpts": excerpts,
    }

    system_msg = (
        "You are a senior Canadian grant writer. Rewrite one section only. "
        "Follow user instruction exactly, keep factual integrity, and do not invent facts. "
        "If the current section is formatted as prompt_id: prompt_text answer blocks, preserve that structure. "
        "If source excerpts are provided, use them only as reference guidance and do not copy verbatim. "
        "Return JSON only: {\"text\":\"<rewritten section>\"}."
    )
    user_msg = json.dumps(payload, ensure_ascii=False)

    try:
        from openai import OpenAI

        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        content = resp.choices[0].message.content or "{}"
        data = json.loads(content)
    except Exception as e_v1:
        try:
            import openai

            openai.api_key = api_key
            r = openai.ChatCompletion.create(
                model=CHAT_MODEL,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.2,
            )
            content = r["choices"][0]["message"]["content"] or "{}"
            data = json.loads(content)
        except Exception as e_legacy:
            raise RuntimeError(
                "Section rewrite failed in both OpenAI SDK modes."
                f"\n\nv1+ error: {repr(e_v1)}"
                f"\nlegacy error: {repr(e_legacy)}"
            )

    text = str(data.get("text") or "").strip() or (current_text or "").strip()
    return {"text": text, "references": references}
