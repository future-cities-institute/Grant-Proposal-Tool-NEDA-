import { API_BASE } from "./utils";
import { supabase } from "./supabase";

const RAG_USE_CASE = process.env.NEXT_PUBLIC_RAG_USE_CASE || "default";

async function authHeaders(): Promise<Record<string, string>> {
  if (typeof window === "undefined") return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export type Requirements = {
  grant_name: string;
  sections: {
    key: string;
    title: string;
    guidance: string;
    word_limit?: number;
    prompt_items?: Array<{
      prompt_id?: string;
      label?: string;
      prompt_text: string;
      detail_text?: string;
      prompt_type?: string;
      response_style?: string;
      answer_type?: string;
      word_limit?: number;
      required?: boolean;
      sub_prompt?: boolean;
      options?: string[];
      conditional_on_previous?: string | null;
      parent_prompt_id?: string | null;
      response_value?: string | null;
      source_confidence?: string | null;
      source_origin?: string | null;
    }>;
    section_purpose?: string;
    parser_diagnostics?: string[];
  }[];
  eligibility?: string[];
  raw_text?: string;
  must_include?: string[];
  required_sections?: string[];
  parser_meta?: {
    mode?: string;
    confidence?: "low" | "medium" | "high" | string;
    model?: string;
    raw_text_length?: number;
    heuristic_section_count?: number;
    final_section_count?: number;
    llm_fallback_used?: boolean;
    llm_error?: string | null;
    document_ai_used?: boolean;
    document_ai_error?: string | null;
    document_ai_page_count?: number | null;
    document_ai_form_field_count?: number | null;
    document_ai_table_count?: number | null;
    document_ai_used_augmented_text?: boolean | null;
    document_ai_location?: string | null;
    fallback_reasons?: string[];
    diagnostics?: string[];
    used_default_template?: boolean;
    heuristic_titles_preview?: string[];
    section_titles_preview?: string[];
    question_count?: number;
    structured_prompt_count?: number;
    sections_with_prompt_quality_warnings?: number;
  };
  [k: string]: unknown;
};

export type CommunityProfile = {
  community_name: string;
  region: string;
  local_priority: string;
  legal_name?: string;
  operating_name?: string;
  applicant_profile?: string;
  registration_number?: string;
  year_established?: string;
  contact_name?: string;
  contact_title?: string;
  contact_email?: string;
  contact_phone?: string;
  mailing_address?: string;
  website?: string;
  indigenous_communities?: string;
  population_served?: string;
  demographic_context?: string;
  existing_services?: string;
  service_gaps?: string;
  remoteness_context?: string;
  governance_context?: string;
  project_title?: string;
  project_location?: string;
  timeline?: string;
  challenges?: string;
  strengths?: string;
  partners?: string;
  applicant_type?: string;
  project_type?: string;
  project_stage?: string;
  community_support_status?: string;
  other_funding_status?: string;
  project_summary?: string;
  project_objectives?: string;
  target_beneficiaries?: string;
  direct_beneficiaries?: string;
  indirect_beneficiaries?: string;
  project_activities?: string;
  expected_outputs?: string;
  staffing_plan?: string;
  project_management_approach?: string;
  expected_outcomes?: string;
  quantitative_indicators?: string;
  qualitative_indicators?: string;
  baseline_conditions?: string;
  baseline_data_collection?: string;
  success_measurement?: string;
  community_engagement?: string;
  approvals_status?: string;
  elders_involvement?: string;
  knowledge_keepers_involvement?: string;
  youth_involvement?: string;
  data_governance?: string;
  cultural_safety?: string;
  evidence_note?: string;
  why_now?: string;
  total_project_cost?: number;
  budget_personnel?: string;
  budget_professional_services?: string;
  budget_equipment_materials?: string;
  budget_travel_logistics?: string;
  budget_training?: string;
  budget_evaluation?: string;
  budget_admin?: string;
  budget_contingency?: string;
  budget_breakdown?: string;
  budget_assumptions?: string;
  other_funding?: string;
  risks_and_mitigation?: string;
  risk_likelihood?: string;
  risk_impact?: string;
  mitigation_plan?: string;
  sustainability_plan?: string;
  maintenance_requirements?: string;
  ownership_model?: string;
  future_funding_sources?: string;
  scaling_plan?: string;
  supporting_documents_text?: string;
  requested_budget?: number;
  indicators_before?: Record<string, number>;
  indicators_after?: Record<string, number>;
  scenario?: Record<string, unknown>;
};

export type DraftSection = {
  key: string;
  title: string;
  body: string;
  guidance?: string;
  prompt_items?: Requirements["sections"][number]["prompt_items"];
};

export type Draft = {
  meta: {
    community_name?: string;
    local_priority?: string;
    requested_budget?: number;
    grant_name?: string;
  };
  sections: DraftSection[];
};

export type PromptCoverageSection = {
  section_key: string;
  section_title: string;
  prompts: Array<{
    prompt_id: string;
    prompt_text: string;
    response_style?: string;
    answered: boolean;
    status?: "answered" | "needs_review" | "missing";
    confidence?: "high" | "medium" | "low";
    review_note?: string;
    options?: string[];
    response_value?: string | null;
    conditional_on_previous?: string | null;
    parent_prompt_id?: string | null;
  }>;
};

export type ValidationResult = {
  gaps: string[];
  warnings: string[];
};

export type ComplianceWarning = {
  type: string;
  message: string;
  details?: Record<string, unknown>;
};

export type ComplianceGap = {
  failed_check_id: string;
  category: string;
  severity: "minor" | "major" | "critical";
  confidence_score: number;
  message: string;
  recommendation: string;
  source_excerpt: string;
  source_document: string;
};

export type SectionComplianceResult = {
  section: string;
  section_label?: string;
  warnings: ComplianceWarning[];
  compliance_gaps: ComplianceGap[];
  scoring_hooks?: {
    overall_score: number;
    dimensions: Record<string, number>;
  };
};

export type AggregatedWarning = ComplianceWarning & {
  section: string;
  section_label?: string;
};

export type AggregatedComplianceGap = ComplianceGap & {
  section: string;
  section_label?: string;
};

export type ComplianceSummary = {
  sectionResults: SectionComplianceResult[];
  warnings: AggregatedWarning[];
  complianceGaps: AggregatedComplianceGap[];
};

export type RewriteReference = {
  rank: number;
  source: string;
  chunk_index?: number;
  distance?: number;
  snippet: string;
};

export type ProposalMetricIssue = {
  issue_id: string;
  title: string;
  message: string;
  severity: "success" | "info" | "warning" | "critical";
  confidence_score: number;
  section_key: string;
  anchor_type: "text" | "paragraph" | "section";
  anchor_text?: string | null;
  anchor_hint?: string | null;
  affected_sections: string[];
  excerpt?: string | null;
  recommendation: string;
};

export type ProposalMetric = {
  id: string;
  label: string;
  category_id: string;
  description: string;
  score: number;
  issues_count: number;
  status: string;
  summary: string;
  issues: ProposalMetricIssue[];
  suggestions: string[];
  linked_sections: string[];
};

export type ProposalMetricCategory = {
  id: string;
  label: string;
  score: number;
  issues: number;
  metrics: ProposalMetric[];
};

export type ProposalAnalysisSection = {
  key: string;
  title: string;
  body: string;
  order: number;
  word_limit?: number | null;
  issues_count: number;
  warnings: ComplianceWarning[];
  compliance_gaps: ComplianceGap[];
  section_score: number;
};

export type ProposalAnalysis = {
  analysis: {
    proposal_id: string;
    file_name: string;
    file_type: "pdf" | "docx";
    uploaded_at: string;
    last_analyzed_at: string;
  };
  extraction: {
    extractor: string;
    confidence: "high" | "medium" | "low";
    preview_mode: "sectioned" | "continuous";
    raw_text_length: number;
    cleaned_text_length: number;
    section_count: number;
    numbering_gaps_detected: boolean;
    warnings: string[];
    candidate_extractors: Array<{
      extractor: string;
      score: number;
      chars: number;
    }>;
  };
  overall_score: number;
  issue_count: number;
  categories: ProposalMetricCategory[];
  sections: ProposalAnalysisSection[];
  additional_submission_requirements: string[];
  assistant_starters: string[];
  raw_preview_text: string;
  report_summary: string;
};

export type ProposalRewriteResponse = {
  proposal_id: string;
  section_key: string;
  rewritten_text: string;
  rewrite_scope?: "paragraph" | "section";
  source_text?: string | null;
  rationale: string;
  references: RewriteReference[];
};

export type ProposalChatResponse = {
  proposal_id: string;
  response: string;
  suggested_actions: string[];
};

export type WorkspaceUser = {
  id: string;
  email: string;
  name: string;
  created_at?: string;
  updated_at?: string;
};

export type SavedProposal = {
  id: string;
  user_id: string;
  title: string;
  community_name: string;
  grant_name: string;
  status: string;
  current_step: number;
  created_at: string;
  updated_at: string;
  last_exported_at?: string | null;
  requirements?: Requirements | null;
  profile?: CommunityProfile | null;
  draft?: Draft | null;
  enhanced?: Record<string, string> | null;
  prompt_coverage?: Record<string, PromptCoverageSection> | null;
  validation?: ComplianceSummary | null;
  final_sections?: DraftSection[] | null;
};

export type SavedProposalInput = Partial<
  Pick<
    SavedProposal,
    | "title"
    | "community_name"
    | "grant_name"
    | "status"
    | "current_step"
    | "requirements"
    | "profile"
    | "draft"
    | "enhanced"
    | "prompt_coverage"
    | "validation"
    | "final_sections"
    | "last_exported_at"
  >
>;

export async function getCurrentUser(): Promise<WorkspaceUser> {
  const res = await fetch(`${API_BASE}/api/me`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to load account");
  }
  return res.json();
}

export async function listSavedProposals(): Promise<SavedProposal[]> {
  const res = await fetch(`${API_BASE}/api/proposals`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to load saved proposals");
  }
  const data = await res.json();
  return data.proposals || [];
}

export async function createSavedProposal(params: SavedProposalInput): Promise<SavedProposal> {
  const res = await fetch(`${API_BASE}/api/proposals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to create saved proposal");
  }
  return res.json();
}

export async function getSavedProposal(proposalId: string): Promise<SavedProposal> {
  const res = await fetch(`${API_BASE}/api/proposals/${proposalId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to load saved proposal");
  }
  return res.json();
}

export async function updateSavedProposal(proposalId: string, params: SavedProposalInput): Promise<SavedProposal> {
  const res = await fetch(`${API_BASE}/api/proposals/${proposalId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to save proposal");
  }
  return res.json();
}

export async function markSavedProposalExported(proposalId: string): Promise<SavedProposal> {
  const res = await fetch(`${API_BASE}/api/proposals/${proposalId}/exported`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to update export status");
  }
  return res.json();
}

export async function parseGrant(file: File): Promise<{
  requirements: Requirements;
  raw_text: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/parse-grant`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to parse grant");
  }
  return res.json();
}

export async function parseSupportingDocument(file: File): Promise<{
  filename: string;
  raw_text: string;
  char_count: number;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/parse-supporting-document`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to parse supporting document");
  }
  return res.json();
}

export async function generateDraft(
  profile: CommunityProfile,
  requirements: Requirements,
  requested_budget: number
): Promise<Draft> {
  const res = await fetch(`${API_BASE}/api/generate-draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      profile,
      requirements,
      requested_budget,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to generate draft");
  }
  return res.json();
}

export async function enhanceDraft(
  draft: Draft,
  requirements: Requirements,
  profile: CommunityProfile,
  useCase: string = RAG_USE_CASE
): Promise<{
  enhanced: Record<string, string>;
  prompt_coverage: Record<string, PromptCoverageSection>;
}> {
  const res = await fetch(`${API_BASE}/api/enhance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft, requirements, profile, use_case: useCase }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to enhance draft");
  }
  return res.json();
}

export async function validateDraft(
  draft: Draft,
  requirements: Requirements
): Promise<ValidationResult> {
  const res = await fetch(`${API_BASE}/api/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft, requirements }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to validate");
  }
  return res.json();
}

