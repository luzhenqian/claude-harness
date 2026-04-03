'use client';

import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api-client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: any[];
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string | null;
  articleSlug: string | null;
  updatedAt: string;
}

export function useChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadConversations = useCallback(async () => {
    const convs = await api.listConversations();
    setConversations(convs);
  }, []);

  const selectConversation = useCallback(async (id: string) => {
    setActiveConversationId(id);
    const msgs = await api.getMessages(id);
    setMessages(msgs);
  }, []);

  const createConversation = useCallback(async (articleSlug?: string) => {
    const conv = await api.createConversation(articleSlug);
    setActiveConversationId(conv.id);
    setMessages([]);
    await loadConversations();
    return conv.id;
  }, [loadConversations]);

  const sendMessage = useCallback(async (
    content: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string },
  ) => {
    const convId = activeConversationId ?? await createConversation(context?.articleSlug);

    const userMsg: ChatMessage = { id: `temp-${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);

    const assistantMsg: ChatMessage = { id: `stream-${Date.now()}`, role: 'assistant', content: '', isStreaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const response = await api.sendMessage(convId, content, context);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const chunk = JSON.parse(data);
            if (chunk.type === 'text_delta') {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.isStreaming) {
                  updated[updated.length - 1] = { ...last, content: last.content + chunk.delta };
                }
                return updated;
              });
            }
          } catch {}
        }
      }
    } finally {
      setIsStreaming(false);
      setMessages((prev) => prev.map((m) => ({ ...m, isStreaming: false })));
      loadConversations();
    }
  }, [activeConversationId, createConversation, loadConversations]);

  const stopStreaming = useCallback(() => { abortRef.current?.abort(); }, []);

  return {
    conversations, activeConversationId, messages, isStreaming,
    loadConversations, selectConversation, createConversation, sendMessage, stopStreaming,
  };
}
