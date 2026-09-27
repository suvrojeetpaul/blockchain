def calculate_risk_score(
    graph,
    wallet_address,
    transactions
):

    wallet = wallet_address.lower()

    score = 0

    indicators = []

    if wallet not in graph:

        return {
            "risk_score": 0,
            "risk_level": "UNKNOWN",
            "indicators": [
                "Wallet not found in transaction graph"
            ]
        }

    # ============================================
    # BASIC METRICS
    # ============================================

    incoming = graph.in_degree(wallet)

    outgoing = graph.out_degree(wallet)

    transaction_count = len(
        transactions
    )

    # ============================================
    # UNIQUE COUNTERPARTIES
    # ============================================

    counterparties = set()

    for tx in transactions:

        sender = tx.get("from")

        receiver = tx.get("to")

        if sender:

            sender = sender.lower()

            if sender != wallet:

                counterparties.add(
                    sender
                )

        if receiver:

            receiver = receiver.lower()

            if receiver != wallet:

                counterparties.add(
                    receiver
                )

    counterparty_count = len(
        counterparties
    )

    # ============================================
    # MAX TRANSACTION VALUE
    # ============================================

    max_value = 0

    for tx in transactions:

        value = tx.get("value", 0)

        if isinstance(
            value,
            (int, float)
        ):

            max_value = max(
                max_value,
                value
            )

    # ============================================
    # 1. HIGH ACTIVITY
    # ============================================

    if transaction_count >= 100:

        score += 5

        indicators.append(
            "Very high transaction activity"
        )

    elif transaction_count >= 50:

        score += 3

        indicators.append(
            "Elevated transaction activity"
        )

    # ============================================
    # 2. FAN-IN
    # ============================================

    if incoming >= 10:

        score += 5

        indicators.append(
            "High fan-in activity"
        )

    # ============================================
    # 3. FAN-OUT
    # ============================================

    if outgoing >= 10:

        score += 10

        indicators.append(
            "High fan-out activity"
        )

    # ============================================
    # 4. BALANCED RAPID MOVEMENT INDICATOR
    # ============================================

    # A wallet that receives a lot and immediately
    # distributes funds is more interesting than
    # a wallet that simply receives funds.

    if incoming >= 5 and outgoing >= 5:

        score += 10

        indicators.append(
            "High two-way transaction activity"
        )

    # ============================================
    # 5. COUNTERPARTY DIVERSITY
    # ============================================

    if counterparty_count >= 25:

        score += 10

        indicators.append(
            "Very high counterparty diversity"
        )

    elif counterparty_count >= 10:

        score += 5

        indicators.append(
            "High counterparty diversity"
        )

    # ============================================
    # 6. LARGE VALUE
    # ============================================

    if max_value >= 100:

        score += 10

        indicators.append(
            "Very large transaction detected"
        )

    elif max_value >= 10:

        score += 5

        indicators.append(
            "Large transaction detected"
        )

    # ============================================
    # SCORE LIMIT
    # ============================================

    score = min(
        score,
        100
    )

    # ============================================
    # RISK LEVEL
    # ============================================
    # Requested bands:
    # 0-30 -> LOW
    # 30-60 -> MEDIUM
    # 60+ -> HIGH

    if score >= 60:

        risk_level = "HIGH"

    elif score >= 30:

        risk_level = "MEDIUM"

    else:

        risk_level = "LOW"

    if not indicators:
        risk_summary = "No material suspicious patterns were identified in the available transaction sample."
    elif risk_level == "HIGH":
        risk_summary = "Multiple suspicious behaviors were observed, including elevated network activity and fund dispersion patterns."
    elif risk_level == "MEDIUM":
        risk_summary = "The wallet shows moderate behavioral anomalies that may justify deeper review or follow-up examination."
    else:
        risk_summary = "Low signal activity detected in the current dataset; no strong suspicious patterns were identified."

    # ============================================
    # RETURN
    # ============================================

    return {

        "risk_score": score,

        "risk_level": risk_level,

        "severity": risk_level,

        "confidence": min(98, max(60, score + 10)),

        "risk_summary": risk_summary,

        "indicators": indicators,

        "transaction_count":
            transaction_count,

        "incoming_connections":
            incoming,

        "outgoing_connections":
            outgoing,

        "counterparty_count":
            counterparty_count,

        "maximum_transaction_value":
            max_value,

        "normalized_score": round(score / 100, 3),

        "wallet_activity_profile": {
            "incoming_volume": incoming,
            "outgoing_volume": outgoing,
            "counterparty_diversity": counterparty_count,
            "maximum_value": max_value,
            "total_signals": len(indicators)
        }
    }