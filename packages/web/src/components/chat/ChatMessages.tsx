'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import type { ChatMessage } from '@/hooks/useChat';

interface Props { messages: ChatMessage[]; }

export function ChatMessages({ messages }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
        Ask me anything about Claude Code&apos;s source code and architecture.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg) => (
        <ChatMessageComponent key={msg.id} role={msg.role} content={msg.content} isStreaming={msg.isStreaming} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
