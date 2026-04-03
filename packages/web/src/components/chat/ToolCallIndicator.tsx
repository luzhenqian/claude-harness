'use client';

interface Props { toolName: string; args?: string; }

const TOOL_LABELS: Record<string, string> = {
  search_code: 'Searching source code', read_file: 'Reading file',
  search_articles: 'Searching articles', get_article: 'Reading article',
};

export function ToolCallIndicator({ toolName, args }: Props) {
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-400 py-1">
      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-600 border-t-violet-400" />
      <span>{TOOL_LABELS[toolName] || toolName}{args ? `: ${args}` : ''}...</span>
    </div>
  );
}
