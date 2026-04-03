'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TooltipState {
  filePath: string;
  lineRange?: { start: number; end: number };
  x: number;
  y: number;
}

// Cache fetched code to avoid re-fetching on repeated hovers
const codeCache = new Map<string, { code: string; error?: string }>();

async function fetchCode(filePath: string): Promise<{ code: string | null; error: string | null }> {
  const cached = codeCache.get(filePath);
  if (cached) return { code: cached.code, error: cached.error || null };

  try {
    const res = await fetch(`${API_BASE}/source/${encodeURIComponent(filePath)}`);
    if (!res.ok) {
      // Fallback: try the server action pattern via a simple GET
      const result = { code: null, error: `File not found: ${filePath}` };
      codeCache.set(filePath, { code: '', error: result.error });
      return result;
    }
    const data = await res.json();
    codeCache.set(filePath, { code: data.code || '' });
    return { code: data.code, error: null };
  } catch {
    // Use direct fetch to the source file via the existing code browser pattern
    const result = { code: null, error: `Failed to fetch: ${filePath}` };
    codeCache.set(filePath, { code: '', error: result.error });
    return result;
  }
}

function TooltipContent({ filePath, lineRange }: { filePath: string; lineRange?: { start: number; end: number } }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchCode(filePath).then(result => {
      if (cancelled) return;
      setCode(result.code);
      setError(result.error);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [filePath]);

  if (loading) {
    return (
      <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
        Loading...
      </div>
    );
  }

  if (error || !code) {
    return (
      <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 12 }}>
        {error || 'No content'}
      </div>
    );
  }

  const lines = code.split('\n');
  const start = lineRange?.start ? Math.max(1, lineRange.start) : 1;
  const end = lineRange?.end ? Math.min(lines.length, lineRange.end) : Math.min(lines.length, start + 29);
  const displayLines = lines.slice(start - 1, end);
  const totalLines = lines.length;

  return (
    <div>
      {/* Header */}
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--accent)',
          fontWeight: 500,
        }}>
          {filePath}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          L{start}-{end} / {totalLines}
        </span>
      </div>
      {/* Code */}
      <div style={{
        padding: '10px 0',
        overflow: 'auto',
        maxHeight: 300,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        lineHeight: 1.6,
      }}>
        {displayLines.map((line, i) => (
          <div key={i} style={{
            display: 'flex',
            padding: '0 14px',
            whiteSpace: 'pre',
          }}>
            <span style={{
              minWidth: 36,
              textAlign: 'right',
              paddingRight: 12,
              color: 'var(--text-muted)',
              userSelect: 'none',
              flexShrink: 0,
            }}>
              {start + i}
            </span>
            <span style={{ color: 'var(--text)' }}>{line}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CodePreviewProvider({ children }: { children: React.ReactNode }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const showTooltip = useCallback((filePath: string, lineRange: { start: number; end: number } | undefined, rect: DOMRect) => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setTooltip({
      filePath,
      lineRange,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  }, []);

  const scheduleHide = useCallback(() => {
    hideTimeout.current = setTimeout(() => setTooltip(null), 200);
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseEnter = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href*="/code?file="]') as HTMLAnchorElement | null;
      if (!link) return;

      const href = link.getAttribute('href') || '';
      const fileMatch = href.match(/file=([^&#]+)/);
      if (!fileMatch) return;

      const filePath = decodeURIComponent(fileMatch[1]);
      const lineMatch = href.match(/#L(\d+)(?:-L(\d+))?/);
      const lineRange = lineMatch
        ? { start: parseInt(lineMatch[1]), end: lineMatch[2] ? parseInt(lineMatch[2]) : parseInt(lineMatch[1]) + 29 }
        : undefined;

      const rect = link.getBoundingClientRect();
      showTooltip(filePath, lineRange, rect);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      const link = (e.target as HTMLElement).closest('a[href*="/code?file="]');
      if (link) scheduleHide();
    };

    container.addEventListener('mouseenter', handleMouseEnter, true);
    container.addEventListener('mouseleave', handleMouseLeave, true);
    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter, true);
      container.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [showTooltip, scheduleHide]);

  return (
    <div ref={containerRef}>
      {children}
      {tooltip && createPortal(
        <div
          onMouseEnter={cancelHide}
          onMouseLeave={scheduleHide}
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            marginTop: -8,
            width: 520,
            maxWidth: 'calc(100vw - 32px)',
            borderRadius: 12,
            border: '1px solid var(--border)',
            background: 'var(--bg-code)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'chat-fade-in 0.15s ease',
          }}
        >
          <TooltipContent filePath={tooltip.filePath} lineRange={tooltip.lineRange} />
        </div>,
        document.body,
      )}
    </div>
  );
}
