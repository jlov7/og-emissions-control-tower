"use client";

import { useMemo } from "react";

import type { EventRecord } from "../types";

interface SummaryStatsProps {
  events: EventRecord[];
  onJumpToEvent: (eventId: string) => void;
}

interface SummaryTotals {
  total: number;
  high: number;
  breached: number;
  investigating: number;
  nextBreach: { id: string; label: string; etaHours: number } | null;
}

const statDescriptors = [
  {
    key: "total" as const,
    label: "Open Detections",
    description: "All methane events currently tracked in the control tower.",
  },
  {
    key: "high" as const,
    label: "High Triage",
    description: "Events scoring ≥ 0.7, usually worth immediate attention.",
  },
  {
    key: "breached" as const,
    label: "SLA Breaches",
    description: "Investigate or report timers already in the red.",
  },
  {
    key: "investigating" as const,
    label: "In Progress",
    description: "Investigations underway and awaiting final reports.",
  },
];

export function SummaryStats({ events, onJumpToEvent }: SummaryStatsProps) {
  const summary = useMemo<SummaryTotals>(() => buildSummary(events), [events]);

  return (
    <section className="grid gap-3 rounded-3xl bg-surface-light p-5 shadow-card ring-1 ring-slate-100 dark:bg-surface-dark dark:ring-slate-800 sm:grid-cols-2 lg:grid-cols-4">
      {statDescriptors.map((descriptor) => (
        <article key={descriptor.key} className="flex flex-col justify-between rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {descriptor.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-50">
              {summary[descriptor.key]}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{descriptor.description}</p>
          </div>
          {descriptor.key === "breached" && summary.nextBreach && (
            <button
              type="button"
              onClick={() => onJumpToEvent(summary.nextBreach.id)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-sla-breach px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Review {summary.nextBreach.id} ({summary.nextBreach.label})
            </button>
          )}
        </article>
      ))}
    </section>
  );
}

function buildSummary(events: EventRecord[]): SummaryTotals {
  const totals: SummaryTotals = {
    total: events.length,
    high: 0,
    breached: 0,
    investigating: 0,
    nextBreach: null,
  };

  for (const event of events) {
    if (event.triage_bucket === "HIGH") {
      totals.high += 1;
    }
    if (event.status === "INVESTIGATING") {
      totals.investigating += 1;
    }
    if (event.sla_investigate_breached || event.sla_report_breached) {
      totals.breached += 1;
    }

    const hoursRemaining = Math.min(event.sla_investigate_remaining_h, event.sla_report_remaining_h);
    if (!Number.isFinite(hoursRemaining)) {
      continue;
    }
    if (!totals.nextBreach || hoursRemaining < totals.nextBreach.etaHours) {
      const label = hoursRemaining < 0
        ? `Overdue by ${Math.abs(hoursRemaining).toFixed(1)} h`
        : `${hoursRemaining.toFixed(1)} h left`;
      totals.nextBreach = { id: event.id, label, etaHours: hoursRemaining };
    }
  }

  return totals;
}
