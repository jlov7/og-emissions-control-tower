"use client";

import Image from "next/image";

import type { EventRecord } from "../types";
import { SLAChip } from "./SLAChip";
import { TriageChip } from "./TriageChip";

const detectionIcons: Record<string, string> = {
  satellite: "/icons/satellite.svg",
  OGI: "/icons/ogi.svg",
  continuous: "/icons/sensor.svg",
};

const detectionLabels: Record<string, string> = {
  satellite: "Satellite",
  OGI: "OGI",
  continuous: "Continuous",
};

interface Props {
  events: EventRecord[];
  selectedId: string | null;
  onSelect: (eventId: string) => void;
}

export function EventList({ events, selectedId, onSelect }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
        No events match the current filters. Try switching tabs or clearing the SLA-only toggle.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Showing {events.length} event{events.length === 1 ? "" : "s"}</p>
      {events.map((event) => {
        const isActive = event.id === selectedId;
        const detectionIcon = detectionIcons[event.detection_type] ?? "/icons/alarm.svg";
        const detectionLabel = detectionLabels[event.detection_type] ?? event.detection_type;
        return (
          <button
            key={event.id}
            type="button"
            onClick={() => onSelect(event.id)}
            className={`card flex w-full flex-col items-start text-left transition ${
              isActive ? "ring-2 ring-accent-primary" : "hover:ring-2 hover:ring-slate-200 dark:hover:ring-slate-700"
            }`}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Image
                  src={detectionIcon}
                  alt={`${detectionLabel} detection icon`}
                  width={32}
                  height={32}
                />
                <div>
                  <p className="text-sm font-semibold text-slate-500 dark:text-slate-300">{event.id}</p>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {event.asset.site_name}
                  </h3>
                </div>
              </div>
              <TriageChip
                score={event.triage_score}
                bucket={event.triage_bucket}
                breakdown={event.triage_breakdown}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <span className="chip bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-100">
                {detectionLabel}
              </span>
              <span>{event.est_ch4_kgph.toFixed(0)} kg/h CH₄</span>
              <span>Confidence {Math.round(event.confidence * 100)}%</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <SLAChip
                label="Investigate"
                remainingHours={event.sla_investigate_remaining_h}
                deadlineUtc={event.sla_investigate_deadline_utc}
              />
              <SLAChip
                label="Report"
                remainingHours={event.sla_report_remaining_h}
                deadlineUtc={event.sla_report_deadline_utc}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
