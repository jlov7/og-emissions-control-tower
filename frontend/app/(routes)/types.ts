export type Asset = {
  site_id: string;
  site_name: string;
  operator: string;
  lat: number;
  lon: number;
};

export type TriageBreakdown = {
  base_severity: number;
  detection_weight: number;
  confidence: number;
  recency_boost: number;
  score: number;
  components: Record<string, number>;
  computed_at_utc: string;
};

export type ActionLogEntry = {
  message: string;
  timestamp_utc: string;
};

export type RunbookItem = {
  id: string;
  label: string;
  completed: boolean;
  completed_at_utc: string | null;
};

export type EventRecord = {
  id: string;
  site_id: string;
  detection_type: "satellite" | "OGI" | "continuous";
  est_ch4_kgph: number;
  confidence: number;
  lat: number;
  lon: number;
  status: "NEW" | "INVESTIGATING" | "REPORTED";
  detected_at_utc: string;
  investigation_started_utc: string | null;
  report_submitted_utc: string | null;
  notes: Record<string, unknown>;
  asset: Asset;
  triage_score: number;
  triage_bucket: "LOW" | "MED" | "HIGH";
  triage_breakdown: TriageBreakdown;
  sla_investigate_deadline_utc: string;
  sla_report_deadline_utc: string;
  sla_investigate_remaining_h: number;
  sla_report_remaining_h: number;
  sla_investigate_breached: boolean;
  sla_report_breached: boolean;
  action_log: ActionLogEntry[];
  runbook: RunbookItem[];
};

export type EventsResponse = {
  events: EventRecord[];
};
