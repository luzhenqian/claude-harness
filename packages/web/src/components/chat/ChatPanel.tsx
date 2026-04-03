'use client';

import { useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { ConversationList } from './ConversationList';
import { LoginButton } from '@/components/auth/LoginButton';

interface Props { onClose: () => void; articleSlug?: string; articleContent?: string; }

export function ChatPanel({ onClose, articleSlug, articleContent }: Props) {
  const { user } = useAuthContext();
  const {
    conversations, activeConversationId, messages, isStreaming,
    loadConversations, selectConversation, createConversation, sendMessage,
  } = useChat();

  useEffect(() => { if (user) loadConversations(); }, [user, loadConversations]);

  if (!user) {
    return (
      <div className="flex flex-col h-full bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
          <span className="text-sm font-medium text-neutral-100">AI Assistant</span>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 text-lg">&times;</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm text-neutral-400 mb-4">Sign in to start chatting</p>
            <LoginButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-neutral-900 rounded-xl border border-neutral-800 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-violet-400">AI Assistant</span>
          {articleSlug && (<><span className="text-neutral-700">|</span><span className="text-xs text-neutral-500">Reading: {articleSlug}</span></>)}
        </div>
        <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300 text-lg">&times;</button>
      </div>
      <div className="flex flex-1 min-h-0">
        <ConversationList conversations={conversations} activeId={activeConversationId}
          onSelect={selectConversation} onNew={() => createConversation(articleSlug)} />
        <div className="flex flex-col flex-1 min-w-0">
          <ChatMessages messages={messages} />
          <ChatInput onSend={(content) => sendMessage(content, { articleSlug, articleContent })} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}
