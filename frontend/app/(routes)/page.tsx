"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DetailsDrawer } from "./_components/DetailsDrawer";
import { EventList } from "./_components/EventList";
import { Map } from "./_components/Map";
import { Toolbar } from "./_components/Toolbar";
import { downloadEventPdf, fetchEvents as fetchEventsApi, postEventAction, uploadEventsCsv } from "./client";
import type { EventRecord, EventsResponse } from "./types";

export default function HomePage() {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [triageFilter, setTriageFilter] = useState<"ALL" | "HIGH" | "MED" | "LOW">("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NEW" | "INVESTIGATING" | "REPORTED">("ALL");
  const [slaOnly, setSlaOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [completingItem, setCompletingItem] = useState<string | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [banner, setBanner] = useState<string | null>(null);

  const applyTheme = useCallback((nextTheme: "light" | "dark") => {
    setTheme(nextTheme);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", nextTheme);
      localStorage.setItem("ect-theme", nextTheme);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const stored = localStorage.getItem("ect-theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(stored ?? (prefersDark ? "dark" : "light"));
  }, [applyTheme]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data: EventsResponse = await fetchEventsApi();
      setEvents(data.events);
      setBanner(null);
      if (data.events.length > 0) {
        setSelectedId((current) => current ?? data.events[0].id);
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (triageFilter !== "ALL" && event.triage_bucket !== triageFilter) {
        return false;
      }
      if (statusFilter !== "ALL" && event.status !== statusFilter) {
        return false;
      }
      if (slaOnly && !(event.sla_investigate_breached || event.sla_report_breached)) {
        return false;
      }
      return true;
    });
  }, [events, triageFilter, statusFilter, slaOnly]);

  useEffect(() => {
    if (filteredEvents.length === 0) {
      return;
    }
    if (!selectedId || !filteredEvents.some((event) => event.id === selectedId)) {
      setSelectedId(filteredEvents[0].id);
    }
  }, [filteredEvents, selectedId]);

  const selectedEvent = filteredEvents.find((event) => event.id === selectedId) ?? null;

  const replaceEvent = (updated: EventRecord) => {
    setEvents((prev) => prev.map((event) => (event.id === updated.id ? updated : event)));
    setSelectedId(updated.id);
  };

  const handleStartInvestigation = async (eventId: string) => {
    setIsInvestigating(true);
    try {
      const payload: EventRecord = await postEventAction(eventId, "investigate");
      setError(null);
      replaceEvent(payload);
      setBanner(`Marked ${payload.id} as INVESTIGATING.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsInvestigating(false);
    }
  };

  const handleMarkReported = async (eventId: string) => {
    setIsReporting(true);
    try {
      const payload: EventRecord = await postEventAction(eventId, "report");
      setError(null);
      replaceEvent(payload);
      setBanner(`Marked ${payload.id} as REPORTED.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setIsReporting(false);
    }
  };

  const handleRunbookComplete = async (eventId: string, itemId: string) => {
    setCompletingItem(itemId);
    try {
      const payload: EventRecord = await postEventAction(eventId, "runbook", { item_id: itemId });
      setError(null);
      replaceEvent(payload);
      setBanner(`Logged runbook item on ${payload.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update runbook");
    } finally {
      setCompletingItem(null);
    }
  };

  const handleDownloadPdf = async (eventId: string) => {
    try {
      const blob = await downloadEventPdf(eventId);
      setError(null);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `report_${eventId}.pdf`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      setBanner(`Generated PDF for ${eventId}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate PDF");
    }
  };

  const handleCsvUpload = async (file: File) => {
    try {
      const payload = await uploadEventsCsv(file);
      setError(null);
      setBanner(payload.message);
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload CSV");
    }
  };

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <Toolbar
        triageFilter={triageFilter}
        statusFilter={statusFilter}
        slaOnly={slaOnly}
        theme={theme}
        onTriageFilterChange={setTriageFilter}
        onStatusFilterChange={setStatusFilter}
        onSlaToggle={setSlaOnly}
        onRefresh={loadEvents}
        onCsvUpload={handleCsvUpload}
        onThemeToggle={() => applyTheme(theme === "light" ? "dark" : "light")}
      />

      {error && (
        <div className="rounded-xl border border-red-400 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500 dark:bg-red-900/40 dark:text-red-100">
          {error}
        </div>
      )}

      {banner && !error && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-100">
          {banner}
        </div>
      )}

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="card h-full">
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">Loading map…</p>
            ) : (
              <Map events={filteredEvents} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <div className="card max-h-[360px] overflow-y-auto">
            {loading ? (
              <p className="text-sm text-slate-500 dark:text-slate-300">Loading events…</p>
            ) : (
              <EventList events={filteredEvents} selectedId={selectedId} onSelect={setSelectedId} />
            )}
          </div>
          <DetailsDrawer
            event={selectedEvent}
            isInvestigating={isInvestigating}
            isReporting={isReporting}
            completingItem={completingItem}
            onStartInvestigation={handleStartInvestigation}
            onMarkReported={handleMarkReported}
            onCompleteRunbook={handleRunbookComplete}
            onDownloadPdf={handleDownloadPdf}
          />
        </div>
      </section>
    </main>
  );
}
