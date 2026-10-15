"""Seed the local workspace with Chesterfield Inlet (Igluligaarjuk) records.

Sources (``ced_plans copy/Chesterfield Inlet/`` unless noted):

- "Chesterfield Inlet 2023" Community Economic Development Plan: a five-year plan
  developed in 2018 by Canadian Ecotourism Services (consultation May 2018). Used
  in two forms: the Part 1 executive-summary brochure and the full plan.
  "2023" is the plan's name, not the year it was written.
- Hamlet of Chesterfield Inlet Community Economic Development Plan (2013).
- Hamlet of Chesterfield Inlet Community Development Plan (December 2008).
- Hamlet website, chesterfield-inlet.ca (municipal administration page): CEDO
  contact, P.O. box, "est. 1980".
- Government of Nunavut Chesterfield Inlet contact list (July 2025): local services.
- Statistics Canada 2021 Census population count (397).

Fields the sources do not support are left blank. The readiness review is not
seeded: generate it with the app's analyzer (POST /api/proposals/<id>/feedback-report).
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone

from backend.app.workspace_store import (
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
    return {"key": key, "title": title, "body": " ".join(body.split()), "guidance": ""}


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
    "operating_name": "",
    "applicant_type": "Municipal government (hamlet) in Nunavut",
    "registration_number": "",
    "year_established": "1980 (Municipality of Chesterfield Inlet, per the Hamlet website)",
    "website": "https://chesterfield-inlet.ca",
    "contact_name": "David Kattegatsiak",
    "contact_title": "Community Economic Development Officer",
    "contact_email": "edo_hamlet@qiniq.com",
    "contact_phone": "867-898-4603",
    "mailing_address": "P.O. Box 10, Chesterfield Inlet, Nunavut X0C 0B0",
    "applicant_profile": (
        "The Hamlet of Chesterfield Inlet is the municipal government for Igluligaarjuk, on the western shore of "
        "Hudson Bay in the Kivalliq region. Its current five-year Community Economic Development plan, "
        "\"Chesterfield Inlet 2023\", was developed in 2018 by Canadian Ecotourism Services under the direction of "
        "CEDO David Kattegatsiak, with guidance from Hamlet Council, Mayor Simionie Sammurtok and the Senior "
        "Administrative Officer. The Department of Economic Development and Transportation funded the plan. It "
        "updates the Hamlet's earlier CED plans from 2013, 2008 and 2003."
    ),
    "indigenous_communities": "Chesterfield Inlet (Igluligaarjuk), an Inuit community in Nunavut",
    "population_served": (
        "397 residents in the 2021 Census (Statistics Canada), down from 437 in 2016. The Nunavut Bureau of "
        "Statistics estimated 433 for 2023 (Government of Nunavut community contact list, 2025). The CED plan, "
        "using 2016 census data, reports that 54.5 percent of residents were under 25 and the average age was 27."
    ),
    "demographic_context": (
        "Igluligaarjuk means 'place with few Thule houses'. The CED plan describes Chesterfield Inlet as the "
        "oldest permanent settlement in Nunavut and the 'original' Arctic community. In the 2016 census, 94 percent "
        "of residents were Inuit. Because the population is young, the plan asks for at least one youth-focused "
        "project in each of its seven community directions."
    ),
    "existing_services": (
        "Services listed in the Government of Nunavut's 2025 community contact list include the Hamlet office, "
        "Aqigiq Hunters and Trappers Organization (which handles Iqalukpik Fish Plant commercial fishing), the "
        "health centre, RCMP, Victor Sammurtok School (K-12), Nunavut Arctic College, a daycare centre, the arena, "
        "a community drop-in centre, the local radio station (93.3 FM), the Pitsiulak Co-operative and Northern "
        "stores, and the Tangmavik Hotel (Inns North)."
    ),
    "service_gaps": (
        "The CED plan names the quality of the education system, the high cost of living and of doing business, "
        "and housing as key challenges. Residents asked for more employment, training, mental health support "
        "and recreation facilities. Youth asked to have their concerns heard."
    ),
    "remoteness_context": (
        "Chesterfield Inlet is about 90 km north of Rankin Inlet and about 1,600 km north of Winnipeg. Scheduled "
        "air service runs through Rankin Inlet. The CED plan supports the Government of Nunavut's work on a road "
        "to Rankin Inlet and other Kivalliq communities, and the studies recommended for a deep-sea harbour."
    ),
    "governance_context": (
        "The plan was developed through an online survey (including a youth survey), interviews, a presentation "
        "at Victor Sammurtok School, a community open house, and a review of draft recommendations by the Mayor, "
        "Council, the SAO and the CEDO. The full plan notes that it remains a draft until approved by the Hamlet. "
        "Implementation sits with the Hamlet's economic development department. The plan recommends an internal "
        "CED manager and a designated manager for each of its seven community directions."
    ),
    "local_priority": (
        "Residents named three sectors with the greatest potential benefit: education, employment and training; "
        "heritage and culture; and wellness and recreation. In the community survey, 71 percent said providing "
        "employment opportunities is the most important factor for creating socio-economic opportunity, and "
        "67 percent said education and training have the highest potential to benefit the community."
    ),
    "strengths": (
        "Residents named traditional knowledge, based on a strong connection to the land, as the community's "
        "greatest strength. Sharing country food continues, and people come together in times of need. In the "
        "survey, 92 percent want the Hamlet to invest in preserving traditional knowledge, skills and language."
    ),
    "partners": (
        "Partners named in the CED plan's action items include Aqigiq Hunters and Trappers Organization, Victor "
        "Sammurtok School, Nunavut Arctic College, the Kivalliq Inuit Association, Fisheries and Oceans Canada, the "
        "Department of Environment and the Government of Nunavut. The plan's budget assumes about 90 percent of "
        "costs come from partners, but it does not name specific funders."
    ),
    "cultural_safety": (
        "The plan is guided by Inuit Societal Values and Inuit Qaujimajatuqangit. Priorities came from residents, "
        "including students at Victor Sammurtok School and the Arctic College Learning Centre. As a final step, "
        "the recommendations were brought back to the community and confirmed."
    ),
    "data_governance": (
        "The full CED plan states that the document, including its financial information, is the property of "
        "Chesterfield Inlet and is provided in confidence for uses the community authorizes. Survey results in "
        "the plan are reported as aggregate percentages."
    ),
    "supporting_documents_text": (
        "Source documents: \"Chesterfield Inlet 2023\" Community Economic Development Plan (developed 2018 by "
        "Canadian Ecotourism Services), both the Part 1 executive-summary brochure and the full plan; Hamlet of "
        "Chesterfield Inlet Community Economic Development Plan (2013); Hamlet of Chesterfield Inlet Community "
        "Development Plan (December 2008, Accutech Engineering)."
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
    direction: str,
    status: str,
    step: int,
    budget: int,
    total: int,
    summary: str,
    sections: list[dict],
    req_items: list[tuple[str, str, str]],
) -> dict:
    # No funder has been chosen for any of these drafts, so the grant label says so.
    grant_name = f"No funder selected · CED plan direction: {direction}"
    profile = {
        **PROFILE,
        "project_title": title,
        "project_location": "Chesterfield Inlet (Igluligaarjuk), Kivalliq, Nunavut",
        "project_summary": summary,
        "requested_budget": budget,
        "total_project_cost": total,
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
    if status == "exported":
        payload["last_exported_at"] = datetime.now(timezone.utc).isoformat()
    return payload


PLAN = "the Chesterfield Inlet 2023 CED plan"


def build_proposals() -> list[dict]:
    edu_sections = [
        section(
            "need",
            "Community need",
            f"""
            Education, employment and training is the first of the three strategic priorities residents named in {PLAN}.
            In the plan's community survey, 71 percent said providing employment opportunities is the most important factor
            for creating socio-economic opportunity, and 67 percent said education and training have the highest potential
            to benefit the community. Using 2016 census data, the plan reports that 54.5 percent of residents were under 25.
            The plan aims for a mixed economy of wage work and the traditional land-based economy, with less need to hire
            from outside the community.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The plan's key action items for this direction are to expand and construct a new building for the Arctic College
            Learning Centre so more courses can be offered locally; promote enrolment in the Inuit Learning and Development
            Project, with a goal of two community members per year; support the creation of a Youth Council; encourage Victor
            Sammurtok School students to take part in experience exchanges and learning programs outside the community; and
            offer tourism training courses and certifications, including hospitality, guiding and business management.
            Year 1 of the implementation plan also includes hiring a guidance counsellor or additional teacher at Victor
            Sammurtok School and laying the groundwork, through training, for more business development and employment.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            This direction totals $523,200 in the full plan's detailed 5-year budget (Part 2, p. 46): $223,200 short term (years 1-2), $100,000 medium term
            (years 2-3) and $200,000 long term (years 3-5). The line items are a Learning Centre feasibility study
            ($78,500), Youth Council set-up ($25,000), a guidance counsellor ($55,000), a PLAR assessment of local
            training needs ($25,000), tourism training courses and certification ($100,000), a daycare facility
            feasibility study ($64,700), a vocational training and equipment feasibility assessment ($100,000), and
            support for community members to become registered nurses ($75,000). Building a new Learning Centre is
            an action item, but the budget only funds the feasibility study. The plan projects $52,320 from Chesterfield
            Inlet and $470,880 from partners. The requested funding in this draft is that partner share. These are the
            plan's 2018 projections, not quotes or funder awards.
            """,
        ),
        section(
            "outcomes",
            "What success looks like",
            """
            Indicators of success named in the plan include more employment opportunities in the community, enhanced skill
            development, and more educational and professional opportunities for youth. Targets written into the action items
            are two Inuit Learning and Development Project participants per year, a Youth Council, and tourism training and
            certifications offered in the community.
            """,
        ),
    ]
    wellness_sections = [
        section(
            "need",
            "Community need",
            f"""
            Wellness and recreation is one of the three strategic priorities residents named in {PLAN}. In the youth survey,
            85 percent said they would be most interested in sports and fitness activities, and 80 percent support programs
            that address social issues. The plan calls for a permanent mental health worker to help residents with struggles such as
            suicide, anxiety, depression and residential school trauma.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The plan's key action items are to establish consistent, ongoing programs focused on social development, traditional
            knowledge, mental health and healing, and secure funding for them; secure a permanent mental health worker from
            outside the community; and increase recreational facilities (an indoor swimming pool, fitness centre, indoor playground
            and arena upgrades) in collaboration with a youth centre. Year 1 of implementation includes hiring a full-time mental
            health worker. Years 2 and 3 expand recreation and wellness opportunities, and a youth drop-in centre is listed among
            the longer-term projects (years 4 and beyond).
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            This direction totals $588,437 in the full plan's detailed 5-year budget (Part 2, p. 46): $203,333 short term and $385,103 medium term, with no long-term
            amount. The line items are ongoing social development, traditional knowledge, mental health and healing
            programs ($166,667), a full-time mental health worker ($100,000), a feasibility study for a new recreation
            and fitness centre or drop-in centre ($121,770), a community food sharing initiative ($30,000), a sport
            mentorship program ($50,000), a wellness and recreation strategy ($35,000), a food sustainability
            feasibility assessment ($15,000), a community strategy on cannabis legalization ($20,000), and support for
            athletes in Inuit sports and the Arctic Winter Games ($50,000). The pool, fitness centre, playground and
            arena upgrades are action items, but the budget only funds the feasibility study. The plan projects $58,843
            from Chesterfield Inlet and $529,593 from partners; the split adds to $1 less than the total because of
            rounding. The requested funding in this draft is the partner share. These are 2018 projections, not awards.
            """,
        ),
    ]
    culture_sections = [
        section(
            "need",
            "Community need",
            f"""
            Heritage and culture is one of the three strategic priorities residents named in {PLAN}. In the survey, 92 percent
            want the Hamlet to invest in preserving traditional knowledge, skills and language. Residents named traditional
            knowledge, based on a strong connection to the land, as the community's greatest strength. The plan notes that
            Chesterfield Inlet's history and archaeological sites give it an opportunity to preserve and share its culture.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The plan's key action items are to support the Kivalliq Inuit Association in building the new cultural centre so it
            meets community needs; support the traditional land-based economy by creating incentives for residents to hunt, fish
            and gather country food; organize regular community festivals and events where residents share food; create
            opportunities for Elders to take part in community initiatives; establish a consistent arts and crafts program
            teaching young people and the middle generation traditional sewing, tool making and carving; map historical sites
            with youth and Elders as a cultural preservation project; and study the feasibility of preserving the community's
            heritage buildings.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            This direction totals $450,550 in the full plan's detailed 5-year budget (Part 2, p. 46): $150,550 short term, $175,000 medium term and $125,000 long term.
            The line items are traditional land-based training program development ($15,000), annual community
            festivals and events ($75,000 over five years), an annual Elders' program ($175,000), radio programming
            ($15,000), an annual arts and crafts program ($75,000), archaeological mapping of historical sites
            ($45,550), and a heritage buildings preservation feasibility study ($50,000). The KIA cultural centre is an
            action item with no amount in this budget. The plan projects $45,055 from Chesterfield Inlet and $405,495
            from partners. The requested funding in this draft is that partner share. These are 2018 projections, not
            awards.
            """,
        ),
    ]
    tourism_sections = [
        section(
            "need",
            "Community need",
            f"""
            In the survey for {PLAN}, 67 percent of community members support developing responsible cultural tourism or
            ecotourism. The plan names tourism and commercial fishing as key sustainable economic opportunities. It describes
            Chesterfield Inlet as the oldest permanent settlement in Nunavut, with a Thule site just outside the community, a
            history tied to commercial whaling, and a Hudson's Bay Company post established in 1911, all of which give it
            strong potential for cultural ecotourism.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The plan's key action items are to develop a five-year community ecotourism plan; improve visitor accommodations;
            work with the Government of Nunavut to reduce insurance costs for guides and outfitters; pursue funding and political
            support for tourism through the Truth and Reconciliation Commission's calls to action; and refine the current
            self-guided community tour and train a local guide to deliver it. The implementation plan puts the first stages of
            tourism planning in year 1, visitor accommodations and product development in years 2 and 3, and a tourism
            coordinator and tourism organization in year 4 and beyond. Related tourism training sits under the education direction.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            This direction totals $285,000 in the full plan's detailed 5-year budget (Part 2, p. 46): $90,000 short term, $60,000 medium term and $135,000 long term.
            The line items are a five-year community ecotourism plan ($40,000), an accommodations feasibility study
            ($50,000), pursuing funding and political support for tourism ($15,000), refining the self-guided community
            tour ($45,000), hiring a tourism coordinator including training ($85,000), and developing Authentic
            Indigenous Moments (AIM) experiences ($50,000). Improving visitor accommodations is an action item, but the
            budget only funds the feasibility study. The plan projects $28,500 from Chesterfield Inlet and $256,500 from
            partners. The requested funding in this draft is that partner share. These are 2018 projections, not awards.
            """,
        ),
    ]
    business_sections = [
        section(
            "need",
            "Community need",
            f"""
            Local business and infrastructure is one of the seven community directions in {PLAN}. Residents asked for employment
            built by developing different sectors in the community, and for places such as a coffee shop or general corner store.
            The plan aims to support local entrepreneurs, build business capacity, explore expanding the commercial fishing
            industry, and support large territorial infrastructure projects that link Chesterfield Inlet to other economic zones.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The plan's key action items are to implement and align with the 2017/2018 infrastructure plan priorities; apply for a
            search and rescue boat and equipment through the Indigenous Community-Boat Volunteer program; complete upgrades to
            the Iqalukpik Fish Plant and study expanding it for commercial fishing and meat processing; collaborate with the
            Government of Nunavut on the road to Rankin Inlet and other Kivalliq communities; pursue the recommended studies for
            the deep-sea harbour project; and establish a business incubator space with a coordinator. In the implementation plan,
            year 1 secures funding for major infrastructure, years 2 and 3 include the fish plant upgrades and local business
            capacity building, and the road, housing and business incubator are longer-term (year 4 and beyond).
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            This direction totals $447,500 in the full plan's detailed 5-year budget (Part 2, p. 46): $297,500 short term, $110,000 medium term and $40,000 long term.
            The line items are a rescue boat ($60,000), a feasibility study for Iqalukpik Fish Plant upgrades ($75,000),
            the deep-sea harbour study ($90,000), a community asset management plan ($12,500), developing local businesses
            that complement the land-based economy, culture or ecotourism ($20,000), a youth awareness campaign ($15,000),
            a study on streamlining shipping and transportation ($35,000), a quarry development plan ($25,000), a
            restaurant feasibility study ($50,000), a part-time program coordinator including training ($40,000), and a
            housing strategy ($25,000). The fish plant upgrades themselves, the road to Rankin Inlet and a business
            incubator space have no amounts in this budget. The plan projects $44,750 from Chesterfield Inlet and
            $402,750 from partners. The requested funding in this draft is that partner share. The separate Mining and
            Resource Development direction totals $35,000: a Kivalliq Trade Show presentation ($5,000), a go-forward
            strategy ($15,000) and a communications plan for mining companies ($15,000). These are 2018 projections,
            not awards.
            """,
        ),
    ]
    environment_sections = [
        section(
            "need",
            "Community need",
            f"""
            In the survey for {PLAN}, 88 percent of community members want the natural environment to continue serving as
            traditional hunting and fishing grounds. The plan pairs care for the land with planning for commercial fishing,
            mitigating negative environmental impacts and adopting cleaner technologies.
            """,
        ),
        section(
            "activities",
            "Proposed work",
            """
            The plan's key action items are to make sure selective hunting techniques are passed down to younger generations;
            support knowledgeable community hunters through programs such as the Government of Nunavut's Country Food
            Distribution program and Nunavut Tunngavik's Harvester Support Program; work with Fisheries and Oceans Canada, the
            Department of Environment and the Aqigiq HTO to set fishing development goals and start at least one project that
            benefits the community; develop an environmental mitigation strategy for the impacts of shipping on wildlife,
            marine animals and local hunting; implement clean technologies for water treatment, waste processing and energy
            through the Indigenous Innovations Corporation's demonstration project and iSolara Solar Power; and study the
            feasibility of a bio-research lab to monitor wildlife and migration routes. Years 2 and 3 of implementation begin
            the shift to cleaner energy and technologies.
            """,
        ),
        section(
            "budget",
            "CED plan budget",
            """
            This direction totals $218,198 in the full plan's detailed 5-year budget (Part 2, p. 46): $60,000 short term, $123,198 medium term and $35,000 long term.
            The line items are education on selective hunting techniques ($25,000), training so the hunters used for
            the Country Food Distribution and Harvester Support programs are experienced and knowledgeable ($35,000),
            an environmental mitigation strategy for shipping ($50,000), a community waste management plan ($35,000),
            a bio-research lab feasibility study ($38,198), and geospatial mapping ($35,000). The fishing project with
            DFO, the Department of Environment and the Aqigiq HTO, and the clean-technology projects, are action items
            with no amounts in this budget. The plan projects $21,820 from Chesterfield Inlet and $196,378 from
            partners. The requested funding in this draft is that partner share. These are 2018 projections, not awards.
            """,
        ),
    ]

    common_need = ("need", "Need", "Describe the community need this CED direction responds to.")
    return [
        proposal(
            "ci-edu-learning-centre",
            "Arctic College Learning Centre and local training",
            "Education, Employment & Training",
            "exported",
            5,
            470880,
            523200,
            "Fund the education and training items in the Chesterfield Inlet 2023 CED plan budget, including a feasibility study for a new Arctic College Learning Centre and a guidance counsellor.",
            edu_sections,
            [common_need, ("activities", "Work plan", "List the education and training actions."), ("budget", "Budget", "Use the CED plan figures."), ("outcomes", "Outcomes", "Name the plan's success indicators.")],
        ),
        proposal(
            "ci-wellness-recreation",
            "Mental health worker and youth recreation",
            "Wellness & Recreation",
            "ready_to_export",
            4,
            529593,
            588437,
            "Hire a full-time mental health worker, run ongoing wellness programs, and study a new recreation and fitness centre, as budgeted in the Chesterfield Inlet 2023 CED plan.",
            wellness_sections,
            [common_need, ("activities", "Work plan", "List wellness and recreation actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
        proposal(
            "ci-culture-heritage",
            "Traditional knowledge, culture, and heritage sites",
            "Culture & Heritage",
            "ready_to_export",
            4,
            405495,
            450550,
            "Fund the Elders' program, arts and crafts, community events, land-based training, and heritage site work budgeted in the Chesterfield Inlet 2023 CED plan.",
            culture_sections,
            [common_need, ("activities", "Work plan", "List culture and heritage actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
        proposal(
            "ci-tourism",
            "Cultural tourism and visitor accommodations",
            "Tourism",
            "draft",
            3,
            256500,
            285000,
            "Develop a community ecotourism plan, study visitor accommodations, refine the community tour, and hire a tourism coordinator, as budgeted in the Chesterfield Inlet 2023 CED plan.",
            tourism_sections,
            [common_need, ("activities", "Work plan", "List tourism actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
        proposal(
            "ci-local-business",
            "Fish plant, local business, and community infrastructure",
            "Local Business & Infrastructure",
            "draft",
            2,
            402750,
            447500,
            "Buy a rescue boat, study Iqalukpik Fish Plant upgrades and the deep-sea harbour, and fund the business and planning studies budgeted in the Chesterfield Inlet 2023 CED plan.",
            business_sections,
            [common_need, ("activities", "Work plan", "List business and infrastructure actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
        proposal(
            "ci-environment-fishing",
            "Care for the land and hunting grounds",
            "Environment",
            "exported",
            5,
            196378,
            218198,
            "Fund hunter education and training, a shipping mitigation strategy, a waste management plan, a bio-research lab study, and geospatial mapping, as budgeted in the Chesterfield Inlet 2023 CED plan.",
            environment_sections,
            [common_need, ("activities", "Work plan", "List environment actions."), ("budget", "Budget", "Use the CED plan figures.")],
        ),
    ]


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


def main() -> None:
    from backend.app.workspace_store import _db_path

    db_path = str(_db_path())
    clear_previous(db_path)
    upsert_community_profile(USER_ID, PROFILE)
    for payload in build_proposals():
        create_proposal(USER_ID, payload)
    print(f"Seeded Chesterfield Inlet workspace for {USER_ID} in {db_path}")
    print("Generate the readiness review with: POST /api/proposals/ci-edu-learning-centre/feedback-report")


if __name__ == "__main__":
    main()
