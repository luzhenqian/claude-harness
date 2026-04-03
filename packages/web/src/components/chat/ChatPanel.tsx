'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { LoginButton } from '@/components/auth/LoginButton';
import { Plus, X } from 'lucide-react';
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

  if (!user) {
    return (
      <div className="flex flex-col h-full rounded-xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{t(locale, 'chat.title')}</span>
          <button onClick={onClose} className="text-lg transition-colors" style={{ color: 'var(--text-muted)' }}>&times;</button>
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
    <div className="flex flex-col h-full rounded-xl shadow-2xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{t(locale, 'chat.title')}</span>
          {articleSlug && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>{formatTemplate(t(locale, 'chat.reading'), { slug: articleSlug })}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => createConversation(articleSlug)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title={t(locale, 'chat.newConversation')}>
            <Plus size={16} />
          </button>
          <button onClick={onClose}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <X size={16} />
          </button>
        </div>
      </div>
      <ChatMessages messages={messages} onEditMessage={(id, content) => editMessage(id, content, { articleSlug, articleContent })} />
      <ChatInput onSend={(content) => sendMessage(content, { articleSlug, articleContent })} disabled={isStreaming} />
    </div>
  );
}
