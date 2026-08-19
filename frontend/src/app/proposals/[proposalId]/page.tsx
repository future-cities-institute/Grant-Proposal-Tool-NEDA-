"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, CalendarClock, Check, Clipboard, Download, FileText, History, Loader2, PencilLine, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  duplicateSavedProposal,
  exportDraftDocx,
  exportDraftPdf,
  getSavedProposal,
  markSavedProposalExported,
  type DraftSection,
} from "@/lib/api";
import { copyProposalText, formatProposalText } from "@/lib/proposalClipboard";
import { useState } from "react";

export default function ProposalDetailPage({ params }: { params: { proposalId: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const proposalQuery = useQuery({
    queryKey: ["saved-proposal", params.proposalId],
    queryFn: () => getSavedProposal(params.proposalId),
  });
  const proposal = proposalQuery.data;
  const versions = buildVersionHistory(proposal);
  const exportSections = buildExportSections(proposal);
  const hasExportableDraft = exportSections.length > 0;
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!proposal || exportSections.length === 0) throw new Error("This proposal does not have an exportable draft yet.");
      const profile = { ...(proposal.community_profile_snapshot || {}), ...(proposal.application_details || {}), ...(proposal.profile || {}) };
      return exportDraftPdf({
        grant_name: proposal.grant_name || proposal.requirements?.grant_name || "",
        community_name: proposal.community_name || profile.community_name || "",
        region: profile.region || "",
        local_priority: profile.local_priority || "",
        requested_budget: profile.requested_budget,
        sections: exportSections,
      });
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeDownloadName(proposal?.title || "grant_proposal")}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      void markSavedProposalExported(params.proposalId).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["saved-proposal", params.proposalId] });
        void queryClient.invalidateQueries({ queryKey: ["saved-proposals"] });
      });
    },
  });
  const docxExportMutation = useMutation({
    mutationFn: async () => {
      if (!proposal || exportSections.length === 0) throw new Error("This proposal does not have an exportable draft yet.");
      const profile = { ...(proposal.community_profile_snapshot || {}), ...(proposal.application_details || {}), ...(proposal.profile || {}) };
      return exportDraftDocx({
        grant_name: proposal.grant_name || proposal.requirements?.grant_name || "",
        community_name: proposal.community_name || profile.community_name || "",
        region: profile.region || "",
        local_priority: profile.local_priority || "",
        requested_budget: profile.requested_budget,
        sections: exportSections,
      });
    },
    onSuccess: (blob) => {
      downloadBlob(blob, `${safeDownloadName(proposal?.title || "grant_proposal")}.docx`);
      void markSavedProposalExported(params.proposalId).then(() => {
        void queryClient.invalidateQueries({ queryKey: ["saved-proposal", params.proposalId] });
        void queryClient.invalidateQueries({ queryKey: ["saved-proposals"] });
      });
    },
  });
  const duplicateMutation = useMutation({
    mutationFn: () => duplicateSavedProposal(params.proposalId),
    onSuccess: (copy) => {
      void queryClient.invalidateQueries({ queryKey: ["saved-proposals"] });
      router.push(`/proposals/${copy.id}`);
    },
  });

  const copySavedProposal = async () => {
    if (!proposal) return;
    const profile = { ...(proposal.community_profile_snapshot || {}), ...(proposal.application_details || {}), ...(proposal.profile || {}) };
    try {
      await copyProposalText(
        formatProposalText({
          grantName: proposal.grant_name || proposal.requirements?.grant_name,
          communityName: proposal.community_name || profile.community_name,
          region: profile.region,
          requestedBudget: profile.requested_budget,
          sections: exportSections,
        })
      );
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 2500);
    } catch {
      setCopyStatus("error");
    }
  };

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
            <Link href={`/proposal?proposalId=${params.proposalId}`}>
              <Button variant="outline">
                <PencilLine className="mr-2 h-4 w-4" />
                Continue editing
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => void copySavedProposal()}
              disabled={!proposal || !hasExportableDraft || exportMutation.isPending || docxExportMutation.isPending}
            >
              {copyStatus === "copied" ? <Check className="mr-2 h-4 w-4" /> : <Clipboard className="mr-2 h-4 w-4" />}
              {copyStatus === "copied" ? "Copied" : "Copy proposal text"}
            </Button>
            <Button
              variant="outline"
              onClick={() => docxExportMutation.mutate()}
              disabled={!proposal || !hasExportableDraft || docxExportMutation.isPending || exportMutation.isPending}
            >
              {docxExportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
              {docxExportMutation.isPending ? "Preparing DOCX..." : hasExportableDraft ? "Download DOCX" : "No draft available"}
            </Button>
            <Button
              onClick={() => exportMutation.mutate()}
              disabled={!proposal || !hasExportableDraft || exportMutation.isPending || docxExportMutation.isPending}
            >
              {exportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {exportMutation.isPending ? "Preparing PDF..." : hasExportableDraft ? "Download latest PDF" : "No draft available"}
            </Button>
          </div>
        </div>

        {(exportMutation.isError || docxExportMutation.isError || duplicateMutation.isError || copyStatus === "error") && (
          <p className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {copyStatus === "error"
              ? "The proposal could not be copied. Check your browser permissions and try again."
              : (exportMutation.error || docxExportMutation.error || duplicateMutation.error)?.message || "The action could not be completed."}
          </p>
        )}

        {proposal && !hasExportableDraft && (
          <div className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-4 text-sm text-foreground">
            <p className="font-medium">This record contains a reviewed grant package, but no generated proposal draft yet.</p>
            <p className="mt-1 text-muted-foreground">
              Select Continue editing, complete the application details, and generate the report before exporting the proposal.
            </p>
          </div>
        )}

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
                  <span>Draft sections</span>
                  <span className="font-medium text-foreground">{proposal?.final_sections?.length || proposal?.draft?.sections?.length || 0}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Extracted grant sections</span>
                  <span className="font-medium text-foreground">{proposal?.requirements?.sections?.length || 0}</span>
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => duplicateMutation.mutate()}
                  disabled={!proposal || duplicateMutation.isPending}
                >
                  {duplicateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  {duplicateMutation.isPending ? "Creating copy..." : "Create a copy"}
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

function buildExportSections(proposal?: Awaited<ReturnType<typeof getSavedProposal>>): DraftSection[] {
  if (!proposal) return [];
  if (proposal.final_sections?.length) return proposal.final_sections;
  return (proposal.draft?.sections || []).map((section) => ({
    ...section,
    body: proposal.enhanced?.[section.key] || section.body,
  }));
}

function safeDownloadName(value: string) {
  return value.trim().replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "") || "grant_proposal";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
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
