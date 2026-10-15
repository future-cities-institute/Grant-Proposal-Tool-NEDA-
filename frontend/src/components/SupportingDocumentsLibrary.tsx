"use client";

import { useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Copy, FileText, FolderOpen, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import {
  deleteSupportingDocument,
  getSupportingDocument,
  listSupportingDocuments,
  parseSupportingDocument,
  saveSupportingDocument,
  type SupportingDocument,
} from "@/lib/api";

const SUPPORTING_DOCUMENTS_KEY = ["supporting-documents"];

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function DocumentRow({ document }: { document: SupportingDocument }) {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [expanded, setExpanded] = useState(false);

  const detailQuery = useQuery({
    queryKey: [...SUPPORTING_DOCUMENTS_KEY, document.id],
    queryFn: () => getSupportingDocument(document.id),
    enabled: expanded,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteSupportingDocument(document.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUPPORTING_DOCUMENTS_KEY });
      showToast({ title: "Document deleted", description: document.filename });
    },
    onError: (err) => {
      showToast({
        title: "Could not delete document",
        description: err instanceof Error ? err.message : undefined,
        variant: "error",
      });
    },
  });

  const copyText = async () => {
    try {
      const text = detailQuery.data?.raw_text ?? (await getSupportingDocument(document.id)).raw_text ?? "";
      await navigator.clipboard.writeText(text);
      showToast({ title: "Text copied", description: `Paste it into a proposal's supporting context.` });
    } catch {
      showToast({ title: "Could not copy text", variant: "error" });
    }
  };

  return (
    <div className="rounded-lg border border-border bg-background/60 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground" title={document.filename}>
              {document.filename}
            </p>
            <p className="text-xs text-muted-foreground">
              Uploaded {formatDate(document.created_at)} · {document.char_count.toLocaleString()} characters
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setExpanded((open) => !open)}>
            {expanded ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
            {expanded ? "Hide" : "View"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={copyText}>
            <Copy className="mr-1 h-4 w-4" />
            Copy
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (window.confirm(`Delete “${document.filename}”? This cannot be undone.`)) deleteMutation.mutate();
            }}
          >
            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
      {expanded ? (
        <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {detailQuery.isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading extracted text...
            </span>
          ) : detailQuery.isError ? (
            <span className="text-destructive">Could not load this document.</span>
          ) : (
            detailQuery.data?.raw_text || "No text extracted."
          )}
        </div>
      ) : (
        document.preview && (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{document.preview}</p>
        )
      )}
    </div>
  );
}

export function SupportingDocumentsLibrary() {
  const queryClient = useQueryClient();
  const showToast = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const documentsQuery = useQuery({
    queryKey: SUPPORTING_DOCUMENTS_KEY,
    queryFn: listSupportingDocuments,
  });

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      const parsed = await Promise.all(files.map((file) => parseSupportingDocument(file)));
      await Promise.all(parsed.map((item) => saveSupportingDocument(item)));
      await queryClient.invalidateQueries({ queryKey: SUPPORTING_DOCUMENTS_KEY });
      showToast({
        title: parsed.length === 1 ? "Upload successful" : `${parsed.length} documents uploaded`,
        description: parsed.map((item) => item.filename).join(", "),
      });
    } catch (err) {
      showToast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload supporting document.",
        variant: "error",
      });
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  const documents = documentsQuery.data || [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="flex gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-lg">Uploaded documents</CardTitle>
            <CardDescription>
              Supporting documents you&apos;ve uploaded — community plans, letters, budgets, and reports.
            </CardDescription>
          </div>
        </div>
        <div className="shrink-0">
          <input
            id="library-supporting-upload"
            type="file"
            multiple
            accept=".txt,.md,.csv,.json,.pdf,.docx"
            className="hidden"
            onChange={handleUpload}
            disabled={isUploading}
          />
          <Button
            type="button"
            disabled={isUploading}
            onClick={() => document.getElementById("library-supporting-upload")?.click()}
          >
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isUploading ? "Uploading..." : "Upload documents"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {documentsQuery.isLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading documents...
          </p>
        ) : documentsQuery.isError ? (
          <p className="text-sm text-destructive">
            {documentsQuery.error instanceof Error ? documentsQuery.error.message : "Could not load documents."}
          </p>
        ) : documents.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No documents uploaded yet. Files you add in a proposal&apos;s Supporting Documents section will appear here.
          </p>
        ) : (
          documents.map((doc) => <DocumentRow key={doc.id} document={doc} />)
        )}
      </CardContent>
    </Card>
  );
}
