'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { LoginButton } from '@/components/auth/LoginButton';
import { Plus, X, Maximize2, Minimize2 } from 'lucide-react';
import { useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { t, formatTemplate } from '@/lib/ui-translations';

interface Props {
  onClose: () => void;
  articleSlug?: string;
  articleContent?: string;
  pendingMessage?: { content: string; context?: any } | null;
  onPendingConsumed?: () => void;
}

export function ChatPanel({ onClose, articleSlug, articleContent, pendingMessage, onPendingConsumed }: Props) {
  const { user } = useAuthContext();
  const {
    activeConversationId, messages, isStreaming,
    findOrCreateSession, createConversation, sendMessage, editMessage,
  } = useChat();
  const locale = useLocale();
  const initialized = useRef(false);
  const [expanded, setExpanded] = useState(false);

  // Auto-find or create session on mount
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    findOrCreateSession(articleSlug);
  }, [user, articleSlug, findOrCreateSession]);

  // Handle pending messages from context menu
  useEffect(() => {
    if (pendingMessage && activeConversationId && !isStreaming) {
      sendMessage(pendingMessage.content, { articleSlug, articleContent, ...pendingMessage.context });
      onPendingConsumed?.();
    }
  }, [pendingMessage, activeConversationId, isStreaming, sendMessage, articleSlug, articleContent, onPendingConsumed]);

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    height: 48,
    background: 'rgba(9,9,11,0.95)',
    backdropFilter: 'blur(16px)',
    borderBottom: '1px solid #1a1a22',
  };

  const headerBtnStyle: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 7,
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s',
  };

  if (!user) {
    return (
      <div className="flex flex-col h-full overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
              boxShadow: '0 0 8px rgba(245,158,11,0.3)', animation: 'pulse 2s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: 13, fontWeight: 600, color: 'var(--text)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>AI {locale === 'zh' ? '\u52a9\u624b' : locale === 'ja' ? '\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8' : 'Assistant'}</span>
          </div>
          <button onClick={onClose} style={headerBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>{t(locale, 'chat.signIn')}</p>
            <LoginButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)',
            boxShadow: '0 0 8px rgba(245,158,11,0.3)', animation: 'pulse 2s ease-in-out infinite',
          }} />
          <span style={{
            fontSize: 13, fontWeight: 600, color: 'var(--text)',
            fontFamily: "'JetBrains Mono', monospace",
          }}>AI {locale === 'zh' ? '\u52a9\u624b' : locale === 'ja' ? '\u30a2\u30b7\u30b9\u30bf\u30f3\u30c8' : 'Assistant'}</span>
          {articleSlug && (
            <>
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>|</span>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: "'JetBrains Mono', monospace" }}>
                {formatTemplate(t(locale, 'chat.reading'), { slug: articleSlug })}
              </span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => createConversation(articleSlug)}
            style={headerBtnStyle} title={t(locale, 'chat.newConversation')}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
            <Plus size={14} />
          </button>
          <button onClick={() => setExpanded(!expanded)}
            style={headerBtnStyle} title={expanded ? 'Collapse' : 'Expand'}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
            {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose}
            style={headerBtnStyle}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)'; }}>
            <X size={14} />
          </button>
        </div>
      </div>
      <ChatMessages messages={messages} onEditMessage={(id, content) => editMessage(id, content, { articleSlug, articleContent })} onSend={(content) => sendMessage(content, { articleSlug, articleContent })} />
      <ChatInput onSend={(content) => sendMessage(content, { articleSlug, articleContent })} disabled={isStreaming} />
    </div>
  );
}
