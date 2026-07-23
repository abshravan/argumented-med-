"""Environment-backed configuration for the MediAssist backend."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()


def _split(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    provider: str = os.getenv("LLM_PROVIDER", "gemini").strip().lower()

    google_api_key: str = os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    gemini_fallback_models: list[str] = field(
        default_factory=lambda: _split(
            os.getenv("GEMINI_FALLBACK_MODELS", "gemini-2.0-flash,gemini-2.0-flash-lite")
        )
    )

    openrouter_api_key: str = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_model: str = os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4.5")
    openrouter_fallback_models: list[str] = field(
        default_factory=lambda: _split(os.getenv("OPENROUTER_FALLBACK_MODELS", ""))
    )
    openrouter_base_url: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    openrouter_site_url: str = os.getenv("OPENROUTER_SITE_URL", "http://localhost:3000")
    openrouter_app_name: str = os.getenv("OPENROUTER_APP_NAME", "MediAssist Clinical Workspace")

    temperature: float = float(os.getenv("TEMPERATURE", "0.2"))
    # One call returns narrative + the full insights JSON, so this needs headroom.
    max_output_tokens: int = int(os.getenv("MAX_OUTPUT_TOKENS", "3500"))

    #: Attempts against the primary model before falling back (transient errors only).
    max_retries: int = int(os.getenv("LLM_MAX_RETRIES", "2"))
    retry_base_delay: float = float(os.getenv("LLM_RETRY_BASE_DELAY", "1.5"))

    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    cors_origins: list[str] = field(
        default_factory=lambda: _split(
            os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
        )
    )

    def available_providers(self) -> list[str]:
        out: list[str] = []
        if self.google_api_key:
            out.append("gemini")
        if self.openrouter_api_key:
            out.append("openrouter")
        return out

    def default_model_for(self, provider: str) -> str:
        return self.openrouter_model if provider == "openrouter" else self.gemini_model

    def fallbacks_for(self, provider: str) -> list[str]:
        return (
            self.openrouter_fallback_models
            if provider == "openrouter"
            else self.gemini_fallback_models
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
