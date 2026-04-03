'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { LoginButton } from '@/components/auth/LoginButton';
import { MessageSquare } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

export function ChatPage() {
  const { user } = useAuthContext();
  const locale = useLocale();
  const {
    conversations, activeConversationId, messages, isStreaming,
    loadConversations, selectConversation, createConversation,
    sendMessage, editMessage, deleteConversation, renameConversation,
  } = useChat();
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;
    loadConversations();
  }, [user, loadConversations]);

  if (!user) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 56px)', paddingTop: '56px' }}>
        <div className="text-center">
          <MessageSquare size={48} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h2 className="text-xl font-medium mb-2" style={{ color: 'var(--text)' }}>{t(locale, 'chat.title')}</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>{t(locale, 'chat.signInAccess')}</p>
          <LoginButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex" style={{ height: 'calc(100vh - 56px)', paddingTop: '56px' }}>
      <ChatSidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={selectConversation}
        onNew={() => createConversation()}
        onRename={renameConversation}
        onDelete={deleteConversation}
      />

      <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg)' }}>
        {activeConversationId ? (
          <>
            <div className="flex-1 flex justify-center overflow-y-auto">
              <div className="w-full max-w-3xl">
                <ChatMessages messages={messages} onEditMessage={(id, content) => editMessage(id, content)} />
              </div>
            </div>
            <div className="flex justify-center" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="w-full max-w-3xl">
                <ChatInput onSend={(content) => sendMessage(content)} disabled={isStreaming} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <MessageSquare size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
              <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>
                {t(locale, 'chat.askAbout')}
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
                {t(locale, 'chat.selectOrNew')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[t(locale, 'chat.quickQ1'), t(locale, 'chat.quickQ2'), t(locale, 'chat.quickQ3')].map((q) => (
                  <button key={q}
                    onClick={async () => {
                      const id = await createConversation();
                      sendMessage(q);
                    }}
                    className="text-sm px-3 py-1.5 rounded-full transition-colors"
                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.2)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
