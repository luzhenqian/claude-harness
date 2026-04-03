"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { t, getTagLabel, formatTemplate } from "@/lib/ui-translations";
import { useTextSelection } from '@/hooks/useTextSelection';
import { ContextMenu } from '@/components/chat/ContextMenu';
import { getChatWidgetHandle } from '@/components/chat/ChatWidget';

interface ArticleShellProps {
  locale: string;
  title: string;
  description: string;
  order: number;
  totalArticles: number;
  tags: string[];
  readTime: number;
  moduleCount: number;
  children: React.ReactNode;
}

const TAG_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  architecture: { color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'rgba(245,158,11,0.2)' },
  overview: { color: 'var(--blue)', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  startup: { color: 'var(--green)', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  tools: { color: 'var(--green)', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  permissions: { color: 'var(--purple)', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
  security: { color: 'var(--purple)', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
  performance: { color: 'var(--cyan)', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
  streaming: { color: 'var(--cyan)', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
  memory: { color: 'var(--pink)', bg: 'rgba(244,114,182,0.1)', border: 'rgba(244,114,182,0.2)' },
  context: { color: 'var(--cyan)', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
  concurrency: { color: 'var(--purple)', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
  bridge: { color: 'var(--blue)', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)' },
  mcp: { color: 'var(--green)', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.2)' },
  react: { color: 'var(--cyan)', bg: 'rgba(6,182,212,0.1)', border: 'rgba(6,182,212,0.2)' },
  config: { color: 'var(--accent)', bg: 'var(--accent-dim)', border: 'rgba(245,158,11,0.2)' },
};

// TAG_LABELS now handled by getTagLabel() from ui-translations

interface Heading {
  id: string;
  text: string;
  level: number;
}

/**
 * Generate a stable, URL-friendly ID from heading text.
 * - Keeps ASCII alphanumeric as-is
 * - Converts Chinese/CJK chars to pinyin-like index: "section-1", "section-2", etc.
 * - Falls back to "h-{index}" for pure CJK headings
 */
function slugify(text: string, index: number): string {
  // Extract ASCII words
  const ascii = text
    .replace(/[^\w\s-]/g, '') // remove non-word, non-space, non-dash
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (ascii.length > 0) {
    return `${ascii}-${index}`;
  }
  // Pure CJK heading
  return `section-${index}`;
}

export default function ArticleShell({ locale, title, description, order, totalArticles, tags, readTime, moduleCount, children }: ArticleShellProps) {
  const [progress, setProgress] = useState(0);
  const [activeId, setActiveId] = useState('');
  const [headings, setHeadings] = useState<Heading[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);
  const tocListRef = useRef<HTMLUListElement>(null);
  const activeIdRef = useRef('');
  const isClickScrolling = useRef(false);
  const headingsRef = useRef<Heading[]>([]);

  const { selection, clearSelection } = useTextSelection(contentRef);

  const handleContextAction = useCallback((action: string, customPrompt?: string) => {
    if (!selection) return;
    const widget = getChatWidgetHandle();
    if (!widget) return;

    const prompts: Record<string, Record<string, string>> = {
      explain: {
        zh: `请解释以下内容：\n\n"${selection.text}"`,
        en: `Please explain the following text:\n\n"${selection.text}"`,
        ja: `以下のテキストを説明してください：\n\n「${selection.text}」`,
      },
      find_code: {
        zh: `查找与以下内容相关的源代码：\n\n"${selection.text}"`,
        en: `Find source code related to:\n\n"${selection.text}"`,
        ja: `以下に関連するソースコードを検索：\n\n「${selection.text}」`,
      },
      find_articles: {
        zh: `查找与以下内容相关的文章：\n\n"${selection.text}"`,
        en: `Find articles related to:\n\n"${selection.text}"`,
        ja: `以下に関連する記事を検索：\n\n「${selection.text}」`,
      },
      custom: {
        zh: `关于以下文字："${selection.text}"\n\n${customPrompt}`,
        en: `About the following text: "${selection.text}"\n\n${customPrompt}`,
        ja: `以下のテキストについて：「${selection.text}」\n\n${customPrompt}`,
      },
    };

    const message = prompts[action]?.[locale] || prompts[action]?.en || selection.text;

    widget.open(message, { selectedText: selection.text, newConversation: true });
    clearSelection();
  }, [selection, clearSelection, locale]);

  // Keep refs in sync with state
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { headingsRef.current = headings; }, [headings]);

  // Extract headings from rendered content and assign stable ASCII IDs
  useEffect(() => {
    if (!contentRef.current) return;

    const timer = setTimeout(() => {
      const els = contentRef.current?.querySelectorAll('h2, h3');
      if (!els || els.length === 0) return;

      const items: Heading[] = [];
      const usedIds = new Set<string>();

      els.forEach((el, idx) => {
        const text = el.textContent || '';
        let id = slugify(text, idx + 1);

        // Deduplicate
        while (usedIds.has(id)) {
          id = `${id}-${idx}`;
        }
        usedIds.add(id);
        el.id = id;

        items.push({ id, text, level: el.tagName === 'H2' ? 2 : 3 });
      });

      setHeadings(items);

      // If URL has a hash on load, scroll to it after IDs are assigned
      if (window.location.hash) {
        const hashId = decodeURIComponent(window.location.hash.slice(1));
        const target = document.getElementById(hashId);
        if (target) {
          setTimeout(() => target.scrollIntoView({ behavior: 'smooth' }), 150);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [children]);

  // Stable scroll handler using refs (no dependency on activeId state)
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    setProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);

    if (isClickScrolling.current) return;

    const items = headingsRef.current;
    if (items.length === 0) return;

    const scrollOffset = scrollTop + 120;
    let currentId = items[0].id;

    for (const h of items) {
      const el = document.getElementById(h.id);
      if (el && el.offsetTop <= scrollOffset) {
        currentId = h.id;
      }
    }

    if (currentId !== activeIdRef.current) {
      setActiveId(currentId);
      window.history.replaceState(null, '', `#${currentId}`);
    }
  }, []); // stable — no deps, uses refs

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Auto-scroll TOC sidebar to keep active item visible, keeping it roughly 1/3 from top
  useEffect(() => {
    if (!activeId || !tocListRef.current) return;
    const sidebar = tocListRef.current.closest('.toc-sidebar') as HTMLElement | null;
    if (!sidebar) return;
    const activeEl = tocListRef.current.querySelector(`a[href="#${CSS.escape(activeId)}"]`) as HTMLElement | null;
    if (!activeEl) return;

    const sidebarRect = sidebar.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    const elRelativeTop = elRect.top - sidebarRect.top + sidebar.scrollTop;
    const targetScroll = elRelativeTop - sidebar.clientHeight * 0.3;
    sidebar.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
  }, [activeId]);

  // Run scroll spy once after headings are populated
  useEffect(() => {
    if (headings.length > 0) {
      handleScroll();
    }
  }, [headings, handleScroll]);

  const handleTocClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    isClickScrolling.current = true;
    setActiveId(id);
    window.history.pushState(null, '', `#${id}`);
    target.scrollIntoView({ behavior: 'smooth' });

    setTimeout(() => {
      isClickScrolling.current = false;
    }, 800);
  }, []);

  return (
    <div className="article-page">
      <div className="progress-bar" style={{ width: `${progress}%` }}></div>

      <nav className="article-nav">
        <div className="nav-left">
          <Link href={`/${locale}`} className="nav-logo"><span className="dot"></span> Claude Harness</Link>
          <div className="nav-breadcrumb">
            <span className="sep">/</span>
            <Link href={`/${locale}/articles`}>{t(locale, 'nav.articles')}</Link>
            <span className="sep">/</span>
            <span style={{ color: 'var(--text-dim)' }}>{String(order).padStart(2, '0')} — {title.length > 20 ? title.slice(0, 20) + '...' : title}</span>
          </div>
        </div>
        <div className="nav-right">
          <Link href={`/${locale}/code`} className="nav-btn" title="在代码浏览器中查看">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m16 18 6-6-6-6"/><path d="m8 6-6 6 6 6"/></svg>
            查看源码
          </Link>
        </div>
      </nav>

      <div className="article-layout">
        <aside className="toc-sidebar">
          <div className="toc-label">{t(locale, 'article.toc')}</div>
          <ul className="toc-list" ref={tocListRef}>
            {headings.map((h) => (
              <li key={h.id} className="toc-item">
                <a
                  className={`toc-link ${h.level === 3 ? 'sub' : ''} ${activeId === h.id ? 'active' : ''}`}
                  href={`#${h.id}`}
                  onClick={(e) => handleTocClick(e, h.id)}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <main className="article-container">
          <article>
            <header className="article-header">
              <div className="article-meta-row">
                {tags.slice(0, 3).map((tag) => {
                  const colors = TAG_COLORS[tag] || { color: 'var(--text-dim)', bg: 'rgba(255,255,255,0.05)', border: 'var(--border)' };
                  const label = getTagLabel(locale, tag);
                  return (
                    <span
                      key={tag}
                      className="article-tag"
                      style={{ color: colors.color, background: colors.bg, borderColor: colors.border }}
                    >
                      {label}
                    </span>
                  );
                })}
              </div>
              <h1 className="article-title">{title}</h1>
              <p className="article-desc">{description}</p>
              <div className="article-info">
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> {formatTemplate(t(locale, 'article.readTime'), { readTime })}</span>
                {moduleCount > 0 && <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> {formatTemplate(t(locale, 'article.moduleCount'), { moduleCount })}</span>}
                <span>{String(order).padStart(2, '0')} / {String(totalArticles).padStart(2, '0')}</span>
              </div>
            </header>

            <div className="prose" ref={contentRef}>
              {children}
            </div>
          </article>
        </main>

        <aside className="right-gutter">
          <div className="gutter-label">{t(locale, 'article.sidebarTitle')}</div>
          <div className="gutter-file">
            {formatTemplate(t(locale, 'article.articleNum'), { order })}
            <span className="gutter-lines">{formatTemplate(t(locale, 'article.articleTotal'), { total: totalArticles })}</span>
          </div>
        </aside>
      </div>
      {selection && (
        <ContextMenu
          x={selection.x}
          y={selection.y}
          selectedText={selection.text}
          onAction={handleContextAction}
          onClose={clearSelection}
        />
      )}
    </div>
  );
}
