"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

interface MermaidDiagramProps {
  chart: string;
}

// ─── Detection helpers ─────────────────────────────────────────────

function isArchitectureDiagram(chart: string): boolean {
  return (
    /^graph\s+TD/i.test(chart) &&
    /subgraph/.test(chart) &&
    /(入口|命令|工具|引擎|服务)/.test(chart)
  );
}

function isSequenceDiagram(chart: string): boolean {
  return /^sequenceDiagram/i.test(chart);
}

function isParallelComparison(chart: string): boolean {
  return /^graph\s+LR/i.test(chart) && /串行/.test(chart) && /并行/.test(chart);
}

function isStateDiagram(chart: string): boolean {
  return /^stateDiagram/i.test(chart);
}

function isClassDiagram(chart: string): boolean {
  return /^classDiagram/i.test(chart);
}

function isToolGroupDiagram(chart: string): boolean {
  // graph TD with multiple subgraphs but NOT architecture layers
  return (
    /^graph\s+TD/i.test(chart) &&
    /subgraph/.test(chart) &&
    !/(入口|命令|引擎|服务)层/.test(chart) &&
    !isArchitectureDiagram(chart)
  );
}

function isFlowchart(chart: string): boolean {
  return /^(flowchart|graph)\s+(TD|LR|TB)/i.test(chart);
}

// ─── Parse utilities ───────────────────────────────────────────────

/** Parse node text like `A[name<br/>desc]` or `A{decision?}` or `A["quoted"]` */
function parseNodeLabel(raw: string): { id: string; text: string; desc?: string; shape: "box" | "decision" | "round" } {
  // Match: ID["text"] or ID[text] or ID{text} or ID(text) or ID([text])
  const m =
    raw.match(/^(\w+)\["([^"]+)"\]/) ||
    raw.match(/^(\w+)\[([^\]]+)\]/) ||
    raw.match(/^(\w+)\{([^}]+)\}/) ||
    raw.match(/^(\w+)\(\[([^\]]+)\]\)/) ||
    raw.match(/^(\w+)\(([^)]+)\)/);

  if (!m) {
    return { id: raw.trim(), text: raw.trim(), shape: "box" };
  }

  const id = m[1];
  const label = m[2];
  const shape = raw.includes("{") && raw.includes("}") ? "decision" : "box";

  if (label.includes("<br/>")) {
    const [name, ...rest] = label.split("<br/>");
    return { id, text: name, desc: rest.join(" "), shape };
  }

  return { id, text: label, shape };
}

