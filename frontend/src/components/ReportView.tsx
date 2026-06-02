"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import {
  type CommunityProfile,
  type ComplianceGap,
  type ComplianceSummary,
  type ComplianceWarning,
  type Draft,
  type DraftSection,
  type PromptCoverageSection,
  type Requirements,
  evaluateSectionCompliance,
  rewriteSection,
} from "@/lib/api";
import {
  Check,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RotateCcw,
  Save,
  Loader2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";

type SectionEditorState = {
  versions: string[];
  index: number;
  working: string;
  isOpen: boolean;
  missingInputValues: Record<string, string>;
  showAllMissing: boolean;
};

export function ReportView({
  draft,
  enhanced,
  promptCoverage,
  validation,
  requirements,
  profile,
  onContinueToExport,
}: {
  draft: Draft;
  enhanced: Record<string, string>;
  promptCoverage: Record<string, PromptCoverageSection>;
  validation: ComplianceSummary | null;
  requirements: Requirements;
  profile: CommunityProfile;
  onContinueToExport: (sections: DraftSection[]) => void;
}) {
  const sections = draft.sections || [];
  const [liveValidation, setLiveValidation] = useState<ComplianceSummary | null>(validation);

  const [sectionStates, setSectionStates] = useState<Record<string, SectionEditorState>>({});
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sectionError, setSectionError] = useState<string>("");
  const [isValidating, setIsValidating] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const previousBodiesRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const initial: Record<string, SectionEditorState> = {};
    for (const sec of sections) {
      const baseText = stripPromptMetadataLines(enhanced[sec.key] || sec.body || "");
      initial[sec.key] = {
        versions: [baseText],
        index: 0,
        working: baseText,
        isOpen: false,
        missingInputValues: {},
        showAllMissing: false,
      };
    }
    if (sections[0]) {
      initial[sections[0].key].isOpen = true;
      setActiveKey(sections[0].key);
    }
    setSectionStates(initial);
  }, [sections, enhanced]);

  useEffect(() => {
    setLiveValidation(validation);
  }, [validation]);

  const summaryBudget = useMemo(() => draft.meta?.requested_budget?.toLocaleString(), [draft.meta]);

  const finalSections = useMemo(
    () =>
      sections.map((sec) => ({
        ...sec,
        body:
          (Object.prototype.hasOwnProperty.call(sectionStates, sec.key)
            ? sectionStates[sec.key]?.working
            : enhanced[sec.key] || sec.body || "")?.trim() || "",
      })),
    [sections, sectionStates, enhanced]
  );

  const sectionResults = useMemo(() => {
    const entries = mergeSectionResults(
      liveValidation?.sectionResults ?? [],
      buildImmediateSectionResults(finalSections)
    );
    return Object.fromEntries(entries.map((item) => [item.section, item]));
  }, [finalSections, liveValidation]);

  const warnings = useMemo(
    () =>
      Object.values(sectionResults).flatMap((result) =>
        result.warnings.map((warning) => ({
          ...warning,
          section: result.section,
          section_label: result.section_label,
        }))
      ),
    [sectionResults]
  );

  const gaps = useMemo(
    () =>
      Object.values(sectionResults).flatMap((result) =>
        result.compliance_gaps.map((gap) => ({
          ...gap,
          section: result.section,
          section_label: result.section_label,
        }))
      ),
    [sectionResults]
  );

  const groupedWarnings = useMemo(() => {
    return warnings.reduce<Record<string, typeof warnings>>((acc, warning) => {
      const label = warning.section_label || warning.section.replaceAll("_", " ");
      acc[label] = [...(acc[label] || []), warning];
      return acc;
    }, {});
  }, [warnings]);

  const groupedGaps = useMemo(() => {
    return gaps.reduce<Record<string, typeof gaps>>((acc, gap) => {
      const label = gap.section_label || gap.section.replaceAll("_", " ");
      acc[label] = [...(acc[label] || []), gap];
      return acc;
    }, {});
  }, [gaps]);

  const missingInfoSections = useMemo(() => {
    return finalSections
      .map((section) => {
        const sectionResult = sectionResults[section.key];
        const sectionWarnings = sectionResult?.warnings ?? [];
        const expectedPromptItems =
          section.prompt_items || requirements.sections.find((item) => item.key === section.key)?.prompt_items || [];
        const reviewItems = extractPromptReviewItems(
          section.body || "",
          promptCoverage[section.key],
          expectedPromptItems
        );
        const missingPrompts = reviewItems.filter((item) => item.status === "missing");
        const needsReviewPrompts = reviewItems.filter((item) => item.status === "needs_review");
        const priorityWarnings = sectionWarnings.filter((warning) =>
          PRIORITY_WARNING_TYPES.has(warning.type)
        );
        return {
          key: section.key,
          title: section.title || section.key,
          missingPrompts,
          needsReviewPrompts,
          priorityWarnings,
          score: missingPrompts.length * 2 + needsReviewPrompts.length + priorityWarnings.length,
        };
      })
      .filter((section) => section.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  }, [finalSections, promptCoverage, requirements.sections, sectionResults]);

  const topQualityIssues = useMemo(() => {
    return gaps
      .slice()
      .sort((a, b) => b.confidence_score - a.confidence_score)
      .slice(0, 6);
  }, [gaps]);

  const buildFinalSections = (): DraftSection[] => finalSections;

  const openSection = (key: string) => {
    setSectionStates((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = { ...next[k], isOpen: k === key };
      }
      return next;
    });
    setActiveKey(key);
  };

  const jumpToSection = (key: string) => {
    openSection(key);
    window.setTimeout(() => {
      sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  };

  useEffect(() => {
    const hasInitializedStates = sections.length > 0 && Object.keys(sectionStates).length > 0;
    if (!hasInitializedStates) return;

    const currentBodies = Object.fromEntries(finalSections.map((section) => [section.key, section.body]));
    const changedSections = finalSections.filter(
      (section) => previousBodiesRef.current[section.key] !== section.body
    );
    if (changedSections.length === 0) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsValidating(true);
      try {
        const nextResults = await Promise.all(
          changedSections.map(async (section) => {
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
        if (!cancelled) {
          setLiveValidation((prev) => {
            const merged = mergeSectionResults(prev?.sectionResults ?? [], nextResults);
            return {
              sectionResults: merged,
              warnings: merged.flatMap((result) =>
                result.warnings.map((warning) => ({
                  ...warning,
                  section: result.section,
                  section_label: result.section_label,
                }))
              ),
              complianceGaps: merged.flatMap((result) =>
                result.compliance_gaps.map((gap) => ({
                  ...gap,
                  section: result.section,
                  section_label: result.section_label,
                }))
              ),
            };
          });
          previousBodiesRef.current = currentBodies;
        }
      } catch {
        // Keep last known validation state if refresh fails.
      } finally {
        if (!cancelled) {
          setIsValidating(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [finalSections, sections.length, sectionStates]);

  const setSectionState = (key: string, updater: (prev: SectionEditorState) => SectionEditorState) => {
    setSectionStates((prev) => {
      const current = prev[key];
      if (!current) return prev;
      return { ...prev, [key]: updater(current) };
    });
  };

  const toggleOpen = (key: string) => {
    setSectionStates((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = { ...next[k], isOpen: k === key ? !next[k].isOpen : false };
      }
      return next;
    });
    setActiveKey(key);
  };

  const saveManualEdit = (key: string) => {
    setSectionState(key, (s) => {
      const baseline = s.versions[s.index] || "";
      if (s.working.trim() === baseline.trim()) return s;
      const nextVersions = [...s.versions.slice(0, s.index + 1), s.working];
      return { ...s, versions: nextVersions, index: nextVersions.length - 1 };
    });
  };

  const undoEdit = (key: string) => {
    setSectionState(key, (s) => {
      if (s.index <= 0) return s;
      const nextIndex = s.index - 1;
      return { ...s, index: nextIndex, working: s.versions[nextIndex] || "" };
    });
  };

  const resetWorking = (key: string) => {
    setSectionState(key, (s) => ({ ...s, working: s.versions[s.index] || "" }));
  };

  const generateMissingInfoSuggestion = async (key: string, title: string) => {
    const state = sectionStates[key];
    if (!state) return;
    const section = sections.find((item) => item.key === key);
    const expectedPromptItems =
      section?.prompt_items || requirements.sections.find((item) => item.key === key)?.prompt_items || [];
    const reviewItems = extractPromptReviewItems(
      state.working || "",
      promptCoverage[key],
      expectedPromptItems
    );
    const actionableItems = reviewItems.filter((item) => item.status !== "answered");
    const filledInputs = actionableItems
      .map((item) => ({
        ...item,
        value: (state.missingInputValues[item.promptId] || "").trim(),
      }))
      .filter((item) => item.value);

    if (filledInputs.length === 0) {
      setSectionError("Add at least one missing or uncertain answer before generating a targeted section update.");
      return;
    }

    const instruction = [
      "Update this section by filling only the missing or uncertain prompt answers listed below.",
      "Preserve the existing question-by-question structure.",
      "Do not rewrite answered prompts unless needed for consistency.",
      "Use these user-provided facts as the primary source for the missing items:",
      ...filledInputs.map((item) => `${item.promptId}: ${item.value}`),
    ].join("\n");

    setSectionError("");
    setBusyKey(key);
    try {
      const out = await rewriteSection({
        section_key: key,
        section_title: title,
        current_text: state.working,
        instruction,
        requirements,
        profile,
      });
      const nextText = stripPromptMetadataLines(out.text || "");
      if (!nextText) {
        throw new Error("The targeted update did not return section text.");
      }
      setSectionState(key, (s) => ({
        ...s,
        versions: [...s.versions.slice(0, s.index + 1), nextText],
        index: s.index + 1,
        working: nextText,
        missingInputValues: {},
      }));
    } catch (e) {
      setSectionError(e instanceof Error ? e.message : "Could not generate a targeted section update.");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Your proposal draft</h2>
        <Link href="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {draft.meta?.community_name} · {draft.meta?.grant_name} · ${summaryBudget}
          </p>
        </CardContent>
      </Card>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Section editor</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Open any section below to edit text directly, ask AI for targeted changes, then apply only what you want.
        </CardContent>
      </Card>

      <Card
        className={
          missingInfoSections.length > 0 || topQualityIssues.length > 0
            ? "border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/10"
            : "border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/10"
        }
      >
        <CardHeader>
          <CardTitle className="text-base">Top priorities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Start with missing prompt answers when we can detect them, then review section-level
            warnings and compliance gaps.
          </p>
          {missingInfoSections.length > 0 ? (
            <div className="space-y-3">
              {missingInfoSections.slice(0, 6).map((section) => (
                <div key={section.key} className="rounded-lg border border-amber-500/30 bg-white/70 p-3 dark:border-amber-500/20 dark:bg-card/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="font-medium text-foreground">{section.title}</p>
                      {section.missingPrompts.length > 0 && (
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {section.missingPrompts.slice(0, 4).map((item) => (
                            <li key={`${section.key}-${item.promptId}`}>
                              <span className="font-medium text-foreground">{item.promptId}</span>
                              {`: ${item.promptText}`}
                            </li>
                          ))}
                          {section.missingPrompts.length > 4 && (
                            <li>{`+ ${section.missingPrompts.length - 4} more missing prompts`}</li>
                          )}
                        </ul>
                      )}
                      {section.needsReviewPrompts.length > 0 && (
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {section.needsReviewPrompts.slice(0, 3).map((item) => (
                            <li key={`${section.key}-${item.promptId}-review`}>
                              <span className="font-medium text-foreground">{item.promptId}</span>
                              {`: needs review${item.reviewNote ? ` - ${item.reviewNote}` : ""}`}
                            </li>
                          ))}
                        </ul>
                      )}
                      {section.priorityWarnings.map((warning, index) => (
                        <p key={`${section.key}-${warning.type}-${index}`} className="text-sm text-muted-foreground">
                          {warning.message}
                        </p>
                      ))}
                    </div>
                    <Button size="sm" variant="outline" onClick={() => jumpToSection(section.key)}>
                      Open section
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : topQualityIssues.length > 0 ? (
            <div className="space-y-3">
              {topQualityIssues.map((gap) => (
                <div key={`${gap.section}-${gap.failed_check_id}`} className="rounded-lg border border-amber-500/30 bg-white/70 p-3 dark:border-amber-500/20 dark:bg-card/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {gap.section_label || gap.section.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{gap.message}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => jumpToSection(gap.section)}>
                      Open section
                      <ExternalLink className="ml-2 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-emerald-700 dark:text-emerald-300">No priority issues detected yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        {sections.map((sec) => {
          const state = sectionStates[sec.key];
          if (!state) return null;
          const isBusy = busyKey === sec.key;
          const versionCount = state.versions.length;
          const sectionResult = sectionResults[sec.key];
          const sectionWarnings = sectionResult?.warnings ?? [];
          const sectionGaps = sectionResult?.compliance_gaps ?? [];
          const expectedPromptItems =
            sec.prompt_items || requirements.sections.find((item) => item.key === sec.key)?.prompt_items || [];
          const reviewItems = extractPromptReviewItems(
            state.working || "",
            promptCoverage[sec.key],
            expectedPromptItems
          );
          const missingPrompts = reviewItems.filter((item) => item.status === "missing");
          const needsReviewPrompts = reviewItems.filter((item) => item.status === "needs_review");
          const lowConfidencePrompts = needsReviewPrompts.filter((item) => item.confidence === "low");
          const actionablePromptItems = [...missingPrompts, ...lowConfidencePrompts];
          const visibleMissingPrompts = state.showAllMissing ? actionablePromptItems : actionablePromptItems.slice(0, 4);
          const priorityWarnings = sectionWarnings.filter((warning) =>
            PRIORITY_WARNING_TYPES.has(warning.type)
          );

          return (
            <Card
              key={sec.key}
              ref={(node) => {
                sectionRefs.current[sec.key] = node;
              }}
            >
              <CardHeader>
                <button
                  type="button"
                  className="flex w-full items-center justify-between text-left"
                  onClick={() => toggleOpen(sec.key)}
                >
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-base">{sec.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          sectionGaps.length > 0
                            ? "rounded-full border border-rose-500/40 bg-rose-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-rose-700 dark:bg-rose-950/20 dark:text-rose-300"
                            : "rounded-full border border-emerald-500/30 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300"
                        }
                      >
                        {sectionGaps.length > 0 ? `${sectionGaps.length} gap${sectionGaps.length === 1 ? "" : "s"}` : "no gaps"}
                      </span>
                      <span
                        className={
                          sectionWarnings.length > 0
                            ? "rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-950/20 dark:text-amber-300"
                            : "rounded-full border border-sky-500/30 bg-sky-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-sky-700 dark:bg-sky-950/20 dark:text-sky-300"
                        }
                      >
                        {sectionWarnings.length > 0
                          ? `${sectionWarnings.length} warning${sectionWarnings.length === 1 ? "" : "s"}`
                          : "no warnings"}
                      </span>
                      {missingPrompts.length > 0 && (
                        <span className="rounded-full border border-amber-500/40 bg-amber-50 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
                          {missingPrompts.length} missing
                        </span>
                      )}
                      {needsReviewPrompts.length > 0 && (
                        <span className="rounded-full border border-violet-500/40 bg-violet-950/20 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-violet-300">
                          {needsReviewPrompts.length} review
                        </span>
                      )}
                    </div>
                  </div>
                  {state.isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CardHeader>
              {state.isOpen && (
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                      <p className="text-xs text-muted-foreground">
                        Version {state.index + 1} of {versionCount}
                      </p>
                      <Textarea
                        value={state.working}
                        onChange={(e) =>
                          setSectionState(sec.key, (s) => ({ ...s, working: e.target.value }))
                        }
                        rows={14}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => saveManualEdit(sec.key)}>
                          <Save className="mr-2 h-4 w-4" />
                          Save manual edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => undoEdit(sec.key)} disabled={state.index === 0}>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Undo
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => resetWorking(sec.key)}>
                          Reset unsaved
                        </Button>
                      </div>
                  </div>

                  {sectionError && activeKey === sec.key && (
                    <p className="text-sm text-destructive">{sectionError}</p>
                  )}

                  {lowConfidencePrompts.length > 0 && (
                    <div className="rounded-lg border border-violet-500/30 bg-violet-950/10 p-3">
                      <p className="text-sm font-medium text-violet-200">
                        Low-confidence answers to review ({lowConfidencePrompts.length})
                      </p>
                      <div className="mt-2 space-y-2">
                        {lowConfidencePrompts.map((item) => (
                          <div key={`${sec.key}-${item.promptId}-low-confidence`} className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{item.promptId}: </span>
                            {item.promptText}
                            {item.reviewNote && (
                              <p className="mt-1 text-xs text-violet-200">{item.reviewNote}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {actionablePromptItems.length > 0 && (
                    <details className="rounded-lg border border-amber-500/30 bg-amber-50/60 p-3 dark:bg-amber-950/20">
                      <summary className="cursor-pointer select-none text-sm font-medium">
                        Review / missing info editor ({actionablePromptItems.length})
                      </summary>
                      <div className="mt-3 space-y-3">
                        <p className="text-xs text-muted-foreground">
                          Add corrections for uncertain answers or fill missing facts, then generate a targeted update.
                        </p>
                        <div className="space-y-3">
                          {visibleMissingPrompts.map((item) => (
                            <label key={`${sec.key}-${item.promptId}`} className="block space-y-1">
                              <span className="text-xs font-medium text-muted-foreground">
                                {item.promptId}: {item.promptText}
                              </span>
                              {item.status === "needs_review" && (
                                <span className="block text-xs text-violet-300">
                                  {item.reviewNote || "Please confirm before submission."}
                                </span>
                              )}
                              <Textarea
                                value={state.missingInputValues[item.promptId] || ""}
                                onChange={(event) =>
                                  setSectionState(sec.key, (s) => ({
                                    ...s,
                                    missingInputValues: {
                                      ...s.missingInputValues,
                                      [item.promptId]: event.target.value,
                                    },
                                  }))
                                }
                                rows={3}
                                placeholder="Add the answer or facts to include."
                              />
                            </label>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {actionablePromptItems.length > 4 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setSectionState(sec.key, (s) => ({ ...s, showAllMissing: !s.showAllMissing }))
                              }
                            >
                              {state.showAllMissing ? "Show fewer prompts" : `Show ${actionablePromptItems.length - 4} more`}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => generateMissingInfoSuggestion(sec.key, sec.title)}
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating
                              </>
                            ) : (
                              <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                Fill missing info
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </details>
                  )}

                  {(sectionWarnings.length > 0 || sectionGaps.length > 0) && (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {priorityWarnings.length > 0 && (
                        <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 p-3 dark:bg-amber-950/20 lg:col-span-2">
                          <p className="text-sm font-medium">Priority warnings</p>
                          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                            {priorityWarnings.map((warning, index) => (
                              <li key={`${sec.key}-${warning.type}-${index}`}>{warning.message}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 p-3 dark:bg-amber-950/20">
                        <p className="text-sm font-medium">Section compliance gaps</p>
                        {sectionGaps.length > 0 ? (
                          <ul className="mt-2 space-y-3 text-sm text-muted-foreground">
                            {sectionGaps.map((gap) => (
                              <li key={gap.failed_check_id}>
                                <p className="font-medium text-foreground">
                                  {gap.message}
                                  <span className="ml-2 text-xs uppercase tracking-wide text-amber-700 dark:text-amber-400">
                                    {gap.severity}
                                  </span>
                                  <span className="ml-2 text-xs uppercase tracking-wide text-sky-700 dark:text-sky-400">
                                    {gap.confidence_score}% confidence
                                  </span>
                                </p>
                                <p className="mt-1">{gap.recommendation}</p>
                                <details className="mt-2 rounded-md border border-border bg-card/40 p-2">
                                  <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                                    Source: {gap.source_document}
                                  </summary>
                                  <p className="mt-2 text-xs text-muted-foreground">{gap.source_excerpt}</p>
                                </details>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">No compliance gaps for this section.</p>
                        )}
                      </div>

                      <div className="rounded-lg border border-amber-500/30 bg-amber-50/60 p-3 dark:bg-amber-950/20">
                        <p className="text-sm font-medium">Section warnings</p>
                        {sectionWarnings.length > 0 ? (
                          <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                            {sectionWarnings.map((warning, index) => (
                              <li key={`${warning.type}-${index}`}>
                                <span className="font-medium text-foreground">{warning.message}</span>
                                <span className="ml-2 text-xs uppercase tracking-wide text-muted-foreground/80">
                                  {warning.type.replaceAll("_", " ")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-muted-foreground">No warnings for this section.</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Card
        className={
          gaps.length > 0
              ? "border-rose-500/50 bg-rose-50/80 dark:bg-rose-950/10"
              : "border-emerald-500/30 bg-emerald-50/80 dark:bg-emerald-950/10"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {gaps.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              ) : (
                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              Report-wide compliance gaps
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Aggregated from all proposal sections.
            </p>
          </CardHeader>
          <CardContent>
            {isValidating && (
              <p className="mb-2 text-xs text-muted-foreground">Refreshing checks...</p>
            )}
            {gaps.length > 0 ? (
              <div className="space-y-4 text-sm text-muted-foreground">
                {Object.entries(groupedGaps).map(([sectionLabel, sectionGaps]) => (
                  <div key={sectionLabel} className="rounded-md border border-rose-500/30 bg-white/70 p-3 dark:border-rose-500/20 dark:bg-rose-950/10">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-200/80">
                      {sectionLabel}
                    </p>
                    <ul className="space-y-3">
                      {sectionGaps.map((gap) => (
                        <li key={`${gap.section}-${gap.failed_check_id}`}>
                          <p className="font-medium text-foreground">
                            {gap.message}
                            <span className="ml-2 text-xs uppercase tracking-wide text-rose-700 dark:text-rose-300">
                              {gap.severity}
                            </span>
                            <span className="ml-2 text-xs uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                              {gap.confidence_score}% confidence
                            </span>
                          </p>
                          <p className="mt-2">{gap.recommendation}</p>
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-rose-500/40 bg-white/50 text-rose-700 hover:bg-rose-50 dark:bg-transparent dark:text-rose-200 dark:hover:bg-rose-950/30"
                              onClick={() => jumpToSection(gap.section)}
                            >
                              Open section
                              <ExternalLink className="ml-2 h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <details
                            className="mt-2 rounded-md border border-rose-500/30 bg-rose-50/70 p-2 dark:border-rose-500/20 dark:bg-rose-950/10"
                          >
                            <summary className="cursor-pointer text-xs font-medium text-muted-foreground">
                              Source: {gap.source_document}
                            </summary>
                            <p className="mt-2 text-xs text-muted-foreground">{gap.source_excerpt}</p>
                          </details>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-emerald-700 dark:text-emerald-300">No major gaps detected.</p>
            )}
          </CardContent>
        </Card>

        <Card
        className={
          warnings.length > 0
              ? "border-amber-500/50 bg-amber-50/80 dark:bg-amber-950/10"
              : "border-sky-500/30 bg-sky-50/80 dark:bg-sky-950/10"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {warnings.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <Check className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              )}
              Report-wide warnings
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Aggregated from all proposal sections.
            </p>
          </CardHeader>
          <CardContent>
            {isValidating && (
              <p className="mb-2 text-xs text-muted-foreground">Refreshing checks...</p>
            )}
            {warnings.length > 0 ? (
              <div className="space-y-4 text-sm text-muted-foreground">
                {Object.entries(groupedWarnings).map(([sectionLabel, sectionWarnings]) => (
                  <div key={sectionLabel} className="rounded-md border border-amber-500/30 bg-white/70 p-3 dark:border-amber-500/20 dark:bg-amber-950/10">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-200/80">
                      {sectionLabel}
                    </p>
                    <ul className="space-y-3">
                      {sectionWarnings.map((warning, index) => (
                        <li key={`${warning.section}-${warning.type}-${index}`}>
                          <p className="font-medium text-foreground">{warning.message}</p>
                          <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground/80">
                            {warning.type.replaceAll("_", " ")}
                          </p>
                          <div className="mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-amber-500/40 bg-white/50 text-amber-700 hover:bg-amber-50 dark:bg-transparent dark:text-amber-200 dark:hover:bg-amber-950/30"
                              onClick={() => jumpToSection(warning.section)}
                            >
                              Open section
                              <ExternalLink className="ml-2 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-sky-700 dark:text-sky-300">No warnings.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => onContinueToExport(buildFinalSections())}>
          Continue to export
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function buildImmediateSectionResults(sections: DraftSection[]) {
  return sections
    .map((section) => {
      const warnings: ComplianceWarning[] = [];
      if (section.body === "") {
        warnings.push({ type: "empty_section", message: "This section is empty." });
      } else if (section.body.trim() === "") {
        warnings.push({ type: "whitespace_only_section", message: "This section contains only whitespace." });
      }

      return {
        section: section.key,
        section_label: section.title || section.key,
        warnings,
        compliance_gaps: [] as ComplianceGap[],
        scoring_hooks: undefined,
      };
    })
    .filter((section) => section.warnings.length > 0);
}

function mergeSectionResults(base: ComplianceSummary["sectionResults"], overrides: ComplianceSummary["sectionResults"]) {
  const merged = new Map<string, ComplianceSummary["sectionResults"][number]>();

  for (const result of base) {
    merged.set(result.section, result);
  }

  for (const result of overrides) {
    const current = merged.get(result.section);
    if (!current) {
      merged.set(result.section, result);
      continue;
    }

    merged.set(result.section, {
      ...current,
      ...result,
      warnings: dedupeWarnings([...(current.warnings || []), ...(result.warnings || [])]),
      compliance_gaps: result.compliance_gaps.length > 0 ? result.compliance_gaps : current.compliance_gaps,
      scoring_hooks: result.scoring_hooks || current.scoring_hooks,
    });
  }

  return Array.from(merged.values());
}

function dedupeWarnings(warnings: ComplianceWarning[]) {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.type}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const PRIORITY_WARNING_TYPES = new Set([
  "empty_section",
  "whitespace_only_section",
  "incomplete_section",
  "word_limit_exceeded",
  "below_expected_word_limit",
]);

function extractPromptReviewItems(
  sectionBody: string,
  promptCoverage: PromptCoverageSection | undefined,
  expectedPromptItems: NonNullable<Requirements["sections"][number]["prompt_items"]> = []
) {
  if (promptCoverage?.prompts?.length) {
    return promptCoverage.prompts
      .filter((item) => (item.status || (item.answered ? "answered" : "missing")) !== "answered")
      .map((item) => ({
        promptId: item.prompt_id,
        promptText: item.prompt_text,
        status: item.status || (item.answered ? "answered" : "missing"),
        confidence: item.confidence,
        reviewNote: item.review_note,
      }));
  }

  const lines = (sectionBody || "").split(/\r?\n/);
  const missing: Array<{
    promptId: string;
    promptText: string;
    status: "missing" | "needs_review";
    confidence?: "high" | "medium" | "low";
    reviewNote?: string;
  }> = [];
  const explicitMissingIds = new Set<string>();

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]?.trim() || "";
    const promptMatch = line.match(/^((?:Q[\w.-]+)|(?:prompt_\d+)|(?:\d[\w.-]*)):\s*(.+)$/i);
    if (!promptMatch) continue;

    const promptId = promptMatch[1];
    const promptText = promptMatch[2].trim();
    const answerLines: string[] = [];

    for (let j = i + 1; j < lines.length; j += 1) {
      const nextLine = (lines[j] || "").trim();
      if (/^((?:Q[\w.-]+)|(?:prompt_\d+)|(?:\d[\w.-]*)):\s*/i.test(nextLine)) break;
      if (!nextLine) continue;
      answerLines.push(nextLine);
    }

    const answerText = answerLines.join(" ").trim();
    if (!answerText || answerText.includes("[No answer generated]") || answerText.includes("[Missing information needed]")) {
      explicitMissingIds.add(promptId);
      missing.push({ promptId, promptText, status: "missing", confidence: "low" });
    } else if (/^Confidence:\s*(medium|low)\b/im.test(answerText) || /^Needs review:/im.test(answerText)) {
      const confidenceMatch = answerText.match(/^Confidence:\s*(high|medium|low)\b/im);
      const reviewMatch = answerText.match(/^Needs review:\s*(.+)$/im);
      missing.push({
        promptId,
        promptText,
        status: "needs_review",
        confidence: (confidenceMatch?.[1] as "high" | "medium" | "low" | undefined) || "medium",
        reviewNote: reviewMatch?.[1],
      });
    }
  }

  const bodyLower = (sectionBody || "").toLowerCase();
  const hasExplicitPromptFormatting = /(^|\n)\s*((?:Q[\w.-]+)|(?:prompt_\d+)|(?:\d[\w.-]*)):\s*/i.test(sectionBody || "");
  const seen = new Set(missing.map((item) => item.promptId));

  for (const item of expectedPromptItems) {
    const promptId = String(item.prompt_id || "").trim();
    const promptText = String(item.prompt_text || "").trim();
    if (!promptId || !promptText || seen.has(promptId) || explicitMissingIds.has(promptId)) {
      continue;
    }

    const promptMentioned = bodyLower.includes(promptId.toLowerCase()) || fuzzyIncludes(bodyLower, promptText);
    if (hasExplicitPromptFormatting) {
      if (!promptMentioned) {
        missing.push({ promptId, promptText, status: "missing", confidence: "low" });
        seen.add(promptId);
      }
      continue;
    }

    if (isLikelyStructuredPrompt(item) || !promptMentioned) {
      missing.push({ promptId, promptText, status: "missing", confidence: "low" });
      seen.add(promptId);
    }
  }

  return missing;
}

function stripPromptMetadataLines(text: string) {
  return (text || "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*(Confidence|Needs review):\s*/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isLikelyStructuredPrompt(item: {
  prompt_id?: string;
  prompt_text: string;
  prompt_type?: string;
  answer_type?: string;
}) {
  const promptType = String(item.prompt_type || item.answer_type || "").toLowerCase();
  const promptText = String(item.prompt_text || "").toLowerCase();
  return (
    ["field", "selection", "multi_selection", "yes_no", "yes_no_explanation", "short_field"].includes(promptType) ||
    /\b(select|choose|website|email|url|budget|employees|country|organization|founded|name)\b/.test(promptText)
  );
}

function fuzzyIncludes(bodyLower: string, promptText: string) {
  const snippet = promptText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 4)
    .slice(0, 6)
    .join(" ");
  if (!snippet) return false;
  return bodyLower.includes(snippet);
}
