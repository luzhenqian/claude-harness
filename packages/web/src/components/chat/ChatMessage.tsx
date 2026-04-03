'use client';

import { useState } from 'react';
import { MessageRenderer } from './MessageRenderer';
import { Pencil } from 'lucide-react';

interface Props {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  isStreaming?: boolean;
  onEdit?: (id: string, newContent: string) => void;
}

export function ChatMessage({ id, role, content, isStreaming, onEdit }: Props) {
  const isUser = role === 'user';
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleConfirmEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== content && onEdit) {
      onEdit(id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`relative max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser ? 'rounded-br-md' : 'rounded-bl-md'
      }`} style={{
        background: isUser ? 'var(--accent-dim)' : 'var(--bg-elevated)',
        color: isUser ? 'var(--text-bright)' : 'var(--text)',
        border: isUser ? '1px solid rgba(245,158,11,0.2)' : '1px solid var(--border)',
      }}>
        {editing ? (
          <div>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full resize-none rounded p-2 text-sm focus:outline-none"
              style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirmEdit(); }
                if (e.key === 'Escape') { setEditing(false); setEditValue(content); }
              }}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => { setEditing(false); setEditValue(content); }}
                className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-dim)' }}>Cancel</button>
              <button onClick={handleConfirmEdit}
                className="text-xs px-2 py-1 rounded text-white" style={{ background: 'var(--accent)' }}>Save & Resend</button>
            </div>
          </div>
        ) : (
          <>
            {isUser ? (
              <div className="whitespace-pre-wrap">{content}</div>
            ) : isStreaming ? (
              <div className="whitespace-pre-wrap streaming-cursor">{content}</div>
            ) : (
              <MessageRenderer content={content} />
            )}
            {isStreaming && !content && (
              <span className="streaming-cursor" />
            )}
          </>
        )}
        {isUser && !editing && onEdit && (
          <button
            onClick={() => setEditing(true)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
