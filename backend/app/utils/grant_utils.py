from typing import Dict, Any, List

def fit_programs(local_priority: str, programs: list[dict]) -> list[dict]:
    # keep your existing logic
    # (not rewriting here since you already have it working)
    scored = []
    pr = (local_priority or "").lower()
    for p in programs:
        focus = [str(x).lower() for x in p.get("focus", [])]
        score = 1 if any(pr in f or f in pr for f in focus) else 0
        if score:
            scored.append(p)
    return scored

def generate_proposal_from_requirements(profile: Dict[str, Any], requirements: Dict[str, Any], requested_budget: int) -> Dict[str, Any]:
    """
    Generates a draft that follows the uploaded requirements section list.
    This is the key shift away from a generic template.
    """
    sections_out: List[Dict[str, Any]] = []

    for sec in requirements.get("sections", []):
        key = sec.get("key", "section")
        title = sec.get("title", "Section")
        guidance = sec.get("guidance", "")
        prompt_items = sec.get("prompt_items", []) or []

        body = _baseline_section_writer(
            title=title,
            guidance=guidance,
            prompt_items=prompt_items,
            profile=profile,
            requested_budget=requested_budget,
        )

        sections_out.append({
            "key": key,
            "title": title,
            "body": body,
            "guidance": guidance,
            "prompt_items": prompt_items,
        })

    return {
        "meta": {
            "community_name": profile.get("community_name"),
            "local_priority": profile.get("local_priority"),
            "requested_budget": requested_budget,
            "grant_name": requirements.get("grant_name", ""),
        },
        "sections": sections_out
    }

