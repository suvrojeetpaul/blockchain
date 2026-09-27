from blockchain.transactions import (
    get_eth_transactions
)

from blockchain.graph import (
    create_transaction_graph
)

from blockchain.risk import (
    calculate_risk_score
)

from blockchain.vasp import (
    load_vasp_addresses,
    find_nearest_vasp
)

from blockchain.patterns import (
    detect_fan_patterns,
    detect_rapid_movements,
    detect_layering
)


def analyze_wallet(
    wallet_address: str,
    max_transactions: int = 50
):

    # ============================================
    # 1. FETCH BLOCKCHAIN TRANSACTIONS
    # ============================================

    transactions = get_eth_transactions(
        wallet_address,
        max_count=max_transactions
    )

    # ============================================
    # 2. BUILD TRANSACTION GRAPH
    # ============================================

    graph = create_transaction_graph(
        transactions
    )

    # ============================================
    # 3. RISK ANALYSIS
    # ============================================

    risk = calculate_risk_score(
        graph,
        wallet_address,
        transactions
    )

    # ============================================
    # 4. PATTERN ANALYSIS
    # ============================================

    fan_patterns = detect_fan_patterns(
        graph
    )

    rapid_movements = detect_rapid_movements(
        transactions,
        wallet_address
    )

    layering = detect_layering(
        graph,
        wallet_address
    )

    # ============================================
    # 5. VASP ANALYSIS
    # ============================================

    vasp_database = load_vasp_addresses()

    vasp_results = find_nearest_vasp(
        graph,
        wallet_address,
        vasp_database
    )

    # ============================================
    # 6. RETURN UNIFIED INTELLIGENCE
    # ============================================

    risk_summary = risk.get("risk_summary") or "Risk profile reviewed."
    signal_count = len(risk.get("indicators") or [])
    vasp_count = len(vasp_results or [])

    findings = [
        f"Transactions analyzed: {len(transactions)}",
        f"Wallets in graph: {graph.number_of_nodes()}",
        f"Transaction links: {graph.number_of_edges()}",
        f"Risk score: {risk.get('risk_score', 0)}/100",
        f"Risk level: {risk.get('risk_level', 'LOW')}",
        f"Risk indicators: {signal_count}",
        f"VASP exposure matches: {vasp_count}"
    ]

    if rapid_movements:
        findings.append(f"Rapid movement patterns detected: {len(rapid_movements)}")
    if fan_patterns:
        findings.append(f"Fan-out/fan-in patterns detected: {len(fan_patterns)}")
    if layering:
        findings.append(f"Multi-hop layering paths detected: {len(layering)}")

    return {

        "wallet": wallet_address,

        "blockchain": "ethereum",

        "summary": {

            "transactions_analyzed":
                len(transactions),

            "wallets_in_graph":
                graph.number_of_nodes(),

            "transaction_links":
                graph.number_of_edges(),

            "incoming_transactions":
                sum(1 for tx in transactions if (tx.get("direction") == "incoming")),

            "outgoing_transactions":
                sum(1 for tx in transactions if (tx.get("direction") == "outgoing")),

            "counterparty_count":
                risk.get("wallet_activity_profile", {}).get("counterparty_diversity", 0),

            "maximum_transaction_value":
                risk.get("wallet_activity_profile", {}).get("maximum_value", 0),

            "risk_score":
                risk.get("risk_score", 0),

            "risk_level":
                risk.get("risk_level", "LOW")
        },

        "risk": risk,

        "patterns": {

            "fan_patterns":
                fan_patterns,

            "rapid_movements":
                rapid_movements,

            "layering":
                layering,

            "signal_count":
                signal_count,

            "pattern_summary": {
                "rapid_movements": len(rapid_movements),
                "fan_patterns": len(fan_patterns),
                "layering_paths": len(layering)
            }
        },

        "vasp_exposure": vasp_results,

        "transactions": transactions,

        "extracted_details": {
            "risk_summary": risk_summary,
            "key_findings": findings,
            "recommended_action": (
                "Escalate for manual review and validate counterparties if risk is medium or high."
                if risk.get("risk_level") in {"MEDIUM", "HIGH"}
                else "Continue monitoring; no immediate escalation required for this snapshot."
            )
        },

        "report": {
            "headline": f"Blockchain intelligence review for {wallet_address}",
            "executive_summary": risk_summary,
            "observations": findings,
            "final_risk_level": risk.get("risk_level", "LOW"),
            "final_risk_score": risk.get("risk_score", 0),
            "vasp_matches": vasp_count,
            "pattern_count": signal_count + len(rapid_movements) + len(fan_patterns) + len(layering)
        }
    }