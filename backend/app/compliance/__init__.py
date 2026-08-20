"""Compliance evaluation package for section-based grant review."""

from typing import Any

__all__ = ["ComplianceEvaluationService", "build_default_service"]


def __getattr__(name: str) -> Any:
    """Load the evaluation service only when callers request it."""
    if name in __all__:
        from backend.app.compliance.service import ComplianceEvaluationService, build_default_service

        return {
            "ComplianceEvaluationService": ComplianceEvaluationService,
            "build_default_service": build_default_service,
        }[name]
    raise AttributeError(name)
