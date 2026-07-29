import type { ComplianceGap, ComplianceWarning } from "@/lib/api";

export type GuidedIssueStatus = "open" | "suggested" | "applied" | "dismissed" | "resolved";

export type GuidedEditorIssue = {
  id: string;
  sectionKey: string;
  sectionTitle: string;
  category: "missing_information" | "compliance" | "specificity" | "wording";
  severity: "high" | "medium" | "low";
  title: string;
  explanation: string;
  recommendedAction: string;
  anchorType: "paragraph" | "section";
  anchorExcerpt?: string;
  requiresUserInformation: boolean;
  canSuggestRewrite: boolean;
};

type ReviewPrompt = {
  promptId: string;
  promptText: string;
  status: string;
  reviewNote?: string;
};

export function buildGuidedEditorIssues(params: {
  sectionKey: string;
  sectionTitle: string;
  sectionBody: string;
  warnings: ComplianceWarning[];
  gaps: ComplianceGap[];
  reviewPrompts: ReviewPrompt[];
}): GuidedEditorIssue[] {
  const { sectionKey, sectionTitle, sectionBody, warnings, gaps, reviewPrompts } = params;
  const promptIssues = reviewPrompts.map<GuidedEditorIssue>((prompt) => ({
    id: `${sectionKey}:prompt:${prompt.promptId}`,
    sectionKey,
    sectionTitle,
    category: "missing_information",
    severity: prompt.status === "missing" ? "high" : "medium",
    title: prompt.status === "missing" ? `Answer ${prompt.promptId}` : `Confirm ${prompt.promptId}`,
    explanation: prompt.reviewNote || prompt.promptText,
    recommendedAction: `Provide verified information for: ${prompt.promptText}`,
    anchorType: "section",
    requiresUserInformation: true,
    canSuggestRewrite: true,
  }));

  const gapIssues = gaps.map<GuidedEditorIssue>((gap) => {
    const excerpt = findAnchorExcerpt(sectionBody, gap.source_excerpt);
    const requiresFacts = needsVerifiedInformation(`${gap.message} ${gap.recommendation}`);
    return {
      id: `${sectionKey}:gap:${gap.failed_check_id}`,
      sectionKey,
      sectionTitle,
      category: "compliance",
      severity: gap.severity === "critical" ? "high" : gap.severity === "major" ? "medium" : "low",
      title: gap.message,
      explanation: `This finding is based on ${gap.source_document || "the grant requirements"}.`,
      recommendedAction: gap.recommendation,
      anchorType: excerpt ? "paragraph" : "section",
      anchorExcerpt: excerpt,
      requiresUserInformation: requiresFacts,
      canSuggestRewrite: true,
    };
  });

  const warningIssues = warnings.map<GuidedEditorIssue>((warning, index) => {
    const isEmpty = warning.type === "empty_section" || warning.type === "whitespace_only_section";
    const isWordLimit = warning.type.includes("word_limit");
    return {
      id: `${sectionKey}:warning:${warning.type}:${index}`,
      sectionKey,
      sectionTitle,
      category: isWordLimit ? "wording" : isEmpty ? "missing_information" : "specificity",
      severity: isEmpty ? "high" : "medium",
      title: warning.message,
      explanation: warningExplanation(warning.type),
      recommendedAction: warningAction(warning.type),
      anchorType: "section",
      requiresUserInformation: isEmpty,
      canSuggestRewrite: !isEmpty || sectionBody.trim().length > 0,
    };
  });

  return dedupeIssues([...promptIssues, ...gapIssues, ...warningIssues]);
}

function findAnchorExcerpt(body: string, candidate?: string) {
  const excerpt = (candidate || "").trim();
  if (!excerpt || excerpt.length < 12) return undefined;
  return body.toLowerCase().includes(excerpt.toLowerCase()) ? excerpt : undefined;
}

function needsVerifiedInformation(text: string) {
  return /\b(provide|identify|name|specify|confirm|add evidence|include evidence|date|amount|number|budget|who will)\b/i.test(text);
}

function warningExplanation(type: string) {
  if (type === "word_limit_exceeded") return "The section may be rejected or truncated if it exceeds the funder's limit.";
  if (type === "below_expected_word_limit") return "The response may not contain enough detail to address the funder's expectations.";
  if (type === "empty_section" || type === "whitespace_only_section") return "The funder expects a response for this section.";
  if (type.includes("sensitive")) return "This content should be reviewed before it is included in an external submission.";
  return "This section contains a review signal that may affect clarity or completeness.";
}

function warningAction(type: string) {
  if (type === "word_limit_exceeded") return "Shorten the section while preserving facts, figures, and required answers.";
  if (type === "below_expected_word_limit") return "Add concrete evidence, responsibilities, outcomes, or implementation details.";
  if (type === "empty_section" || type === "whitespace_only_section") return "Provide the facts needed to draft this section.";
  if (type.includes("sensitive")) return "Confirm that this information is appropriate and authorized for submission.";
  return "Review the flagged section and make the recommended clarification.";
}

function dedupeIssues(issues: GuidedEditorIssue[]) {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.sectionKey}:${issue.title}:${issue.recommendedAction}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
