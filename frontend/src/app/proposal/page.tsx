"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  FileUp,
  FileText,
  Check,
  Loader2,
  Upload,
  AlertCircle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  parseGrant,
  generateDraft,
  enhanceDraft,
  evaluateDraftCompliance,
  type Requirements,
  type CommunityProfile,
  type Draft,
  type DraftSection,
  type ComplianceSummary,
  type PromptCoverageSection,
  type StructuredAnswersSection,
  exportDraftPdf,
  createSavedProposal,
  updateSavedProposal,
  markSavedProposalExported,
  getCommunityProfile,
  getSavedProposal,
  type SavedProposal,
} from "@/lib/api";
import {
  COMMUNITY_PROFILE_FIELD_KEYS,
  CommunityForm,
  blankCommunityFormValues,
  type CommunityFormValues,
} from "@/components/CommunityForm";
import { ProposalSections } from "@/components/ProposalSections";
import { ReportView } from "@/components/ReportView";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";

const STEPS = [
  { id: 1, label: "Upload grant package" },
  { id: 2, label: "Review sections" },
  { id: 3, label: "Application details" },
  { id: 4, label: "Generate report" },
  { id: 5, label: "Export draft" },
];

function applicationDetailsFrom(values: CommunityFormValues): Partial<CommunityProfile> {
  const reusable = new Set<string>(COMMUNITY_PROFILE_FIELD_KEYS);
  return Object.fromEntries(Object.entries(values).filter(([key]) => !reusable.has(key))) as Partial<CommunityProfile>;
}

function safestSavedStep(proposal: SavedProposal): number {
  const hasRequirements = Boolean(proposal.requirements);
  const hasProfile = Boolean(proposal.profile || proposal.community_profile_snapshot);
  if (hasRequirements && hasProfile && proposal.final_sections?.length) return 5;
  if (hasRequirements && hasProfile && proposal.draft?.sections?.length) return 4;
  if (hasRequirements && (proposal.application_details || proposal.profile)) return 3;
  if (hasRequirements) return 2;
  return 1;
}