def _baseline_section_writer(
    title: str,
    guidance: str,
    prompt_items: List[Dict[str, Any]],
    profile: Dict[str, Any],
    requested_budget: int,
) -> str:
    """
    Non-LLM baseline text. The LLM can polish later.
    """
    c = profile.get("community_name", "")
    region = profile.get("region", "")
    priority = profile.get("local_priority", "")
    challenges = profile.get("challenges", "")
    strengths = profile.get("strengths", "")
    partners = profile.get("partners", "")
    applicant_type = profile.get("applicant_type", "")
    project_type = profile.get("project_type", "")
    project_stage = profile.get("project_stage", "")
    community_support_status = profile.get("community_support_status", "")
    other_funding_status = profile.get("other_funding_status", "")
    timeline = profile.get("timeline", "")
    project_summary = profile.get("project_summary", "")
    target_beneficiaries = profile.get("target_beneficiaries", "")
    project_activities = profile.get("project_activities", "")
    expected_outcomes = profile.get("expected_outcomes", "")
    community_engagement = profile.get("community_engagement", "")
    evidence_note = profile.get("evidence_note", "")
    budget_breakdown = profile.get("budget_breakdown", "")
    other_funding = profile.get("other_funding", "")
    risks_and_mitigation = profile.get("risks_and_mitigation", "")
    sustainability_plan = profile.get("sustainability_plan", "")
    supporting_documents_text = profile.get("supporting_documents_text", "")

    base = []

    # Always anchor to community + priority
    base.append(f"{c} ({region}) is seeking ${requested_budget:,} to address {priority}.")

    # Add detail when available
    context_fields = [
        ("Legal applicant name", "legal_name"),
        ("Operating name", "operating_name"),
        ("Applicant type", "applicant_type"),
        ("Applicant profile / mandate", "applicant_profile"),
        ("Registration number", "registration_number"),
        ("Year established", "year_established"),
        ("Primary contact", "contact_name"),
        ("Contact title", "contact_title"),
        ("Contact email", "contact_email"),
        ("Contact phone", "contact_phone"),
        ("Mailing address", "mailing_address"),
        ("Website", "website"),
        ("Indigenous communities", "indigenous_communities"),
        ("Population/service population", "population_served"),
        ("Demographic context", "demographic_context"),
        ("Existing services", "existing_services"),
        ("Service gaps", "service_gaps"),
        ("Remoteness/logistics context", "remoteness_context"),
        ("Governance context", "governance_context"),
        ("Project title", "project_title"),
        ("Project type", "project_type"),
        ("Project stage/readiness", "project_stage"),
        ("Project location", "project_location"),
        ("Project summary", "project_summary"),
        ("Project objectives", "project_objectives"),
        ("Activities and deliverables", "project_activities"),
        ("Expected outputs / deliverables", "expected_outputs"),
        ("Staffing/team roles", "staffing_plan"),
        ("Project management approach", "project_management_approach"),
        ("Target beneficiaries", "target_beneficiaries"),
        ("Direct beneficiaries", "direct_beneficiaries"),
        ("Indirect beneficiaries", "indirect_beneficiaries"),
        ("Expected outcomes", "expected_outcomes"),
        ("Quantitative indicators", "quantitative_indicators"),
        ("Qualitative indicators", "qualitative_indicators"),
        ("Baseline conditions", "baseline_conditions"),
        ("Baseline data collection", "baseline_data_collection"),
        ("Success measurement", "success_measurement"),
        ("Community support status", "community_support_status"),
        ("Community engagement/support", "community_engagement"),
        ("Approvals/supporting documents status", "approvals_status"),
        ("Elders involvement", "elders_involvement"),
        ("Knowledge Keepers involvement", "knowledge_keepers_involvement"),
        ("Youth involvement", "youth_involvement"),
        ("Data governance / OCAP", "data_governance"),
        ("Cultural safety", "cultural_safety"),
        ("Local context", "challenges"),
        ("Community strengths/assets", "strengths"),
        ("Partners and roles", "partners"),
        ("Timeline", "timeline"),
        ("Evidence/supporting data", "evidence_note"),
        ("Why now", "why_now"),
        ("Total project cost", "total_project_cost"),
        ("Personnel budget", "budget_personnel"),
        ("Professional services budget", "budget_professional_services"),
        ("Equipment/materials budget", "budget_equipment_materials"),
        ("Travel/logistics budget", "budget_travel_logistics"),
        ("Training budget", "budget_training"),
        ("Evaluation/reporting budget", "budget_evaluation"),
        ("Administration/overhead budget", "budget_admin"),
        ("Contingency budget", "budget_contingency"),
        ("Budget breakdown", "budget_breakdown"),
        ("Budget assumptions", "budget_assumptions"),
        ("Other funding status", "other_funding_status"),
        ("Other funding/in-kind support", "other_funding"),
        ("Risks and mitigation", "risks_and_mitigation"),
        ("Risk likelihood", "risk_likelihood"),
        ("Risk impact", "risk_impact"),
        ("Mitigation and contingency plan", "mitigation_plan"),
        ("Sustainability after funding", "sustainability_plan"),
        ("Maintenance requirements", "maintenance_requirements"),
        ("Community ownership / operations model", "ownership_model"),
        ("Future funding/revenue sources", "future_funding_sources"),
        ("Scaling or replication plan", "scaling_plan"),
    ]
    for label, field_name in context_fields:
        value = profile.get(field_name)
        if value is not None and str(value).strip():
            base.append(f"{label}: {value}")
    if supporting_documents_text:
        base.append(f"Supporting document context: {supporting_documents_text[:4000]}")

    # Use any extracted guidance as “what the funder is asking for”
    if guidance:
        base.append("")
        base.append("Application guidance (what this section should cover):")
        base.append(guidance)

    if prompt_items:
        base.append("")
        base.append("Application prompts to answer in this section:")
        for item in prompt_items:
            prompt_id = str(item.get("prompt_id") or f"prompt_{len(base)}").strip()
            prompt_text = str(item.get("prompt_text") or "").strip()
            if not prompt_text:
                continue
            heading = f"{prompt_id}: {prompt_text}"
            word_limit = item.get("word_limit")
            if isinstance(word_limit, int) and word_limit > 0:
                heading += f" ({word_limit} words)"
            base.append(heading)
            base.append("[Missing information needed]")

    return "\n\n".join(base).strip()
