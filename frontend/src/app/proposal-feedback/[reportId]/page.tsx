"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  Loader2,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getProposalFeedbackReport,
  type ProposalAnalysis,
  type ProposalFeedbackReport,
  type ProposalMetricIssue,
} from "@/lib/api";

type PriorityFinding = ProposalMetricIssue & {
  categoryLabel: string;
  metricLabel: string;
  metricScore: number;
};

export default function ProposalFeedbackReportPage({ params }: { params: { reportId: string } }) {
  const reportQuery = useQuery({
    queryKey: ["proposal-feedback-report", params.reportId],
    queryFn: () => getProposalFeedbackReport(params.reportId),
  });
  const report = reportQuery.data;
  const analysis = getAnalysis(report?.report?.analysis);

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-6 pb-12">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        {reportQuery.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading review report...</p>
        ) : reportQuery.isError || !report ? (
          <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> This review report could not be loaded.
          </p>
        ) : !analysis ? (
          <p className="flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4" /> This saved report does not contain detailed analysis results.
          </p>
        ) : (
          <FeedbackReport report={report} analysis={analysis} />
        )}
      </main>
    </AppShell>
  );
}

function FeedbackReport({
  report,
  analysis,
}: {
  report: ProposalFeedbackReport;
  analysis: ProposalAnalysis;
}) {
  const priorities = buildPriorities(analysis);
  const strengths = analysis.categories
    .filter((category) => category.assessed !== false)
    .flatMap((category) => category.metrics.map((metric) => ({ ...metric, categoryLabel: category.label })))
    .filter((metric) => metric.issues_count === 0 && metric.score >= 85)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
  const extractionNeedsReview =
    analysis.extraction.confidence !== "high" ||
    analysis.extraction.preview_mode === "continuous" ||
    analysis.extraction.warnings.length > 0;

  return (
    <>
      <header>
        <p className="text-sm font-medium text-primary">Saved proposal review</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{report.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Analyzed {new Date(report.analyzed_at).toLocaleString()} · Rubric {analysis.rubric_version}
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <ScoreRing score={analysis.overall_score} />
            <div>
              <h2 className="text-lg font-semibold text-foreground">Overall readiness</h2>
              <p className="text-sm font-medium text-primary">{analysis.score_label}</p>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              This readiness score highlights revision priorities; it is not a prediction of funding success.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-lg">Readiness by category</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {analysis.categories.map((category) => (
              <div key={category.id}>
                <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                  <span className="font-medium text-foreground">{category.label}</span>
                  <span className="shrink-0 font-semibold text-foreground">
                    {category.assessed === false ? "Not assessed" : `${category.score}%`}
                  </span>
                </div>
                {category.assessed === false ? (
                  <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{category.not_assessed_reason}</p>
                ) : (
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted" aria-label={`${category.label}: ${category.score}%`}>
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(2, category.score)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {extractionNeedsReview && (
        <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <FileSearch className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Confirm the extracted content</p>
            <p className="mt-1 text-sm leading-relaxed">
              The document was extracted with {analysis.extraction.confidence} confidence across {analysis.extraction.section_count} sections. Review the detailed findings against the original proposal before making changes.
            </p>
            {analysis.extraction.warnings.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {analysis.extraction.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> What is working well</CardTitle></CardHeader>
          <CardContent>
            {strengths.length ? (
              <ul className="space-y-3">
                {strengths.map((metric) => (
                  <li key={metric.id} className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <p className="font-medium text-foreground">{metric.label}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{metric.categoryLabel} · {metric.score}%</p>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Address the priority findings first; strengths will become clearer after revision.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Target className="h-5 w-5 text-primary" /> Priority improvements</CardTitle></CardHeader>
          <CardContent>
            {priorities.length ? (
              <ol className="space-y-3">
                {priorities.slice(0, 6).map((finding, index) => (
                  <li key={finding.issue_id} className="flex gap-3 rounded-lg border border-border p-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                    <div>
                      <p className="font-medium text-foreground">{finding.message}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{finding.recommendation}</p>
                      <p className="mt-2 text-xs font-medium text-primary">{finding.categoryLabel} · {finding.metricLabel}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-muted-foreground">No material issues were identified by the readiness rubric.</p>}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Detailed findings</CardTitle>
          <p className="text-sm text-muted-foreground">Expand a category to review its metrics, evidence and recommended actions.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.categories.map((category) => (
            <details key={category.id} className="group rounded-xl border border-border bg-background">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-4">
                <div>
                  <span className="font-semibold text-foreground">{category.label}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {category.assessed === false ? "Not assessed" : `${category.issues} finding${category.issues === 1 ? "" : "s"}`}
                  </span>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="space-y-3 border-t border-border p-4">
                {category.assessed === false ? (
                  <p className="text-sm text-muted-foreground">{category.not_assessed_reason}</p>
                ) : category.metrics.map((metric) => (
                  <div key={metric.id} className="rounded-lg bg-muted/40 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div><h3 className="font-medium text-foreground">{metric.label}</h3><p className="mt-1 text-sm text-muted-foreground">{metric.summary}</p></div>
                      <span className="shrink-0 text-sm font-semibold text-foreground">{metric.score}%</span>
                    </div>
                    {metric.issues.length > 0 && (
                      <ul className="mt-3 space-y-2 border-t border-border pt-3">
                        {metric.issues.map((issue) => (
                          <li key={issue.issue_id} className="text-sm">
                            <p className="flex items-start gap-2 font-medium text-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /> {issue.message}</p>
                            <p className="mt-1 pl-6 text-muted-foreground"><span className="font-medium">Recommended action:</span> {issue.recommendation}</p>
                            {issue.excerpt && <p className="mt-1 pl-6 text-xs italic text-muted-foreground">Evidence: “{issue.excerpt}”</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg viewBox="0 0 112 112" className="h-32 w-32 -rotate-90" role="img" aria-label={`Overall readiness score ${clamped} out of 100`}>
        <circle cx="56" cy="56" r={radius} fill="none" className="stroke-muted" strokeWidth="10" />
        <circle cx="56" cy="56" r={radius} fill="none" className="stroke-primary" strokeWidth="10" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - clamped / 100)} />
      </svg>
      <span className="absolute text-3xl font-semibold text-foreground">{clamped}<span className="text-base text-muted-foreground">/100</span></span>
    </div>
  );
}

function getAnalysis(value: unknown): ProposalAnalysis | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ProposalAnalysis>;
  return candidate.analysis && candidate.extraction && Array.isArray(candidate.categories) && Array.isArray(candidate.sections)
    ? candidate as ProposalAnalysis
    : null;
}

function buildPriorities(analysis: ProposalAnalysis): PriorityFinding[] {
  const severityRank = { critical: 0, warning: 1, info: 2, success: 3 };
  return analysis.categories
    .filter((category) => category.assessed !== false)
    .flatMap((category) => category.metrics.flatMap((metric) => metric.issues.map((issue) => ({
      ...issue,
      categoryLabel: category.label,
      metricLabel: metric.label,
      metricScore: metric.score,
    }))))
    .sort((left, right) => severityRank[left.severity] - severityRank[right.severity] || left.metricScore - right.metricScore || right.confidence_score - left.confidence_score);
}