function renderInlineCode(text: string): React.ReactNode {
  // Convert `code` to <code> tags and backtick-wrapped text
  const parts = text.split(/`([^`]+)`/);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <code key={i}>{part}</code>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
}

function stripStyleLines(chart: string): string {
  return chart
    .split("\n")
    .filter((l) => !l.trim().startsWith("style "))
    .join("\n");
}

// ─── Architecture Diagram ──────────────────────────────────────────

function layerClass(name: string): string {
  if (/入口/.test(name)) return "layer-entry";
  if (/命令/.test(name)) return "layer-cmd";
  if (/工具/.test(name)) return "layer-tool";
  if (/引擎/.test(name)) return "layer-engine";
  if (/服务/.test(name)) return "layer-service";
  return "layer-entry";
}

interface ArchLayer {
  label: string;
  nodes: { name: string; desc?: string }[];
}

function parseArchitecture(chart: string): ArchLayer[] {
  const cleaned = stripStyleLines(chart);
  const layers: ArchLayer[] = [];
  let current: ArchLayer | null = null;

  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim();
    const sgMatch = trimmed.match(/^subgraph\s+"([^"]+)"/);
    if (sgMatch) {
      current = { label: sgMatch[1], nodes: [] };
      continue;
    }
    if (trimmed === "end" && current) {
      layers.push(current);
      current = null;
      continue;
    }
    if (current) {
      // Parse node definitions: ID[name<br/>desc]
      const nodeMatch = trimmed.match(/^\w+\[([^\]]+)\]/);
      if (nodeMatch) {
        const label = nodeMatch[1];
        if (label.includes("<br/>")) {
          const [name, ...rest] = label.split("<br/>");
          current.nodes.push({ name, desc: rest.join(" ") });
        } else {
          current.nodes.push({ name: label });
        }
      }
    }
  }

  return layers;
}

function ArchitectureDiagram({ chart }: { chart: string }) {
  const layers = parseArchitecture(chart);

  return (
    <div className="diagram-block">
      <div className="diagram-title">系统架构</div>
      <div className="arch-diagram">
        {layers.map((layer, i) => (
          <React.Fragment key={i}>
            {i > 0 && (
              <div className="arch-connector">
                <div className="arch-connector-line">
                  <div className="connector-arrow" />
                </div>
              </div>
            )}
            <div className={`arch-layer ${layerClass(layer.label)}`}>
              <div className="arch-layer-label">{layer.label}</div>
              <div className="arch-layer-content">
                {layer.nodes.map((node, j) => (
                  <div key={j} className="arch-box">
                    <div className="box-name">{node.name}</div>
                    {node.desc && <div className="box-desc">{node.desc}</div>}
                  </div>
                ))}
              </div>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Sequence Diagram ──────────────────────────────────────────────

interface SeqParticipant {
  id: string;
  name: string;
}

interface SeqMessage {
  from: string;
  to: string;
  text: string;
  dashed: boolean;
}

interface SeqNote {
  text: string;
}

type SeqItem =
  | { type: "message"; data: SeqMessage }
  | { type: "note"; data: SeqNote }
  | { type: "loop-start"; label: string }
  | { type: "loop-end" }
  | { type: "alt-start"; label: string }
  | { type: "else"; label: string }
  | { type: "opt-start"; label: string };

const PARTICIPANT_STYLES: { color: string; bg: string; border: string; cssClass: string }[] = [
  { color: "var(--blue)", bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.3)", cssClass: "p-user" },
  { color: "var(--accent)", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", cssClass: "p-engine" },
  { color: "var(--green)", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.3)", cssClass: "p-query" },
  { color: "var(--purple)", bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.3)", cssClass: "p-api" },
  { color: "var(--pink)", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.3)", cssClass: "p-tool" },
  { color: "var(--cyan)", bg: "rgba(6,182,212,0.08)", border: "rgba(6,182,212,0.3)", cssClass: "p-tool" },
];

function parseSequence(chart: string): {
  participants: SeqParticipant[];
  items: SeqItem[];
} {
  const participants: SeqParticipant[] = [];
  const items: SeqItem[] = [];

  for (const line of chart.split("\n")) {
    const trimmed = line.trim();

    const pMatch = trimmed.match(/^participant\s+(\w+)\s+as\s+(.+)/);
    if (pMatch) {
      participants.push({ id: pMatch[1], name: pMatch[2] });
      continue;
    }

    const msgMatch = trimmed.match(/^(\w+)(--?>>)(\w+):\s*(.+)/);
    if (msgMatch) {
      items.push({
        type: "message",
        data: { from: msgMatch[1], to: msgMatch[3], text: msgMatch[4], dashed: msgMatch[2] === "-->>" },
      });
      continue;
    }

    const noteMatch = trimmed.match(/^Note\s+over\s+[^:]+:\s*(.+)/);
    if (noteMatch) {
      items.push({ type: "note", data: { text: noteMatch[1] } });
      continue;
    }

    if (/^loop\s+/.test(trimmed)) { items.push({ type: "loop-start", label: trimmed.replace(/^loop\s+/, "") }); continue; }
    if (/^par\s+/.test(trimmed)) { items.push({ type: "loop-start", label: trimmed.replace(/^par\s+/, "") }); continue; }
    if (/^opt\s+/.test(trimmed)) { items.push({ type: "opt-start", label: trimmed.replace(/^opt\s+/, "") }); continue; }
    if (/^alt\s+/.test(trimmed)) { items.push({ type: "alt-start", label: trimmed.replace(/^alt\s+/, "") }); continue; }
    if (/^else\s*/.test(trimmed)) { items.push({ type: "else", label: trimmed.replace(/^else\s*/, "") }); continue; }
    if (trimmed === "end") { items.push({ type: "loop-end" }); continue; }
  }

  return { participants, items };
}

/** Flatten all items into a linear list of renderable "frames" for animation */
interface SeqFrame {
  kind: "step" | "note" | "loop-start" | "loop-end" | "alt-header" | "else-header" | "alt-end";
  stepNum?: number;
  from?: string;
  to?: string;
  text?: string;
  dashed?: boolean;
  isSelf?: boolean;
  fromStyle?: typeof PARTICIPANT_STYLES[0];
  label?: string;
  branchIndex?: number;
}

function flattenSeqItems(
  items: SeqItem[],
  participants: SeqParticipant[],
  pColorMap: Map<string, typeof PARTICIPANT_STYLES[0]>,
): SeqFrame[] {
  const frames: SeqFrame[] = [];
  let stepCounter = 0;

  function walk(list: SeqItem[], start: number): number {
    let i = start;
    while (i < list.length) {
      const item = list[i];
      if (item.type === "loop-end") {
        frames.push({ kind: "loop-end" });
        return i + 1;
      }
      if (item.type === "loop-start" || item.type === "opt-start") {
        frames.push({ kind: "loop-start", label: item.label });
        i = walk(list, i + 1);
        continue;
      }
      if (item.type === "alt-start") {
        frames.push({ kind: "alt-header", label: item.label, branchIndex: 0 });
        i = walk(list, i + 1);
        continue;
      }
      if (item.type === "else") {
        frames.push({ kind: "else-header", label: item.label || "否则" });
        i++;
        continue;
      }
      if (item.type === "message") {
        stepCounter++;
        const msg = item.data;
        const fromP = participants.find(p => p.id === msg.from);
        const toP = participants.find(p => p.id === msg.to);
        frames.push({
          kind: "step",
          stepNum: stepCounter,
          from: fromP?.name || msg.from,
          to: toP?.name || msg.to,
          text: msg.text,
          dashed: msg.dashed,
          isSelf: msg.from === msg.to,
          fromStyle: pColorMap.get(msg.from),
        });
      }
      if (item.type === "note") {
        frames.push({ kind: "note", text: item.data.text });
      }
      i++;
    }
    return i;
  }

  walk(items, 0);
  return frames;
}

function SequenceDiagram({ chart }: { chart: string }) {
  const { participants, items } = parseSequence(chart);
  const pColorMap = new Map<string, typeof PARTICIPANT_STYLES[0]>();
  participants.forEach((p, i) => pColorMap.set(p.id, PARTICIPANT_STYLES[i % PARTICIPANT_STYLES.length]));

  const frames = React.useMemo(() => flattenSeqItems(items, participants, pColorMap), [chart]);
  const totalFrames = frames.length;

  const [visibleCount, setVisibleCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-start when in viewport
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          setIsPlaying(true);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [hasStarted]);

  // Animation tick
  useEffect(() => {
    if (!isPlaying) return;
    if (visibleCount >= totalFrames) {
      setIsPlaying(false);
      return;
    }
    const frame = frames[visibleCount];
    // Structural frames (loop/alt markers) appear instantly, steps have delay
    const delay = (frame.kind === "step" || frame.kind === "note") ? 400 : 150;
    timerRef.current = setTimeout(() => {
      setVisibleCount(c => c + 1);
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, visibleCount, totalFrames, frames]);

  const handlePlayPause = useCallback(() => {
    if (visibleCount >= totalFrames) {
      // Replay
      setVisibleCount(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(p => !p);
    }
  }, [visibleCount, totalFrames]);

  const handleShowAll = useCallback(() => {
    setVisibleCount(totalFrames);
    setIsPlaying(false);
  }, [totalFrames]);

  // Build the nested JSX from visible frames
  const visibleFrames = frames.slice(0, visibleCount);

  function buildJSX(fList: SeqFrame[], start: number): { els: React.ReactNode[]; next: number } {
    const els: React.ReactNode[] = [];
    let i = start;

    while (i < fList.length) {
      const f = fList[i];

      if (f.kind === "loop-end" || f.kind === "alt-end") return { els, next: i + 1 };

      if (f.kind === "loop-start") {
        const { els: inner, next } = buildJSX(fList, i + 1);
        const isActive = isPlaying && visibleCount > i && visibleCount <= next;
        els.push(
          <motion.div
            key={`loop-${i}`}
            className="seq-loop-box"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, boxShadow: isActive ? "0 0 20px rgba(245,158,11,0.1)" : "none" }}
            transition={{ duration: 0.3 }}
          >
            <div className="seq-loop-label">{f.label}</div>
            <div className="seq-steps">{inner}</div>
          </motion.div>
        );
        i = next;
        continue;
      }

      if (f.kind === "alt-header") {
        // Gather until loop-end, splitting on else-header
        const branches: { label: string; items: React.ReactNode[]; isIf: boolean }[] = [];
        let curLabel = f.label || "";
        let curItems: React.ReactNode[] = [];
        let isFirst = true;
        let depth = 0;
        i++;

        while (i < fList.length) {
          const cur = fList[i];
          if (cur.kind === "alt-header" || cur.kind === "loop-start") depth++;
          if (cur.kind === "loop-end") {
            if (depth === 0) { i++; break; }
            depth--;
          }
          if (cur.kind === "else-header" && depth === 0) {
            branches.push({ label: curLabel, items: curItems, isIf: isFirst });
            curLabel = cur.label || "";
            curItems = [];
            isFirst = false;
            i++;
            continue;
          }
          // Render inline items
          if (cur.kind === "step") {
            curItems.push(renderAnimatedStep(cur, i));
          } else if (cur.kind === "note") {
            curItems.push(renderAnimatedNote(cur, i));
          } else if (cur.kind === "loop-start") {
            const { els: inner, next } = buildJSX(fList, i + 1);
            const isActive2 = isPlaying && visibleCount > i && visibleCount <= next;
            curItems.push(
              <motion.div key={`nested-${i}`} className="seq-loop-box"
                initial={{ opacity: 0 }} animate={{ opacity: 1, boxShadow: isActive2 ? "0 0 20px rgba(245,158,11,0.1)" : "none" }}
                transition={{ duration: 0.3 }}>
                <div className="seq-loop-label">{cur.label}</div>
                <div className="seq-steps">{inner}</div>
              </motion.div>
            );
            i = next;
            continue;
          }
          i++;
        }
        branches.push({ label: curLabel, items: curItems, isIf: isFirst });

        els.push(
          <motion.div key={`alt-${start}-${i}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
            style={{ margin: "12px 0", borderRadius: "10px", border: "1px solid var(--border)", overflow: "hidden", background: "rgba(255,255,255,0.01)" }}>
            {branches.map((br, bi) => (
              <div key={bi}>
                <div style={{
                  padding: "8px 16px", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                  color: br.isIf ? "var(--blue)" : "var(--accent)",
                  background: br.isIf ? "rgba(96,165,250,0.05)" : "rgba(245,158,11,0.05)",
                  borderBottom: "1px solid var(--border)",
                  borderTop: bi > 0 ? "1px dashed var(--border)" : "none",
                  letterSpacing: "0.03em",
                }}>
                  {br.isIf ? "IF" : "ELSE"} {br.label}
                </div>
                <div style={{ padding: "8px 0" }}><div className="seq-steps">{br.items}</div></div>
              </div>
            ))}
          </motion.div>
        );
        continue;
      }

      if (f.kind === "else-header") { i++; continue; }

      if (f.kind === "step") {
        els.push(renderAnimatedStep(f, i));
      }
      if (f.kind === "note") {
        els.push(renderAnimatedNote(f, i));
      }
      i++;
    }
    return { els, next: i };
  }

  function renderAnimatedStep(f: SeqFrame, key: number) {
    const arrow = f.dashed ? "←" : "→";
    const display = f.isSelf ? f.from : `${f.from} ${arrow} ${f.to}`;
    const isLatest = key === visibleCount - 1;
    return (
      <motion.div
        key={`step-${key}`}
        className="seq-step"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0, background: isLatest && isPlaying ? "rgba(245,158,11,0.06)" : "transparent" }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <span className="seq-num" style={f.fromStyle ? { background: f.fromStyle.bg, color: f.fromStyle.color } : undefined}>
          {f.stepNum}
        </span>
        <span className="seq-arrow" style={{ color: f.fromStyle?.color || "var(--text-muted)" }}>
          {display}
        </span>
        <span className="seq-msg">{renderInlineCode(f.text || "")}</span>
      </motion.div>
    );
  }

  function renderAnimatedNote(f: SeqFrame, key: number) {
    return (
      <motion.div
        key={`note-${key}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{ padding: "6px 16px 6px 52px", fontSize: "12px", fontStyle: "italic", color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace" }}
      >
        💡 {f.text}
      </motion.div>
    );
  }

  const { els } = buildJSX(visibleFrames, 0);
  const isDone = visibleCount >= totalFrames;

  return (
    <div className="diagram-block" ref={containerRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="diagram-title">时序图</div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Progress indicator */}
          <span style={{ fontSize: "11px", fontFamily: "'JetBrains Mono', monospace", color: "var(--text-muted)" }}>
            {visibleCount}/{totalFrames}
          </span>
          <button
            onClick={handlePlayPause}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid var(--border)", borderRadius: "6px",
              padding: "4px 10px", fontSize: "12px", color: "var(--text-dim)", cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s",
            }}
          >
            {isDone ? "↻ 重播" : isPlaying ? "⏸ 暂停" : "▶ 播放"}
          </button>
          {!isDone && (
            <button
              onClick={handleShowAll}
              style={{
                background: "transparent", border: "1px solid var(--border)", borderRadius: "6px",
                padding: "4px 10px", fontSize: "12px", color: "var(--text-muted)", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s",
              }}
            >
              全部显示
            </button>
          )}
        </div>
      </div>

      <div className="seq-diagram">
        {/* Participants */}
        <div className="seq-participants">
          {participants.map((p, i) => {
            const s = PARTICIPANT_STYLES[i % PARTICIPANT_STYLES.length];
            return (
              <motion.div
                key={p.id}
                className="seq-p"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <span className={`seq-p-box ${s.cssClass}`}>{p.name}</span>
              </motion.div>
            );
          })}
        </div>
        {/* Steps */}
        <AnimatePresence>
          <div className="seq-steps">{els}</div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Parallel Comparison Diagram ───────────────────────────────────

interface ParallelSide {
  title: string;
  items: string[];
}

function parseParallel(chart: string): { slow: ParallelSide; fast: ParallelSide } {
  const cleaned = stripStyleLines(chart);
  const slow: ParallelSide = { title: "", items: [] };
  const fast: ParallelSide = { title: "", items: [] };
  let current: ParallelSide | null = null;
  const seen = new Set<string>();

  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim();
    const sgMatch = trimmed.match(/^subgraph\s+"([^"]+)"/);
    if (sgMatch) {
      if (/串行/.test(sgMatch[1])) {
        slow.title = sgMatch[1];
        current = slow;
      } else if (/并行/.test(sgMatch[1])) {
        fast.title = sgMatch[1];
        current = fast;
      }
      continue;
    }
    if (trimmed === "end") {
      current = null;
      continue;
    }
    if (current) {
      // Extract ALL node labels from the line (handles chained: A[x] --> B[y] --> C[z])
      const nodeRegex = /\w+\[([^\]]+)\]/g;
      let m;
      while ((m = nodeRegex.exec(trimmed)) !== null) {
        const label = m[1];
        if (!seen.has(label)) {
          seen.add(label);
          current.items.push(label);
        }
      }
    }
  }

  return { slow, fast };
}

function ParallelDiagram({ chart }: { chart: string }) {
  const { slow, fast } = parseParallel(chart);

  // Derive a title from the subgraph names
  const title = "串行 VS 并行启动";

  // Deterministic bar widths based on item count
  const barWidths = [55, 75, 65, 70, 0]; // last item ("就绪") has no bar

  return (
    <div className="diagram-block">
      <div className="diagram-title">{title}</div>
      <div className="parallel-diagram">
        {/* Slow / serial side */}
        <div className="parallel-box slow">
          <div className="parallel-box-title">✗ {slow.title || "串行方式"}</div>
          <div className="parallel-items">
            {slow.items.map((item, i) => {
              const isLast = i === slow.items.length - 1;
              return (
                <React.Fragment key={i}>
                  <div className="p-item">
                    <span className="p-item-label">{item}</span>
                    {!isLast && <span className="p-bar" style={{ width: `${barWidths[i % barWidths.length] || 60}%` }} />}
                    {isLast && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}> ✓</span>}
                  </div>
                  {!isLast && <div className="p-arrow">↓</div>}
                </React.Fragment>
              );
            })}
          </div>
        </div>
        {/* Fast / parallel side */}
        <div className="parallel-box fast">
          <div className="parallel-box-title">✓ {fast.title || "并行方式"}</div>
          <div className="parallel-items">
            {fast.items.map((item, i) => {
              const isLast = i === fast.items.length - 1;
              return (
                <div key={i} className="p-item">
                  <span className="p-item-label">{item}</span>
                  {!isLast && <span className="p-bar" style={{ width: `${barWidths[i % barWidths.length] || 60}%` }} />}
                  {isLast && <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}> ✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── State Diagram ─────────────────────────────────────────────────

interface StateTransition {
  from: string;
  to: string;
  label: string;
}

function parseStateDiagram(chart: string): { states: string[]; transitions: StateTransition[] } {
  const transitions: StateTransition[] = [];
  const stateSet = new Set<string>();

  for (const line of chart.split("\n")) {
    const trimmed = line.trim();
    // State1 --> State2: label
    const m = trimmed.match(/^(.+?)\s*-->\s*(.+?)(?::\s*(.+))?$/);
    if (m) {
      const from = m[1].trim();
      const to = m[2].trim();
      const label = m[3]?.trim() || "";
      transitions.push({ from, to, label });
      if (from !== "[*]") stateSet.add(from);
      if (to !== "[*]") stateSet.add(to);
    }
  }

  return { states: Array.from(stateSet), transitions };
}

function StateDiagram({ chart }: { chart: string }) {
  const { states, transitions } = parseStateDiagram(chart);

  // Group transitions by source for a cleaner layout
  const groups = new Map<string, StateTransition[]>();
  for (const t of transitions) {
    const key = t.from === "[*]" ? "__start__" : t.from;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const stateColors: Record<string, string> = {};
  const palette = [
    "rgba(96,165,250,0.15)",
    "rgba(245,158,11,0.15)",
    "rgba(74,222,128,0.15)",
    "rgba(192,132,252,0.15)",
    "rgba(251,113,133,0.15)",
    "rgba(45,212,191,0.15)",
  ];
  const borderPalette = [
    "rgba(96,165,250,0.3)",
    "rgba(245,158,11,0.3)",
    "rgba(74,222,128,0.3)",
    "rgba(192,132,252,0.3)",
    "rgba(251,113,133,0.3)",
    "rgba(45,212,191,0.3)",
  ];
  states.forEach((s, i) => {
    stateColors[s] = palette[i % palette.length];
  });

  return (
    <div className="diagram-block">
      <div className="diagram-title">状态图</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "8px 0" }}>
        {/* State badges */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
          {states.map((s, i) => (
            <div
              key={s}
              style={{
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                fontFamily: "'JetBrains Mono', monospace",
                background: palette[i % palette.length],
                border: `1px solid ${borderPalette[i % borderPalette.length]}`,
                color: "var(--text)",
              }}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Transitions */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {transitions.map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "5px 10px",
                borderRadius: "6px",
                fontSize: "12px",
                background: "rgba(255,255,255,0.02)",
                borderLeft: `3px solid ${borderPalette[states.indexOf(t.from === "[*]" ? t.to : t.from) % borderPalette.length] || "var(--border)"}`,
              }}
            >
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-secondary)",
                  minWidth: "120px",
                  textAlign: "right",
                }}
              >
                {t.from === "[*]" ? "●" : t.from}
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>→</span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--text-secondary)",
                  minWidth: "120px",
                }}
              >
                {t.to === "[*]" ? "●" : t.to}
              </span>
              {t.label && (
                <span style={{ color: "var(--text-tertiary)", fontSize: "11px" }}>{t.label}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Class Diagram ─────────────────────────────────────────────────

interface ClassDef {
  name: string;
  members: string[];
}

interface ClassRelation {
  from: string;
  to: string;
  label: string;
  type: "solid" | "dashed";
}

function parseClassDiagram(chart: string): { classes: ClassDef[]; relations: ClassRelation[] } {
  const classes: ClassDef[] = [];
  const relations: ClassRelation[] = [];
  let current: ClassDef | null = null;

  for (const line of chart.split("\n")) {
    const trimmed = line.trim();

    const classMatch = trimmed.match(/^class\s+(\w+)\s*\{/);
    if (classMatch) {
      current = { name: classMatch[1], members: [] };
      continue;
    }

    if (trimmed === "}" && current) {
      classes.push(current);
      current = null;
      continue;
    }

    if (current && trimmed.length > 0) {
      current.members.push(trimmed);
      continue;
    }

    // Relations: A --> B : label or A ..> B : label
    const relMatch = trimmed.match(/^(\w+)\s*(-->|\.\.>)\s*(\w+)\s*(?::\s*(.+))?/);
    if (relMatch) {
      relations.push({
        from: relMatch[1],
        to: relMatch[3],
        label: relMatch[4] || "",
        type: relMatch[2] === "-->" ? "solid" : "dashed",
      });
    }
  }

  return { classes, relations };
}

function ClassDiagramComponent({ chart }: { chart: string }) {
  const { classes, relations } = parseClassDiagram(chart);

  const classColors = [
    { bg: "rgba(96,165,250,0.08)", border: "rgba(96,165,250,0.25)", header: "rgba(96,165,250,0.15)" },
    { bg: "rgba(74,222,128,0.08)", border: "rgba(74,222,128,0.25)", header: "rgba(74,222,128,0.15)" },
    { bg: "rgba(192,132,252,0.08)", border: "rgba(192,132,252,0.25)", header: "rgba(192,132,252,0.15)" },
  ];

  return (
    <div className="diagram-block">
      <div className="diagram-title">类图</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", padding: "8px 0" }}>
        {classes.map((cls, i) => {
          const color = classColors[i % classColors.length];
          return (
            <div
              key={cls.name}
              style={{
                border: `1px solid ${color.border}`,
                borderRadius: "8px",
                overflow: "hidden",
                minWidth: "220px",
                flex: "1 1 220px",
                maxWidth: "320px",
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  background: color.header,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 600,
                  fontSize: "13px",
                  color: "var(--text)",
                  borderBottom: `1px solid ${color.border}`,
                }}
              >
                {cls.name}
              </div>
              <div style={{ padding: "6px 12px", background: color.bg }}>
                {cls.members.map((m, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: "11px",
                      fontFamily: "'JetBrains Mono', monospace",
                      color: "var(--text-secondary)",
                      padding: "2px 0",
                      borderBottom:
                        j < cls.members.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    {m}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {relations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "12px" }}>
          {relations.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12px",
                color: "var(--text-tertiary)",
              }}
            >
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                {r.from}
              </span>
              <span>{r.type === "solid" ? "→" : "⇢"}</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--text-secondary)" }}>
                {r.to}
              </span>
              {r.label && <span style={{ fontSize: "11px" }}>({r.label})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tool Group Diagram (graph TD with subgroups, non-architecture) ─

interface ToolGroup {
  label: string;
  nodes: { name: string; desc?: string }[];
}

function parseToolGroups(chart: string): ToolGroup[] {
  const cleaned = stripStyleLines(chart);
  const groups: ToolGroup[] = [];
  let current: ToolGroup | null = null;

  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim();
    const sgMatch = trimmed.match(/^subgraph\s+"([^"]+)"/);
    if (sgMatch) {
      current = { label: sgMatch[1], nodes: [] };
      continue;
    }
    if (trimmed === "end" && current) {
      groups.push(current);
      current = null;
      continue;
    }
    if (current) {
      const nodeMatch = trimmed.match(/^\w+\[([^\]]+)\]/);
      if (nodeMatch) {
        const label = nodeMatch[1];
        if (label.includes("<br/>")) {
          const [name, ...rest] = label.split("<br/>");
          current.nodes.push({ name, desc: rest.join(" ") });
        } else {
          current.nodes.push({ name: label });
        }
      }
    }
  }

  return groups;
}

const groupColorPalette = [
  { bg: "rgba(96,165,250,0.06)", border: "rgba(96,165,250,0.2)", dot: "rgb(96,165,250)" },
  { bg: "rgba(192,132,252,0.06)", border: "rgba(192,132,252,0.2)", dot: "rgb(192,132,252)" },
  { bg: "rgba(74,222,128,0.06)", border: "rgba(74,222,128,0.2)", dot: "rgb(74,222,128)" },
  { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", dot: "rgb(245,158,11)" },
  { bg: "rgba(251,113,133,0.06)", border: "rgba(251,113,133,0.2)", dot: "rgb(251,113,133)" },
  { bg: "rgba(45,212,191,0.06)", border: "rgba(45,212,191,0.2)", dot: "rgb(45,212,191)" },
  { bg: "rgba(248,113,113,0.06)", border: "rgba(248,113,113,0.2)", dot: "rgb(248,113,113)" },
];

function ToolGroupDiagram({ chart }: { chart: string }) {
  const groups = parseToolGroups(chart);

  return (
    <div className="diagram-block">
      <div className="diagram-title">工具分类</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "12px",
          padding: "8px 0",
        }}
      >
        {groups.map((group, i) => {
          const color = groupColorPalette[i % groupColorPalette.length];
          return (
            <div
              key={i}
              style={{
                border: `1px solid ${color.border}`,
                borderRadius: "8px",
                overflow: "hidden",
                background: color.bg,
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "var(--text)",
                  borderBottom: `1px solid ${color.border}`,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: color.dot,
                    display: "inline-block",
                  }}
                />
                {group.label}
              </div>
              <div style={{ padding: "6px 12px" }}>
                {group.nodes.map((node, j) => (
                  <div
                    key={j}
                    style={{
                      padding: "4px 0",
                      borderBottom:
                        j < group.nodes.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 500,
                        color: "var(--text)",
                      }}
                    >
                      {node.name}
                    </div>
                    {node.desc && (
                      <div style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                        {node.desc}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Flowchart Diagram ─────────────────────────────────────────────

interface FlowNode {
  id: string;
  text: string;
  desc?: string;
  shape: "box" | "decision" | "round";
}

interface FlowEdge {
  from: string;
  to: string;
  label?: string;
}

interface FlowSubgraph {
  id: string;
  title: string;
  nodeIds: string[];
}

function parseFlowchart(chart: string): {
  nodes: Map<string, FlowNode>;
  edges: FlowEdge[];
  subgraphs: FlowSubgraph[];
} {
  const cleaned = stripStyleLines(chart);
  const nodes = new Map<string, FlowNode>();
  const edges: FlowEdge[] = [];
  const subgraphs: FlowSubgraph[] = [];
  let currentSg: FlowSubgraph | null = null;

  function ensureNode(id: string): FlowNode {
    if (!nodes.has(id)) {
      nodes.set(id, { id, text: id, shape: "box" });
    }
    return nodes.get(id)!;
  }

  for (const line of cleaned.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("%%") || /^(flowchart|graph)\s/.test(trimmed)) continue;

    // Subgraph
    const sgMatch = trimmed.match(/^subgraph\s+(\w+)\["([^"]+)"\]/) || trimmed.match(/^subgraph\s+"([^"]+)"/);
    if (sgMatch) {
      const id = sgMatch[2] ? sgMatch[1] : sgMatch[1];
      const title = sgMatch[2] || sgMatch[1];
      currentSg = { id, title, nodeIds: [] };
      continue;
    }

    if (trimmed === "end") {
      if (currentSg) {
        subgraphs.push(currentSg);
        currentSg = null;
      }
      continue;
    }

    // Edge: A -->|label| B[text] or A --> B[text] or A --> B
    // Also handle: A -->|label| B{text}
    const edgeMatch = trimmed.match(
      /^(\w+)\s*(-+->|=+>|-.->)\s*(?:\|([^|]*)\|\s*)?(\w+(?:\["[^"]+"\]|\[[^\]]+\]|\{[^}]+\}|\([^)]+\))?)/
    );
    if (edgeMatch) {
      const fromId = edgeMatch[1];
      const label = edgeMatch[3]?.trim();
      const toRaw = edgeMatch[4];

      ensureNode(fromId);
      const toNode = parseNodeLabel(toRaw);
      if (toNode.text !== toNode.id || toNode.shape !== "box") {
        nodes.set(toNode.id, toNode);
      } else {
        ensureNode(toNode.id);
      }

      if (currentSg) {
        if (!currentSg.nodeIds.includes(fromId)) currentSg.nodeIds.push(fromId);
        if (!currentSg.nodeIds.includes(toNode.id)) currentSg.nodeIds.push(toNode.id);
      }

      edges.push({ from: fromId, to: toNode.id, label });
      continue;
    }

    // Standalone node definition: A[text] or A{text}
    const standaloneMatch = trimmed.match(/^(\w+)(\["[^"]+"\]|\[[^\]]+\]|\{[^}]+\}|\([^)]+\))$/);
    if (standaloneMatch) {
      const node = parseNodeLabel(trimmed);
      nodes.set(node.id, node);
      if (currentSg) {
        if (!currentSg.nodeIds.includes(node.id)) currentSg.nodeIds.push(node.id);
      }
      continue;
    }

    // Dotted edge: I -.->|StreamEvent| S[text]
    const dottedMatch = trimmed.match(
      /^(\w+)\s*-\.->(?:\|([^|]*)\|)?\s*(\w+(?:\["[^"]+"\]|\[[^\]]+\]|\{[^}]+\}|\([^)]+\))?)/
    );
    if (dottedMatch) {
      const fromId = dottedMatch[1];
      const label = dottedMatch[2]?.trim();
      const toNode = parseNodeLabel(dottedMatch[3]);

      ensureNode(fromId);
      if (toNode.text !== toNode.id || toNode.shape !== "box") {
        nodes.set(toNode.id, toNode);
      } else {
        ensureNode(toNode.id);
      }

      if (currentSg) {
        if (!currentSg.nodeIds.includes(fromId)) currentSg.nodeIds.push(fromId);
        if (!currentSg.nodeIds.includes(toNode.id)) currentSg.nodeIds.push(toNode.id);
      }

      edges.push({ from: fromId, to: toNode.id, label });
    }
  }

  return { nodes, edges, subgraphs };
}

/** Connector arrow between flow items */
function FlowArrow({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "2px 0", gap: "6px" }}>
      <div style={{ width: "2px", height: "20px", background: "var(--border-hover)", position: "relative" }}>
        <div
          style={{
            position: "absolute",
            bottom: "-3px",
            left: "50%",
            transform: "translateX(-50%)",
            borderLeft: "4px solid transparent",
            borderRight: "4px solid transparent",
            borderTop: "5px solid var(--border-hover)",
          }}
        />
      </div>
      {label && (
        <span style={{ fontSize: "11px", color: "var(--text-tertiary)", fontStyle: "italic" }}>{label}</span>
      )}
    </div>
  );
}

function FlowNodeBox({ node }: { node: FlowNode }) {
  const isDecision = node.shape === "decision";
  return (
    <div
      style={{
        padding: "10px 16px",
        borderRadius: isDecision ? "4px" : "8px",
        border: `1px solid ${isDecision ? "rgba(245,158,11,0.3)" : "var(--border)"}`,
        background: isDecision ? "rgba(245,158,11,0.06)" : "var(--bg-card, rgba(255,255,255,0.02))",
        textAlign: "center",
        fontSize: "13px",
        fontFamily: "'JetBrains Mono', monospace",
        color: "var(--text)",
        maxWidth: "280px",
      }}
    >
      <div style={{ fontWeight: isDecision ? 500 : 400 }}>{node.text}</div>
      {node.desc && (
        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>{node.desc}</div>
      )}
    </div>
  );
}

function FlowchartDiagram({ chart }: { chart: string }) {
  const { nodes, edges, subgraphs } = parseFlowchart(chart);

  // Build a simple linearized view: find roots and walk edges
  // For complex flowcharts with subgraphs, render subgraphs as sections
  const hasSubgraphs = subgraphs.length > 0;

  if (hasSubgraphs) {
    return (
      <div className="diagram-block">
        <div className="diagram-title">流程图</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", padding: "8px 0" }}>
          {subgraphs.map((sg, sgIdx) => {
            // Find edges within this subgraph
            const sgEdges = edges.filter(
              (e) => sg.nodeIds.includes(e.from) && sg.nodeIds.includes(e.to)
            );
            // Topological ordering within subgraph
            const ordered = topologicalSort(sg.nodeIds, sgEdges);

            return (
              <div
                key={sgIdx}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  background: "rgba(255,255,255,0.01)",
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "10px",
                    paddingBottom: "6px",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {sg.title}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0" }}>
                  {ordered.map((nodeId, i) => {
                    const node = nodes.get(nodeId);
                    if (!node) return null;
                    const edgeToThis = sgEdges.find((e) => e.to === nodeId);
                    // Check for branching (decision node with multiple outgoing edges)
                    const outEdges = sgEdges.filter((e) => e.from === nodeId);
                    const isBranching = node.shape === "decision" && outEdges.length > 1;

                    return (
                      <React.Fragment key={nodeId}>
                        {i > 0 && <FlowArrow label={edgeToThis?.label} />}
                        <FlowNodeBox node={node} />
                        {isBranching && (
                          <div style={{ display: "flex", gap: "12px", marginTop: "4px", width: "100%" }}>
                            {outEdges.map((oe, oeIdx) => {
                              const target = nodes.get(oe.to);
                              if (!target) return null;
                              return (
                                <div key={oeIdx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                                  <FlowArrow label={oe.label} />
                                  <FlowNodeBox node={target} />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Cross-subgraph edges */}
          {(() => {
            const crossEdges = edges.filter(
              (e) =>
                !subgraphs.some((sg) => sg.nodeIds.includes(e.from) && sg.nodeIds.includes(e.to))
            );
            if (crossEdges.length === 0) return null;
            return (
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "8px" }}>
                {crossEdges.map((e, i) => {
                  const fromNode = nodes.get(e.from);
                  const toNode = nodes.get(e.to);
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11px",
                        color: "var(--text-tertiary)",
                        padding: "2px 8px",
                      }}
                    >
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {fromNode?.text || e.from}
                      </span>
                      <span>→</span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {toNode?.text || e.to}
                      </span>
                      {e.label && <span>({e.label})</span>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  // No subgraphs: simple linear flow
  const allNodeIds = Array.from(nodes.keys());
  const ordered = topologicalSort(allNodeIds, edges);

  // Detect branching: decisions with multiple outgoing edges
  // We'll render a linear flow but show branches side by side
  return (
    <div className="diagram-block">
      <div className="diagram-title">流程图</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0", padding: "8px 0" }}>
        {renderFlowNodes(ordered, edges, nodes)}
      </div>
    </div>
  );
}

function renderFlowNodes(
  ordered: string[],
  edges: FlowEdge[],
  nodes: Map<string, FlowNode>,
  rendered = new Set<string>()
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < ordered.length; i++) {
    const nodeId = ordered[i];
    if (rendered.has(nodeId)) continue;
    rendered.add(nodeId);

    const node = nodes.get(nodeId);
    if (!node) continue;

    const inEdge = edges.find((e) => e.to === nodeId && rendered.has(e.from));
    const outEdges = edges.filter((e) => e.from === nodeId);

    if (elements.length > 0) {
      elements.push(<FlowArrow key={`arrow-${nodeId}`} label={inEdge?.label} />);
    }

    elements.push(<FlowNodeBox key={nodeId} node={node} />);

    // Branch if decision with multiple targets
    if (node.shape === "decision" && outEdges.length > 1) {
      elements.push(
        <div
          key={`branch-${nodeId}`}
          style={{ display: "flex", gap: "12px", width: "100%", justifyContent: "center", flexWrap: "wrap" }}
        >
          {outEdges.map((oe, oeIdx) => {
            const target = nodes.get(oe.to);
            if (!target || rendered.has(oe.to)) return null;
            rendered.add(oe.to);

            // Follow chain from this target
            const chain: FlowNode[] = [target];
            let current = oe.to;
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const next = edges.find(
                (e) => e.from === current && !rendered.has(e.to) && nodes.has(e.to)
              );
              if (!next) break;
              const nextNode = nodes.get(next.to)!;
              rendered.add(next.to);
              chain.push(nextNode);
              current = next.to;
            }

            return (
              <div key={oeIdx} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0", minWidth: "140px" }}>
                <FlowArrow label={oe.label} />
                {chain.map((cn, cnIdx) => (
                  <React.Fragment key={cn.id}>
                    {cnIdx > 0 && <FlowArrow />}
                    <FlowNodeBox node={cn} />
                  </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      );
    }
  }

  return elements;
}

/** Simple topological sort for node ordering */
function topologicalSort(nodeIds: string[], edges: FlowEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const e of edges) {
    if (nodeIds.includes(e.from) && nodeIds.includes(e.to)) {
      adj.get(e.from)!.push(e.to);
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    }
  }

  const queue = nodeIds.filter((id) => (inDegree.get(id) || 0) === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);
    for (const next of adj.get(node) || []) {
      const newDeg = (inDegree.get(next) || 1) - 1;
      inDegree.set(next, newDeg);
      if (newDeg === 0) {
        queue.push(next);
      }
    }
  }

  // Add any remaining nodes (cycles)
  for (const id of nodeIds) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
}

// ─── Main Component ────────────────────────────────────────────────

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const trimmed = chart.trim();

  if (isArchitectureDiagram(trimmed)) {
    return <ArchitectureDiagram chart={trimmed} />;
  }
  if (isSequenceDiagram(trimmed)) {
    return <SequenceDiagram chart={trimmed} />;
  }
  if (isParallelComparison(trimmed)) {
    return <ParallelDiagram chart={trimmed} />;
  }
  if (isStateDiagram(trimmed)) {
    return <StateDiagram chart={trimmed} />;
  }
  if (isClassDiagram(trimmed)) {
    return <ClassDiagramComponent chart={trimmed} />;
  }
  if (isToolGroupDiagram(trimmed)) {
    return <ToolGroupDiagram chart={trimmed} />;
  }
  if (isFlowchart(trimmed)) {
    return <FlowchartDiagram chart={trimmed} />;
  }

  // Fallback: render as preformatted text
  return (
    <div className="diagram-block">
      <pre
        style={{
          margin: 0,
          fontSize: "12px",
          fontFamily: "'JetBrains Mono', monospace",
          color: "var(--text-secondary)",
          whiteSpace: "pre-wrap",
          overflowX: "auto",
        }}
      >
        {chart}
      </pre>
    </div>
  );
}
