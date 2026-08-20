"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, BarChart3, Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProposalFeedbackReport } from "@/lib/api";

export default function ProposalFeedbackReportPage({ params }: { params: { reportId: string } }) {
  const reportQuery = useQuery({
    queryKey: ["proposal-feedback-report", params.reportId],
    queryFn: () => getProposalFeedbackReport(params.reportId),
  });
  const report = reportQuery.data;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>
        {reportQuery.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading review report...</p>
        ) : reportQuery.isError || !report ? (
          <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> This review report could not be loaded.
          </p>
        ) : (
          <>
            <div>
              <p className="text-sm font-medium text-primary">Saved proposal review</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{report.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">Analyzed {new Date(report.analyzed_at).toLocaleString()} · Rubric {report.rubric_version}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-4 w-4" /> Overall readiness</CardTitle></CardHeader>
                <CardContent><p className="text-5xl font-semibold text-primary">{Math.round(report.overall_score || 0)}<span className="text-xl">/100</span></p><p className="mt-3 text-sm text-muted-foreground">{report.priority_issue_count} priority findings</p></CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Category scores</CardTitle></CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  {Object.entries(report.category_scores).map(([category, score]) => (
                    <div key={category} className="rounded-lg border border-border bg-background/50 p-3">
                      <p className="text-sm text-muted-foreground">{formatCategory(category)}</p>
                      <p className="mt-1 text-2xl font-semibold text-foreground">{Math.round(score)}%</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function formatCategory(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
