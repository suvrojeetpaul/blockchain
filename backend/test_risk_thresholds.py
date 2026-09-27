import networkx as nx

from blockchain.risk import calculate_risk_score


def build_graph_with_score_38_wallet():
    g = nx.DiGraph()
    g.add_node("0xabc")
    g.add_edge("0xabc", "0x111")
    g.add_edge("0xabc", "0x222")
    g.add_edge("0x333", "0xabc")
    g.add_edge("0x444", "0xabc")

    transactions = [
        {"from": "0xabc", "to": "0x111", "value": 30},
        {"from": "0xabc", "to": "0x222", "value": 20},
        {"from": "0x333", "to": "0xabc", "value": 15},
        {"from": "0x444", "to": "0xabc", "value": 10},
    ]

    return g, transactions


def test_mid_range_score_maps_to_medium():
    graph, transactions = build_graph_with_score_38_wallet()
    result = calculate_risk_score(graph, "0xabc", transactions)

    assert result["risk_score"] >= 35
    assert result["risk_level"] == "MEDIUM"


def test_high_score_maps_to_high():
    g = nx.DiGraph()
    g.add_node("0xabc")
    g.add_edge("0xabc", "0x111")
    g.add_edge("0xabc", "0x222")
    g.add_edge("0xabc", "0x333")
    g.add_edge("0xabc", "0x444")
    g.add_edge("0xabc", "0x555")
    g.add_edge("0xabc", "0x666")
    g.add_edge("0x777", "0xabc")
    g.add_edge("0x888", "0xabc")
    g.add_edge("0x999", "0xabc")

    transactions = [
        {"from": "0xabc", "to": "0x111", "value": 120},
        {"from": "0xabc", "to": "0x222", "value": 90},
        {"from": "0xabc", "to": "0x333", "value": 87},
        {"from": "0xabc", "to": "0x444", "value": 75},
        {"from": "0xabc", "to": "0x555", "value": 70},
        {"from": "0xabc", "to": "0x666", "value": 65},
        {"from": "0x777", "to": "0xabc", "value": 30},
        {"from": "0x888", "to": "0xabc", "value": 20},
        {"from": "0x999", "to": "0xabc", "value": 18},
    ]

    result = calculate_risk_score(g, "0xabc", transactions)
    assert result["risk_level"] == "HIGH"