export default function ProposalPage({ searchParams }: { searchParams?: { proposalId?: string } }) {
  const requestedProposalId = searchParams?.proposalId || "";
  const communityProfileQuery = useQuery({ queryKey: ["community-profile"], queryFn: getCommunityProfile });
  const savedProposalQuery = useQuery({
    queryKey: ["saved-proposal", requestedProposalId],
    queryFn: () => getSavedProposal(requestedProposalId),
    enabled: Boolean(requestedProposalId),
  });
  const [step, setStep] = useState(1);
  const [grantFile, setGrantFile] = useState<File | null>(null);
  const [requirements, setRequirements] = useState<Requirements | null>(null);
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [enhanced, setEnhanced] = useState<Record<string, string> | null>(null);
  const [structuredAnswers, setStructuredAnswers] = useState<Record<string, StructuredAnswersSection>>({});
  const [promptCoverage, setPromptCoverage] = useState<Record<string, PromptCoverageSection>>({});
  const [validation, setValidation] = useState<ComplianceSummary | null>(null);
  const [finalSections, setFinalSections] = useState<DraftSection[]>([]);
  const [exportError, setExportError] = useState<string>("");
  const [proposalId, setProposalId] = useState<string | null>(null);
  const [activeCommunityProfileId, setActiveCommunityProfileId] = useState<string | null>(null);
  const [activeCommunityProfileSnapshot, setActiveCommunityProfileSnapshot] = useState<Partial<CommunityProfile>>({});
  const [communityFormValues, setCommunityFormValues] = useState<CommunityFormValues | null>(null);
  const [communitySaveStatus, setCommunitySaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const [requirementsSaveStatus, setRequirementsSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const [deletedSection, setDeletedSection] = useState<{ section: Requirements["sections"][number]; index: number } | null>(null);
  const communitySaveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const latestCommunitySaveRef = useRef(0);
  const communityRevisionRef = useRef(0);
  const requirementsRevisionRef = useRef(0);
  const hydratedProposalRef = useRef<string | null>(null);

  useEffect(() => {
    if (communityProfileQuery.isLoading || communityFormValues) return;
    const reusableProfile = communityProfileQuery.data?.profile || {};
    setCommunityFormValues({
      ...blankCommunityFormValues,
      ...reusableProfile,
    } as CommunityFormValues);
    setActiveCommunityProfileId(communityProfileQuery.data?.id || null);
    setActiveCommunityProfileSnapshot(reusableProfile);
  }, [communityFormValues, communityProfileQuery.data, communityProfileQuery.isLoading]);

  useEffect(() => {
    const saved = savedProposalQuery.data;
    if (!requestedProposalId || !saved || hydratedProposalRef.current === saved.id) return;
    const snapshot = saved.community_profile_snapshot || saved.profile || {};
    const applicationDetails = saved.application_details || saved.profile || {};
    const combinedProfile = { ...snapshot, ...applicationDetails } as CommunityProfile;
    setProposalId(saved.id);
    setRequirements(saved.requirements || null);
    setProfile(saved.profile || (Object.keys(combinedProfile).length ? combinedProfile : null));
    setDraft(saved.draft || null);
    setEnhanced(saved.enhanced || null);
    setStructuredAnswers(saved.structured_answers || {});
    setPromptCoverage(saved.prompt_coverage || {});
    setValidation(saved.validation || null);
    setFinalSections(saved.final_sections || []);
    setActiveCommunityProfileId(saved.community_profile_id || null);
    setActiveCommunityProfileSnapshot(snapshot);
    setCommunityFormValues({
      ...blankCommunityFormValues,
      ...snapshot,
      ...applicationDetails,
    } as CommunityFormValues);
    setStep(safestSavedStep(saved));
    hydratedProposalRef.current = saved.id;
  }, [requestedProposalId, savedProposalQuery.data]);

  const saveCommunityDraft = useCallback(
    (values: CommunityFormValues) => {
      if (!proposalId) return Promise.resolve(null);
      const saveId = latestCommunitySaveRef.current + 1;
      const revision = communityRevisionRef.current;
      latestCommunitySaveRef.current = saveId;
      setCommunitySaveStatus("saving");

      const saveTask = communitySaveChainRef.current
        .catch(() => undefined)
        .then(() =>
          updateSavedProposal(proposalId, {
            application_details: applicationDetailsFrom(values),
            community_profile_id: activeCommunityProfileId,
            community_profile_snapshot: activeCommunityProfileSnapshot,
            community_name: activeCommunityProfileSnapshot.community_name || "",
          })
        );

      communitySaveChainRef.current = saveTask;
      void saveTask.then(
        () => {
          if (latestCommunitySaveRef.current === saveId && communityRevisionRef.current === revision) {
            setCommunitySaveStatus("saved");
          }
        },
        () => {
          if (latestCommunitySaveRef.current === saveId && communityRevisionRef.current === revision) {
            setCommunitySaveStatus("error");
          }
        }
      );
      return saveTask;
    },
    [activeCommunityProfileId, activeCommunityProfileSnapshot, proposalId]
  );

  useEffect(() => {
    if (step !== 3 || !proposalId || !communityFormValues) return;
    const timeoutId = window.setTimeout(() => {
      void saveCommunityDraft(communityFormValues);
    }, 1200);
    return () => window.clearTimeout(timeoutId);
  }, [communityFormValues, proposalId, saveCommunityDraft, step]);

  useEffect(() => {
    const hasPendingChanges =
      (step === 2 && ["unsaved", "saving", "error"].includes(requirementsSaveStatus)) ||
      (step === 3 && ["unsaved", "saving", "error"].includes(communitySaveStatus));
    if (!hasPendingChanges) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [communitySaveStatus, requirementsSaveStatus, step]);

  useEffect(() => {
    if (step !== 2 || requirementsSaveStatus !== "unsaved" || !proposalId || !requirements) return;
    const timeoutId = window.setTimeout(() => {
      const revision = requirementsRevisionRef.current;
      setRequirementsSaveStatus("saving");
      void updateSavedProposal(proposalId, { requirements, current_step: 2 }).then(
        () => {
          if (requirementsRevisionRef.current === revision) setRequirementsSaveStatus("saved");
        },
        () => {
          if (requirementsRevisionRef.current === revision) setRequirementsSaveStatus("error");
        }
      );
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [proposalId, requirements, requirementsSaveStatus, step]);

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !requirements || finalSections.length === 0) {
        throw new Error("No finalized draft content to export.");
      }
      return exportDraftPdf({
        grant_name: requirements.grant_name || "",
        community_name: profile.community_name || "",
        region: profile.region || "",
        local_priority: profile.local_priority || "",
        requested_budget: profile.requested_budget,
        sections: finalSections.map((s) => ({
          key: s.key,
          title: s.title,
          body: s.body,
        })),
      });
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "grant_proposal.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setExportError("");
      if (proposalId) {
        void markSavedProposalExported(proposalId);
      }
    },
    onError: (err) => {
      setExportError(err instanceof Error ? err.message : "Export failed.");
    },
  });

  const parseMutation = useMutation({
    mutationFn: (file: File) => parseGrant(file),
    onSuccess: (data) => {
      setRequirements(data.requirements);
      setStep(2);
      void (async () => {
        try {
          const saved = await createSavedProposal({
            title: data.requirements.grant_name || grantFile?.name || "Untitled Proposal",
            grant_name: data.requirements.grant_name || "",
            status: "grant_parsed",
            current_step: 2,
            requirements: data.requirements,
            community_profile_id: activeCommunityProfileId,
            community_profile_snapshot: activeCommunityProfileSnapshot,
          });
          setProposalId(saved.id);
          window.history.replaceState(window.history.state, "", `/proposal?proposalId=${encodeURIComponent(saved.id)}`);
        } catch (error) {
          console.warn("Could not save proposal after grant parsing.", error);
        }
      })();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async ({
      profile: p,
      requirements: r,
      budget,
    }: {
      profile: CommunityProfile;
      requirements: Requirements;
      budget: number;
    }) => {
      const d = await generateDraft(p, r, budget);
      const { enhanced: enh, structured_answers, prompt_coverage } = await enhanceDraft(d, r, p);
      const val = await evaluateDraftCompliance(d.sections || []);
      return {
        draft: d,
        enhanced: enh,
        structuredAnswers: structured_answers || {},
        promptCoverage: prompt_coverage || {},
        validation: val,
        profile: p,
        requirements: r,
      };
    },
    onSuccess: (data) => {
      setDraft(data.draft);
      setEnhanced(data.enhanced);
      setStructuredAnswers(data.structuredAnswers);
      setPromptCoverage(data.promptCoverage);
      setValidation(data.validation);
      setStep(4);
      if (proposalId) {
        void updateSavedProposal(proposalId, {
          title: data.requirements.grant_name || data.profile.project_title || "Untitled Proposal",
          community_name: data.profile.community_name || "",
          grant_name: data.requirements.grant_name || "",
          status: "generated_draft",
          current_step: 4,
          requirements: data.requirements,
          profile: data.profile,
          draft: data.draft,
          enhanced: data.enhanced,
          structured_answers: data.structuredAnswers,
          prompt_coverage: data.promptCoverage,
          validation: data.validation,
        });
      }
    },
  });

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && /\.(pdf|docx|txt)$/i.test(file.name)) {
        setGrantFile(file);
        parseMutation.mutate(file);
      }
    },
    [parseMutation]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        setGrantFile(file);
        parseMutation.mutate(file);
      }
    },
    [parseMutation]
  );

  const handleGenerate = useCallback(
    (formProfile: CommunityProfile & { requested_budget: number }) => {
      if (!requirements) return;
      const combinedProfile = {
        ...activeCommunityProfileSnapshot,
        ...applicationDetailsFrom(formProfile as CommunityFormValues),
      } as CommunityProfile & { requested_budget: number };
      setProfile(combinedProfile);
      setCommunityFormValues(combinedProfile as CommunityFormValues);
      if (proposalId) {
        void updateSavedProposal(proposalId, {
          profile: combinedProfile,
          application_details: applicationDetailsFrom(formProfile as CommunityFormValues),
          community_profile_id: activeCommunityProfileId,
          community_profile_snapshot: activeCommunityProfileSnapshot,
          community_name: combinedProfile.community_name || "",
          status: "intake_completed",
          current_step: 3,
        });
      }
      generateMutation.mutate({
        profile: combinedProfile,
        requirements,
        budget: combinedProfile.requested_budget,
      });
    },
    [activeCommunityProfileId, activeCommunityProfileSnapshot, requirements, generateMutation, proposalId]
  );

  const handleCommunityBack = useCallback(async () => {
    if (communityFormValues && proposalId) {
      try {
        await saveCommunityDraft(communityFormValues);
      } catch {
        // Keep navigation available; the form values remain in builder state.
      }
    }
    setStep(2);
  }, [communityFormValues, proposalId, saveCommunityDraft]);

  const handleSectionsNext = useCallback(() => {
    setStep(3);
    if (proposalId && requirements) {
      void updateSavedProposal(proposalId, {
        requirements,
        current_step: 3,
      });
    }
  }, [proposalId, requirements]);

  const handleSectionTitleChange = useCallback(
    (sectionKey: string, title: string) => {
      requirementsRevisionRef.current += 1;
      setRequirementsSaveStatus("unsaved");
      setRequirements((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: (prev.sections || []).map((s) =>
            s.key === sectionKey ? { ...s, title } : s
          ),
        };
      });
    },
    []
  );

  const handleSectionDelete = useCallback((sectionKey: string) => {
    if (!requirements) return;
    const index = requirements.sections.findIndex((section) => section.key === sectionKey);
    if (index < 0) return;
    requirementsRevisionRef.current += 1;
    setRequirementsSaveStatus("unsaved");
    setDeletedSection({ section: requirements.sections[index], index });
    setRequirements({
      ...requirements,
      sections: requirements.sections.filter((section) => section.key !== sectionKey),
    });
  }, [requirements]);

  const handleSectionRestore = useCallback(() => {
    if (!deletedSection) return;
    requirementsRevisionRef.current += 1;
    setRequirementsSaveStatus("unsaved");
    setRequirements((prev) => {
      if (!prev || prev.sections.some((section) => section.key === deletedSection.section.key)) return prev;
      const sections = [...prev.sections];
      sections.splice(Math.min(deletedSection.index, sections.length), 0, deletedSection.section);
      return { ...prev, sections };
    });
    setDeletedSection(null);
  }, [deletedSection]);

  const handleSectionAdd = useCallback(() => {
    requirementsRevisionRef.current += 1;
    setRequirementsSaveStatus("unsaved");
    setRequirements((prev) => {
      if (!prev) return prev;
      const sections = prev.sections || [];
      let idx = sections.length + 1;
      let key = `custom_section_${idx}`;
      const existing = new Set(sections.map((s) => s.key));
      while (existing.has(key)) {
        idx += 1;
        key = `custom_section_${idx}`;
      }
      return {
        ...prev,
        sections: [
          ...sections,
          {
            key,
            title: `Custom Section ${idx}`,
            guidance: "",
          },
        ],
      };
    });
  }, []);

  const progressPct = step === 5 ? 100 : ((step - 1) / 4) * 100;

  if (requestedProposalId && savedProposalQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading saved proposal...
        </p>
      </div>
    );
  }

  if (requestedProposalId && savedProposalQuery.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-lg border-destructive/40">
          <CardContent className="space-y-4 p-6">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" /> This saved proposal could not be loaded.
            </p>
            <Link href="/dashboard"><Button variant="outline">Return to dashboard</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto flex h-14 items-center gap-4 px-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold text-foreground">Grant Proposal Builder</h1>
            {(grantFile || savedProposalQuery.data) && (
              <p className="text-xs text-muted-foreground">
                Improving: {grantFile?.name || savedProposalQuery.data?.title}
              </p>
            )}
          </div>
          <ThemeToggle />
        </div>
        {/* Stepper */}
        <div className="border-t border-border bg-muted/30 px-4 py-3">
          <div className="container mx-auto flex items-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    step > s.id
                      ? "bg-primary text-primary-foreground"
                      : step === s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    step >= s.id ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "mx-1 h-0.5 w-6 rounded",
                      step > s.id ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            ))}
            <span className="ml-auto text-sm text-muted-foreground">
              {Math.round(progressPct)}% Complete
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Step 1: Upload */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <Card className="border-2">
                <CardHeader>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Upload className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle>Upload grant application package</CardTitle>
                  <CardDescription>
                    Upload the grant posting (PDF, DOCX, or TXT). We&apos;ll extract key
                    sections and requirements so the AI can align your proposal.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/40 bg-muted/20 p-8 transition-colors hover:border-primary/50 hover:bg-muted/30"
                  >
                    {parseMutation.isPending ? (
                      <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    ) : (
                      <>
                        <FileUp className="mb-4 h-12 w-12 text-muted-foreground" />
                        <p className="mb-2 font-medium text-foreground">
                          Drag & drop your grant posting here
                        </p>
                        <p className="mb-4 text-sm text-muted-foreground">
                          or click to browse (PDF, DOCX, TXT)
                        </p>
                        <input
                          type="file"
                          accept=".pdf,.docx,.txt"
                          onChange={handleFileSelect}
                          className="hidden"
                          id="grant-upload"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => document.getElementById("grant-upload")?.click()}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Choose File
                        </Button>
                      </>
                    )}
                  </div>
                  {parseMutation.isError && (
                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {parseMutation.error.message}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="text-base">Community context (optional)</CardTitle>
                  <CardDescription>
                    You can upload community plans and funding guidelines during the process
                    to get tailored recommendations.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          )}

          {/* Step 2: Sections */}
          {step === 2 && requirements && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <ProposalSections
                requirements={requirements}
                onNext={handleSectionsNext}
                onBack={() => setStep(1)}
                onSectionTitleChange={handleSectionTitleChange}
                onSectionDelete={handleSectionDelete}
                onSectionRestore={handleSectionRestore}
                deletedSectionTitle={deletedSection?.section.title}
                saveStatus={requirementsSaveStatus}
                onSectionAdd={handleSectionAdd}
              />
            </motion.div>
          )}

          {/* Step 3: Community form */}
          {step === 3 && requirements && communityFormValues && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <CommunityForm
                onSubmit={handleGenerate}
                isSubmitting={generateMutation.isPending}
                error={generateMutation.error?.message}
                onBack={() => void handleCommunityBack()}
                initialValues={communityFormValues}
                onValuesChange={(values) => {
                  communityRevisionRef.current += 1;
                  setCommunityFormValues(values);
                  setCommunitySaveStatus("unsaved");
                }}
                saveStatus={communitySaveStatus}
                communityProfileUpdatedAt={communityProfileQuery.data?.updated_at}
              />
            </motion.div>
          )}

          {step === 3 && requirements && !communityFormValues && (
            <Card>
              <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your Community Profile...
              </CardContent>
            </Card>
          )}

          {/* Step 4: Report */}
          {step === 4 && draft && requirements && profile && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <ReportView
                draft={draft}
                enhanced={enhanced || {}}
                promptCoverage={promptCoverage}
                validation={validation}
                requirements={requirements}
                profile={profile}
                onContinueToExport={(sections) => {
                  setFinalSections(buildQuestionFormattedSections(sections, structuredAnswers));
                  setStep(5);
                  if (proposalId) {
                    void updateSavedProposal(proposalId, {
                      final_sections: buildQuestionFormattedSections(sections, structuredAnswers),
                      status: "ready_to_export",
                      current_step: 5,
                    });
                  }
                }}
              />
            </motion.div>
          )}

          {/* Step 5: Export */}
          {step === 5 && profile && requirements && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Final export</CardTitle>
                  <CardDescription>
                    Download a polished PDF version of your proposal. You can go back to the
                    editor if you want to make more section changes first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    <p>
                      Document: <span className="font-medium text-foreground">{requirements.grant_name || "Grant Proposal"}</span>
                    </p>
                    <p>
                      Community: <span className="font-medium text-foreground">{profile.community_name || "N/A"}</span>
                    </p>
                    <p>
                      Sections: <span className="font-medium text-foreground">{finalSections.length}</span>
                    </p>
                  </div>

                  {exportError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {exportError}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => setStep(4)} disabled={exportMutation.isPending}>
                      Back to editor
                    </Button>
                    <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending || finalSections.length === 0}>
                      {exportMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparing PDF...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function buildQuestionFormattedSections(
  sections: DraftSection[],
  structuredAnswers: Record<string, StructuredAnswersSection>
): DraftSection[] {
  return sections.map((section) => {
    const structuredSection = structuredAnswers[section.key];
    const answers = structuredSection?.answers || [];
    if (!answers.length) {
      return section;
    }

    return {
      ...section,
      title: structuredSection.section_title || section.title,
      body: answers
        .map((answer) => {
          const promptId = answer.prompt_id?.trim();
          const promptText = answer.prompt_text?.trim();
          if (!promptId || !promptText) return "";
          return `${promptId}: ${promptText}\n${normalizeStructuredExportAnswer(answer.answer)}`;
        })
        .filter(Boolean)
        .join("\n\n"),
    };
  });
}

function normalizeStructuredExportAnswer(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "Needs additional information.";

  const pythonListMatch = raw.match(/^\[([\s\S]*)\]$/);
  if (pythonListMatch) {
    const items = Array.from(raw.matchAll(/'([^']+)'|"([^"]+)"/g))
      .map((match) => (match[1] || match[2] || "").trim())
      .filter(Boolean);
    if (items.length) {
      return items.map((item) => `- ${item}`).join("\n");
    }
  }

  return raw
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+\./g, ".")
    .trim();
}
