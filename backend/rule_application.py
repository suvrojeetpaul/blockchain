"""Standalone rule-stage fraud analysis API.

This module is intentionally separate from ``main.py``. Run it explicitly
with ``uvicorn rule_application:app`` from the backend directory.
"""

import re
from statistics import fmean
from typing import Any

from fastapi import APIRouter, FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    from investigation.service import analyze_wallet
except ModuleNotFoundError:
    from backend.investigation.service import analyze_wallet


ETHEREUM_ADDRESS = re.compile(r"^0x[a-fA-F0-9]{40}$")

RULE_NAMES = (
    "transaction_activity",
    "incoming_activity",
    "outgoing_activity",
    "counterparty_diversity",
    "maximum_transaction_value",
    "pattern_signals",
)

# These weights are kept in this isolated module so the existing risk score
# and /analyze endpoint retain their current behavior.
RULE_WEIGHTS = {
    "transaction_activity": 0.15,
    "incoming_activity": 0.15,
    "outgoing_activity": 0.20,
    "counterparty_diversity": 0.15,
    "maximum_transaction_value": 0.20,
    "pattern_signals": 0.15,
}


class WalletRequest(BaseModel):
    wallet_address: str = Field(
        ...,
        description="Ethereum wallet address",
        examples=["0xFEEEEEE44046c3f61a8CC081E0918eF0de0a7ffC"],
    )


class RuleOutput(BaseModel):
    mu_rule: float
    sigma_squared_rule: float


app = FastAPI(
    title="Rule-Based Fraud Analysis",
    description="Isolated rule-stage wallet evidence API.",
    version="1.0.0",
)
router = APIRouter()


def _bounded_ratio(value: float, threshold: float) -> float:
    """Convert a metric to a bounded evidence value in the range [0, 1]."""
    if threshold <= 0:
        return 0.0
    return min(max(float(value) / threshold, 0.0), 1.0)


def _extract_evidence(analysis: dict[str, Any]) -> dict[str, float]:
    summary = analysis.get("summary", {})
    patterns = analysis.get("patterns", {})
    pattern_count = (
        len(patterns.get("rapid_movements", []))
        + len(patterns.get("fan_patterns", []))
        + len(patterns.get("layering", []))
    )

    return {
        "transaction_activity": _bounded_ratio(
            summary.get("transactions_analyzed", 0), 50
        ),
        "incoming_activity": _bounded_ratio(
            summary.get("incoming_transactions", 0), 10
        ),
        "outgoing_activity": _bounded_ratio(
            summary.get("outgoing_transactions", 0), 10
        ),
        "counterparty_diversity": _bounded_ratio(
            summary.get("counterparty_count", 0), 25
        ),
        "maximum_transaction_value": _bounded_ratio(
            summary.get("maximum_transaction_value", 0), 100
        ),
        "pattern_signals": _bounded_ratio(pattern_count, 5),
    }


def calculate_rule_statistics(evidence: dict[str, float]) -> tuple[float, float]:
    weighted_values = [
        evidence[name] * RULE_WEIGHTS[name]
        for name in RULE_NAMES
    ]
    mu_rule = sum(weighted_values)
    sigma_squared_rule = fmean(
        (value - mu_rule) ** 2 for value in weighted_values
    )
    return mu_rule, sigma_squared_rule


@router.post("/analyze-rule", response_model=RuleOutput)
def analyze_rule(request: WalletRequest) -> RuleOutput:
    wallet = request.wallet_address.strip()

    if not ETHEREUM_ADDRESS.fullmatch(wallet):
        raise HTTPException(
            status_code=400,
            detail="Invalid Ethereum wallet address.",
        )

    try:
        analysis = analyze_wallet(wallet)
        evidence = _extract_evidence(analysis)
        mu_rule, sigma_squared_rule = calculate_rule_statistics(evidence)
        return RuleOutput(
            mu_rule=float(mu_rule),
            sigma_squared_rule=float(sigma_squared_rule),
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Rule analysis failed: {exc}",
        ) from exc


app.include_router(router)
