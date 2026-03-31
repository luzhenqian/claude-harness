"use client";

import { useEffect, useRef, useId } from "react";

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "_");

  useEffect(() => {
    let cancelled = false;

    async function render() {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          primaryColor: "#d4a574",
          primaryTextColor: "#ededed",
          primaryBorderColor: "#555",
          lineColor: "#888",
          secondaryColor: "#1a1a2e",
          tertiaryColor: "#16213e",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: "14px",
        },
      });

      if (cancelled || !containerRef.current) return;

      try {
        const { svg } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        // Show raw chart on render failure
        if (!cancelled && containerRef.current) {
          containerRef.current.textContent = chart;
        }
      }
    }

    render();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  return (
    <div
      ref={containerRef}
      className="my-8 flex justify-center overflow-x-auto rounded-lg border border-[var(--border)] bg-[#111] p-6"
    />
  );
}
