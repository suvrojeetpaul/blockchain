import { useState } from "react";

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";


// ============================================================
// WALLET NODE
// ============================================================

function WalletNode({ data }) {
  const isSuspect = data.type === "suspect";

  return (
    <div
      style={{
        minWidth: 124,
        padding: "10px 12px",
        borderRadius: 14,

        border: isSuspect
          ? "2px solid #5c9dff"
          : "1px solid #34445f",

        background: isSuspect
          ? "#142b49"
          : "#111c2d",

        // FORCE NODE TEXT TO WHITE
        color: "#ffffff",

        WebkitTextFillColor: "#ffffff",

        boxShadow: isSuspect
          ? "0 0 25px rgba(92,157,255,0.25)"
          : "0 8px 25px rgba(0,0,0,0.2)",

        textAlign: "center",
      }}
    >

      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: "#6ea8ff",
        }}
      />


      {/* NODE TYPE */}

      <div
        style={{
          fontSize: 10,

          color: "#ffffff",

          WebkitTextFillColor: "#ffffff",

          marginBottom: 5,

          letterSpacing: 0.5,

          fontWeight: 700,
        }}
      >
        {isSuspect
          ? "INVESTIGATED WALLET"
          : data.type === "sender"
          ? "SENDER"
          : "CONNECTED WALLET"}
      </div>


      {/* WALLET ADDRESS */}

      <div
        style={{
          fontSize: 11,

          fontWeight: 700,

          color: "#ffffff",

          WebkitTextFillColor: "#ffffff",

          wordBreak: "break-all",

          lineHeight: 1.4,
        }}
      >
        {data.address}
      </div>


      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: "#6ea8ff",
        }}
      />

    </div>
  );
}


const nodeTypes = {
  wallet: WalletNode,
};


// ============================================================
// HELPERS
// ============================================================

function shortenAddress(address) {
  if (!address) return "";

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}


function formatTimestamp(timestamp) {
  if (!timestamp) {
    return "Unknown";
  }

  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}


// ============================================================
// BUILD GRAPH
// ============================================================

