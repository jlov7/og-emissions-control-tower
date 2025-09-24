import type { EventRecord, EventsResponse } from "./types";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    const detail = await safeParseError(response);
    throw new Error(detail ?? `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const data = (await response.json()) as T;
  return data;
}

async function safeParseError(response: Response): Promise<string | null> {
  try {
    const payload = await response.clone().json();
    if (typeof payload === "string") {
      return payload;
    }
    if (payload && typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch (error) {
    // Ignore JSON parse failures and fall back to status text
  }
  return null;
}

export async function fetchEvents(): Promise<EventsResponse> {
  return apiFetch<EventsResponse>("/api/events");
}

export async function getEvent(eventId: string): Promise<EventRecord> {
  return apiFetch<EventRecord>(`/api/events/${eventId}`);
}

export async function postEventAction(
  eventId: string,
  action: "investigate" | "report" | "runbook",
  body?: Record<string, unknown>
): Promise<EventRecord> {
  const init: RequestInit = {
    method: "POST",
  };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return apiFetch<EventRecord>(`/api/events/${eventId}/${action}`, init);
}

export async function uploadEventsCsv(file: File): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(`${API_BASE}/api/events/import`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const detail = await safeParseError(response);
    throw new Error(detail ?? "CSV upload failed");
  }
  const payload = await response.json();
  return { message: payload.message as string };
}

export async function downloadEventPdf(eventId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/api/events/${eventId}/report.pdf`);
  if (!response.ok) {
    const detail = await safeParseError(response);
    throw new Error(detail ?? "Unable to generate PDF");
  }
  return response.blob();
}
