"""Negotiation schema for custom plan consultation and bargain calls."""

from __future__ import annotations

# Re-export unified PlanNegotiation model from app.models.billing
from app.models.billing import PlanNegotiation

__all__ = ["PlanNegotiation"]
