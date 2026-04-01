"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";

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

const TAG_LABELS: Record<string, string> = {
  architecture: '架构',
  overview: 'overview',
  startup: 'startup',
  tools: '工具',
  permissions: '权限',
  security: '安全',
  performance: '性能',
  streaming: '流式',
  'query-engine': '查询引擎',
  'async-generator': '异步生成器',
  recovery: '恢复',
  'streaming-executor': '流式执行',
  concurrency: '并发',
  context: '上下文',
  compact: '压缩',
  'token-management': 'Token管理',
  'lazy-loading': '惰性加载',
  'feature-flags': 'Feature Flag',
  'multi-agent': '多Agent',
  coordinator: '协调器',
  'agent-tool': 'AgentTool',
  swarm: 'Swarm',
  memory: '记忆',
  persistence: '持久化',
  memdir: 'memdir',
  bridge: 'Bridge',
  'ide-integration': 'IDE集成',
  'session-management': '会话管理',
  mcp: 'MCP',
  protocol: '协议',
  extensibility: '可扩展',
  skills: 'Skills',
  plugins: '插件',
  oauth: 'OAuth',
  authentication: '认证',
  keychain: 'Keychain',
  'terminal-ui': '终端UI',
  react: 'React',
  ink: 'Ink',
  components: '组件',
  keybindings: '快捷键',
  vim: 'Vim',
  'state-machine': '状态机',
  input: '输入',
  screens: '全屏',
  fullscreen: '全屏UI',
  doctor: 'Doctor',
  resume: '恢复',
  state: '状态',
  store: 'Store',
  telemetry: '遥测',
  opentelemetry: 'OpenTelemetry',
  analytics: '分析',
  config: '配置',
  schema: 'Schema',
  migrations: '迁移',
  settings: '设置',
  bun: 'Bun',
  'dead-code-elimination': 'DCE',
  'file-operations': '文件操作',
  read: 'Read',
  write: 'Write',
  edit: 'Edit',
  bash: 'Bash',
  shell: 'Shell',
  sandbox: '沙箱',
  search: '搜索',
  glob: 'Glob',
  grep: 'Grep',
  ripgrep: 'ripgrep',
  web: 'Web',
  fetch: 'Fetch',
  proxy: '代理',
  lsp: 'LSP',
  'language-server': '语言服务',
  diagnostics: '诊断',
  buddy: 'Buddy',
  'easter-egg': '彩蛋',
  prng: 'PRNG',
  output: '输出',
  styles: '样式',
  themes: '主题',
  markdown: 'Markdown',
  remote: '远程',
  cron: 'Cron',
  headless: '无头模式',
  server: '服务器',
  session: '会话',
  share: '分享',
  api: 'API',
  anthropic: 'Anthropic',
  'cost-tracking': '成本追踪',
  'error-handling': '错误处理',
  resilience: '韧性',
};

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
  const activeIdRef = useRef('');
  const isClickScrolling = useRef(false);
  const headingsRef = useRef<Heading[]>([]);

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
            <Link href={`/${locale}/articles`}>文章</Link>
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
          <div className="toc-label">目录</div>
          <ul className="toc-list">
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
                  const label = TAG_LABELS[tag] || tag;
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
                <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> 约 {readTime} 分钟</span>
                {moduleCount > 0 && <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> 涉及 {moduleCount} 个模块</span>}
                <span>{String(order).padStart(2, '0')} / {String(totalArticles).padStart(2, '0')}</span>
              </div>
            </header>

            <div className="prose" ref={contentRef}>
              {children}
            </div>
          </article>
        </main>

        <aside className="right-gutter">
          <div className="gutter-label">文章信息</div>
          <div className="gutter-file">
            第 {order} 篇
            <span className="gutter-lines">共 {totalArticles} 篇</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
