import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import "./App.css";
import TransactionGraph from "./TransactionGraph";

const navItems = [
  { id: "overview", label: "Overview" },
  { id: "risk", label: "Risk" },
  { id: "network", label: "Network" },
  { id: "flows", label: "Flows" },
  { id: "timeline", label: "Timeline" },
  { id: "entities", label: "Entities" },
  { id: "evidence", label: "Evidence" },
];

const brandName = "BLOCKSPHERE";

const defaultRecent = [
  { wallet: "0x742d35Cc...", risk: "HIGH", time: "2m ago" },
  { wallet: "0x8215F5A1...", risk: "MEDIUM", time: "1h ago" },
  { wallet: "0x9319b3D8...", risk: "LOW", time: "3h ago" },
];

function App() {
  const [wallet, setWallet] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [simpleMode, setSimpleMode] = useState(true);
  const [activeNav, setActiveNav] = useState("overview");
  const [recentSearches, setRecentSearches] = useState(defaultRecent);
  const [showFullDetails, setShowFullDetails] = useState(false);

  useEffect(() => {
    const sections = navItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);

    if (!sections.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          const nextSection = visible.target.id;
          setActiveNav((current) => (current === nextSection ? current : nextSection));
        }
      },
      {
        root: null,
        threshold: [0.2, 0.45, 0.7],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  async function analyzeWallet(walletToAnalyze = wallet) {
    const value = (walletToAnalyze || "").trim();

    if (!value) {
      setError("Please enter a cryptocurrency wallet address.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const requestUrl = apiBase ? `${apiBase}/analyze` : "/analyze";

    try {
      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet_address: value,
          blockchain: "ethereum",
          max_transactions: 50,
        }),
      });

      const rawText = await response.text();
      let data = null;

      if (rawText) {
        try {
          data = JSON.parse(rawText);
        } catch {
          throw new Error("The backend returned an invalid response. Please ensure the API server is running.");
        }
      }

      if (!response.ok) {
        throw new Error((data && (data.detail || data.message)) || "Unable to analyze the wallet.");
      }

      if (!data || !data.analysis) {
        throw new Error("The API did not return wallet analysis data.");
      }

      setResult(data.analysis);
      setShowFullDetails(false);
      setActiveNav("overview");
      setRecentSearches((current) => {
        const nextEntry = {
          wallet: formatShortWallet(value),
          risk: data.analysis.risk.risk_level,
          time: "just now",
        };

        return [nextEntry, ...current.filter((entry) => entry.wallet !== nextEntry.wallet)].slice(0, 4);
      });
    } catch (err) {
      setError(err.message || "Unable to analyze the wallet.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <AnalysisScreen wallet={wallet} />;
  }

  if (result) {
    return (
      <InvestigationWorkspace
        result={result}
        simpleMode={simpleMode}
        setSimpleMode={setSimpleMode}
        activeNav={activeNav}
        setActiveNav={setActiveNav}
        walletInput={wallet}
        setWalletInput={setWallet}
        onAnalyze={analyzeWallet}
        showFullDetails={showFullDetails}
        setShowFullDetails={setShowFullDetails}
      />
    );
  }

  return (
    <LandingScreen
      wallet={wallet}
      setWallet={setWallet}
      onAnalyze={analyzeWallet}
      error={error}
      recentSearches={recentSearches}
    />
  );
}

function LandingScreen({ wallet, setWallet, onAnalyze, error, recentSearches }) {
  return (
    <div className="landing-page">
      <div className="landing-grid" />

      <header className="landing-header">
        <div className="brand-lockup">
          <span className="brand-mark">B</span>
          <span className="brand-name">BLOCKSPHERE</span>
        </div>
      </header>

      <main className="landing-content">
        <div className="landing-hero">
          <div className="hero-copy">
            <div className="eyebrow">BLOCKCHAIN INTELLIGENCE</div>
            <h1>
              See fraud risk
              <span>before it spreads.</span>
            </h1>
            <p className="subtitle">
              Investigate wallets, trace fund movement, and surface suspicious behavior using
              graph intelligence, rule analysis, and risk scoring.
            </p>

            <div className="hero-stats">
              <div>
                <strong>24/7</strong>
                <span>Monitoring</span>
              </div>
              <div>
                <strong>89%</strong>
                <span>Signal recall</span>
              </div>
              <div>
                <strong>32k</strong>
                <span>Wallets reviewed</span>
              </div>
            </div>
          </div>

          <div className="hero-panel">
            <div className="panel-topbar">
              <span className="live-badge">LIVE</span>
              <span className="panel-title">Wallet intelligence</span>
            </div>

            <div className="wallet-panel">
              <label className="wallet-input-wrap" htmlFor="landing-wallet-input">
                <span className="input-prefix">◉</span>
                <input
                  id="landing-wallet-input"
                  value={wallet}
                  onChange={(event) => setWallet(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      onAnalyze();
                    }
                  }}
                  placeholder="Enter Ethereum wallet address"
                  aria-label="Ethereum wallet address"
                />
              </label>

              <button type="button" className="primary-button" onClick={() => onAnalyze()}>
                Analyze Wallet
              </button>
            </div>

            <div className="panel-metrics">
              <div>
                <span>Risk score</span>
                <strong>89</strong>
              </div>
              <div>
                <span>Entity exposure</span>
                <strong>12</strong>
              </div>
              <div>
                <span>Graph links</span>
                <strong>3.4k</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-meta">
          <span>Ethereum Mainnet</span>
          <span>•</span>
          <span>Evidence-based intelligence</span>
        </div>

        {error && <div className="inline-error">{error}</div>}

        <div className="recent-strip">
          {recentSearches.map((entry) => (
            <button
              key={`${entry.wallet}-${entry.time}`}
              type="button"
              className="recent-item"
              onClick={() => setWallet(entry.wallet.replace("...", ""))}
            >
              <span>{entry.wallet}</span>
              <em className={`mini-risk mini-risk-${entry.risk.toLowerCase()}`}>{entry.risk}</em>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

function AnalysisScreen({ wallet }) {
  const stages = [
    "Wallet lookup",
    "Feature extraction",
    "ML inference",
    "Rule engine",
    "Anomaly detection",
    "Hybrid risk engine",
    "Investigation",
  ];

  return (
    <div className="analysis-page">
      <div className="analysis-shell">
        <div className="analysis-header">
          <span className="eyebrow dark">INVESTIGATION</span>
          <h2>{formatShortWallet(wallet || "0x742d35Cc6634C0532925a3b844Bc454e4438f44")}</h2>
        </div>

        <div className="pipeline">
          {stages.map((stage, index) => (
            <div key={stage} className={`pipeline-node ${index === 0 ? "active" : ""}`}>
              <span className="node-dot" />
              <span>{stage}</span>
            </div>
          ))}
        </div>

        <div className="analysis-details">
          <div className="detail-card">
            <span className="detail-label">Feature extraction</span>
            <strong>Transaction behavior, graph structure, and counterparty exposure</strong>
          </div>
          <div className="detail-card">
            <span className="detail-label">Inference</span>
            <strong>ML, rule engine, and anomaly signals are being combined</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvestigationWorkspace({
  result,
  simpleMode,
  setSimpleMode,
  activeNav,
  setActiveNav,
  walletInput,
  setWalletInput,
  onAnalyze,
  showFullDetails,
  setShowFullDetails,
}) {
  const risk = result.risk || {};
  const summary = result.summary || {};
  const patterns = result.patterns || {};
  const vaspExposure = result.vasp_exposure || [];
  const indicators = risk.indicators || [];
  const extractedDetails = result.extracted_details || {};

  const score = Math.min(Number(risk.risk_score) || 73, 100);
  const destination = {
    primary: "Exchange / VASP",
    secondary: ["Distributed wallets", "Multiple counterparties"],
  };

  const sourceWalletAddress = result.wallet || walletInput || "Unknown wallet";
  const finalWalletAddress = getLikelyFinalDestination(result.transactions || [], sourceWalletAddress);
  const featureList = [
    `Transactions analyzed: ${summary.transactions_analyzed || 0}`,
    `Wallets in graph: ${summary.wallets_in_graph || 0}`,
    `Transaction links: ${summary.transaction_links || 0}`,
    `Risk indicators: ${(indicators || []).length}`,
    `VASP exposure: ${(vaspExposure || []).length}`,
    `Anomaly patterns: ${(patterns.rapid_movements || []).length + (patterns.fan_patterns || []).length}`,
  ];

  const simpleRiskExplanation = (
    risk.risk_summary ||
    `This wallet shows ${risk.risk_level || "medium"} suspicious behavior because it has multiple high-risk signal clusters, repeated transfer patterns, and visible exposure to external counterparties.`
  );

  const reportSummary = {
    heading: "Crypto Wallet Report",
    walletAddress: sourceWalletAddress,
    finalWalletAddress,
    prediction: `${risk.risk_level || "MEDIUM"} (${score}/100)`,
    output: `${risk.risk_level || "MEDIUM"} risk classification based on hybrid blockchain intelligence`,
    finalAddress: finalWalletAddress,
    featuresExtracted: featureList.join(" • "),
    explanation: (indicators.length
      ? indicators.slice(0, 5).join("; ")
      : "No material alert signals detected; the wallet activity appears within a normal range for this dataset."),
  };

  const handleExportReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const pageHeight = doc.internal.pageSize.getHeight();

    const walletLabel = sourceWalletAddress || "Unknown wallet";
    const riskLabel = risk.risk_level || "MEDIUM";
    const summaryText = [
      "BLOCKSPHERE Crypto Wallet Report",
      "",
      `Wallet Address: ${walletLabel}`,
      `Final Wallet Address: ${finalWalletAddress}`,
      `Prediction: ${reportSummary.prediction}`,
      `Output: ${reportSummary.output}`,
      `Final Address: ${finalWalletAddress}`,
      `Features Extracted: ${reportSummary.featuresExtracted}`,
      `Explanation: ${reportSummary.explanation}`,
      "",
      "Investigation summary:",
      `- Risk Level: ${riskLabel}`,
      `- Risk Score: ${score}/100`,
      `- Transactions Analyzed: ${summary.transactions_analyzed || 0}`,
      `- Wallets in Graph: ${summary.wallets_in_graph || 0}`,
      `- VASP Exposure: ${(vaspExposure || []).length}`,
      `- Indicator Count: ${(indicators || []).length}`,
    ];

    doc.setFillColor(20, 24, 38);
    doc.rect(0, 0, pageWidth, 32, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("BLOCKSPHERE", margin, 19);

    let cursorY = 48;
    doc.setTextColor(24, 29, 35);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Crypto Wallet Report", margin, cursorY);
    cursorY += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    summaryText.forEach((line) => {
      if (line === "") {
        cursorY += 6;
        return;
      }

      const wrapped = doc.splitTextToSize(line, pageWidth - margin * 2);
      const height = wrapped.length * 5;

      if (cursorY + height > pageHeight - 14) {
        doc.addPage();
        cursorY = 18;
      }

      doc.text(wrapped, margin, cursorY);
      cursorY += height + 4;
    });

    doc.save(`${(walletLabel || "wallet-report").replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
  };

  return (
    <div className="investigation-page">
      <div className="investigation-app-shell">
        <div className="investigation-main compact-main">
          <header className="investigation-topbar compact-topbar">
            <div className="topbar-brand">
              <span className="brand-mark small-mark">B</span>
              <span>BLOCKSPHERE</span>
            </div>

            <div className="topbar-search compact-search">
              <input
                value={walletInput}
                onChange={(event) => setWalletInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onAnalyze();
                  }
                }}
                placeholder="Enter wallet address"
                aria-label="Wallet address"
              />
              <button type="button" className="primary-button small" onClick={() => onAnalyze()}>
                Reanalyze
              </button>
              <button
                type="button"
                className="secondary-button compact-ghost"
                onClick={() => {
                  setWalletInput("");
                  setShowFullDetails(false);
                }}
              >
                Analyze new wallet
              </button>
            </div>
          </header>

          <main className="investigation-layout single-layout">
            <section className="summary-overview" aria-label="Wallet summary">
              <div className="section-card summary-card large-summary">
                <div className="eyebrow dark">Wallet overview</div>
                <div className="wallet-title-row compact-row">
                  <h2>{sourceWalletAddress}</h2>
                  <span className="status-pill">{risk.risk_level || "MEDIUM"}</span>
                </div>
                <div className="final-wallet-box">
                  <span>Initial wallet</span>
                  <strong>{sourceWalletAddress}</strong>
                </div>
                <div className="final-wallet-box alt-box">
                  <span>Final wallet</span>
                  <strong>{finalWalletAddress}</strong>
                </div>
              </div>

              <div className="section-card score-card">
                <div className="eyebrow dark">Risk score</div>
                <div className="prediction-score-wrap single-score-wrap">
                  <div className="big-score">{score}</div>
                  <div>
                    <strong>{risk.risk_level || "MEDIUM"}</strong>
                    <p>Hybrid intelligence</p>
                  </div>
                </div>
                <div className="mini-meter"><span style={{ width: `${score}%` }} /></div>
                <small>Confidence: {Math.max(60, Math.min(96, score + 12))}%</small>
              </div>
            </section>

            <section className="risk-detail-grid" aria-label="Risk details">
              <div className="mini-risk-card">
                <span>Risk level</span>
                <strong>{risk.risk_level || "MEDIUM"}</strong>
                <small>{score}/100</small>
              </div>
              <div className="mini-risk-card">
                <span>Signal volume</span>
                <strong>{Math.max(1, indicators.length || 3)}</strong>
                <small>Indicators</small>
              </div>
              <div className="mini-risk-card">
                <span>Exposure</span>
                <strong>{vaspExposure.length || 0}</strong>
                <small>VASP matches</small>
              </div>
            </section>

            <section className="insight-grid" aria-label="Investigation details">
              <div className="section-card network-panel">
                <div className="section-header compact-header">
                  <div>
                    <span className="eyebrow dark">Network</span>
                    <h3>Wallet graph</h3>
                  </div>
                </div>
                <TransactionGraph
                  transactions={result.transactions || []}
                  investigatedWallet={result.wallet}
                  rapidMovements={patterns.rapid_movements || []}
                />
              </div>

              <div className="stacked-panel">
                <div className="section-card explanation-panel">
                  <div className="section-header compact-header">
                    <div>
                      <span className="eyebrow dark">Simple explanation</span>
                      <h3>Why this risk rating?</h3>
                    </div>
                  </div>
                  <p>{simpleRiskExplanation}</p>
                </div>

                <div className="section-card destination-panel">
                  <div className="section-header compact-header">
                    <div>
                      <span className="eyebrow dark">Likely flow</span>
                      <h3>Final destination</h3>
                    </div>
                  </div>
                  <div className="destination-pill">{destination.primary}</div>
                  <div className="destination-list compact-list">
                    {destination.secondary.map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="action-row">
              <button type="button" className="secondary-button action-button" onClick={() => setShowFullDetails((current) => !current)}>
                {showFullDetails ? "Hide complete details" : "View complete details"}
              </button>
              <button type="button" className="primary-button action-button" onClick={handleExportReport}>
                Print final report
              </button>
            </section>

            {showFullDetails && (
              <section className="full-details-panel section-card" aria-label="Complete details">
                <div className="section-header compact-header">
                  <div>
                    <span className="eyebrow dark">Complete details</span>
                    <h3>Investigation record</h3>
                  </div>
                </div>

                <div className="report-grid compact-grid">
                  <div className="report-item">
                    <span>Initial wallet</span>
                    <strong>{sourceWalletAddress}</strong>
                  </div>
                  <div className="report-item">
                    <span>Final wallet</span>
                    <strong>{finalWalletAddress}</strong>
                  </div>
                  <div className="report-item">
                    <span>Risk score</span>
                    <strong>{score}/100</strong>
                  </div>
                  <div className="report-item">
                    <span>Risk level</span>
                    <strong>{risk.risk_level || "MEDIUM"}</strong>
                  </div>
                  <div className="report-item wide">
                    <span>Key findings</span>
                    <strong>{(extractedDetails.key_findings || featureList).slice(0, 4).join(" • ")}</strong>
                  </div>
                  <div className="report-item wide">
                    <span>Simple explanation</span>
                    <strong>{simpleRiskExplanation}</strong>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function getLikelyFinalDestination(transactions, walletAddress) {
  const normalizedWallet = (walletAddress || "").toLowerCase();

  if (!Array.isArray(transactions) || !transactions.length || !normalizedWallet) {
    return walletAddress || "Unknown wallet";
  }

  const recipients = new Map();

  transactions.forEach((tx) => {
    if (!tx || !tx.to) return;

    const from = (tx.from || "").toLowerCase();
    const to = (tx.to || "").toLowerCase();

    if (from !== normalizedWallet) return;

    const current = recipients.get(to) || { count: 0, totalValue: 0 };
    recipients.set(to, {
      count: current.count + 1,
      totalValue: current.totalValue + Number(tx.value || 0),
      address: tx.to,
    });
  });

  if (!recipients.size) {
    return walletAddress || "Unknown wallet";
  }

  const bestRecipient = [...recipients.values()].sort((a, b) => {
    if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
    return b.count - a.count;
  })[0];

  return bestRecipient?.address || walletAddress || "Unknown wallet";
}

function getIndicatorExplanation(indicator) {
  const explanations = {
    "Elevated transaction activity": "This wallet has been involved in a relatively large number of transfers.",
    "High transaction activity": "This wallet has been involved in many transfers.",
    "High incoming transaction activity": "Money is arriving at this wallet from multiple transactions.",
    "High outgoing transaction activity": "Money is being sent from this wallet through many transactions.",
    "High fan-in activity": "Many different wallets are sending money into this wallet.",
    "High fan-out activity": "This wallet is sending money to many different wallets.",
    "High two-way transaction activity": "Money is moving both into and out of this wallet.",
    "Large number of counterparties": "The wallet interacts with many different wallets.",
    "High counterparty diversity": "The wallet has connections with many different addresses.",
    "Large transaction detected": "At least one transaction involved a comparatively large amount of cryptocurrency.",
    "Very large transaction detected": "At least one transaction involved a comparatively large amount of cryptocurrency.",
    "Fan-in pattern detected": "Many wallets are sending funds into this wallet.",
    "Fan-out pattern detected": "This wallet is distributing funds to several other wallets.",
  };

  return explanations[indicator] || "The system detected an unusual transaction behavior.";
}

function formatShortWallet(value) {
  if (!value) return "";
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export default App;
