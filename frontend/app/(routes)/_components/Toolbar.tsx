"use client";

import { ChangeEvent } from "react";

const triageOptions = [
  { value: "ALL", label: "All severities" },
  { value: "HIGH", label: "High" },
  { value: "MED", label: "Medium" },
  { value: "LOW", label: "Low" },
] as const;

const statusOptions = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "INVESTIGATING", label: "Investigating" },
  { value: "REPORTED", label: "Reported" },
] as const;

interface Props {
  triageFilter: typeof triageOptions[number]["value"];
  statusFilter: typeof statusOptions[number]["value"];
  slaOnly: boolean;
  theme: "light" | "dark";
  onTriageFilterChange: (value: Props["triageFilter"]) => void;
  onStatusFilterChange: (value: Props["statusFilter"]) => void;
  onSlaToggle: (value: boolean) => void;
  onRefresh: () => void;
  onCsvUpload: (file: File) => void;
  onThemeToggle: () => void;
  onShowGuide: () => void;
}

export function Toolbar({
  triageFilter,
  statusFilter,
  slaOnly,
  theme,
  onTriageFilterChange,
  onStatusFilterChange,
  onSlaToggle,
  onRefresh,
  onCsvUpload,
  onThemeToggle,
  onShowGuide,
}: Props) {
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onCsvUpload(file);
      event.target.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface-light px-6 py-4 shadow-card dark:bg-surface-dark">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Emissions Control Tower (Demo)
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Synthetic detections for methane triage, SLA tracking, and audit-ready reports.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Filter by severity or lifecycle, import the sample CSV, or open the guide for a quick tour.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Refresh
        </button>
        <select
          value={triageFilter}
          onChange={(event) => onTriageFilterChange(event.target.value as Props["triageFilter"])}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm focus-visible:ring-2 dark:border-slate-600 dark:bg-surface-dark dark:text-slate-100"
          aria-label="Filter by triage bucket"
        >
          {triageOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex rounded-full border border-slate-300 p-1 dark:border-slate-600" role="tablist" aria-label="Filter by status">
          {statusOptions.map((option) => {
            const active = option.value === statusFilter;
            return (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={active}
                className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                  active
                    ? "bg-accent-primary text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
                onClick={() => onStatusFilterChange(option.value)}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <input
            type="checkbox"
            checked={slaOnly}
            onChange={(event) => onSlaToggle(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-accent-primary focus:ring-accent-primary"
          />
          SLA breaches only
        </label>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-slate-400 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-accent-primary hover:text-accent-primary dark:border-slate-500 dark:text-slate-200 dark:hover:border-accent-secondary dark:hover:text-accent-secondary">
            <input
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
              aria-label="Upload additional detections"
            />
            Import CSV
          </label>
          <a
            href="/samples/demo_events_batch.csv"
            className="text-sm font-medium text-accent-primary underline-offset-4 hover:underline dark:text-accent-secondary"
            download
          >
            Sample batch
          </a>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onThemeToggle}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Toggle theme"
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button
            type="button"
            onClick={onShowGuide}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Guide
          </button>
        </div>
      </div>
    </div>
  );
}
