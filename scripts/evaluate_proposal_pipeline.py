from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from io import BytesIO
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv

    load_dotenv(ROOT / "api" / ".env")
except Exception:
    pass


MISSING_PATTERNS = (
    "[Missing information needed]",
    "[No answer generated]",
    "Needs additional information.",
)


DEFAULT_PROFILE: dict[str, Any] = {
    "community_name": "Kinngait",
    "region": "Nunavut",
    "local_priority": "Improve reliable year-round access to clean drinking water",
    "legal_name": "Hamlet of Kinngait",
    "operating_name": "Kinngait",
    "applicant_profile": (
        "The Hamlet of Kinngait coordinates municipal services, public works, community "
        "infrastructure planning, and local service delivery for residents."
    ),
    "applicant_type": "Indigenous municipal or local government",
    "contact_name": "Community Infrastructure Project Lead",
    "contact_title": "Senior Administrative Officer",
    "contact_email": "infrastructure@example.ca",
    "contact_phone": "867-555-0142",
    "mailing_address": "Hamlet Office, Kinngait, Nunavut, X0A 0C0",
    "indigenous_communities": "Kinngait Inuit community",
    "population_served": "Approximately 1,500 residents",
    "demographic_context": "Households, Elders, families, municipal facilities, and service providers rely on the local water system.",
    "service_gaps": "Aging water infrastructure, seasonal logistics, and limited local maintenance capacity contribute to service disruptions.",
    "remoteness_context": "Kinngait's northern location creates short construction windows, seasonal shipping constraints, and higher logistics costs.",
    "governance_context": "Hamlet leadership will oversee delivery with input from public works staff and community members.",
    "project_title": "Kinngait Water Infrastructure Reliability Project",
    "project_type": "Community infrastructure",
    "project_stage": "Implementation ready",
    "project_location": "Kinngait, Nunavut",
    "project_summary": "Upgrade critical water infrastructure and strengthen local maintenance practices to reduce disruptions.",
    "project_objectives": "Improve water service reliability, build local maintenance capacity, and strengthen community confidence.",
    "project_activities": (
        "Complete technical assessment, finalize design, procure materials, coordinate seasonal shipping, "
        "install priority upgrades, train local operators, and monitor performance."
    ),
    "expected_outputs": "Installed priority water-system upgrades, trained local operators, and a practical maintenance plan.",
    "staffing_plan": "Hamlet leadership, public works staff, regional technical advisors, and local health team representatives will support delivery.",
    "expected_outcomes": "Reduced service disruptions, stronger local maintenance capacity, and improved confidence in clean water access.",
    "quantitative_indicators": "Number of service disruptions, maintenance response time, operator training completions, and households served.",
    "qualitative_indicators": "Resident confidence, staff readiness, and satisfaction with water service reliability.",
    "baseline_conditions": "The current system experiences reliability concerns related to infrastructure age and logistics constraints.",
    "baseline_data_collection": "Baseline data will be compiled from maintenance logs, service records, and community feedback.",
    "success_measurement": "Success will be measured through service records, training completion logs, and resident feedback.",
    "community_engagement": "Residents will be updated through council meetings and local notices, with feedback gathered from public works staff, Elders, and service users.",
    "community_support_status": "Strong community support confirmed through council discussions and resident engagement.",
    "budget_assumptions": "Budget assumes seasonal shipping windows, local staff participation, technical advisory support, and contingency for northern logistics.",
    "budget_breakdown": "Equipment and materials, professional services, shipping/logistics, training, evaluation, and contingency.",
    "risks_and_mitigation": "Shipping delays and short construction seasons will be managed through early procurement, phased scheduling, and contingency planning.",
    "mitigation_plan": "Use early procurement, phased work, local coordination, and technical review to reduce delivery risk.",
    "maintenance_requirements": "Local operators will receive training and maintenance procedures will be updated for ongoing operations.",
    "sustainability_plan": "The Hamlet will integrate maintenance into public works operations after the grant period.",
    "data_governance": "Community-held records and feedback will be used with local approval and reported in aggregate.",
    "cultural_safety": "Engagement will use plain language, local channels, and respectful handling of community information.",
    "requested_budget": 350000,
}


@dataclass
class UploadedFile:
    path: Path

    @property
    def name(self) -> str:
        return self.path.name

    def __post_init__(self) -> None:
        self._bytes = self.path.read_bytes()
        self._io = BytesIO(self._bytes)

    def read(self, n: int = -1) -> bytes:
        return self._io.read(n)

    def getvalue(self) -> bytes:
        return self._bytes

    def seek(self, pos: int = 0) -> int:
        return self._io.seek(pos)