function buildGraph(
  transactions,
  investigatedWallet,
  rapidMovements = []
) {

  const wallet =
    investigatedWallet?.toLowerCase() || "";


  // ----------------------------------------------------------
  // Identify transactions involved in rapid movements
  // ----------------------------------------------------------

  const rapidTransactionHashes =
    new Set();

  rapidMovements.forEach((movement) => {

    if (movement.incoming_tx) {
      rapidTransactionHashes.add(
        movement.incoming_tx
      );
    }

    if (movement.outgoing_tx) {
      rapidTransactionHashes.add(
        movement.outgoing_tx
      );
    }

  });


  const nodesMap = new Map();

  const edges = [];


  // ----------------------------------------------------------
  // Create nodes and edges
  // ----------------------------------------------------------

  transactions.forEach((tx) => {

    const from =
      tx.from?.toLowerCase();

    const to =
      tx.to?.toLowerCase();


    if (!from || !to) {
      return;
    }


    // --------------------------------------------------------
    // SOURCE NODE
    // --------------------------------------------------------

    if (!nodesMap.has(from)) {

      nodesMap.set(from, {

        id: from,

        type: "wallet",

        position: {
          x: 0,
          y: 0,
        },

        data: {

          address:
            shortenAddress(from),

          fullAddress: from,

          type:
            from === wallet
              ? "suspect"
              : "sender",

        },

      });

    }


    // --------------------------------------------------------
    // DESTINATION NODE
    // --------------------------------------------------------

    if (!nodesMap.has(to)) {

      nodesMap.set(to, {

        id: to,

        type: "wallet",

        position: {
          x: 0,
          y: 0,
        },

        data: {

          address:
            shortenAddress(to),

          fullAddress: to,

          type:
            to === wallet
              ? "suspect"
              : "connected",

        },

      });

    }


    // --------------------------------------------------------
    // TRANSACTION CLASSIFICATION
    // --------------------------------------------------------

    const isRapid =
      rapidTransactionHashes.has(
        tx.hash
      );


    const isOutgoing =
      from === wallet;


    const edgeColor =
      isRapid
        ? "#f3b75b"
        : isOutgoing
        ? "#e67883"
        : "#69a7ff";


    // --------------------------------------------------------
    // TRANSACTION EDGE
    // --------------------------------------------------------

    edges.push({

      id: tx.hash,

      source: from,

      target: to,


      label:
        `${Number(tx.value || 0).toFixed(4)} ${
          tx.asset || "ETH"
        }`,


      animated:
        isRapid,


      style: {

        stroke: edgeColor,

        strokeWidth:
          isRapid ? 4 : 2,

      },


      markerEnd: {

        type:
          MarkerType.ArrowClosed,

        color:
          edgeColor,

      },


      labelStyle: {

        fill:
          isRapid
            ? "#f3c778"
            : "#a9b8ce",

        fontSize: 10,

        fontWeight:
          isRapid ? 700 : 400,

      },


      labelBgStyle: {

        fill: "#0b1422",

        fillOpacity: 0.95,

      },


      data: {

        hash: tx.hash,

        value: tx.value,

        asset:
          tx.asset || "ETH",

        direction:
          tx.direction,

        timestamp:
          tx.blockTimestamp,

        from:
          tx.from,

        to:
          tx.to,

        isRapid,

      },

    });

  });


  // ----------------------------------------------------------
  // Convert node map to array
  // ----------------------------------------------------------

  const nodes =
    Array.from(
      nodesMap.values()
    );


  // ----------------------------------------------------------
  // Position investigated wallet
  // ----------------------------------------------------------

  const suspectNode =
    nodes.find(
      (node) =>
        node.id === wallet
    );


  if (suspectNode) {

    suspectNode.position = {
      x: 400,
      y: 220,
    };

  }


  // ----------------------------------------------------------
  // Position connected wallets around suspect
  // ----------------------------------------------------------

  const otherNodes =
    nodes.filter(
      (node) =>
        node.id !== wallet
    );


  otherNodes.forEach(
    (node, index) => {

      const nodesPerRing = 12;
      const ringIndex = Math.floor(index / nodesPerRing);
      const ringPosition = index % nodesPerRing;
      const ringSize = Math.min(
        nodesPerRing,
        otherNodes.length - ringIndex * nodesPerRing
      );
      const angle =
        (ringPosition / Math.max(ringSize, 1)) * Math.PI * 2;
      const radius = 260 + ringIndex * 135;


      node.position = {

        x:
          400 +
          Math.cos(angle) *
            radius,

        y:
          220 +
          Math.sin(angle) *
            radius,

      };

    }
  );


  return {
    nodes,
    edges,
  };
}


// ============================================================
// MAIN COMPONENT
// ============================================================

