"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface MermaidDiagramProps {
  chart: string;
}

// ─── Type Detection ───────────────────────────────────────────────

function isNativeMermaidType(chart: string): boolean {
  const t = chart.trim();
  return (
    /^sequenceDiagram/i.test(t) ||
    /^classDiagram/i.test(t)
  );
}

function isStateDiagram(chart: string): boolean {
  return /^stateDiagram/i.test(chart.trim());
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

    // ── Parse node definitions first ──
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

    // ── Parse edges ──
    // Strip bracket content so "A[long text] --> B{text}" becomes "A --> B"
    const stripped = trimmed
      .replace(/\["[^"]*"\]/g, "")  // ["..."]
      .replace(/\[[^\]]*\]/g, "")    // [...]
      .replace(/\{[^}]*\}/g, "")     // {...}
      .replace(/\(\[[^\]]*\]\)/g, "") // ([...])
      .replace(/\([^)]*\)/g, "");     // (...)

    const edgeGlobalRegex = /(\w+)\s*-+>(?:\|([^|]*)\|)?\s*(\w+)/g;
    let eim;
    while ((eim = edgeGlobalRegex.exec(stripped)) !== null) {
      const from = eim[1];
      const to = eim[3];
      const label = eim[2]?.trim();
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

// ─── State Diagram Parser ────────────────────────────────────────

function parseStateDiagram(chart: string): ParsedChart {
  const nodes = new Map<string, ParsedNode>();
  const edges: ParsedEdge[] = [];
  const nodeStyles = new Map<string, string>();

  // Ensure [*] start/end nodes exist
  const ensureNode = (id: string) => {
    if (nodes.has(id)) return;
    if (id === "__start__" || id === "__end__") {
      nodes.set(id, { id, title: id === "__start__" ? "●" : "◎", shape: "round" });
    } else {
      nodes.set(id, { id, title: id, shape: "box" });
    }
  };

  for (const line of chart.split("\n")) {
    const trimmed = line.trim();
    if (/^stateDiagram/i.test(trimmed) || !trimmed) continue;
    if (/^direction\s/i.test(trimmed)) continue;

    // State transition: StateA --> StateB: label
    // Also handles [*] --> StateA and StateA --> [*]
    const transMatch = trimmed.match(
      /^(\[\*\]|\w+)\s*-->\s*(\[\*\]|\w+)(?:\s*:\s*(.+))?$/
    );
    if (transMatch) {
      // Map [*] to start/end nodes based on context
      let from = transMatch[1];
      let to = transMatch[2];
      const label = transMatch[3]?.trim();

      // First [*] is start, last [*] is end
      if (from === "[*]") from = "__start__";
      if (to === "[*]") to = "__end__";

      ensureNode(from);
      ensureNode(to);
      edges.push({ from, to, label });
    }
  }

  return { direction: "TD", nodes, edges, subgraphs: [], nodeStyles };
}

// ─── Custom Graph Renderer ────────────────────────────────────────

/** Check if this is a side-by-side comparison (e.g. serial vs parallel) */
function isComparisonDiagram(
  subgraphs: ParsedSubgraph[],
  edges: ParsedEdge[]
): boolean {
  if (subgraphs.length !== 2) return false;
  // No edges between the two subgraphs → independent comparison
  const setA = new Set(subgraphs[0].nodeIds);
  const setB = new Set(subgraphs[1].nodeIds);
  return !edges.some(
    (e) =>
      (setA.has(e.from) && setB.has(e.to)) ||
      (setB.has(e.from) && setA.has(e.to))
  );
}

function CustomGraphDiagram({ chart }: { chart: string }) {
  const parsed = isStateDiagram(chart) ? parseStateDiagram(chart) : parseChart(chart);
  const { direction, nodes, edges, subgraphs } = parsed;
  const isHorizontal = direction === "LR";

  if (subgraphs.length > 0) {
    if (isComparisonDiagram(subgraphs, edges)) {
      return (
        <ComparisonDiagram
          subgraphs={subgraphs}
          nodes={nodes}
          edges={edges}
        />
      );
    }
    return (
      <LayeredDiagram
        subgraphs={subgraphs}
        nodes={nodes}
        edges={edges}
        isHorizontal={isHorizontal}
      />
    );
  }

  return <FlowDiagram nodes={nodes} edges={edges} isHorizontal={isHorizontal} />;
}

// ─── Comparison Diagram (side-by-side timeline) ───────────────────

function ComparisonDiagram({
  subgraphs,
  nodes,
  edges,
}: {
  subgraphs: ParsedSubgraph[];
  nodes: Map<string, ParsedNode>;
  edges: ParsedEdge[];
}) {
  const pathname = usePathname();
  const locale = pathname.split('/').filter(Boolean)[0] || 'en';
  // Analyze each subgraph's structure
  const panels = subgraphs.map((sg) => {
    const sgNodeSet = new Set(sg.nodeIds);
    const sgEdges = edges.filter(
      (e) => sgNodeSet.has(e.from) && sgNodeSet.has(e.to)
    );

    const outDegree = new Map<string, number>();
    const inDegree = new Map<string, number>();
    for (const id of sg.nodeIds) {
      outDegree.set(id, 0);
      inDegree.set(id, 0);
    }
    for (const e of sgEdges) {
      outDegree.set(e.from, (outDegree.get(e.from) || 0) + 1);
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    }

    const startNodes = sg.nodeIds.filter((id) => inDegree.get(id) === 0);
    const endNodes = sg.nodeIds.filter((id) => outDegree.get(id) === 0);
    const hasFork = startNodes.some((id) => (outDegree.get(id) || 0) > 1);
    const isSlow = /慢|串行|slow|遅い|直列/i.test(sg.label);

    // Build ordered timeline rows
    // For fork-join: start → [parallel group] → end
    // For linear: step → step → step
    type Row = { ids: string[]; parallel: boolean };
    const rows: Row[] = [];

    if (hasFork && startNodes.length === 1 && endNodes.length === 1) {
      const middleIds = sg.nodeIds.filter(
        (id) => id !== startNodes[0] && id !== endNodes[0]
      );
      rows.push({ ids: [startNodes[0]], parallel: false });
      rows.push({ ids: middleIds, parallel: true });
      rows.push({ ids: [endNodes[0]], parallel: false });
    } else {
      const ordered = topoSortSubset(sg.nodeIds, sgEdges);
      for (const id of ordered) {
        rows.push({ ids: [id], parallel: false });
      }
    }

    return { sg, rows, isSlow };
  });

  // Calculate timeline: each step = 1 unit, parallel steps share the same time slot
  const maxSlots = Math.max(
    ...panels.map((p) => p.rows.length)
  );

  return (
    <div className="diagram-comparison">
      {panels.map((panel, pIdx) => {
        const color = panel.isSlow ? "#f87171" : "#34d399";
        const barBg = panel.isSlow
          ? "rgba(248,113,113,0.2)"
          : "rgba(52,211,153,0.2)";
        const barFill = panel.isSlow
          ? "rgba(248,113,113,0.5)"
          : "rgba(52,211,153,0.5)";

        return (
          <div key={pIdx} className="cmp-panel">
            <div className="cmp-title" style={{ color }}>
              {panel.sg.label}
            </div>
            <div className="cmp-timeline">
              {panel.rows.map((row, rIdx) => (
                <div key={rIdx} className="cmp-row">
                  <div className="cmp-labels">
                    {row.ids.map((id) => {
                      const node = nodes.get(id);
                      return (
                        <span key={id} className="cmp-label">
                          {node?.title || id}
                        </span>
                      );
                    })}
                  </div>
                  <div className="cmp-bar-track" style={{ background: barBg }}>
                    <div
                      className="cmp-bar"
                      style={{
                        background: barFill,
                        width: `${(1 / maxSlots) * 100}%`,
                        marginLeft: panel.isSlow
                          ? `${(rIdx / maxSlots) * 100}%`
                          : row.parallel
                            ? `${(1 / maxSlots) * 100}%`
                            : rIdx === 0
                              ? "0%"
                              : `${(2 / maxSlots) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="cmp-total" style={{ color }}>
              {panel.isSlow
                ? locale === 'ja' ? `合計 ≈ ${panel.rows.length} ステップ`
                  : locale === 'en' ? `Total ≈ ${panel.rows.length} steps`
                  : `总耗时 ≈ ${panel.rows.length} 步`
                : locale === 'ja' ? `合計 ≈ ${panel.rows.length} ステップ（並行 = 高速）`
                  : locale === 'en' ? `Total ≈ ${panel.rows.length} steps (parallel = faster)`
                  : `总耗时 ≈ ${panel.rows.length} 步（并行 = 更快）`}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function topoSortSubset(nodeIds: string[], edges: ParsedEdge[]): string[] {
  const ids = [...nodeIds];
  const inDeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  const idSet = new Set(ids);

  for (const id of ids) {
    inDeg.set(id, 0);
    adj.set(id, []);
  }
  for (const e of edges) {
    if (idSet.has(e.from) && idSet.has(e.to)) {
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
  for (const id of ids) {
    if (!result.includes(id)) result.push(id);
  }
  return result;
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
  const layerNodeSets = subgraphs.map((sg) => new Set(sg.nodeIds));

  const hasInterLayerEdges = (fromIdx: number, toIdx: number) =>
    edges.some(
      (e) =>
        layerNodeSets[fromIdx]?.has(e.from) &&
        layerNodeSets[toIdx]?.has(e.to)
    );

  return (
    <div
      className="custom-diagram"
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        gap: "8px",
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
              <div className="diagram-layer-label" style={{ color: pal.text }}>
                {sg.label}
              </div>
              <div
                className="diagram-layer-nodes"
                style={{ flexDirection: isHorizontal ? "column" : "row" }}
              >
                {sg.nodeIds.map((nodeId) => {
                  const node = nodes.get(nodeId);
                  if (!node) return null;
                  const nodePal =
                    node.paletteIdx != null ? getPalette(node.paletteIdx) : pal;
                  return <NodeBox key={nodeId} node={node} pal={nodePal} />;
                })}
              </div>
            </div>
            {showArrow && (
              <div className="diagram-arrow">
                <svg
                  width={isHorizontal ? "28" : "16"}
                  height={isHorizontal ? "16" : "28"}
                  viewBox={isHorizontal ? "0 0 28 16" : "0 0 16 28"}
                >
                  {isHorizontal ? (
                    <>
                      <line x1="4" y1="8" x2="20" y2="8" stroke="#475569" strokeWidth="1.5" />
                      <polygon points="19,4 27,8 19,12" fill="#475569" />
                    </>
                  ) : (
                    <>
                      <line x1="8" y1="4" x2="8" y2="20" stroke="#475569" strokeWidth="1.5" />
                      <polygon points="4,19 8,27 12,19" fill="#475569" />
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

// ─── Flow Diagram (ELKjs-powered layout) ────────────────────────────

interface ElkLayoutResult {
  nodePositions: Map<string, { x: number; y: number; width: number; height: number }>;
  edgeRoutes: { from: string; to: string; label?: string; points: { x: number; y: number }[] }[];
  width: number;
  height: number;
}

function FlowDiagram({
  nodes,
  edges,
  isHorizontal,
}: {
  nodes: Map<string, ParsedNode>;
  edges: ParsedEdge[];
  isHorizontal: boolean;
}) {
  const [layout, setLayout] = useState<ElkLayoutResult | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function runLayout() {
      const ELK = (await import("elkjs/lib/elk.bundled.js")).default;
      const elk = new ELK();

      // Estimate node dimensions — CJK chars are ~2x width of Latin
      const measureTextWidth = (text: string, fontSize: number) => {
        let w = 0;
        for (const ch of text) {
          w += ch.charCodeAt(0) > 0x2e7f ? fontSize : fontSize * 0.6;
        }
        return w;
      };
      const estimateNodeSize = (node: ParsedNode) => {
        // Start/end state markers are small circles
        if (node.id === "__start__" || node.id === "__end__") {
          return { width: 20, height: 20 };
        }
        const titleW = measureTextWidth(node.title, 13);
        const descW = node.desc ? measureTextWidth(node.desc, 11.5) : 0;
        const contentW = Math.max(titleW, descW);
        const width = Math.max(140, Math.min(280, contentW + 48));
        const height = node.desc ? 72 : 48;
        return { width, height };
      };

      const elkNodes = [...nodes.entries()].map(([id, node]) => {
        const { width, height } = estimateNodeSize(node);
        return { id, width, height };
      });

      const elkEdges = edges
        .filter((e) => nodes.has(e.from) && nodes.has(e.to))
        .map((e, i) => ({
          id: `e${i}`,
          sources: [e.from],
          targets: [e.to],
        }));

      const graph = {
        id: "root",
        layoutOptions: {
          "elk.algorithm": "layered",
          "elk.direction": isHorizontal ? "RIGHT" : "DOWN",
          "elk.spacing.nodeNode": "40",
          "elk.layered.spacing.nodeNodeBetweenLayers": "70",
          "elk.layered.spacing.edgeNodeBetweenLayers": "30",
          "elk.layered.spacing.edgeEdgeBetweenLayers": "25",
          "elk.spacing.edgeNode": "25",
          "elk.spacing.edgeEdge": "20",
          "elk.edgeRouting": "POLYLINE",
          "elk.layered.mergeEdges": "false",
          "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
          "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
        },
        children: elkNodes,
        edges: elkEdges,
      };

      try {
        const result = await elk.layout(graph) as any;
        if (cancelled) return;

        const nodePositions = new Map<string, { x: number; y: number; width: number; height: number }>();
        for (const child of result.children || []) {
          nodePositions.set(child.id, {
            x: child.x || 0,
            y: child.y || 0,
            width: child.width || 140,
            height: child.height || 48,
          });
        }

        const edgeRoutes = (result.edges || []).map((elkEdge: any, i: number) => {
          const sections = elkEdge.sections || [];
          const points: { x: number; y: number }[] = [];
          for (const section of sections) {
            if (section.startPoint) points.push(section.startPoint);
            if (section.bendPoints) points.push(...section.bendPoints);
            if (section.endPoint) points.push(section.endPoint);
          }
          return {
            from: edges[i].from,
            to: edges[i].to,
            label: edges[i].label,
            points,
          };
        });

        setLayout({
          nodePositions,
          edgeRoutes,
          width: result.width || 400,
          height: result.height || 300,
        });
      } catch (err) {
        console.warn("ELK layout failed:", err);
      }
    }

    runLayout();
    return () => { cancelled = true; };
  }, [nodes, edges, isHorizontal]);

  // Loading state
  if (!layout) {
    return (
      <div className="custom-diagram" style={{ minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 13 }}>...</span>
      </div>
    );
  }

  const { nodePositions, edgeRoutes, width, height } = layout;
  const PAD = 20;

  return (
    <div className="custom-diagram" style={{ display: "flex", justifyContent: "center" }}>
      <svg
        viewBox={`${-PAD} ${-PAD} ${width + PAD * 2} ${height + PAD * 2}`}
        style={{ display: "block", width: "100%", height: "auto" }}
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#475569" />
          </marker>
        </defs>

        {/* Edges */}
        {edgeRoutes.map((route, i) => {
          if (route.points.length < 2) return null;

          // Build SVG polyline path
          const d = route.points
            .map((p, j) => `${j === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          // Label at the length-based midpoint of the polyline path
          let totalLen = 0;
          const segLens: number[] = [];
          for (let s = 1; s < route.points.length; s++) {
            const dx = route.points[s].x - route.points[s - 1].x;
            const dy = route.points[s].y - route.points[s - 1].y;
            const len = Math.sqrt(dx * dx + dy * dy);
            segLens.push(len);
            totalLen += len;
          }
          const halfLen = totalLen / 2;
          let accum = 0;
          let labelX = (route.points[0].x + route.points[route.points.length - 1].x) / 2;
          let labelY = (route.points[0].y + route.points[route.points.length - 1].y) / 2;
          for (let s = 0; s < segLens.length; s++) {
            if (accum + segLens[s] >= halfLen) {
              const t = segLens[s] > 0 ? (halfLen - accum) / segLens[s] : 0;
              labelX = route.points[s].x + t * (route.points[s + 1].x - route.points[s].x);
              labelY = route.points[s].y + t * (route.points[s + 1].y - route.points[s].y);
              break;
            }
            accum += segLens[s];
          }

          // Estimate label width for CJK
          const labelW = route.label
            ? [...route.label].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e7f ? 12 : 7), 0) + 12
            : 0;

          return (
            <g key={i}>
              <path
                d={d}
                fill="none"
                stroke="#475569"
                strokeWidth="1.5"
                strokeLinejoin="round"
                markerEnd="url(#arrowhead)"
              />
              {route.label && (
                <>
                  <rect
                    x={labelX - labelW / 2}
                    y={labelY - 9}
                    width={labelW}
                    height={18}
                    rx={4}
                    fill="var(--bg-elevated, #1a1a1a)"
                    fillOpacity="0.92"
                  />
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="var(--text-muted, #94a3b8)"
                    fontSize="11"
                    fontFamily="'JetBrains Mono', monospace"
                  >
                    {route.label}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {[...nodePositions.entries()].map(([id, pos]) => {
          const node = nodes.get(id);
          if (!node) return null;
          const globalIdx = [...nodes.keys()].indexOf(id);
          const pal = getPalette(node.paletteIdx ?? globalIdx);
          const isDecision = node.shape === "decision";
          const isStartEnd = id === "__start__" || id === "__end__";

          // Start/end state circles
          if (isStartEnd) {
            const cx = pos.x + pos.width / 2;
            const cy = pos.y + pos.height / 2;
            const r = 8;
            return (
              <g key={id}>
                <circle cx={cx} cy={cy} r={r} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="2" />
                {id === "__end__" && (
                  <circle cx={cx} cy={cy} r={4} fill="#94a3b8" />
                )}
              </g>
            );
          }

          return (
            <g key={id}>
              <rect
                x={pos.x}
                y={pos.y}
                width={pos.width}
                height={pos.height}
                rx={isDecision ? 4 : 10}
                fill={pal.bg}
                stroke={pal.border}
                strokeWidth="1"
                strokeDasharray={isDecision ? "6 3" : undefined}
              />
              <text
                x={pos.x + pos.width / 2}
                y={pos.y + (node.desc ? 22 : pos.height / 2 + 5)}
                textAnchor="middle"
                fill={pal.text}
                fontSize="13"
                fontWeight="600"
                fontFamily="'JetBrains Mono', system-ui, -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif"
              >
                {node.title}
              </text>
              {node.desc && (
                <text
                  x={pos.x + pos.width / 2}
                  y={pos.y + 42}
                  textAnchor="middle"
                  fill="var(--text-dim, #9ca3af)"
                  fontSize="11.5"
                  fontFamily="system-ui, -apple-system, 'PingFang SC', 'Noto Sans SC', sans-serif"
                >
                  {node.desc}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Node Component ───────────────────────────────────────────────

function NodeBox({
  node,
  pal,
  compact,
}: {
  node: ParsedNode;
  pal: (typeof PALETTE)[0];
  compact?: boolean;
}) {
  const isDecision = node.shape === "decision";

  return (
    <div
      className={`diagram-node ${isDecision ? "diagram-node-decision" : ""} ${compact ? "diagram-node-compact" : ""}`}
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

// ─── Diagram Viewport (zoom / pan / controls) ───────────────────

const MIN_SCALE = 0.25;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.15;
const PAN_STEP = 80;

function DiagramViewport({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startTx: number; startTy: number } | null>(null);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  // Use refs so stable callbacks always see the latest values
  const scaleRef = useRef(scale);
  scaleRef.current = scale;
  const fullscreenRef = useRef(isFullscreen);
  fullscreenRef.current = isFullscreen;

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // In fullscreen: plain scroll = zoom. Outside: Ctrl/Cmd + scroll = zoom.
    const shouldZoom = fullscreenRef.current || e.ctrlKey || e.metaKey;
    if (shouldZoom) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      setScale((s) => clampScale(s + delta));
    } else {
      // Adjust scroll deltas by zoom level so panning feels consistent
      setTranslate((t) => ({
        x: t.x - e.deltaX / scaleRef.current,
        y: t.y - e.deltaY / scaleRef.current,
      }));
    }
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(".diagram-controls")) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTx: translate.x,
      startTy: translate.y,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, [translate]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    // Divide by zoom so dragging moves content 1:1 with the cursor
    const dx = (e.clientX - dragRef.current.startX) / scaleRef.current;
    const dy = (e.clientY - dragRef.current.startY) / scaleRef.current;
    setTranslate({
      x: dragRef.current.startTx + dx,
      y: dragRef.current.startTy + dy,
    });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current?.closest(".diagram-block") as HTMLElement | null;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        document.exitFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  const zoomIn = () => setScale((s) => clampScale(s + ZOOM_STEP));
  const zoomOut = () => setScale((s) => clampScale(s - ZOOM_STEP));
  const reset = () => { setScale(1); setTranslate({ x: 0, y: 0 }); };
  const panUp = () => setTranslate((t) => ({ ...t, y: t.y + PAN_STEP }));
  const panDown = () => setTranslate((t) => ({ ...t, y: t.y - PAN_STEP }));
  const panLeft = () => setTranslate((t) => ({ ...t, x: t.x + PAN_STEP }));
  const panRight = () => setTranslate((t) => ({ ...t, x: t.x - PAN_STEP }));

  const isDefault = scale === 1 && translate.x === 0 && translate.y === 0;

  return (
    <div
      ref={containerRef}
      className="diagram-viewport"
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div
        ref={contentRef}
        className="diagram-viewport-content"
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px)`,
          zoom: scale,
        }}
      >
        {children}
      </div>

      <div className="diagram-controls">
        <button onClick={toggleFullscreen} title={isFullscreen ? "Exit fullscreen" : "Fullscreen"} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
        <div className="diagram-controls-divider" />
        <button onClick={panUp} title="Pan up" aria-label="Pan up">
          <ChevronUp size={16} />
        </button>
        <div className="diagram-controls-row">
          <button onClick={panLeft} title="Pan left" aria-label="Pan left">
            <ChevronLeft size={16} />
          </button>
          <button onClick={reset} title="Reset view" aria-label="Reset view" disabled={isDefault}>
            <RotateCcw size={14} />
          </button>
          <button onClick={panRight} title="Pan right" aria-label="Pan right">
            <ChevronRight size={16} />
          </button>
        </div>
        <button onClick={panDown} title="Pan down" aria-label="Pan down">
          <ChevronDown size={16} />
        </button>
        <div className="diagram-controls-divider" />
        <div className="diagram-controls-zoom">
          <button onClick={zoomIn} title="Zoom in" aria-label="Zoom in">
            <ZoomIn size={16} />
          </button>
          <button onClick={zoomOut} title="Zoom out" aria-label="Zoom out">
            <ZoomOut size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const trimmed = chart.trim();

  return (
    <div className="diagram-block">
      <DiagramViewport>
        {isNativeMermaidType(trimmed) ? (
          <NativeMermaid chart={trimmed} />
        ) : (
          <CustomGraphDiagram chart={trimmed} />
        )}
      </DiagramViewport>
    </div>
  );
}
