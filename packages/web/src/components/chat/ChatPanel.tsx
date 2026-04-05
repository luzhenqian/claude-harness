'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { LoginButton } from '@/components/auth/LoginButton';
import { Plus, X, Maximize2, Minimize2 } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t, formatTemplate } from '@/lib/ui-translations';

interface Props {
  onClose: () => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
  articleSlug?: string;
  articleContent?: string;
  pendingMessage?: { content: string; context?: any } | null;
  onPendingConsumed?: () => void;
}

export function ChatPanel({ onClose, expanded = false, onToggleExpand, articleSlug, articleContent, pendingMessage, onPendingConsumed }: Props) {
  const { user } = useAuthContext();
  const {
    activeConversationId, messages, isStreaming,
    findOrCreateSession, createConversation, sendMessage, editMessage,
    error, clearError,
  } = useChat();
  const locale = useLocale();
  const initialized = useRef(false);
  const pendingHandled = useRef(false);

  // Auto-find or create session on mount (skip if we have a pending new conversation)
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    // If there's a pending message requesting new conversation, skip loading old session
    if (pendingMessage?.context?.newConversation) return;
    findOrCreateSession(articleSlug);
  }, [user, articleSlug, findOrCreateSession, pendingMessage]);

  // Handle pending messages from context menu
  useEffect(() => {
    if (!pendingMessage || pendingHandled.current || isStreaming) return;
    // Mark as handled immediately to prevent double execution
    pendingHandled.current = true;

    const send = async () => {
      if (pendingMessage.context?.newConversation) {
        await createConversation(articleSlug);
      }
      sendMessage(pendingMessage.content, { articleSlug, articleContent, selectedText: pendingMessage.context?.selectedText });
      onPendingConsumed?.();
    };

    send();
  }, [pendingMessage, isStreaming]); // minimal deps — ref guards against re-runs

  // Reset guard when pendingMessage is consumed
  useEffect(() => {
    if (!pendingMessage) pendingHandled.current = false;
  }, [pendingMessage]);

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
          <button onClick={onToggleExpand}
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
      {error && (
        <div className="mx-3 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={clearError} className="ml-3 text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}
      <ChatInput onSend={(content) => sendMessage(content, { articleSlug, articleContent })} disabled={isStreaming} />
    </div>
  );
}
