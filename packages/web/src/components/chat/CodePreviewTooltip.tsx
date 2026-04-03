'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface TooltipState {
  filePath: string;
  lineRange?: { start: number; end: number };
  x: number;
  y: number;
  linkBottom: number; // bottom edge of the link element
}

const codeCache = new Map<string, { code: string; error?: string }>();

async function fetchCode(filePath: string): Promise<{ code: string | null; error: string | null }> {
  const cached = codeCache.get(filePath);
  if (cached) return { code: cached.code, error: cached.error || null };

  try {
    const res = await fetch(`${API_BASE}/source?file=${encodeURIComponent(filePath)}`);
    if (!res.ok) {
      const result = { code: null, error: `File not found: ${filePath}` };
      codeCache.set(filePath, { code: '', error: result.error });
      return result;
    }
    const data = await res.json();
    codeCache.set(filePath, { code: data.code || '' });
    return { code: data.code, error: null };
  } catch {
    const result = { code: null, error: `Failed to fetch: ${filePath}` };
    codeCache.set(filePath, { code: '', error: result.error });
    return result;
  }
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    json: 'json', css: 'css', md: 'markdown',
  };
  return map[ext] ?? 'typescript';
}

const CHUNK_SIZE = 25;

function TooltipContent({ filePath, lineRange }: { filePath: string; lineRange?: { start: number; end: number } }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleEnd, setVisibleEnd] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Initialize visibleEnd when code loads
  useEffect(() => {
    if (!code) return;
    const lines = code.split('\n');
    const start = lineRange?.start ? Math.max(1, lineRange.start) : 1;
    setVisibleEnd(Math.min(lines.length, start + CHUNK_SIZE - 1));
  }, [code, lineRange]);

  // Infinite scroll: load more lines when scrolled near bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !code) return;
    const lines = code.split('\n');

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      if (scrollHeight - scrollTop - clientHeight < 60) {
        setVisibleEnd(prev => Math.min(lines.length, prev + CHUNK_SIZE));
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [code]);

  if (loading) {
    return (
      <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
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
  const displayCode = lines.slice(start - 1, visibleEnd).join('\n');
  const totalLines = lines.length;
  const lang = detectLanguage(filePath);

  return (
    <div>
      {/* macOS-style header — matches article code blocks */}
      <div style={{
        height: 36,
        background: 'var(--bg-code-header)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', opacity: 0.7 }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308', opacity: 0.7 }} />
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', opacity: 0.7 }} />
        </div>
        <span style={{
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--text-muted)',
        }}>
          {filePath.split('/').pop()}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
          L{start}-{visibleEnd} / {totalLines}
        </span>
      </div>
      {/* Code with syntax highlighting — same style as code browser */}
      <div ref={scrollRef} style={{ maxHeight: 320, overflow: 'auto', background: 'var(--bg-code)' }}>
        <SyntaxHighlighter
          language={lang}
          style={vscDarkPlus}
          showLineNumbers
          startingLineNumber={start}
          customStyle={{
            margin: 0,
            padding: '14px 0',
            background: 'transparent',
            fontSize: '13px',
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            lineHeight: '1.6',
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: 'var(--text-muted)',
            textAlign: 'right',
          }}
        >
          {displayCode}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export function CodePreviewProvider({ children }: { children: React.ReactNode }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const activeLink = useRef<HTMLElement | null>(null);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(null);

  const clearHideTimeout = useCallback(() => {
    if (hideTimeout.current) { clearTimeout(hideTimeout.current); hideTimeout.current = null; }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeout.current = setTimeout(() => {
      setTooltip(null);
      activeLink.current = null;
    }, 300);
  }, [clearHideTimeout]);

  const showTooltip = useCallback((filePath: string, lineRange: { start: number; end: number } | undefined, rect: DOMRect) => {
    clearHideTimeout();
    setTooltip({
      filePath,
      lineRange,
      x: rect.left + rect.width / 2,
      y: rect.top,
      linkBottom: rect.bottom,
    });
  }, [clearHideTimeout]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Check if mouse is over a file link
      const link = target.closest('a[href*="/code?file="]') as HTMLAnchorElement | null;
      if (link) {
        activeLink.current = link;
        clearHideTimeout();

        const href = link.getAttribute('href') || '';
        const fileMatch = href.match(/file=([^&#]+)/);
        if (!fileMatch) return;

        const filePath = decodeURIComponent(fileMatch[1]);
        const lineMatch = href.match(/#L(\d+)(?:-L(\d+))?/);
        const lineRange = lineMatch
          ? { start: parseInt(lineMatch[1]), end: lineMatch[2] ? parseInt(lineMatch[2]) : parseInt(lineMatch[1]) + 24 }
          : undefined;

        const rect = link.getBoundingClientRect();
        showTooltip(filePath, lineRange, rect);
        return;
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement | null;

      const link = target.closest('a[href*="/code?file="]');
      if (link) {
        // Check if moving to tooltip
        if (relatedTarget && tooltipRef.current?.contains(relatedTarget)) {
          clearHideTimeout();
          return;
        }
        scheduleHide();
      }
    };

    container.addEventListener('mouseover', handleMouseOver);
    container.addEventListener('mouseout', handleMouseOut);
    return () => {
      container.removeEventListener('mouseover', handleMouseOver);
      container.removeEventListener('mouseout', handleMouseOut);
    };
  }, [showTooltip, scheduleHide, clearHideTimeout]);

  return (
    <div ref={containerRef}>
      {children}
      {tooltip && createPortal(
        <div
          ref={tooltipRef}
          onMouseEnter={clearHideTimeout}
          onMouseLeave={scheduleHide}
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)',
            width: 560,
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
          {/* Invisible bridge area between tooltip and link below */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: -24,
            height: 24,
          }} />
          <TooltipContent filePath={tooltip.filePath} lineRange={tooltip.lineRange} />
        </div>,
        document.body,
      )}
    </div>
  );
}
