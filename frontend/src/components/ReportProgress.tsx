"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export type ProgressStage = {
  label: string;
  /** Percentage this stage may reach before the work behind it reports completion. */
  end: number;
  /** Rough duration of the stage; controls how quickly the bar approaches `end`. */
  expectedMs: number;
};

const TICK_MS = 200;
const COMPLETE_HOLD_MS = 500;

/**
 * Drives a 0 → 100 progress bar for long-running requests. Within a stage the bar eases
 * toward the stage's `end` (it keeps moving but never claims more than it knows), jumps
 * to that point when `advance()` reports a real milestone, and only reaches 100 on `complete()`.
 */
export function useReportProgress(stages: ProgressStage[]) {
  const stagesRef = useRef(stages);
  stagesRef.current = stages;
  const [percent, setPercent] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const stateRef = useRef({ index: 0, stageStartedAt: 0, stageStartPct: 0, startedAt: 0, percent: 0 });

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const tick = useCallback(() => {
    const state = stateRef.current;
    const stage = stagesRef.current[Math.min(state.index, stagesRef.current.length - 1)];
    const now = Date.now();
    const tau = Math.max(stage.expectedMs, 1000) / 2;
    const eased = state.stageStartPct + (stage.end - state.stageStartPct) * (1 - Math.exp(-(now - state.stageStartedAt) / tau));
    state.percent = Math.max(state.percent, Math.min(eased, stage.end));
    setPercent(state.percent);
    setElapsedMs(now - state.startedAt);
  }, []);

  const start = useCallback(() => {
    stop();
    const now = Date.now();
    stateRef.current = { index: 0, stageStartedAt: now, stageStartPct: 0, startedAt: now, percent: 0 };
    setStageIndex(0);
    setPercent(0);
    setElapsedMs(0);
    timerRef.current = window.setInterval(tick, TICK_MS);
  }, [stop, tick]);

  const advance = useCallback(() => {
    const state = stateRef.current;
    const finished = stagesRef.current[state.index];
    if (!finished || state.index >= stagesRef.current.length - 1) return;
    state.percent = Math.max(state.percent, finished.end);
    state.index += 1;
    state.stageStartedAt = Date.now();
    state.stageStartPct = state.percent;
    setStageIndex(state.index);
    setPercent(state.percent);
  }, []);

  const complete = useCallback(async () => {
    stop();
    stateRef.current.percent = 100;
    setPercent(100);
    await new Promise((resolve) => window.setTimeout(resolve, COMPLETE_HOLD_MS));
  }, [stop]);

  const reset = useCallback(() => {
    stop();
    stateRef.current.percent = 0;
    setPercent(0);
    setStageIndex(0);
    setElapsedMs(0);
  }, [stop]);

  useEffect(() => stop, [stop]);

  const label = percent >= 100 ? "Done" : stages[Math.min(stageIndex, stages.length - 1)]?.label || "";
  return { percent, label, elapsedMs, start, advance, complete, reset };
}

/** For single-request work: walks through descriptive labels as time passes, without real milestones. */
export function timedStages(labels: string[], totalExpectedMs: number, maxPercent = 95): ProgressStage[] {
  const share = maxPercent / labels.length;
  return labels.map((label, index) => ({
    label,
    end: Math.round(share * (index + 1)),
    expectedMs: totalExpectedMs / labels.length,
  }));
}

export function ReportProgressOverlay({
  title,
  percent,
  label,
  elapsedMs,
}: {
  title: string;
  percent: number;
  label: string;
  elapsedMs: number;
}) {
  const rounded = Math.round(percent);
  const seconds = Math.floor(elapsedMs / 1000);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg" role="status" aria-live="polite">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 shrink-0 animate-spin text-primary" />
          <p className="font-semibold text-foreground">{title}</p>
          <span className="ml-auto text-2xl font-semibold tabular-nums text-foreground">{rounded}%</span>
        </div>
        <div
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={rounded}
          aria-label={title}
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <span>{label}</span>
          <span className="shrink-0 tabular-nums">{seconds}s</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">This can take a minute or two. Please keep this page open.</p>
      </div>
    </div>
  );
}
