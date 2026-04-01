"use client";

import React, { useEffect, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
}

// ─── Type Detection ───────────────────────────────────────────────

function isNativeMermaidType(chart: string): boolean {
  const t = chart.trim();
  return (
    /^sequenceDiagram/i.test(t) ||
    /^stateDiagram/i.test(t) ||
    /^classDiagram/i.test(t)
  );
}

// ─── Color Palette ────────────────────────────────────────────────

const PALETTE = [
  { border: "#60a5fa", bg: "rgba(96,165,250,0.08)", text: "#93bbfc" },   // blue
  { border: "#34d399", bg: "rgba(52,211,153,0.06)", text: "#6ee7b7" },   // green
  { border: "#a78bfa", bg: "rgba(167,139,250,0.06)", text: "#c4b5fd" },  // purple
  { border: "#f59e0b", bg: "rgba(245,158,11,0.08)", text: "#fbbf24" },   // amber
  { border: "#f472b6", bg: "rgba(244,114,182,0.06)", text: "#f9a8d4" },  // pink
  { border: "#22d3ee", bg: "rgba(34,211,238,0.06)", text: "#67e8f9" },   // cyan
  { border: "#fb923c", bg: "rgba(251,146,60,0.06)", text: "#fdba74" },   // orange
  { border: "#a3e635", bg: "rgba(163,230,53,0.06)", text: "#bef264" },   // lime
];

// Map fill colors from style directives to palette indices
const FILL_TO_PALETTE: Record<string, number> = {
  "#1e3a5f": 0, // blue
  "#1a3d1e": 1, // green
  "#2d1a3d": 2, // purple
  "#3d2e1a": 3, // amber
  "#3d1a1e": 4, // pink
  "#1e3a3d": 5, // cyan
};

function getPalette(index: number) {
  return PALETTE[index % PALETTE.length];
}

// ─── Parsing ──────────────────────────────────────────────────────

interface ParsedNode {
  id: string;
  title: string;
  desc?: string;
  shape: "box" | "decision" | "round" | "stadium";
  paletteIdx?: number;
}

interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
}

interface ParsedSubgraph {
  label: string;
  nodeIds: string[];
}

interface ParsedChart {
  direction: "TD" | "LR" | "TB";
  nodes: Map<string, ParsedNode>;
  edges: ParsedEdge[];
  subgraphs: ParsedSubgraph[];
  nodeStyles: Map<string, string>; // nodeId → fill color
}

