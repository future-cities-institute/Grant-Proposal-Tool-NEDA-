"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarClock, Download, FileText, History, PencilLine, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSavedProposal } from "@/lib/api";

export default function ProposalDetailPage({ params }: { params: { proposalId: string } }) {
  const proposalQuery = useQuery({
    queryKey: ["saved-proposal", params.proposalId],
    queryFn: () => getSavedProposal(params.proposalId),
  });
  const proposal = proposalQuery.data;
  const versions = buildVersionHistory(proposal);

  return (
    <AppShell>
      <div className="space-y-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Saved proposal</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {proposal?.title || "Proposal"}
            </h1>
            <p className="mt-2 text-muted-foreground">
              Proposal ID: {params.proposalId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/proposal">
              <Button variant="outline">
                <PencilLine className="mr-2 h-4 w-4" />
                Resume Builder
              </Button>
            </Link>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export Latest
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <CardHeader>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <History className="h-5 w-5" />
              </div>
              <CardTitle>Version History</CardTitle>
              <CardDescription>
                Review saved proposal milestones and continue from the latest version.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {proposalQuery.isLoading ? (
                <p className="rounded-lg border border-border bg-background/40 p-4 text-sm text-muted-foreground">
                  Loading proposal history...
                </p>
              ) : proposalQuery.isError ? (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  Could not load this proposal.
                </p>
              ) : (
                versions.map((version) => (
                <div key={version.label} className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-medium text-foreground">{version.label}</p>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" />
                      {version.timestamp}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{version.detail}</p>
                </div>
                ))
              )}
            </CardContent>
          </Card>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Proposal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between gap-3">
                  <span>Community</span>
                  <span className="font-medium text-foreground">{proposal?.community_name || "Not set"}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Status</span>
                  <span className="font-medium text-foreground">{formatStatus(proposal?.status || "draft")}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Sections</span>
                  <span className="font-medium text-foreground">{proposal?.final_sections?.length || proposal?.draft?.sections?.length || 0}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/25 bg-primary/5">
              <CardHeader>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background/50 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <CardTitle className="text-base">Create another version</CardTitle>
                <CardDescription>
                  Duplicate this record to create a separate working version while preserving this proposal history.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Duplicate Proposal
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function buildVersionHistory(proposal?: Awaited<ReturnType<typeof getSavedProposal>>) {
  if (!proposal) return [];
  const entries = [
    {
      label: "Proposal created",
      timestamp: formatActivityTime(proposal.created_at),
      detail: "A proposal workspace was created for this grant package.",
    },
  ];
  if (proposal.requirements) {
    entries.push({
      label: "Grant package reviewed",
      timestamp: formatActivityTime(proposal.updated_at),
      detail: "Grant requirements and section prompts were extracted for drafting.",
    });
  }
  if (proposal.draft) {
    entries.push({
      label: "Draft generated",
      timestamp: formatActivityTime(proposal.updated_at),
      detail: "Proposal sections were generated from the community intake and grant requirements.",
    });
  }
  if (proposal.final_sections?.length) {
    entries.push({
      label: "Ready for export",
      timestamp: formatActivityTime(proposal.updated_at),
      detail: "Final section edits were saved for export.",
    });
  }
  if (proposal.last_exported_at) {
    entries.push({
      label: "Export completed",
      timestamp: formatActivityTime(proposal.last_exported_at),
      detail: "A proposal export was generated.",
    });
  }
  return entries;
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
