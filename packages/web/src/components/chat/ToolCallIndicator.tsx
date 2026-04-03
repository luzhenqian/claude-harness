'use client';

import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

interface Props { toolName: string; args?: string; }

export function ToolCallIndicator({ toolName, args }: Props) {
  const locale = useLocale();
  const TOOL_LABELS: Record<string, string> = {
    search_code: t(locale, 'chat.searchingCode'),
    read_file: t(locale, 'chat.readingFile'),
    search_articles: t(locale, 'chat.searchingArticles'),
    get_article: t(locale, 'chat.readingArticle'),
  };
  return (
    <div className="flex items-center gap-2 text-xs py-1" style={{ color: 'var(--text-dim)' }}>
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
      <span>{TOOL_LABELS[toolName] || toolName}{args ? `: ${args}` : ''}...</span>
    </div>
  );
}
