from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

import httpx

from .schemas import EventOut

DEFAULT_ENDPOINT = "https://models.github.ai/inference/v1/chat/completions"
DEFAULT_MODEL = "gpt-4.1-mini"
DEFAULT_TIMEOUT_SECONDS = 30.0


class AIUnavailable(RuntimeError):
    """Raised when the GitHub Models API cannot be used."""


@dataclass
class AIResult:
    content: str
    model: str
    usage: Dict[str, Any] | None = None


class GitHubModelsClient:
    """Minimal GitHub Models client that reads environment variables on each call."""

    token_env = "GITHUB_MODELS_KEY"
    fallback_token_env = "GITHUB_TOKEN"
    endpoint_env = "GITHUB_MODELS_ENDPOINT"
    model_env = "GITHUB_MODELS_MODEL"
    timeout_env = "GITHUB_MODELS_TIMEOUT"

    @property
    def token(self) -> Optional[str]:
        return os.getenv(self.token_env) or os.getenv(self.fallback_token_env)

    @property
    def endpoint(self) -> str:
        return os.getenv(self.endpoint_env, DEFAULT_ENDPOINT)

    @property
    def model_name(self) -> str:
        return os.getenv(self.model_env, DEFAULT_MODEL)

    @property
    def timeout(self) -> float:
        value = os.getenv(self.timeout_env)
        if not value:
            return DEFAULT_TIMEOUT_SECONDS
        try:
            return float(value)
        except ValueError:
            return DEFAULT_TIMEOUT_SECONDS

    @property
    def is_configured(self) -> bool:
        return bool(self.token)

    def generate_event_brief(self, event: EventOut, focus: Optional[str] = None) -> AIResult:
        token = self.token
        if not token:
            raise AIUnavailable("GitHub Models token not available.")

        system_prompt = (
            "You are an emissions response advisor helping operations teams triage synthetic "
            "methane leak detections. Provide concise, actionable guidance. Always mention "
            "SLA status and any missing runbook steps."
        )

        summary_lines = [
            f"Event {event.id} at {event.asset.site_name} ({event.asset.operator}).",
            f"Detection: {event.detection_type}, estimated {event.est_ch4_kgph:.0f} kg/h CH4, confidence {event.confidence:.2f}.",
            f"Status: {event.status}. Triage score {event.triage_score:.2f} ({event.triage_bucket}).",
            f"Detected at {event.detected_at_utc.isoformat()}.",
            f"Investigate by {event.sla_investigate_deadline_utc.isoformat()} ({'breached' if event.sla_investigate_breached else 'on track'}).",
            f"Report by {event.sla_report_deadline_utc.isoformat()} ({'breached' if event.sla_report_breached else 'on track'}).",
        ]

        completed_items = [item.label for item in event.runbook if item.completed]
        pending_items = [item.label for item in event.runbook if not item.completed]

        if completed_items:
            summary_lines.append("Runbook complete: " + ", ".join(completed_items))
        if pending_items:
            summary_lines.append("Runbook pending: " + ", ".join(pending_items))

        if event.action_log:
            recent = ", ".join(
                f"{entry.timestamp_utc.isoformat()} - {entry.message}" for entry in event.action_log[-3:]
            )
            summary_lines.append(f"Recent actions: {recent}")

        if focus:
            summary_lines.append(f"Focus area: {focus}")

        user_prompt = "\n".join(summary_lines)

        payload: Dict[str, Any] = {
            "model": self.model_name,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": (
                        user_prompt
                        + "\n\nRespond with bullet points for immediate response, communications, and data to collect."
                    ),
                },
            ],
            "temperature": 0.3,
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        try:
            response = httpx.post(
                self.endpoint,
                json=payload,
                headers=headers,
                timeout=self.timeout,
            )
        except httpx.HTTPError as exc:
            raise AIUnavailable(f"Failed to contact GitHub Models endpoint: {exc}") from exc

        if response.status_code == 401:
            raise AIUnavailable("Unauthorized to access GitHub Models API with current token.")
        if response.status_code == 403:
            raise AIUnavailable("GitHub Models access denied for this token.")
        if response.status_code == 429:
            raise AIUnavailable("GitHub Models rate limit hit. Try again shortly.")
        if response.status_code >= 400:
            detail = response.text[:200] if response.text else response.reason_phrase
            raise AIUnavailable(f"GitHub Models error ({response.status_code}): {detail}")

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            raise AIUnavailable("GitHub Models response did not include any choices.")

        content = choices[0].get("message", {}).get("content")
        if not content:
            raise AIUnavailable("GitHub Models response did not include content.")

        usage = data.get("usage")

        return AIResult(content=content.strip(), model=self.model_name, usage=usage)


ai_client = GitHubModelsClient()
