"""
Krishi Mitra — Chief Secretary Communication Bridge (Gemma Client)
Connects the backend to the local Gemma 4 E4B server via llama-server (port 8080).
Supports single-turn prompts and full multi-turn agent conversations.
"""

import json
import urllib.error
import urllib.request
from typing import Any, Optional


class GemmaClient:
    """HTTP client communicating with local llama-server REST API."""

    def __init__(
        self,
        base_url: str = "http://127.0.0.1:8080",
        timeout_seconds: int = 45
    ):
        self.base_url = base_url.rstrip("/")
        self.chat_url = f"{self.base_url}/v1/chat/completions"
        self.models_url = f"{self.base_url}/v1/models"
        self.timeout = timeout_seconds

    def is_healthy(self) -> bool:
        """Verify if Gemma server is live and ready."""
        try:
            req = urllib.request.Request(self.models_url, method="GET")
            with urllib.request.urlopen(req, timeout=3) as resp:
                return resp.status == 200
        except Exception:
            return False

    def chat(
        self,
        messages: list[dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 1500
    ) -> dict[str, Any]:
        """
        Send a full multi-turn conversation history to Gemma.
        Enforces JSON mode and low temperature for grounded reasoning.
        """
        payload = {
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "response_format": {"type": "json_object"}
        }

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.chat_url,
            data=data_bytes,
            headers={"Content-Type": "application/json"}
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw_body = json.loads(resp.read().decode("utf-8"))
                content = raw_body["choices"][0]["message"]["content"]
                return json.loads(content)

        except urllib.error.URLError as e:
            raise ConnectionError(
                f"Gemma server unreachable at {self.chat_url}. Error: {e}"
            )
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Gemma returned unparseable output: {content}. Error: {e}"
            )

    def generate_json(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.1,
        max_tokens: int = 1500
    ) -> dict[str, Any]:
        """Single-turn helper."""
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})
        return self.chat(messages, temperature=temperature, max_tokens=max_tokens)