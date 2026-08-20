"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  FileSearch,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/Providers";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteProposalFeedbackReport,
  listProposalFeedbackReports,
  listSavedProposals,
  type SavedProposal,
} from "@/lib/api";

const prepItems = [
  "Grant application package or guidelines",
  "Community and applicant information",
  "Project goals, timeline, budget, and partners",
  "Any local plans, letters, or supporting documents",
];

export function DashboardScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const proposalsQuery = useQuery({
    queryKey: ["saved-proposals"],
    queryFn: listSavedProposals,
  });
  const savedProposals = proposalsQuery.data || [];
  const reportsQuery = useQuery({ queryKey: ["proposal-feedback-reports"], queryFn: listProposalFeedbackReports });
  const feedbackReports = reportsQuery.data || [];
  const deleteReportMutation = useMutation({
    mutationFn: deleteProposalFeedbackReport,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proposal-feedback-reports"] }),
  });
  const exportedCount = savedProposals.filter((proposal) => proposal.status === "exported").length;
  const lastActivity = savedProposals[0]?.updated_at ? formatActivityTime(savedProposals[0].updated_at) : "No activity";
  const displayName = getDisplayName(user);

  return (
    <AppShell>
      <div className="space-y-8">
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
          <div>
            <p className="text-sm font-medium text-primary">Proposal workspace</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              Welcome back, {displayName}
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Start a new proposal, resume a saved draft, or review the resources that will support the main generation workflow.
            </p>
          </div>
          <div className="space-y-2 self-end">
            <Link href="/proposal" className="block">
              <Button size="lg" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Start New Proposal
              </Button>
            </Link>
            <Link href="/proposal-feedback" className="block">
              <Button size="lg" variant="outline" className="w-full">
                <FileSearch className="mr-2 h-4 w-4" />
                Review an Existing Proposal
              </Button>
            </Link>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
          <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Saved proposals", value: String(savedProposals.length), icon: FileText },
                { label: "Exported drafts", value: String(exportedCount), icon: CheckCircle2 },
                { label: "Last activity", value: lastActivity, icon: Clock3 },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Card key={item.label}>
                    <CardContent className="flex items-center gap-4 p-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-semibold text-foreground">{item.value}</p>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Saved Proposals</CardTitle>
                <CardDescription>
                  Resume a proposal, review recent activity, or start a new draft from a grant package.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {proposalsQuery.isLoading ? (
                  <p className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                    Loading saved proposals...
                  </p>
                ) : proposalsQuery.isError ? (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                    Could not load saved proposals. Make sure the backend server is running.
                  </p>
                ) : savedProposals.length === 0 ? (
                  <div className="rounded-lg border border-border bg-background/40 p-5">
                    <p className="font-medium text-foreground">No saved proposals yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Start a new proposal to save your grant package, intake details, generated sections, and export history.
                    </p>
                  </div>
                ) : (
                  savedProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 sm:flex-row sm:items-center"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{proposal.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {(proposal.community_name || proposal.grant_name || "Proposal")} - {formatStatus(proposal.status)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {formatActivityTime(proposal.updated_at)}
                      </span>
                      <Link href={`/proposals/${proposal.id}`}>
                        <Button variant="outline" size="sm">
                          Open
                        </Button>
                      </Link>
                    </div>
                  </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Proposal Review Reports</CardTitle>
                <CardDescription>Revisit readiness scores and recommendations from previous proposal reviews.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {reportsQuery.isLoading ? (
                  <p className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">Loading review reports...</p>
                ) : reportsQuery.isError ? (
                  <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">Could not load proposal review reports.</p>
                ) : feedbackReports.length === 0 ? (
                  <div className="rounded-lg border border-border bg-background/40 p-5">
                    <p className="font-medium text-foreground">No review reports yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">Upload an existing proposal or review a generated draft to create your first readiness report.</p>
                  </div>
                ) : feedbackReports.map((report) => (
                  <div key={report.id} className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-4 sm:flex-row sm:items-center">
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-lg font-semibold leading-none">{Math.round(report.overall_score || 0)}</span>
                      <span className="text-[10px]">/100</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{report.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.priority_issue_count} priority finding{report.priority_issue_count === 1 ? "" : "s"} · {formatActivityTime(report.analyzed_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/proposal-feedback/${report.id}`}><Button variant="outline" size="sm">View report</Button></Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Delete ${report.title}`}
                        disabled={deleteReportMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Delete “${report.title}”? This cannot be undone.`)) deleteReportMutation.mutate(report.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {deleteReportMutation.isError && <p className="text-sm text-destructive">The review report could not be deleted. Please try again.</p>}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Community Profile</CardTitle>
                <CardDescription>
                  Save applicant and community details once so new proposals only ask for application-specific information.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/account">
                  <Button variant="outline" className="w-full">Review Community Profile</Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-primary/25 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base">Main workflow</CardTitle>
                <CardDescription>
                  Generate a new proposal from grant requirements, community context, and supporting documents.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/proposal">
                  <Button className="w-full">
                    Continue to Builder
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">What you will need</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {prepItems.map((item) => (
                  <div key={item} className="flex gap-3 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Privacy note</CardTitle>
                <CardDescription>
                  Your proposal materials are used to support drafting, review, and export within your workspace.
                </CardDescription>
              </CardHeader>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function getDisplayName(user: ReturnType<typeof useAuth>["user"]) {
  const metadata = user?.user_metadata || {};
  const name =
    metadata.full_name ||
    metadata.name ||
    user?.email?.split("@")[0] ||
    "there";
  return String(name).trim() || "there";
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
