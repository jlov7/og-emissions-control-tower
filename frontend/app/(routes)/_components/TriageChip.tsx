"use client";

import { useId, useState } from "react";

import type { TriageBreakdown } from "../types";

const bucketStyles: Record<string, string> = {
  HIGH: "bg-triage-high text-white",
  MED: "bg-triage-medium text-slate-900",
  LOW: "bg-triage-low text-slate-900",
};

interface Props {
  score: number;
  bucket: "HIGH" | "MED" | "LOW";
  breakdown: TriageBreakdown;
}

export function TriageChip({ score, bucket, breakdown }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const tooltipId = useId();

  const bucketClass = bucketStyles[bucket] ?? "bg-slate-500 text-white";

  return (
    <div className="relative inline-flex">
      <div
        className={`chip ${bucketClass} shadow-sm transition hover:opacity-90`}
        aria-describedby={tooltipId}
        role="img"
        aria-label={`Triage ${bucket.toLowerCase()} score ${score.toFixed(2)}`}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onTouchStart={() => setIsOpen(true)}
        onTouchEnd={() => setIsOpen(false)}
      >
        <span className="font-semibold">{score.toFixed(2)}</span>
        <span className="uppercase tracking-wide">{bucket}</span>
      </div>
      {isOpen && (
        <div
          role="tooltip"
          id={tooltipId}
          className="absolute left-1/2 top-full z-20 mt-2 w-64 -translate-x-1/2 rounded-xl bg-slate-900 p-3 text-xs text-white shadow-lg"
        >
          <p className="mb-2 font-semibold text-slate-100">Why this score?</p>
          <ul className="space-y-1 text-slate-200">
            <li>CH₄ rate factor: {breakdown.base_severity.toFixed(2)}</li>
            <li>Detection weight: {breakdown.detection_weight.toFixed(2)}</li>
            <li>Confidence: {breakdown.confidence.toFixed(2)}</li>
            <li>Recency boost: {breakdown.recency_boost.toFixed(2)}</li>
          </ul>
        </div>
      )}
    </div>
  );
}
