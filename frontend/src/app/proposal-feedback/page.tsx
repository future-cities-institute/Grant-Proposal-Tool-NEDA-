"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, FileCheck2, FileText, Loader2, Upload } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { analyzeProposalUpload } from "@/lib/api";

const MAX_FILE_BYTES = 15 * 1024 * 1024;

export default function ProposalFeedbackUploadPage() {
  const router = useRouter();
  const [proposalFile, setProposalFile] = useState<File | null>(null);
  const [grantFile, setGrantFile] = useState<File | null>(null);
  const [inputError, setInputError] = useState("");
  const analysisMutation = useMutation({
    mutationFn: () => {
      if (!proposalFile) throw new Error("Select a proposal draft to continue.");
      return analyzeProposalUpload(proposalFile, grantFile);
    },
    onSuccess: (report) => router.push(`/proposal-feedback/${report.id}`),
  });

  const selectFile = (file: File | undefined, kind: "proposal" | "grant") => {
    setInputError("");
    if (!file) {
      if (kind === "proposal") setProposalFile(null);
      else setGrantFile(null);
      return;
    }
    const allowed = kind === "proposal" ? /\.(pdf|docx)$/i : /\.(pdf|docx|txt)$/i;
    if (!allowed.test(file.name)) {
      setInputError(kind === "proposal" ? "Proposal drafts must be PDF or DOCX files." : "Grant guidelines must be PDF, DOCX, or TXT files.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setInputError(`${kind === "proposal" ? "Proposal" : "Grant-guideline"} files must be 15 MB or smaller.`);
      return;
    }
    if (kind === "proposal") setProposalFile(file);
    else setGrantFile(file);
  };

  const error = inputError || (analysisMutation.error instanceof Error ? analysisMutation.error.message : "");

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="text-sm font-medium text-primary">Proposal review</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Review an existing proposal</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Upload a draft for a standardized proposal-readiness review. Adding the relevant grant guidelines provides context for funding-alignment findings.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Review files</CardTitle>
            <CardDescription>The uploaded files are processed for this review. Original file bytes are not retained in your saved report.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FileInput
              id="proposal-file"
              label="Proposal draft"
              description="Required · PDF or DOCX · maximum 15 MB"
              accept=".pdf,.docx"
              file={proposalFile}
              onChange={(file) => selectFile(file, "proposal")}
            />
            <FileInput
              id="grant-file"
              label="Grant guidelines"
              description="Recommended · PDF, DOCX, or TXT · maximum 15 MB"
              accept=".pdf,.docx,.txt"
              file={grantFile}
              onChange={(file) => selectFile(file, "grant")}
            />

            {error && (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                size="lg"
                disabled={!proposalFile || analysisMutation.isPending}
                onClick={() => analysisMutation.mutate()}
              >
                {analysisMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck2 className="mr-2 h-4 w-4" />}
                {analysisMutation.isPending ? "Analyzing proposal..." : "Review proposal"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function FileInput({
  id,
  label,
  description,
  accept,
  file,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  accept: string;
  file: File | null;
  onChange: (file?: File) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-background/50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          {file && <p className="mt-1 truncate text-sm font-medium text-primary">{file.name}</p>}
        </div>
        <label htmlFor={id} className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-input bg-background px-4 text-sm font-semibold shadow-sm transition-colors hover:bg-accent">
          <Upload className="mr-2 h-4 w-4" />
          {file ? "Replace file" : "Select file"}
        </label>
        <input id={id} type="file" accept={accept} className="sr-only" onChange={(event) => onChange(event.target.files?.[0])} />
      </div>
    </div>
  );
}