function parseChart(chart: string): ParsedChart {
  const nodes = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];
  const subgraphs: ParsedSubgraph[] = [];
  const nodeStyles = new Map<string, string>();

  // Detect direction
  const dirMatch = chart.match(/^(?:graph|flowchart)\s+(TD|LR|TB)/im);
  const direction = (dirMatch?.[1] as "TD" | "LR" | "TB") || "TD";

  let currentSubgraph: ParsedSubgraph | null = null;

  for (const line of chart.split("\n")) {
    const trimmed = line.trim();

    // Skip header line and empty lines
    if (/^(graph|flowchart)\s/i.test(trimmed) || !trimmed) continue;

    // Subgraph start
    const sgMatch = trimmed.match(/^subgraph\s+"?([^"]*)"?\s*$/);
    if (sgMatch) {
      currentSubgraph = { label: sgMatch[1], nodeIds: [] };
      continue;
    }

    // Subgraph end
    if (trimmed === "end") {
      if (currentSubgraph) {
        subgraphs.push(currentSubgraph);
        currentSubgraph = null;
      }
      continue;
    }

    // Style directive
    const styleMatch = trimmed.match(
      /^style\s+(\w+)\s+fill:(#[0-9a-fA-F]+)/
    );
    if (styleMatch) {
      nodeStyles.set(styleMatch[1], styleMatch[2]);
      continue;
    }

    // Edges: A --> B, A -->|label| B, A ---> B
    const edgeMatch = trimmed.match(
      /^(\w+)\s*-+>(?:\|([^|]*)\|)?\s*(\w+)(?:\s*$|[^[])/
    );
    if (edgeMatch) {
      edges.push({
        from: edgeMatch[1],
        to: edgeMatch[3],
        label: edgeMatch[2]?.trim(),
      });
      // Also extract inline node definitions from edges like:
      // C -->|Research 阶段| W1[Worker 1: 研究代码库]
    }

    // Node definitions: extract all node declarations from the line
    // Patterns: ID[text], ID["text"], ID{text}, ID(text), ID([text]), ID[[text]]
    const nodeRegex =
      /(\w+)\s*(?:\["([^"]*?)"\]|\[([^\]]*?)\]|\{([^}]*?)\}|\(\[([^\]]*?)\]\)|\(([^)]*?)\))/g;
    let nodeMatch;
    while ((nodeMatch = nodeRegex.exec(trimmed)) !== null) {
      const id = nodeMatch[1];
      if (id === "style" || id === "subgraph" || id === "graph" || id === "flowchart" || id === "end") continue;

      const rawLabel =
        nodeMatch[2] ?? nodeMatch[3] ?? nodeMatch[4] ?? nodeMatch[5] ?? nodeMatch[6] ?? id;
      const shape = nodeMatch[4]
        ? "decision"
        : nodeMatch[5]
          ? "stadium"
          : nodeMatch[6]
            ? "round"
            : "box";

      // Split on <br/> or \n for multi-line
      const parts = rawLabel.split(/<br\s*\/?>|\n/gi).map((s) => s.trim());
      const title = parts[0] || id;
      const desc = parts.slice(1).join(" · ") || undefined;

      if (!nodes.has(id)) {
        nodes.set(id, { id, title, desc, shape });
      }

      if (currentSubgraph) {
        if (!currentSubgraph.nodeIds.includes(id)) {
          currentSubgraph.nodeIds.push(id);
        }
      }
    }

    // Also parse edges from lines that have node defs
    // e.g. "C -->|Research 阶段| W1[Worker 1: 研究代码库]"
    const edgeInlineRegex =
      /(\w+)\s*(-+>+)\s*(?:\|([^|]*)\|)?\s*(\w+)/g;
    let eim;
    while ((eim = edgeInlineRegex.exec(trimmed)) !== null) {
      const from = eim[1];
      const to = eim[4];
      const label = eim[3]?.trim();
      if (
        from !== "style" &&
        !edges.some((e) => e.from === from && e.to === to && e.label === label)
      ) {
        edges.push({ from, to, label });
      }
    }
  }

  // Assign palette colors from style directives
  for (const [nodeId, fill] of nodeStyles) {
    const node = nodes.get(nodeId);
    if (node && fill in FILL_TO_PALETTE) {
      node.paletteIdx = FILL_TO_PALETTE[fill];
    }
  }

  return { direction, nodes, edges, subgraphs, nodeStyles };
}

// ─── Custom Graph Renderer ────────────────────────────────────────

function CustomGraphDiagram({ chart }: { chart: string }) {
  const parsed = parseChart(chart);
  const { direction, nodes, edges, subgraphs } = parsed;
  const isHorizontal = direction === "LR";

  // If subgraphs exist, render layered layout
  if (subgraphs.length > 0) {
    return (
      <LayeredDiagram
        subgraphs={subgraphs}
        nodes={nodes}
        edges={edges}
        isHorizontal={isHorizontal}
      />
    );
  }

  // Simple flow without subgraphs
  return <FlowDiagram nodes={nodes} edges={edges} isHorizontal={isHorizontal} />;
}

// ─── Layered Diagram (with subgraphs) ─────────────────────────────