export async function evaluateSectionCompliance(params: {
  section_name: string;
  section_text: string;
}): Promise<SectionComplianceResult> {
  const res = await fetch(`${API_BASE}/evaluate/compliance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to evaluate compliance");
  }
  return res.json();
}

export async function evaluateDraftCompliance(
  sections: DraftSection[]
): Promise<ComplianceSummary> {
  const sectionResults = await Promise.all(
    sections.map(async (section) => {
      const result = await evaluateSectionCompliance({
        section_name: section.title || section.key,
        section_text: section.body || "",
      });
      return {
        ...result,
        section: section.key,
        section_label: section.title || section.key,
      };
    })
  );

  return {
    sectionResults,
    warnings: sectionResults.flatMap((result) =>
      result.warnings.map((warning) => ({
        ...warning,
        section: result.section,
        section_label: result.section_label,
      }))
    ),
    complianceGaps: sectionResults.flatMap((result) =>
      result.compliance_gaps.map((gap) => ({
        ...gap,
        section: result.section,
        section_label: result.section_label,
      }))
    ),
  };
}

export async function uploadExistingDraft(file: File): Promise<ProposalAnalysis> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/evaluate/proposal`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to analyze proposal draft");
  }
  return res.json();
}

export async function getProposalAnalysis(proposalId: string): Promise<ProposalAnalysis> {
  const res = await fetch(`${API_BASE}/evaluate/proposal/${proposalId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to load proposal analysis");
  }
  return res.json();
}

export async function reanalyzeProposal(params: {
  proposal_id: string;
  sections: ProposalAnalysisSection[];
}): Promise<ProposalAnalysis> {
  const res = await fetch(`${API_BASE}/evaluate/proposal/reanalyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to re-run proposal analysis");
  }
  return res.json();
}

