"""Seed the local workspace with Chesterfield Inlet (Igluligaarjuk) records.

Facts are taken from the community CED plans in ``ced_plans copy/``:
the 2013 Hamlet CED plan and the 2023 CED plan brochure.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone

from backend.app.workspace_store import (
    create_feedback_report,
    create_proposal,
    upsert_community_profile,
)

USER_ID = "dev-user"

PROPOSAL_IDS = [
    "ci-edu-learning-centre",
    "ci-wellness-recreation",
    "ci-culture-heritage",
    "ci-tourism",
    "ci-local-business",
    "ci-environment-fishing",
]
REPORT_ID = "ci-edu-readiness"


def section(key: str, title: str, body: str) -> dict:
    return {"key": key, "title": title, "body": body.strip(), "guidance": ""}


def requirements(grant_name: str, items: list[tuple[str, str, str]]) -> dict:
    return {
        "grant_name": grant_name,
        "sections": [
            {"key": key, "title": title, "guidance": guidance}
            for key, title, guidance in items
        ],
    }


PROFILE = {
    "community_name": "Chesterfield Inlet",
    "region": "Kivalliq, Nunavut",
    "legal_name": "Hamlet of Chesterfield Inlet",
    "operating_name": "Igluligaarjuk",
    "applicant_type": "Indigenous municipal or local government",
    "registration_number": "Hamlet of Chesterfield Inlet",
    "year_established": "Hudson's Bay Company post established in 1911; the community marked its 100th anniversary in 2011-2012",
    "website": "https://www.chesterfieldinlet.net",
    "contact_name": "David Kattegatsiak",
    "contact_title": "Community Economic Development Officer",
    "contact_email": "",
    "contact_phone": "867-898-9951",
    "mailing_address": "Hamlet Office, Chesterfield Inlet, Nunavut X0C 0B0",
    "applicant_profile": (
        "The Hamlet of Chesterfield Inlet is the local government for Igluligaarjuk, on the west coast of Hudson Bay "
        "in the Kivalliq region. The 2023 Community Economic Development Plan was prepared for the community and is "
        "carried by the Community Economic Development Officer, Hamlet staff, Council, and local organizations. "
        "Mayor Simionie Sammurtok introduced the 2023 plan. The Hamlet coordinates municipal services and uses the "
        "CED plan to start projects that improve social and economic well-being."
    ),
    "indigenous_communities": "Chesterfield Inlet (Igluligaarjuk), an Inuit community in Nunavut",
    "population_served": (
        "The 2013 CED plan describes Chesterfield Inlet as a community of about 400 people. The 2011 census counted "
        "313 residents, 190 of them (60.3 percent) under the age of 24."
    ),
    "demographic_context": (
        "Igluligaarjuk means 'place with a few Thule houses.' Residents describe the community as the original Arctic "
        "community, shaped by Inuit values, Inuktitut, and a year-round relationship with the land. The 2011 census "
        "showed a young population, so education, youth recreation, and local jobs are central to the 2023 plan."
    ),
    "existing_services": (
        "Local services named in the 2013 CED plan include the Hamlet office and garage, Aqigiq Hunters and Trappers "
        "Organization, Kajuqjuk Health Centre, Victor Sammurtok School, the Nunavut Arctic College Learning Centre, "
        "Pairivik Daycare, Noel Nuvak Arena, the community drop-in centre, the Tangmavik / Inns North hotel, the "
        "RCMP detachment, and the Chesterfield Inlet Housing Association."
    ),
    "service_gaps": (
        "The 2023 plan names the cost of living and of doing business, housing, education quality, limited local "
        "employment, mental health support, and recreation facilities as persistent pressures. Residents asked for "
        "more training, a stronger youth voice, and more chances to practice traditional skills on the land."
    ),
    "remoteness_context": (
        "Chesterfield Inlet is about 1,600 km north of Winnipeg on the west coast of Hudson Bay. Shipping, air access, "
        "and the high cost of construction shape what can be built and when. Longer-term infrastructure discussed in "
        "the 2023 plan includes a road toward Rankin Inlet."
    ),
    "governance_context": (
        "The 2023 CED plan was ratified with the Mayor, Council, the Senior Administrative Officer, and the CEDO, "
        "after surveys, school sessions, interviews, and a community open house. Implementation sits with the Hamlet "
        "economic development function, with a recommended internal CED manager and a lead for each of the seven "
        "community directions."
    ),
    "local_priority": (
        "The 2023 plan's top community directions are education, employment and training; heritage and culture; and "
        "wellness and recreation. Seventy-one percent of survey respondents said employment is the most important "
        "factor for socio-economic opportunity, and 67 percent said education and training have the highest potential "
        "benefit."
    ),
    "strengths": (
        "Residents named traditional knowledge and connection to the land as the community's greatest strength. "
        "Country food is still shared, and people come together when someone is in need. Ninety-two percent of survey "
        "respondents want the Hamlet to invest in traditional knowledge, skills, and language."
    ),
    "partners": (
        "Hamlet of Chesterfield Inlet; Community Economic Development Officer; Aqigiq Hunters and Trappers Organization; "
        "Victor Sammurtok School; Nunavut Arctic College; Kivalliq Inuit Association; Department of Fisheries and Oceans; "
        "Department of Environment; and partner funders identified in the 2023 five-year CED budget."
    ),
    "cultural_safety": (
        "The 2023 plan is guided by Inuit Societal Values and Inuit Qaujimajatuqangit. Priorities came from residents, "
        "including youth at Victor Sammurtok School and the Arctic College Learning Centre, and were confirmed with "
        "community leadership before the plan was finalized."
    ),
    "data_governance": (
        "Community survey findings in the 2023 plan are reported in aggregate. Project records should stay with the "
        "Hamlet and be shared in summary form unless Council approves a more specific release."
    ),
    "supporting_documents_text": (
        "Source documents: Chesterfield Inlet 2023 Community Economic Development Plan brochure "
        "(Chesterfield-Inlet-CED-Plan-Brochure-Digital.pdf); Hamlet of Chesterfield Inlet Community Economic "
        "Development Plan (2013); Chesterfield Inlet Community Development Plan (December 2008)."
    ),
}


def draft_for(profile: dict, grant_name: str, sections: list[dict], budget: int) -> dict:
    return {
        "meta": {
            "community_name": "Chesterfield Inlet",
            "local_priority": profile["local_priority"],
            "requested_budget": budget,
            "grant_name": grant_name,
        },
        "sections": sections,
    }


def proposal(
    proposal_id: str,
    title: str,
    grant_name: str,
    status: str,
    step: int,
    budget: int,
    total: int,
    summary: str,
    sections: list[dict],
    req_items: list[tuple[str, str, str]],
    *,
    exported: bool = False,
) -> dict:
    profile = {
        **PROFILE,
        "project_title": title,
        "project_location": "Chesterfield Inlet (Igluligaarjuk), Kivalliq, Nunavut",
        "project_summary": summary,
        "requested_budget": budget,
        "total_project_cost": total,
        "local_priority": PROFILE["local_priority"],
    }
    payload = {
        "id": proposal_id,
        "title": title,
        "community_name": "Chesterfield Inlet",
        "grant_name": grant_name,
        "status": status,
        "current_step": step,
        "requirements": requirements(grant_name, req_items),
        "profile": profile,
        "community_profile_snapshot": PROFILE,
        "application_details": {
            "project_title": title,
            "project_summary": summary,
            "requested_budget": budget,
            "total_project_cost": total,
            "project_location": profile["project_location"],
        },
        "draft": draft_for(PROFILE, grant_name, sections, budget),
        "final_sections": sections if status in {"ready_to_export", "exported"} else None,
    }
    if exported:
        payload["last_exported_at"] = datetime.now(timezone.utc).isoformat()
    return payload


def build_proposals() -> list[dict]:
    edu_sections = [
        section(
            "need",
            "Community need",
            """
            Education, employment, and training are the first strategic priority in the Chesterfield Inlet 2023 CED plan.
            In the community survey, 71 percent of respondents said employment opportunities are the most important factor
            for socio-economic opportunity, and 67 percent said education and training have the highest potential to benefit
            the community. The 2011 census counted 190 residents under 24, about 60 percent of the population at that time.
            The plan's aim is a mixed economy: wage work and the traditional land-based economy, with less reliance on hiring from outside.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The 2023 action plan for this direction is to expand and construct a new building for the Arctic College Learning Centre
            so more courses can be offered in the community; support enrollment in the Inuit Learning and Development Project,
            with a goal of two community members participating each year; support a Youth Council; help Victor Sammurtok School
            students join learning exchanges outside the community; and offer tourism training and certifications in hospitality,
            guiding, and business management. Year 1 of the implementation plan also calls for a guidance counsellor or additional
            teacher at Victor Sammurtok School, and for training that prepares people for business development and employment.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            The 2023 five-year budget for Education, Employment and Training is $223,200 in years 1-2, $100,000 in years 2-3,
            and $200,000 in years 3-5, for $523,200. The same table assigns about $52,320 to Chesterfield Inlet and about
            $470,880 to partners across those three phases. These figures are the plan's own budget, not a quote from a funder.
            """,
        ),
        section(
            "outcomes",
            "What success looks like",
            """
            The plan's indicators include more employment in the community, stronger skills, and more education and professional
            opportunities for youth. Specific early targets already written into the action plan are two Inuit Learning and
            Development Project participants per year, a Youth Council, and tourism training seats in hospitality, guiding,
            and business management.
            """,
        ),
    ]
    wellness_sections = [
        section(
            "need",
            "Community need",
            """
            Wellness and recreation is one of the three sectors residents said has the greatest potential to benefit Chesterfield Inlet.
            Youth in the 2023 consultation asked for sports, fitness, tournaments, and facilities. Eighty-five percent of youth said
            they would be most interested in sports and fitness, and 80 percent supported programs that address social issues.
            People also asked for a permanent mental health worker who can help with suicide, anxiety, depression, and residential school trauma.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The action plan is to run ongoing programs in social development, traditional knowledge, mental health, and healing;
            secure a permanent mental health worker from outside the community; and expand recreation facilities — an indoor
            swimming pool, fitness centre, indoor playground, and arena upgrades — together with a youth centre.
            Year 1 of implementation specifically includes hiring a full-time mental health worker. Years 2 and 3 expand recreation
            and wellness. A youth drop-in centre is listed among the longer-term projects.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            The 2023 five-year budget for Wellness and Recreation is $203,333 in years 1-2 and $385,103 in years 2-3, for $588,436.
            No long-term (years 3-5) amount is listed for this direction. Chesterfield's share in the funding table is about $58,843,
            with about $529,593 from partners.
            """,
        ),
    ]
    culture_sections = [
        section(
            "need",
            "Community need",
            """
            Heritage and culture is the second strategic priority in the 2023 plan. Ninety-two percent of survey respondents want
            the Hamlet to invest in traditional knowledge, skills, and language. Eighty-eight percent want the natural environment
            to continue as traditional hunting and fishing grounds. Residents named connection to the land, and teaching that
            knowledge to younger people, as the community's greatest strength.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The plan commits the community to learn from Elders and Inuit Qaujimajatuqangit while creating room for youth.
            Overarching objectives include more programs for cultural preservation across young people, adults, and Elders,
            and support to practice Inuit culture, including time on the land. Later phases call for programs that strengthen
            the traditional economy, including support for community hunters through the Government of Nunavut's Country Food
            Distribution program and Nunavut Tunngavik's Harvester Support Program.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            The 2023 five-year budget for Culture and Heritage is $150,550 in years 1-2, $175,000 in years 2-3, and $125,000
            in years 3-5, for $450,550. Chesterfield's share is about $45,055 and partners about $405,495.
            """,
        ),
    ]
    tourism_sections = [
        section(
            "need",
            "Community need",
            """
            Sixty-seven percent of survey respondents support responsible cultural tourism or ecotourism. The 2023 plan treats
            tourism, with commercial fishing, as a sustainable economic opportunity that can sit alongside hunting, arts, and
            local services. Chesterfield Inlet's history as an early permanent settlement, a whaling-era meeting place, and the
            site of the Hudson's Bay Company post (1911) is part of what the community can interpret for visitors.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            Year 1 focuses on the first stages of tourism planning. Years 2 and 3 shift to visitor accommodations, product
            development, and refinement. Year 4 and after include hiring a tourism coordinator and standing up a tourism
            organization. Related training, listed under education and employment, covers hospitality, guiding, and business management.
            The existing Tangmavik / Inns North hotel is the community's current visitor accommodation.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            The 2023 five-year tourism budget is $90,000 in years 1-2, $60,000 in years 2-3, and $135,000 in years 3-5, for $285,000.
            Chesterfield's share is about $28,500 and partners about $256,500.
            """,
        ),
    ]
    business_sections = [
        section(
            "need",
            "Community need",
            """
            Local business and infrastructure is one of the seven community directions. Residents asked for employment built
            through different local sectors, and for practical places to spend time and shop, including a coffee shop or corner store.
            The plan also names housing, a business incubator, fish-plant upgrades, and — over the long term — a road toward Rankin Inlet.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            Year 1 lays groundwork for business development and seeks funding for major infrastructure. Years 2 and 3 include
            upgrades to the fish plant in support of a commercial fishery, and capacity building for local businesses.
            Longer-term projects named in the plan are a community business incubator, housing, larger infrastructure, and the
            road to Rankin Inlet. A Kivalliq Trade Show presentation and an 'open for business' communications plan sit in the
            related mining direction and are meant to attract responsible investment.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            The 2023 five-year budget for Local Business and Infrastructure is $297,500 in years 1-2, $110,000 in years 2-3,
            and $40,000 in years 3-5, for $447,500. Chesterfield's share is about $44,750 and partners about $402,750.
            The mining and resource direction is budgeted separately at $35,000 over the first two phases, mostly for hiring
            awareness at Agnico Eagle's Meliadine mine, a Kivalliq Inuit Association benefits strategy, and investment outreach.
            """,
        ),
    ]
    environment_sections = [
        section(
            "need",
            "Community need",
            """
            Eighty-eight percent of survey respondents want the surrounding environment to remain hunting and fishing grounds.
            The 2023 plan treats commercial fishing and care for the land as paired work: develop a fishery with the Aqigiq
            Hunters and Trappers Organization, and limit harm from shipping on wildlife, marine animals, and local hunting.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            Action items are to work with Fisheries and Oceans, the Department of Environment, and the Aqigiq HTO on fishing
            goals and at least one project that benefits the community; write an environmental mitigation strategy for shipping;
            look at clean technologies for water treatment, waste, and energy, including the Indigenous Innovations demonstration
            project and iSolara solar power; and study whether a bio-research lab could monitor wildlife and migration routes.
            Years 2 and 3 also include the shift toward cleaner energy and the fish-plant upgrades that would support a commercial fishery.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            The 2023 five-year environment budget is $60,000 in years 1-2, $123,198 in years 2-3, and $35,000 in years 3-5,
            for $218,198. Chesterfield's share is about $21,820 and partners about $196,378.
            """,
        ),
    ]

    common_need = ("need", "Need", "Describe the community need this CED direction responds to.")
    return [
        proposal(
            "ci-edu-learning-centre",
            "Arctic College Learning Centre and local training",
            "Chesterfield Inlet 2023 CED Plan — Education, Employment and Training",
            "exported",
            5,
            470880,
            523200,
            "Expand the Arctic College Learning Centre and deliver the training actions in the 2023 CED plan.",
            edu_sections,
            [common_need, ("activities", "Work plan", "List the education and training actions."), ("budget", "Budget", "Use the CED plan figures."), ("outcomes", "Outcomes", "Name the plan's success indicators.")],
            exported=True,
        ),
        proposal(
            "ci-wellness-recreation",
            "Mental health worker and youth recreation",
            "Chesterfield Inlet 2023 CED Plan — Wellness and Recreation",
            "ready_to_export",
            4,
            529593,
            588436,
            "Hire a full-time mental health worker and expand youth recreation, as set out in the 2023 CED plan.",
            wellness_sections,
            [common_need, ("activities", "Work plan", "List wellness and recreation actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
        proposal(
            "ci-culture-heritage",
            "Traditional knowledge, language, and time on the land",
            "Chesterfield Inlet 2023 CED Plan — Culture and Heritage",
            "ready_to_export",
            4,
            405495,
            450550,
            "Invest in traditional knowledge, Inuktitut, and land-based programs identified by residents in the 2023 CED plan.",
            culture_sections,
            [common_need, ("activities", "Work plan", "List culture and heritage actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
        proposal(
            "ci-tourism",
            "Cultural tourism and visitor accommodations",
            "Chesterfield Inlet 2023 CED Plan — Tourism",
            "draft",
            3,
            256500,
            285000,
            "Plan responsible cultural tourism and ecotourism, then improve visitor accommodations and hire a tourism coordinator.",
            tourism_sections,
            [common_need, ("activities", "Work plan", "List tourism actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
        proposal(
            "ci-local-business",
            "Fish plant, local business, and community infrastructure",
            "Chesterfield Inlet 2023 CED Plan — Local Business and Infrastructure",
            "draft",
            2,
            402750,
            447500,
            "Upgrade the fish plant, build local business capacity, and advance the infrastructure projects in the 2023 CED plan.",
            business_sections,
            [common_need, ("activities", "Work plan", "List business and infrastructure actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
        proposal(
            "ci-environment-fishing",
            "Commercial fishing and care for hunting grounds",
            "Chesterfield Inlet 2023 CED Plan — Environment",
            "draft",
            2,
            196378,
            218198,
            "Start one community fishing project with the Aqigiq HTO and set shipping and clean-energy actions from the 2023 CED plan.",
            environment_sections,
            [common_need, ("activities", "Work plan", "List environment actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
    ]


def build_report() -> dict:
    analyzed = datetime.now(timezone.utc).isoformat()
    def metric(metric_id, label, score, summary, issues=None):
        issues = issues or []
        return {
            "id": metric_id,
            "label": label,
            "category_id": "community_fit",
            "description": summary,
            "score": score,
            "issues_count": len(issues),
            "status": "needs_revision" if issues else "strong",
            "summary": summary,
            "issues": issues,
            "suggestions": [issue["recommendation"] for issue in issues],
            "linked_sections": ["need", "activities", "budget"],
        }

    warning = {
        "issue_id": "ci-budget-source",
        "title": "Budget is a plan allocation",
        "message": "The dollar figures are the 2023 CED plan's five-year allocations, not confirmed funder awards or supplier quotes.",
        "severity": "warning",
        "confidence_score": 0.9,
        "section_key": "budget",
        "anchor_type": "section",
        "anchor_text": "CED plan budget",
        "anchor_hint": "budget",
        "affected_sections": ["budget"],
        "excerpt": "The 2023 five-year budget for Education, Employment and Training is $223,200 in years 1-2, $100,000 in years 2-3, and $200,000 in years 3-5.",
        "recommendation": "Replace the plan allocation with eligible-cost quotes and name the funder before this draft is submitted anywhere.",
    }
    info = {
        "issue_id": "ci-population-year",
        "title": "Population figures are from the 2013 plan",
        "message": "The population numbers cited are the 2013 plan's 'about 400' description and the 2011 census count of 313.",
        "severity": "info",
        "confidence_score": 0.8,
        "section_key": "need",
        "anchor_type": "section",
        "anchor_text": "Community need",
        "anchor_hint": "need",
        "affected_sections": ["need"],
        "excerpt": "The 2011 census counted 190 residents under 24.",
        "recommendation": "Add the latest Nunavut Bureau of Statistics or census count before using the population figure in an application.",
    }
    return {
        "id": REPORT_ID,
        "source_proposal_id": "ci-edu-learning-centre",
        "title": "Readiness review — Arctic College Learning Centre and local training",
        "source_filename": "Chesterfield-Inlet-CED-Plan-Brochure-Digital.pdf",
        "status": "complete",
        "rubric_version": "proposal-readiness-v1",
        "overall_score": 78,
        "priority_issue_count": 1,
        "category_scores": {"community_fit": 88, "evidence": 74, "budget": 68},
        "analyzed_at": analyzed,
        "grant_context": {
            "community_name": "Chesterfield Inlet",
            "source": "Chesterfield Inlet 2023 Community Economic Development Plan",
        },
        "extracted_sections": [
            {"key": "need", "title": "Community need", "body": "Education, employment, and training are the first strategic priority."},
            {"key": "activities", "title": "Proposed work", "body": "Expand the Arctic College Learning Centre and related training."},
            {"key": "budget", "title": "CED plan budget", "body": "Five-year education budget of $523,200."},
        ],
        "report": {
            "analysis": {
                "analysis": {
                    "proposal_id": "ci-edu-learning-centre",
                    "file_name": "Chesterfield-Inlet-CED-Plan-Brochure-Digital.pdf",
                    "file_type": "workspace",
                    "uploaded_at": analyzed,
                    "last_analyzed_at": analyzed,
                },
                "extraction": {
                    "extractor": "ced-plan-brochure",
                    "confidence": "high",
                    "preview_mode": "sectioned",
                    "raw_text_length": 12000,
                    "cleaned_text_length": 8000,
                    "section_count": 4,
                    "numbering_gaps_detected": False,
                    "warnings": [],
                    "candidate_extractors": [{"extractor": "ced-plan-brochure", "score": 0.9, "chars": 8000}],
                },
                "overall_score": 78,
                "issue_count": 2,
                "score_label": "Solid community fit, budget still needs a funder",
                "rubric_version": "proposal-readiness-v1",
                "report_summary": "The draft matches the 2023 CED priority on education and training. It still needs a named funder and current population figures.",
                "additional_submission_requirements": [
                    "Name the funding program and confirm which CED budget lines are eligible.",
                    "Attach the latest population count and a Council motion if the funder requires one.",
                ],
                "assistant_starters": [
                    "Which funder should this Arctic College project be aimed at?",
                    "What population figure should replace the 2011 census count?",
                ],
                "raw_preview_text": "Chesterfield Inlet 2023 Community Economic Development Plan — Education, Employment and Training.",
                "rubric": {"version": "proposal-readiness-v1", "score_bands": [{"minimum": 75, "label": "Strong foundation"}], "categories": []},
                "sections": [
                    {"key": "need", "title": "Community need", "body": "Education and employment are the top community priority.", "order": 1, "issues_count": 1, "warnings": [], "compliance_gaps": [], "section_score": 86},
                    {"key": "activities", "title": "Proposed work", "body": "Learning Centre expansion and named training actions.", "order": 2, "issues_count": 0, "warnings": [], "compliance_gaps": [], "section_score": 90},
                    {"key": "budget", "title": "CED plan budget", "body": "Five-year allocation of $523,200.", "order": 3, "issues_count": 1, "warnings": [], "compliance_gaps": [], "section_score": 68},
                ],
                "categories": [
                    {
                        "id": "community_fit",
                        "label": "Community fit",
                        "score": 88,
                        "issues": 0,
                        "assessed": True,
                        "metrics": [metric("fit", "Tied to a stated community priority", 92, "Education and employment are the first of the seven directions, and the survey results are cited.")],
                    },
                    {
                        "id": "evidence",
                        "label": "Evidence",
                        "score": 74,
                        "issues": 1,
                        "assessed": True,
                        "metrics": [metric("evidence", "Sources named", 74, "Survey percentages and the 2011 census are cited. The population figure is more than a decade old.", [info])],
                    },
                    {
                        "id": "budget",
                        "label": "Budget",
                        "score": 68,
                        "issues": 1,
                        "assessed": True,
                        "metrics": [metric("budget", "Cost basis", 68, "Amounts match the 2023 five-year CED budget table, including the Chesterfield and partner split.", [warning])],
                    },
                ],
            }
        },
    }


def clear_previous(db_path: str) -> None:
    conn = sqlite3.connect(db_path)
    try:
        conn.execute(
            f"DELETE FROM proposal_feedback_reports WHERE id = ? OR source_proposal_id IN ({','.join('?' for _ in PROPOSAL_IDS)})",
            (REPORT_ID, *PROPOSAL_IDS),
        )
        conn.execute(
            f"DELETE FROM proposals WHERE id IN ({','.join('?' for _ in PROPOSAL_IDS)})",
            PROPOSAL_IDS,
        )
        conn.commit()
    finally:
        conn.close()


def stamp_times(db_path: str) -> None:
    now = datetime.now(timezone.utc)
    stamps = {
        "ci-edu-learning-centre": (now - timedelta(days=21), now - timedelta(days=2), now - timedelta(days=2)),
        "ci-wellness-recreation": (now - timedelta(days=18), now - timedelta(days=4), None),
        "ci-culture-heritage": (now - timedelta(days=16), now - timedelta(days=6), None),
        "ci-tourism": (now - timedelta(days=12), now - timedelta(days=1), None),
        "ci-local-business": (now - timedelta(days=9), now - timedelta(hours=8), None),
        "ci-environment-fishing": (now - timedelta(days=7), now - timedelta(hours=3), None),
    }
    conn = sqlite3.connect(db_path)
    try:
        for proposal_id, (created, updated, exported) in stamps.items():
            conn.execute(
                "UPDATE proposals SET created_at = ?, updated_at = ?, last_exported_at = ? WHERE id = ?",
                (
                    created.isoformat(),
                    updated.isoformat(),
                    exported.isoformat() if exported else None,
                    proposal_id,
                ),
            )
        conn.execute(
            "UPDATE proposal_feedback_reports SET created_at = ?, analyzed_at = ? WHERE id = ?",
            ((now - timedelta(days=1, hours=2)).isoformat(), (now - timedelta(days=1, hours=2)).isoformat(), REPORT_ID),
        )
        conn.commit()
    finally:
        conn.close()


def main() -> None:
    from backend.app.workspace_store import _db_path

    db_path = str(_db_path())
    clear_previous(db_path)
    upsert_community_profile(USER_ID, PROFILE)
    for payload in build_proposals():
        create_proposal(USER_ID, payload)
    create_feedback_report(USER_ID, build_report())
    stamp_times(db_path)
    print(f"Seeded Chesterfield Inlet workspace for {USER_ID} in {db_path}")


if __name__ == "__main__":
    main()
