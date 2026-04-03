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

  const findOrCreateSession = useCallback(async (articleSlug?: string) => {
    const convs = await api.listConversations();
    setConversations(convs);

    const match = articleSlug
      ? convs.find((c: Conversation) => c.articleSlug === articleSlug)
      : convs.find((c: Conversation) => !c.articleSlug);

    if (match) {
      setActiveConversationId(match.id);
      const msgs = await api.getMessages(match.id);
      setMessages(msgs);
      return match.id;
    }

    return createConversation(articleSlug);
  }, [createConversation]);

  // Stream a response from the backend, appending chunks to a streaming assistant message
  const streamResponse = useCallback(async (
    convId: string, content: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string },
    options?: { skipUserMessage?: boolean },
  ) => {
    const assistantMsg: ChatMessage = { id: `stream-${Date.now()}`, role: 'assistant', content: '', isStreaming: true };
    setMessages((prev) => [...prev, assistantMsg]);

    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      const response = await api.sendMessage(convId, content, context, { skipUserMessage: options?.skipUserMessage });
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
      // Reload messages from backend to sync real IDs (replace temp-xxx with UUIDs)
      const realMsgs = await api.getMessages(convId);
      setMessages(realMsgs);
      loadConversations();
    }
  }, [loadConversations]);

  const sendMessage = useCallback(async (
    content: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string },
  ) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation(context?.articleSlug);
    }
    if (!convId) return;

    const userMsg: ChatMessage = { id: `temp-${Date.now()}`, role: 'user', content };
    setMessages((prev) => [...prev, userMsg]);

    await streamResponse(convId, content, context);
  }, [activeConversationId, createConversation, streamResponse]);

  // Edit a user message: update content, delete subsequent messages, regenerate response
  const editMessage = useCallback(async (
    messageId: string,
    newContent: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string },
  ) => {
    if (!activeConversationId) return;

    // Update the message content and delete everything after it
    await api.updateMessage(activeConversationId, messageId, newContent);
    await api.deleteMessagesAfter(activeConversationId, messageId);

    // Reload to get clean state (only the edited user message remains)
    const msgs = await api.getMessages(activeConversationId);
    setMessages(msgs);

    // Stream response — skip creating a new user message since we already have the edited one
    await streamResponse(activeConversationId, newContent, context, { skipUserMessage: true });
  }, [activeConversationId, streamResponse]);

  const stopStreaming = useCallback(() => { abortRef.current?.abort(); }, []);

  const deleteConversation = useCallback(async (id: string) => {
    await api.deleteConversation(id);
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
    await loadConversations();
  }, [activeConversationId, loadConversations]);

  const renameConversation = useCallback(async (id: string, title: string) => {
    await api.updateConversation(id, { title });
    await loadConversations();
  }, [loadConversations]);

  return {
    conversations, activeConversationId, messages, isStreaming,
    loadConversations, selectConversation, createConversation,
    findOrCreateSession, sendMessage, editMessage, stopStreaming,
    deleteConversation, renameConversation,
  };
}
