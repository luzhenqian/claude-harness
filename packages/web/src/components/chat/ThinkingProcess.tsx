'use client';

import { useState } from 'react';
import { useLocale } from '@/hooks/useLocale';

export interface ThinkingStep {
  tool: string;
  args: any;
  resultPreview: string;
}

interface Props {
  steps: ThinkingStep[];
}

const TOOL_LABELS: Record<string, Record<string, string>> = {
  search_files: { zh: '搜索文件', en: 'Search files', ja: 'ファイル検索' },
  read_file: { zh: '读取文件', en: 'Read file', ja: 'ファイル読取' },
  search_articles: { zh: '搜索文章', en: 'Search articles', ja: '記事検索' },
  read_article: { zh: '读取文章', en: 'Read article', ja: '記事読取' },
};

export function ThinkingProcess({ steps }: Props) {
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  if (steps.length === 0) return null;

  const label = locale === 'zh' ? '思考过程' : locale === 'ja' ? '思考プロセス' : 'Thinking';

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted)',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <span style={{
          display: 'inline-block',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          fontSize: 10,
        }}>
          ▶
        </span>
        {label} ({steps.length} {locale === 'zh' ? '步' : locale === 'ja' ? 'ステップ' : steps.length === 1 ? 'step' : 'steps'})
      </button>

      {expanded && (
        <div style={{
          marginTop: 4,
          marginLeft: 16,
          paddingLeft: 12,
          borderLeft: '2px solid var(--border)',
          animation: 'chat-fade-in 0.15s ease',
        }}>
          {steps.map((step, i) => {
            const toolLabel = TOOL_LABELS[step.tool]?.[locale] || step.tool;
            const argsSummary = step.tool === 'search_files' || step.tool === 'search_articles'
              ? `"${step.args?.query || ''}"`
              : step.tool === 'read_file'
                ? step.args?.file_path || ''
                : step.args?.slug || '';

            return (
              <div key={i} style={{
                padding: '4px 0',
                fontSize: 12,
                color: 'var(--text-dim)',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.5,
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>{' '}
                <span style={{ color: 'var(--accent)' }}>{toolLabel}</span>
                {argsSummary && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                    {argsSummary}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
