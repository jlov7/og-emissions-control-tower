"use client";

import { useMemo } from "react";

import type { EventRecord, RunbookItem } from "../types";

const dateFormatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZoneName: "short",
});

interface Props {
  event: EventRecord | null;
  isInvestigating: boolean;
  isReporting: boolean;
  completingItem: string | null;
  onStartInvestigation: (eventId: string) => void;
  onMarkReported: (eventId: string) => void;
  onCompleteRunbook: (eventId: string, itemId: string) => void;
  onDownloadPdf: (eventId: string) => void;
}

export function DetailsDrawer({
  event,
  isInvestigating,
  isReporting,
  completingItem,
  onStartInvestigation,
  onMarkReported,
  onCompleteRunbook,
  onDownloadPdf,
}: Props) {
  if (!event) {
    return (
      <div className="card h-full">
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Select an event to view details, triage insights, and runbook steps.
        </p>
      </div>
    );
  }

  const actionLog = useMemo(
    () =>
      [...event.action_log].sort((a, b) =>
        new Date(a.timestamp_utc).getTime() - new Date(b.timestamp_utc).getTime()
      ),
    [event.action_log]
  );

  const formatDate = (iso: string | null) => (iso ? dateFormatter.format(new Date(iso)) : "—");

  const renderRunbookItem = (item: RunbookItem) => {
    const disabled = item.completed;
    const isLoading = completingItem === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onCompleteRunbook(event.id, item.id)}
        disabled={disabled || isLoading}
        className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
          item.completed
            ? "border-sla-ok bg-slate-100 text-slate-500 dark:bg-slate-800"
            : "border-slate-200 hover:border-accent-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        }`}
        aria-pressed={item.completed}
      >
        <span className="font-medium text-slate-800 dark:text-slate-100">
          {item.label}
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-300">
          {item.completed
            ? `Checked ${formatDate(item.completed_at_utc)}`
            : isLoading
            ? "Saving..."
            : "Mark complete"}
        </span>
      </button>
    );
  };

  return (
    <div className="card h-full overflow-y-auto">
      <header className="mb-4 space-y-2">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {event.asset.site_name}
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-300">
          Detection {event.detection_type.toUpperCase()} · {event.est_ch4_kgph.toFixed(0)} kg/h CH₄ ·
          Confidence {Math.round(event.confidence * 100)}%
        </p>
        <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Status: {event.status}
        </p>
      </header>

      <section className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Key timestamps
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Detected</dt>
            <dd>{formatDate(event.detected_at_utc)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Investigate by</dt>
            <dd>{formatDate(event.sla_investigate_deadline_utc)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Reported by</dt>
            <dd>{formatDate(event.sla_report_deadline_utc)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Investigation started</dt>
            <dd>{formatDate(event.investigation_started_utc)}</dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Report submitted</dt>
            <dd>{formatDate(event.report_submitted_utc)}</dd>
          </div>
        </dl>
      </section>

      <section className="mb-4 space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Runbook — What to check
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Mark items as you complete them; they are mirrored into the audit log and PDF export.
        </p>
        <div className="flex flex-col gap-2">
          {event.runbook.map(renderRunbookItem)}
        </div>
      </section>

      <section className="mb-4 space-y-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Action log
        </h3>
        <ul className="space-y-2 text-sm">
          {actionLog.map((entry) => (
            <li key={`${entry.message}-${entry.timestamp_utc}`} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <p className="font-medium text-slate-700 dark:text-slate-200">{entry.message}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(entry.timestamp_utc)}</p>
            </li>
          ))}
          {actionLog.length === 0 && (
            <li className="text-xs text-slate-500 dark:text-slate-400">No actions captured yet.</li>
          )}
        </ul>
      </section>

      <section className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onStartInvestigation(event.id)}
          disabled={isInvestigating}
          className="rounded-full bg-accent-primary px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isInvestigating ? "Updating…" : "Start Investigation"}
        </button>
        <button
          type="button"
          onClick={() => onMarkReported(event.id)}
          disabled={isReporting}
          className="rounded-full bg-slate-200 px-5 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
        >
          {isReporting ? "Saving…" : "Mark Reported"}
        </button>
        <button
          type="button"
          onClick={() => onDownloadPdf(event.id)}
          className="rounded-full border border-accent-secondary px-5 py-2 text-sm font-semibold text-accent-secondary transition hover:bg-accent-secondary/10"
        >
          Generate PDF
        </button>
      </section>
    </div>
  );
}