function LayeredDiagram({
  subgraphs,
  nodes,
  edges,
  isHorizontal,
}: {
  subgraphs: ParsedSubgraph[];
  nodes: Map<string, ParsedNode>;
  edges: ParsedEdge[];
  isHorizontal: boolean;
}) {
  // Find edges between layers for arrows
  const layerNodeSets = subgraphs.map(
    (sg) => new Set(sg.nodeIds)
  );

  // Check if there are inter-layer edges (for arrows between layers)
  const hasInterLayerEdges = (fromLayerIdx: number, toLayerIdx: number) => {
    return edges.some(
      (e) =>
        layerNodeSets[fromLayerIdx]?.has(e.from) &&
        layerNodeSets[toLayerIdx]?.has(e.to)
    );
  };

  return (
    <div
      className="custom-diagram"
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        gap: "8px",
        alignItems: isHorizontal ? "stretch" : "stretch",
      }}
    >
      {subgraphs.map((sg, layerIdx) => {
        const pal = getPalette(layerIdx);
        const showArrow =
          layerIdx < subgraphs.length - 1 &&
          hasInterLayerEdges(layerIdx, layerIdx + 1);

        return (
          <React.Fragment key={layerIdx}>
            <div className="diagram-layer">
              <div
                className="diagram-layer-label"
                style={{ color: pal.text }}
              >
                {sg.label}
              </div>
              <div
                className="diagram-layer-nodes"
                style={{
                  flexDirection: isHorizontal ? "column" : "row",
                }}
              >
                {sg.nodeIds.map((nodeId) => {
                  const node = nodes.get(nodeId);
                  if (!node) return null;
                  const nodePal =
                    node.paletteIdx != null
                      ? getPalette(node.paletteIdx)
                      : pal;
                  return (
                    <NodeBox
                      key={nodeId}
                      node={node}
                      pal={nodePal}
                    />
                  );
                })}
              </div>
            </div>
            {showArrow && (
              <div
                className="diagram-arrow"
                style={{
                  flexDirection: isHorizontal ? "row" : "column",
                }}
              >
                <svg
                  width={isHorizontal ? "28" : "16"}
                  height={isHorizontal ? "16" : "28"}
                  viewBox={isHorizontal ? "0 0 28 16" : "0 0 16 28"}
                >
                  {isHorizontal ? (
                    <>
                      <line
                        x1="4"
                        y1="8"
                        x2="20"
                        y2="8"
                        stroke="#475569"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points="19,4 27,8 19,12"
                        fill="#475569"
                      />
                    </>
                  ) : (
                    <>
                      <line
                        x1="8"
                        y1="4"
                        x2="8"
                        y2="20"
                        stroke="#475569"
                        strokeWidth="1.5"
                      />
                      <polygon
                        points="4,19 8,27 12,19"
                        fill="#475569"
                      />
                    </>
                  )}
                </svg>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Flow Diagram (without subgraphs) ─────────────────────────────

function FlowDiagram({
  nodes,
  edges,
  isHorizontal,
}: {
  nodes: Map<string, ParsedNode>;
  edges: ParsedEdge[];
  isHorizontal: boolean;
}) {
  // Topological sort for ordering
  const ordered = topoSort(nodes, edges);

  return (
    <div
      className="custom-diagram"
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        gap: "6px",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {ordered.map((nodeId, i) => {
        const node = nodes.get(nodeId);
        if (!node) return null;
        const pal = getPalette(node.paletteIdx ?? i);

        // Find edge label from previous node
        const inEdge = edges.find((e) => e.to === nodeId);

        return (
          <React.Fragment key={nodeId}>
            {i > 0 && (
              <div className="diagram-flow-arrow">
                {inEdge?.label && (
                  <span className="diagram-edge-label">
                    {inEdge.label}
                  </span>
                )}
                <svg
                  width={isHorizontal ? "24" : "14"}
                  height={isHorizontal ? "14" : "24"}
                  viewBox={isHorizontal ? "0 0 24 14" : "0 0 14 24"}
                >
                  {isHorizontal ? (
                    <>
                      <line x1="2" y1="7" x2="16" y2="7" stroke="#475569" strokeWidth="1.5" />
                      <polygon points="15,3 23,7 15,11" fill="#475569" />
                    </>
                  ) : (
                    <>
                      <line x1="7" y1="2" x2="7" y2="16" stroke="#475569" strokeWidth="1.5" />
                      <polygon points="3,15 7,23 11,15" fill="#475569" />
                    </>
                  )}
                </svg>
              </div>
            )}
            <NodeBox node={node} pal={pal} />
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Node Component ───────────────────────────────────────────────

function NodeBox({
  node,
  pal,
}: {
  node: ParsedNode;
  pal: (typeof PALETTE)[0];
}) {
  const isDecision = node.shape === "decision";

  return (
    <div
      className={`diagram-node ${isDecision ? "diagram-node-decision" : ""}`}
      style={{
        borderColor: pal.border,
        background: pal.bg,
      }}
    >
      <div className="diagram-node-title" style={{ color: pal.text }}>
        {node.title}
      </div>
      {node.desc && (
        <div className="diagram-node-desc">{node.desc}</div>
      )}
    </div>
  );
}

// ─── Topological Sort ─────────────────────────────────────────────

function topoSort(
  nodes: Map<string, ParsedNode>,
  edges: ParsedEdge[]
): string[] {
  const ids = [...nodes.keys()];
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of ids) {
    inDeg.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (nodes.has(e.from) && nodes.has(e.to)) {
      adj.get(e.from)!.push(e.to);
      inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);
    }
  }

  const queue = ids.filter((id) => inDeg.get(id) === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const next of adj.get(id) || []) {
      const d = (inDeg.get(next) || 1) - 1;
      inDeg.set(next, d);
      if (d === 0) queue.push(next);
    }
  }

  // Add any remaining (cycles)
  for (const id of ids) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
}

// ─── Native Mermaid (sequence, state, class) ──────────────────────

function NativeMermaid({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>("");
  const idRef = useRef(
    `mermaid-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    let cancelled = false;

    async function render() {
      await document.fonts.ready;

      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          darkMode: true,
          background: "#141414",
          fontFamily:
            "system-ui, -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif",
          fontSize: "14px",
          primaryColor: "#1e293b",
          primaryTextColor: "#e2e8f0",
          primaryBorderColor: "#475569",
          textColor: "#e2e8f0",
          nodeTextColor: "#e2e8f0",
          lineColor: "#64748b",
          // sequence
          actorBkg: "#1e293b",
          actorBorder: "#475569",
          actorTextColor: "#e2e8f0",
          actorLineColor: "#334155",
          signalColor: "#64748b",
          signalTextColor: "#e2e8f0",
          noteBkgColor: "#1e1e1e",
          noteTextColor: "#e2e8f0",
          noteBorderColor: "#475569",
          labelBoxBkgColor: "#1e1e1e",
          labelBoxBorderColor: "#334155",
          labelTextColor: "#e2e8f0",
          loopTextColor: "#94a3b8",
          activationBorderColor: "#f59e0b",
          activationBkgColor: "#2d2510",
          sequenceNumberColor: "#ffffff",
          // state
          labelColor: "#e2e8f0",
          altBackground: "#1a1a1a",
          // class
          classText: "#e2e8f0",
        },
        sequence: {
          useMaxWidth: true,
          actorMargin: 80,
          messageMargin: 35,
          mirrorActors: false,
          diagramMarginX: 20,
          diagramMarginY: 20,
        },
      });

      try {
        const { svg: rendered } = await mermaid.render(
          idRef.current,
          chart.trim()
        );
        if (!cancelled) setSvg(rendered);
      } catch (e) {
        console.warn("Mermaid render failed:", e);
        if (!cancelled) setSvg("");
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart]);

  if (!svg) {
    return <pre className="diagram-fallback">{chart}</pre>;
  }

  return (
    <div
      className="mermaid-native"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const trimmed = chart.trim();

  return (
    <div className="diagram-block">
      {isNativeMermaidType(trimmed) ? (
        <NativeMermaid chart={trimmed} />
      ) : (
        <CustomGraphDiagram chart={trimmed} />
      )}
    </div>
  );
}
