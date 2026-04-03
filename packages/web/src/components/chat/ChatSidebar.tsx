'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Conversation } from '@/hooks/useChat';
import { useLocale } from '@/hooks/useLocale';
import { t, formatTemplate } from '@/lib/ui-translations';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onRename, onDelete }: Props) {
  const locale = useLocale();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title || '');
  };

  const confirmRename = (id: string) => {
    if (editTitle.trim()) onRename(id, editTitle.trim());
    setEditingId(null);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return t(locale, 'chat.justNow');
    if (diffMin < 60) return formatTemplate(t(locale, 'chat.minutesAgo'), { n: diffMin });
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return formatTemplate(t(locale, 'chat.hoursAgo'), { n: diffHr });
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return formatTemplate(t(locale, 'chat.daysAgo'), { n: diffDay });
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full" style={{ width: '280px', borderRight: '1px solid #1a1a22', background: '#0a0a0d' }}>
      <div className="p-3">
        <button onClick={onNew}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.2)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))'}>
          <Plus size={16} />
          {t(locale, 'chat.newConversation')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {conversations.map((conv) => (
          <div key={conv.id}
            className="group relative"
            onClick={() => { if (editingId !== conv.id && deletingId !== conv.id) onSelect(conv.id); }}>
            <div className={`flex items-center px-3 py-2.5 mx-2 rounded-lg cursor-pointer transition-colors`}
              style={{
                background: conv.id === activeId ? 'var(--accent-dim)' : 'transparent',
                borderLeft: conv.id === activeId ? '2px solid var(--accent)' : '2px solid transparent',
              }}
              onMouseEnter={(e) => { if (conv.id !== activeId) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
              onMouseLeave={(e) => { if (conv.id !== activeId) e.currentTarget.style.background = 'transparent'; }}>

              {editingId === conv.id ? (
                <div className="flex-1 flex items-center gap-1">
                  <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1 text-sm rounded px-2 py-0.5 focus:outline-none"
                    style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--accent)' }}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') confirmRename(conv.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button onClick={(e) => { e.stopPropagation(); confirmRename(conv.id); }}
                    style={{ color: 'var(--green)' }}><Check size={14} /></button>
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                    style={{ color: 'var(--text-muted)' }}><X size={14} /></button>
                </div>
              ) : deletingId === conv.id ? (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                    {conv.title || t(locale, 'chat.untitled')}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); onDelete(conv.id); setDeletingId(null); }}
                    className="text-xs px-3 py-1 rounded-md ml-2 flex-shrink-0"
                    style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' }}>
                    {locale === 'zh' ? '\u786e\u8ba4' : locale === 'ja' ? '\u78ba\u8a8d' : 'Confirm'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: conv.id === activeId ? 'var(--text-bright)' : 'var(--text)' }}>
                      {conv.title || t(locale, 'chat.untitled')}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatTime(conv.updatedAt)}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); startRename(conv); }}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                      <Pencil size={12} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(conv.id); }}
                      className="p-1 rounded transition-colors"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sidebar footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #1a1a22',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 6px rgba(245,158,11,0.3)',
        }} />
        <span style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'var(--text-muted)',
          letterSpacing: '0.02em',
        }}>
          Claude Code
        </span>
      </div>
    </div>
  );
}
