'use client';

import type { Conversation } from '@/hooks/useChat';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}

export function ConversationList({ conversations, activeId, onSelect, onNew }: Props) {
  return (
    <div className="w-52 border-r border-neutral-800 flex flex-col">
      <div className="p-2">
        <button onClick={onNew}
          className="w-full text-left px-3 py-1.5 text-xs text-violet-400 hover:bg-neutral-800 rounded-md transition-colors">
          + New conversation
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <button key={conv.id} onClick={() => onSelect(conv.id)}
            className={`w-full text-left px-3 py-2 text-xs truncate transition-colors ${
              conv.id === activeId ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:bg-neutral-800/50'
            }`}>
            {conv.title || 'Untitled'}
          </button>
        ))}
      </div>
    </div>
  );
}
