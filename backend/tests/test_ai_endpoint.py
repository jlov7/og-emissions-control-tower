from __future__ import annotations
import sys
import types

if 'fpdf' not in sys.modules:
    class _DummyFPDF:
        def __init__(self, *args, **kwargs):
            pass

        def set_auto_page_break(self, *args, **kwargs):
            pass

        def add_page(self, *args, **kwargs):
            pass

        def set_font(self, *args, **kwargs):
            pass

        def cell(self, *args, **kwargs):
            pass

        def ln(self, *args, **kwargs):
            pass

        def multi_cell(self, *args, **kwargs):
            pass

        def set_y(self, *args, **kwargs):
            pass

        def output(self, *args, **kwargs):
            return ''

    sys.modules['fpdf'] = types.SimpleNamespace(FPDF=_DummyFPDF)


from typing import Any, Dict

import httpx
import pytest
from fastapi.testclient import TestClient

from app import ai as ai_module
from app.main import app

client = TestClient(app)


def test_ai_endpoint_unavailable(monkeypatch):
    """Without a GitHub token the endpoint should return 503."""
    monkeypatch.delenv(ai_module.GitHubModelsClient.token_env, raising=False)
    monkeypatch.delenv(ai_module.GitHubModelsClient.fallback_token_env, raising=False)
    ai_module.ai_client = ai_module.GitHubModelsClient()

    response = client.post("/api/events/E001/assistant", json={})
    assert response.status_code == 503
    assert response.json()["detail"].startswith("AI assistant is unavailable")


def test_ai_endpoint_success(monkeypatch):
    """With a token the endpoint should call the GitHub Models API."""
    monkeypatch.setenv(ai_module.GitHubModelsClient.fallback_token_env, "ghs_test")
    ai_module.ai_client = ai_module.GitHubModelsClient()

    def fake_post(url: str, json: Dict[str, Any], headers: Dict[str, str], timeout: float):
        assert url == ai_module.ai_client.endpoint
        assert headers["Authorization"] == "Bearer ghs_test"
        assert json["model"] == ai_module.ai_client.model_name
        return httpx.Response(
            status_code=200,
            json={
                "choices": [{"message": {"content": "- Step 1\n- Step 2"}}],
                "usage": {"total_tokens": 42},
            },
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx, "post", fake_post)

    response = client.post("/api/events/E001/assistant", json={})
    assert response.status_code == 200
    body = response.json()
    assert body["content"].startswith("- Step 1")
    assert body["usage"]["total_tokens"] == 42

    monkeypatch.delenv(ai_module.GitHubModelsClient.fallback_token_env, raising=False)
    ai_module.ai_client = ai_module.GitHubModelsClient()