export async function rewriteProposalSection(params: {
  proposal_id: string;
  section_key: string;
  instruction: string;
  rewrite_scope?: "paragraph" | "section";
  target_text?: string | null;
  metric_id?: string;
  issue_id?: string;
  issue_message?: string;
  issue_recommendation?: string;
}): Promise<ProposalRewriteResponse> {
  const res = await fetch(`${API_BASE}/evaluate/proposal/section-rewrite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to rewrite proposal section");
  }
  return res.json();
}

export async function chatAboutProposal(params: {
  proposal_id: string;
  message: string;
  section_key?: string;
  metric_id?: string;
}): Promise<ProposalChatResponse> {
  const res = await fetch(`${API_BASE}/evaluate/proposal/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to get assistant response");
  }
  return res.json();
}

export async function rewriteSection(
  params: {
    section_key: string;
    section_title: string;
    current_text: string;
    instruction: string;
    requirements: Requirements;
    profile: CommunityProfile;
    use_case?: string;
  }
): Promise<{ text: string; references: RewriteReference[] }> {
  const res = await fetch(`${API_BASE}/api/rewrite-section`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...params,
      use_case: params.use_case || RAG_USE_CASE,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to rewrite section");
  }
  return res.json();
}

export async function exportDraftPdf(params: {
  grant_name: string;
  community_name: string;
  region: string;
  local_priority: string;
  requested_budget?: number;
  sections: Array<{ key?: string; title: string; body: string }>;
}): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/export-draft-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to export PDF");
  }
  return res.blob();
}

export async function exportDraftDocx(params: {
  grant_name: string;
  community_name: string;
  region: string;
  local_priority: string;
  requested_budget?: number;
  sections: Array<{ key?: string; title: string; body: string }>;
}): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/export-draft-docx`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Failed to export DOCX");
  }
  return res.blob();
}
