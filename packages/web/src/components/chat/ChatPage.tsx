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
    <div className="flex" style={{ height: '100vh', paddingTop: '56px' }}>
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
                <ChatMessages messages={messages} onEditMessage={(id, content) => editMessage(id, content)} onSend={(content) => sendMessage(content)} />
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-full max-w-3xl">
                <ChatInput onSend={(content) => sendMessage(content)} disabled={isStreaming} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              {/* Terminal icon in rounded square */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, margin: '0 auto 16px',
                background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))',
                border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </div>
              <h3 style={{
                fontSize: 16, fontWeight: 600, marginBottom: 8, color: 'var(--text)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {locale === 'zh' ? '\u5173\u4e8e Claude Code' : locale === 'ja' ? 'Claude Code \u306b\u3064\u3044\u3066' : 'About Claude Code'}
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
                {locale === 'zh' ? '\u9009\u62e9\u5de6\u4fa7\u5bf9\u8bdd\u6216\u5f00\u59cb\u65b0\u7684\u8ba8\u8bba' : t(locale, 'chat.selectOrNew')}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[t(locale, 'chat.quickQ1'), t(locale, 'chat.quickQ2'), t(locale, 'chat.quickQ3')].map((q) => (
                  <button key={q}
                    onClick={async () => {
                      const id = await createConversation();
                      sendMessage(q);
                    }}
                    className="text-sm px-3 py-1.5 transition-colors"
                    style={{ borderRadius: 100, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.2)' }}
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
