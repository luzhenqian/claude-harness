'use client';

import type { Conversation } from '@/hooks/useChat';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

// Deprecated: Use ChatSidebar instead. Kept for reference only.
export function ConversationList({ conversations, activeId, onSelect, onNew }: Props) {
  return (
    <div className="w-52 flex flex-col" style={{ borderRight: '1px solid var(--border)' }}>
      <div className="p-2">
        <button onClick={onNew}
          className="w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors"
          style={{ color: 'var(--accent)' }}>
          + New conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button key={conv.id} onClick={() => onSelect(conv.id)}
            className="w-full text-left px-3 py-2 text-xs truncate transition-colors"
            style={{
              background: conv.id === activeId ? 'var(--accent-dim)' : 'transparent',
              color: conv.id === activeId ? 'var(--text-bright)' : 'var(--text-dim)',
            }}>
            {conv.title || 'Untitled'}
          </button>
        ))}
      </div>
    </div>
  );
}