def word_count(text: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", text or ""))


def missing_info_count(text: str) -> int:
    return sum((text or "").count(pattern) for pattern in MISSING_PATTERNS)


def prompt_label_count(text: str) -> int:
    return len(
        re.findall(
            r"(?m)^\s*(?:Q[\w.-]+|prompt_\d+|\d+(?:\.\d+)*[a-z]?)\s*:",
            text or "",
            flags=re.IGNORECASE,
        )
    )


def numbered_heading_count(text: str) -> int:
    return len(re.findall(r"(?m)^\s*\d+(?:\.\d+)+(?:\.[a-z])?\s+\S+", text or "", flags=re.IGNORECASE))


def section_metrics(sections: list[dict[str, Any]], enhanced: dict[str, str] | None = None) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    enhanced = enhanced or {}
    for section in sections:
        key = str(section.get("key") or "")
        prompt_items = section.get("prompt_items") or []
        text = str(enhanced.get(key) or section.get("body") or section.get("guidance") or "")
        prompt_ids = [str(item.get("prompt_id") or "") for item in prompt_items if item.get("prompt_id")]
        rows.append(
            {
                "key": key,
                "title": section.get("title"),
                "prompt_count": len(prompt_items),
                "prompt_ids": prompt_ids,
                "guidance_chars": len(str(section.get("guidance") or "")),
                "word_limit": section.get("word_limit"),
                "output_words": word_count(text),
                "missing_info_count": missing_info_count(text),
                "prompt_label_count": prompt_label_count(text),
            }
        )
    return rows


def summarize_output(sections: list[dict[str, Any]], enhanced: dict[str, str] | None = None) -> dict[str, Any]:
    rows = section_metrics(sections, enhanced)
    return {
        "total_words": sum(row["output_words"] for row in rows),
        "total_missing_info_count": sum(row["missing_info_count"] for row in rows),
        "total_prompt_label_count": sum(row["prompt_label_count"] for row in rows),
        "sections_under_100_words": sum(1 for row in rows if row["output_words"] < 100),
        "sections": rows,
    }


def extract_pdf_text(path: Path) -> str:
    try:
        from pypdf import PdfReader
    except Exception as exc:
        raise RuntimeError("pypdf is required to analyze exported PDFs") from exc

    reader = PdfReader(str(path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def analyze_pdf_output(path: Path) -> dict[str, Any]:
    text = extract_pdf_text(path)
    return {
        "file": str(path),
        "chars": len(text),
        "words": word_count(text),
        "missing_info_count": missing_info_count(text),
        "numbered_subheading_count": numbered_heading_count(text),
        "prompt_label_like_count": len(
            re.findall(
                r"\b(?:Provide|Describe|Explain|Outline|Identify|List|State)\b[^.\n]{0,80}\s+Needs additional information\.",
                text,
            )
        ),
    }


def load_profile(path: Path | None) -> dict[str, Any]:
    if not path:
        return dict(DEFAULT_PROFILE)
    return json.loads(path.read_text(encoding="utf-8"))


def evaluate_pipeline(
    input_path: Path,
    *,
    profile_path: Path | None = None,
    output_pdf: Path | None = None,
    run_enhance: bool = False,
    use_rag: bool = True,
) -> dict[str, Any]:
    from backend.app.parsers.grant_parsers import parse_grant_upload_to_requirements
    from backend.app.utils.grant_utils import generate_proposal_from_requirements

    profile = load_profile(profile_path)
    requirements, raw_text = parse_grant_upload_to_requirements(UploadedFile(input_path))
    if not requirements:
        raise RuntimeError(f"Could not parse {input_path}")

    draft = generate_proposal_from_requirements(
        profile=profile,
        requirements=requirements,
        requested_budget=int(profile.get("requested_budget") or 0),
    )

    enhanced: dict[str, str] | None = None
    enhance_meta: dict[str, Any] | None = None
    if run_enhance:
        from backend.app.llm.llm_utils import enhance_sections_with_metadata

        result = enhance_sections_with_metadata(
            draft=draft,
            requirements=requirements,
            profile=profile,
            use_rag=use_rag,
        )
        enhanced = result.get("enhanced", {})
        enhance_meta = result.get("meta", {})

    report: dict[str, Any] = {
        "input_file": str(input_path),
        "raw_text_chars": len(raw_text or ""),
        "parser_meta": requirements.get("parser_meta", {}),
        "section_count": len(requirements.get("sections", []) or []),
        "prompt_count": sum(len(section.get("prompt_items", []) or []) for section in requirements.get("sections", []) or []),
        "section_parse_metrics": section_metrics(requirements.get("sections", []) or []),
        "baseline_output": summarize_output(draft.get("sections", []) or []),
        "enhance_meta": enhance_meta,
    }
    if enhanced is not None:
        report["enhanced_output"] = summarize_output(draft.get("sections", []) or [], enhanced)
    if output_pdf:
        report["exported_pdf"] = analyze_pdf_output(output_pdf)
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate grant proposal extraction and generation quality metrics.")
    parser.add_argument("input", type=Path, help="Path to the grant application package PDF/DOCX/TXT.")
    parser.add_argument("--profile", type=Path, help="Optional JSON community profile. Uses a Kinngait smoke profile by default.")
    parser.add_argument("--output-pdf", type=Path, help="Optional exported proposal PDF to analyze.")
    parser.add_argument("--enhance", action="store_true", help="Run OpenAI enhancement and include enhancement/RAG metrics.")
    parser.add_argument("--no-rag", action="store_true", help="Disable RAG during enhancement.")
    parser.add_argument("--out", type=Path, help="Optional path to write JSON metrics.")
    args = parser.parse_args()

    report = evaluate_pipeline(
        args.input,
        profile_path=args.profile,
        output_pdf=args.output_pdf,
        run_enhance=args.enhance,
        use_rag=not args.no_rag,
    )
    payload = json.dumps(report, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(payload + "\n", encoding="utf-8")
    print(payload)


if __name__ == "__main__":
    main()