export default function TransactionGraph({

  transactions = [],

  investigatedWallet,

  rapidMovements = [],

}) {


  // ----------------------------------------------------------
  // Selected transaction
  // ----------------------------------------------------------

  const [
    selectedTransaction,
    setSelectedTransaction,
  ] = useState(null);


  // ----------------------------------------------------------
  // Graph filter
  // ----------------------------------------------------------

  const [
    filter,
    setFilter,
  ] = useState("all");


  // ----------------------------------------------------------
  // Filter transactions
  // ----------------------------------------------------------

  const filteredTransactions =
    transactions.filter((tx) => {

      if (filter === "all") {
        return true;
      }


      if (
        filter === "incoming"
      ) {

        return (
          tx.direction ===
          "incoming"
        );

      }


      if (
        filter === "outgoing"
      ) {

        return (
          tx.direction ===
          "outgoing"
        );

      }


      if (
        filter === "rapid"
      ) {

        return rapidMovements.some(
          (movement) =>

            movement.incoming_tx ===
              tx.hash ||

            movement.outgoing_tx ===
              tx.hash
        );

      }


      return true;

    });


  // ----------------------------------------------------------
  // Build graph
  // ----------------------------------------------------------

  const graph =
    buildGraph(

      filteredTransactions,

      investigatedWallet,

      rapidMovements

    );


  // ==========================================================
  // UI
  // ==========================================================

  return (

    <div
      style={{
        width: "100%",

        display: "flex",

        flexDirection:
          "column",

        gap: 6,
      }}
    >

      {/* =====================================================
          FILTER BAR
      ===================================================== */}

      <div
        style={{
          display: "flex",

          gap: 7,

          flexWrap:
            "wrap",

          alignItems:
            "center",
        }}
      >

        <div
          style={{
            color: "#ffffff",

            WebkitTextFillColor:
              "#ffffff",

            fontSize: 9,

            fontWeight: 700,

            letterSpacing: 1,

            marginRight: 5,
          }}
        >
          SHOW:
        </div>


        {[
          [
            "all",
            "All activity",
          ],

          [
            "incoming",
            "Money received",
          ],

          [
            "outgoing",
            "Money sent",
          ],

          [
            "rapid",
            "Rapid movement",
          ],

        ].map(
          ([value, label]) => (

            <button
              key={value}

              onClick={() => {

                setFilter(
                  value
                );

                setSelectedTransaction(
                  null
                );

              }}

              style={{

                padding:
                  "6px 10px",

                borderRadius: 7,

                border:
                  filter === value

                    ? "1px solid #4e8be3"

                    : "1px solid #26364f",

                background:
                  filter === value

                    ? "#173258"

                    : "#0d1524",

                // FORCE FILTER TEXT TO WHITE
                color: "#ffffff",

                WebkitTextFillColor:
                  "#ffffff",

                fontSize: 10,

                fontWeight:
                  filter === value
                    ? 700
                    : 500,

                cursor:
                  "pointer",

                transition:
                  "all 0.15s ease",

                fontFamily:
                  "inherit",

                textShadow:
                  filter === value
                    ? "0 0 8px rgba(255,255,255,0.15)"
                    : "none",

              }}
            >

              {label}

            </button>

          )
        )}


        {/* TRANSACTION COUNT */}

        <div
          style={{
            marginLeft:
              "auto",

            color:
              "#ffffff",

            WebkitTextFillColor:
              "#ffffff",

            fontSize: 9,
          }}
        >

          Showing{" "}

          <strong
            style={{
              color:
                "#ffffff",

              WebkitTextFillColor:
                "#ffffff",
            }}
          >
            {
              filteredTransactions.length
            }
          </strong>

          {" "}of{" "}

          <strong
            style={{
              color:
                "#ffffff",

              WebkitTextFillColor:
                "#ffffff",
            }}
          >
            {
              transactions.length
            }
          </strong>

          {" "}transactions

        </div>

      </div>


      {/* =====================================================
          GRAPH + DETAILS
      ===================================================== */}

      <div
        style={{
          width: "100%",

          height: 440,

          minHeight: 440,

          display: "flex",

          gap: 8,

          alignItems:
            "stretch",
        }}
        className="transaction-graph-layout"
      >


        {/* ===================================================
            GRAPH
        =================================================== */}

        <div
          style={{
            flex: 1,

            minWidth: 0,

            borderRadius: 14,

            overflow: "hidden",

            border:
              "1px solid #26364f",

            background:
              "#080f1b",

            position:
              "relative",

            aspectRatio:
              "1 / 1",
          }}
          className="transaction-graph-canvas"
        >


          {/* =================================================
              LEGEND
          ================================================= */}

          <div
            style={{
              position:
                "absolute",

              top: 12,

              left: 12,

              zIndex: 10,

              display:
                "flex",

              gap: 12,

              padding:
                "7px 10px",

              borderRadius: 8,

              background:
                "rgba(8,15,27,0.9)",

              border:
                "1px solid #26364f",

              fontSize: 9,

              // FORCE LEGEND TEXT WHITE
              color:
                "#ffffff",

              WebkitTextFillColor:
                "#ffffff",
            }}
          >

            {/* INCOMING */}

            <span
              style={{
                color:
                  "#ffffff",

                WebkitTextFillColor:
                  "#ffffff",
              }}
            >

              <span
                style={{
                  color:
                    "#69a7ff",

                  WebkitTextFillColor:
                    "#69a7ff",

                  marginRight: 4,
                }}
              >
                ●
              </span>

              Incoming

            </span>


            {/* OUTGOING */}

            <span
              style={{
                color:
                  "#ffffff",

                WebkitTextFillColor:
                  "#ffffff",
              }}
            >

              <span
                style={{
                  color:
                    "#e67883",

                  WebkitTextFillColor:
                    "#e67883",

                  marginRight: 4,
                }}
              >
                ●
              </span>

              Outgoing

            </span>


            {/* RAPID */}

            <span
              style={{
                color:
                  "#ffffff",

                WebkitTextFillColor:
                  "#ffffff",
              }}
            >

              <span
                style={{
                  color:
                    "#f3b75b",

                  WebkitTextFillColor:
                    "#f3b75b",

                  marginRight: 4,
                }}
              >
                ●
              </span>

              Rapid

            </span>

          </div>


          {/* =================================================
              REACT FLOW
          ================================================= */}

          <ReactFlow

            nodes={
              graph.nodes
            }

            edges={
              graph.edges
            }

            nodeTypes={
              nodeTypes
            }

            fitView

            minZoom={
              0.3
            }

            maxZoom={
              2
            }

            style={{
              height:
                "100%",

              width:
                "100%",
            }}

            onEdgeClick={
              (event, edge) => {

                setSelectedTransaction(
                  edge.data
                );

              }
            }

          >

            <Background
              gap={20}

              size={1}

              color="#1c2a3e"
            />


            <Controls
              style={{
                background:
                  "#0f172a",

                border:
                  "1px solid #334155",

                borderRadius:
                  "10px",
              }}
            />


            <MiniMap

              nodeColor="#1e293b"
                

              nodeStrokeColor="#60a5fa"
               

              nodeBorderRadius={6}

              maskColor="rgba(2, 6, 23, 0.75)"
                

              style={{
                background:
                  "#0f172a",

                border:
                  "1px solid #334155",

                borderRadius:
                  "10px",
              }}

            />

          </ReactFlow>

        </div>


        {/* ===================================================
            TRANSACTION DETAILS
        =================================================== */}

        {selectedTransaction && (

          <div
            style={{
              width: 220,

              flexShrink: 0,

              padding: 12,

              borderRadius: 14,

              border:
                "1px solid #26364f",

              background:
                "#0d1524",

              color:
                "#ffffff",

              WebkitTextFillColor:
                "#ffffff",

              overflowY:
                "auto",
            }}
            className="transaction-details"
          >


            {/* HEADER */}

            <div
              style={{
                display:
                  "flex",

                justifyContent:
                  "space-between",

                alignItems:
                  "center",
              }}
            >

              <div>

                <div
                  style={{
                    color:
                      "#6ea8ff",

                    fontSize: 10,

                    fontWeight: 700,

                    letterSpacing:
                      1.4,
                  }}
                >
                  TRANSACTION EVIDENCE
                </div>


                <h3
                  style={{
                    margin:
                      "7px 0 0",

                    fontSize: 18,

                    color:
                      "#ffffff",

                    WebkitTextFillColor:
                      "#ffffff",
                  }}
                >
                  Transfer details
                </h3>

              </div>


              <button
                onClick={() =>
                  setSelectedTransaction(
                    null
                  )
                }

                style={{
                  border:
                    "none",

                  background:
                    "#172238",

                  color:
                    "#ffffff",

                  WebkitTextFillColor:
                    "#ffffff",

                  borderRadius:
                    6,

                  width: 30,

                  height: 30,

                  cursor:
                    "pointer",

                  fontSize: 18,
                }}
              >
                ×
              </button>

            </div>


            {/* AMOUNT */}

            <div
              style={{
                marginTop:
                  22,

                padding: 16,

                borderRadius:
                  10,

                background:
                  "#101d31",

                border:
                  "1px solid #263953",
              }}
            >

              <div
                style={{
                  color:
                    "#71839d",

                  fontSize: 10,
                }}
              >
                AMOUNT
              </div>


              <div
                style={{
                  marginTop: 5,

                  fontSize: 25,

                  fontWeight: 800,

                  color:
                    "#75adff",
                }}
              >

                {
                  Number(
                    selectedTransaction.value ||
                      0
                  ).toFixed(6)
                }

                {" "}

                {
                  selectedTransaction.asset ||
                  "ETH"
                }

              </div>

            </div>


            {/* RAPID WARNING */}

            {selectedTransaction.isRapid && (

              <div
                style={{
                  marginTop:
                    12,

                  padding: 12,

                  borderRadius:
                    9,

                  background:
                    "rgba(243,183,91,0.10)",

                  border:
                    "1px solid rgba(243,183,91,0.35)",

                  color:
                    "#f3c778",

                  fontSize: 11,

                  lineHeight:
                    1.5,
                }}
              >

                <strong>
                  Rapid movement detected
                </strong>

                <br />

                This transaction is part of
                a detected rapid fund movement
                pattern.

              </div>

            )}


            {/* DETAILS */}

            <div
              style={{
                marginTop:
                  15,
              }}
            >

              <DetailRow
                label="Direction"
                value={
                  selectedTransaction.direction ===
                  "incoming"

                    ? "Money received"

                    : "Money sent"
                }
              />


              <DetailRow
                label="Time"
                value={
                  formatTimestamp(
                    selectedTransaction
                      .timestamp
                  )
                }
              />


              <DetailRow
                label="From"
                value={
                  shortenAddress(
                    selectedTransaction
                      .from
                  )
                }
              />


              <DetailRow
                label="To"
                value={
                  shortenAddress(
                    selectedTransaction
                      .to
                  )
                }
              />

            </div>


            {/* HASH */}

            <div
              style={{
                marginTop:
                  18,
              }}
            >

              <div
                style={{
                  color:
                    "#71839d",

                  fontSize: 10,

                  marginBottom:
                    7,
                }}
              >
                TRANSACTION HASH
              </div>


              <div
                style={{
                  padding: 10,

                  borderRadius: 7,

                  background:
                    "#080f1b",

                  color:
                    "#82b3ff",

                  fontSize: 10,

                  lineHeight:
                    1.5,

                  wordBreak:
                    "break-all",
                }}
              >
                {
                  selectedTransaction.hash
                }
              </div>

            </div>


            {/* EXPLANATION */}

            <div
              style={{
                marginTop:
                  18,

                padding: 12,

                borderRadius: 8,

                background:
                  "#111d2d",

                color:
                  "#ffffff",

                WebkitTextFillColor:
                  "#ffffff",

                fontSize: 11,

                lineHeight:
                  1.6,
              }}
            >

              {selectedTransaction.direction ===
              "incoming"

                ? "This transaction transferred cryptocurrency into the wallet under investigation."

                : "This transaction transferred cryptocurrency away from the wallet under investigation."
              }

            </div>


          </div>

        )}

      </div>

    </div>
  );
}


// ============================================================
// DETAIL ROW
// ============================================================

function DetailRow({
  label,
  value,
}) {

  return (

    <div
      style={{
        padding:
          "11px 0",

        borderBottom:
          "1px solid #202d42",
      }}
    >

      <div
        style={{
          color:
            "#718097",

          fontSize: 10,

          marginBottom: 4,
        }}
      >
        {label}
      </div>


      <div
        style={{
          // FORCE DETAIL VALUE TEXT WHITE
          color:
            "#ffffff",

          WebkitTextFillColor:
            "#ffffff",

          fontSize: 11,

          wordBreak:
            "break-all",
        }}
      >
        {value}
      </div>

    </div>

  );
}