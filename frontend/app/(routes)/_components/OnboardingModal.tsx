"use client";

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    title: "Review detections",
    body: "Use the filters to focus on severity, status, or SLA breaches. The map, list, and drawer stay in sync as you explore.",
  },
  {
    title: "Triaging & SLAs",
    body: "Hover the triage chip for the scoring recipe, and watch the SLA chips turn red when timelines are breached.",
  },
  {
    title: "Take action",
    body: "Start an investigation, mark reports complete, and check off runbook tasks. Every action feeds the audit log and PDF.",
  },
  {
    title: "Share evidence",
    body: "Need a quick export? Generate the PDF after updating status, or import another detection batch using the sample CSV.",
  },
];

export function OnboardingModal({ open, onClose }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      closeButtonRef.current?.focus();
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="max-w-2xl rounded-3xl bg-white p-8 shadow-2xl dark:bg-surface-dark">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Welcome to the Control Tower
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Four quick tips to get the most out of this demo
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Close onboarding tips"
          >
            Got it
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <article key={step.title} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{step.body}</p>
            </article>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <p>All data is synthetic. Actions update the CSV store locally and feed the PDF export.</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-accent-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Start exploring
          </button>
        </div>
      </div>
    </div>
  );
}
