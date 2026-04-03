# AI Assistant UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the AI assistant to add logout, simplify popup to single-session, create a full chat page, enable streaming markdown, unify to amber design language, and fix text selection context menu.

**Architecture:** Incremental modification of existing chat components. Hooks and API client are mostly reused. New components for user menu and full chat page. Backend gets one new endpoint for message truncation (edit flow).

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, NestJS 11, TypeORM, react-markdown, lucide-react

---

## File Structure

### New Files
- `packages/web/src/components/UserMenu.tsx` — nav bar avatar dropdown (logout, chat history link)
- `packages/web/src/app/[locale]/chat/page.tsx` — standalone chat page (server component)
- `packages/web/src/components/chat/ChatPage.tsx` — full chat page client component (sidebar + chat area)
- `packages/web/src/components/chat/ChatSidebar.tsx` — conversation list for full page with rename/delete

### Modified Files
- `packages/web/src/components/Nav.tsx` — add UserMenu to nav bar
- `packages/web/src/components/chat/ChatWidget.tsx` — style update (amber), keep floating button
- `packages/web/src/components/chat/ChatPanel.tsx` — remove ConversationList, single-session logic, style update
- `packages/web/src/components/chat/ChatMessage.tsx` — streaming raw text mode, amber colors
- `packages/web/src/components/chat/MessageRenderer.tsx` — amber link/code colors
- `packages/web/src/components/chat/ChatInput.tsx` — amber focus/button colors
- `packages/web/src/components/chat/ChatMessages.tsx` — pass message id, support edit callback
- `packages/web/src/components/chat/ContextMenu.tsx` — amber colors
- `packages/web/src/components/chat/ToolCallIndicator.tsx` — amber spinner
- `packages/web/src/components/chat/ConversationList.tsx` — no changes (kept for reference, unused in popup)
- `packages/web/src/hooks/useChat.ts` — add `findOrCreateSession`, `editMessage`, `deleteMessagesAfter`
- `packages/web/src/lib/api-client.ts` — add `deleteMessagesAfter`, `updateMessage` methods
- `packages/web/src/app/[locale]/articles/[slug]/ArticleShell.tsx` — integrate useTextSelection + ContextMenu
- `packages/web/src/app/globals.css` — add cursor blink animation
- `packages/api/src/chat/chat.controller.ts` — add `DELETE :id/messages` and `PATCH :id/messages/:msgId` endpoints
- `packages/api/src/chat/chat.service.ts` — add `deleteMessagesAfter`, `updateMessage` methods

---

### Task 1: Backend — Message Edit & Truncation Endpoints

**Files:**
- Modify: `packages/api/src/chat/chat.service.ts:39-52`
- Modify: `packages/api/src/chat/chat.controller.ts:61-67`

- [ ] **Step 1: Add `deleteMessagesAfter` to ChatService**

Add after the existing `getMessages` method in `packages/api/src/chat/chat.service.ts`:

```typescript
async updateMessage(conversationId: string, messageId: string, content: string): Promise<Message | null> {
  const msg = await this.msgRepo.findOne({ where: { id: messageId, conversationId } });
  if (!msg) return null;
  msg.content = content;
  return this.msgRepo.save(msg);
}

async deleteMessagesAfter(conversationId: string, messageId: string): Promise<number> {
  const msg = await this.msgRepo.findOne({ where: { id: messageId, conversationId } });
  if (!msg) return 0;
  const result = await this.msgRepo
    .createQueryBuilder()
    .delete()
    .from(Message)
    .where('conversation_id = :conversationId', { conversationId })
    .andWhere('created_at > :createdAt', { createdAt: msg.createdAt })
    .execute();
  return result.affected || 0;
}
```

- [ ] **Step 2: Add controller endpoints**

Add before the `sendMessage` method in `packages/api/src/chat/chat.controller.ts` (after the `getMessages` endpoint at line 67):

```typescript
@Patch(':id/messages/:msgId')
async updateMessage(
  @Req() req: Request, @Param('id') id: string, @Param('msgId') msgId: string,
  @Body() body: { content: string },
) {
  const user = req.user as { id: string };
  const conv = await this.chatService.getConversation(id, user.id);
  if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
  const msg = await this.chatService.updateMessage(id, msgId, body.content);
  if (!msg) throw new HttpException('Message not found', HttpStatus.NOT_FOUND);
  return msg;
}

@Delete(':id/messages/:msgId/after')
async deleteMessagesAfter(
  @Req() req: Request, @Param('id') id: string, @Param('msgId') msgId: string,
) {
  const user = req.user as { id: string };
  const conv = await this.chatService.getConversation(id, user.id);
  if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);
  const count = await this.chatService.deleteMessagesAfter(id, msgId);
  return { deleted: count };
}
```

- [ ] **Step 3: Verify backend compiles**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/chat/chat.service.ts packages/api/src/chat/chat.controller.ts
git commit -m "feat(api): add message edit and truncation endpoints"
```

---

### Task 2: Frontend API Client — New Methods

**Files:**
- Modify: `packages/web/src/lib/api-client.ts`

- [ ] **Step 1: Add new API methods**

Add before the closing `};` of the `api` object in `packages/web/src/lib/api-client.ts` (after the `sendMessage` method ending at line 47):

```typescript
updateMessage: (conversationId: string, messageId: string, content: string) =>
  apiFetch<any>(`/conversations/${conversationId}/messages/${messageId}`, {
    method: 'PATCH', body: JSON.stringify({ content }),
  }),

deleteMessagesAfter: (conversationId: string, messageId: string) =>
  apiFetch<{ deleted: number }>(`/conversations/${conversationId}/messages/${messageId}/after`, {
    method: 'DELETE',
  }),
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/api-client.ts
git commit -m "feat(web): add message edit and truncation API methods"
```

---

### Task 3: CSS — Cursor Blink Animation

**Files:**
- Modify: `packages/web/src/app/globals.css`

- [ ] **Step 1: Add cursor blink keyframe**

Add at the end of `packages/web/src/app/globals.css`:

```css
/* ===== STREAMING CURSOR ===== */
@keyframes cursor-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.streaming-cursor::after {
  content: '▊';
  color: var(--accent);
  animation: cursor-blink 0.6s step-end infinite;
  margin-left: 1px;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/app/globals.css
git commit -m "feat(web): add streaming cursor blink animation"
```

---

### Task 4: UI Color Unification — Chat Components

This task updates all chat components from violet to amber/site design tokens.

**Files:**
- Modify: `packages/web/src/components/chat/ChatWidget.tsx`
- Modify: `packages/web/src/components/chat/ChatInput.tsx`
- Modify: `packages/web/src/components/chat/ChatMessage.tsx`
- Modify: `packages/web/src/components/chat/MessageRenderer.tsx`
- Modify: `packages/web/src/components/chat/ToolCallIndicator.tsx`
- Modify: `packages/web/src/components/chat/ContextMenu.tsx`

- [ ] **Step 1: Update ChatWidget.tsx**

Replace the entire file `packages/web/src/components/chat/ChatWidget.tsx`:

```tsx
'use client';

import { useState, useCallback } from 'react';
import { ChatPanel } from './ChatPanel';

interface Props { articleSlug?: string; articleContent?: string; }

export interface ChatWidgetHandle {
  open: (message?: string, context?: { selectedText?: string; articleSlug?: string; articleContent?: string }) => void;
}

let widgetHandle: ChatWidgetHandle | null = null;
export function getChatWidgetHandle() { return widgetHandle; }

export function ChatWidget({ articleSlug, articleContent }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<{ content: string; context?: any } | null>(null);

  const open = useCallback((message?: string, context?: any) => {
    setIsOpen(true);
    if (message) setPendingMessage({ content: message, context });
  }, []);

  widgetHandle = { open };

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center text-white text-xl hover:scale-105 transition-transform"
          style={{ background: 'linear-gradient(135deg, var(--accent), #d97706)', boxShadow: '0 4px 24px var(--accent-glow)' }}
          aria-label="Open AI chat">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[480px] h-[600px]">
          <ChatPanel
            onClose={() => { setIsOpen(false); setPendingMessage(null); }}
            articleSlug={articleSlug} articleContent={articleContent}
            pendingMessage={pendingMessage}
            onPendingConsumed={() => setPendingMessage(null)}
          />
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Update ChatInput.tsx**

Replace the entire file `packages/web/src/components/chat/ChatInput.tsx`:

```tsx
'use client';

import { useState, useRef, KeyboardEvent } from 'react';

interface Props {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex items-end gap-2 p-3" style={{ borderTop: '1px solid var(--border)' }}>
      <textarea
        ref={textareaRef} value={input}
        onChange={(e) => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
        onKeyDown={handleKeyDown} placeholder="Ask about Claude Code..." disabled={disabled} rows={1}
        className="flex-1 resize-none rounded-lg px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none disabled:opacity-50"
        style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', caretColor: 'var(--accent)' }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
      />
      <button onClick={handleSend} disabled={disabled || !input.trim()}
        className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        style={{ background: 'var(--accent)' }}
        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}>
        Send
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Update ChatMessage.tsx — streaming + amber**

Replace the entire file `packages/web/src/components/chat/ChatMessage.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { MessageRenderer } from './MessageRenderer';
import { Pencil } from 'lucide-react';

interface Props {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  isStreaming?: boolean;
  onEdit?: (id: string, newContent: string) => void;
}

export function ChatMessage({ id, role, content, isStreaming, onEdit }: Props) {
  const isUser = role === 'user';
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(content);

  const handleConfirmEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== content && onEdit) {
      onEdit(id, trimmed);
    }
    setEditing(false);
  };

  return (
    <div className={`group flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser ? 'rounded-br-md' : 'rounded-bl-md'
      }`} style={{
        background: isUser ? 'var(--accent-dim)' : 'var(--bg-elevated)',
        color: isUser ? 'var(--text-bright)' : 'var(--text)',
        border: isUser ? '1px solid rgba(245,158,11,0.2)' : '1px solid var(--border)',
      }}>
        {editing ? (
          <div>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full resize-none rounded p-2 text-sm focus:outline-none"
              style={{ background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleConfirmEdit(); }
                if (e.key === 'Escape') { setEditing(false); setEditValue(content); }
              }}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => { setEditing(false); setEditValue(content); }}
                className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-dim)' }}>Cancel</button>
              <button onClick={handleConfirmEdit}
                className="text-xs px-2 py-1 rounded text-white" style={{ background: 'var(--accent)' }}>Save & Resend</button>
            </div>
          </div>
        ) : (
          <>
            {isUser ? (
              <div className="whitespace-pre-wrap">{content}</div>
            ) : isStreaming ? (
              <div className="whitespace-pre-wrap streaming-cursor">{content}</div>
            ) : (
              <MessageRenderer content={content} />
            )}
            {isStreaming && !content && (
              <span className="streaming-cursor" />
            )}
          </>
        )}
        {isUser && !editing && onEdit && (
          <button
            onClick={() => setEditing(true)}
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded"
            style={{ color: 'var(--text-muted)' }}
          >
            <Pencil size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update MessageRenderer.tsx — amber colors**

In `packages/web/src/components/chat/MessageRenderer.tsx`, replace the inline code and link color classes:

Replace `className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-violet-300"` with:
```
className="rounded px-1.5 py-0.5 text-xs" style={{ background: 'var(--bg-code)', color: 'var(--accent)' }}
```

Replace `className="text-violet-400 hover:text-violet-300 underline underline-offset-2"` with:
```
className="underline underline-offset-2" style={{ color: 'var(--accent)' }}
```

- [ ] **Step 5: Update ToolCallIndicator.tsx — amber spinner**

In `packages/web/src/components/chat/ToolCallIndicator.tsx`, replace line 12:

From:
```tsx
<span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-neutral-600 border-t-violet-400" />
```

To:
```tsx
<span className="inline-block h-3 w-3 animate-spin rounded-full border-2" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
```

Also update the container text color from `text-neutral-400` to use the design token:
```tsx
<div className="flex items-center gap-2 text-xs py-1" style={{ color: 'var(--text-dim)' }}>
```

- [ ] **Step 6: Update ContextMenu.tsx — amber colors**

Replace the entire file `packages/web/src/components/chat/ContextMenu.tsx`:

```tsx
'use client';

import { useState } from 'react';

interface Props {
  x: number;
  y: number;
  selectedText: string;
  onAction: (action: string, customPrompt?: string) => void;
  onClose: () => void;
}

export function ContextMenu({ x, y, selectedText, onAction, onClose }: Props) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const actions = [
    { id: 'explain', icon: '🔍', label: 'Explain this' },
    { id: 'find_code', icon: '📄', label: 'Find related source code' },
    { id: 'find_articles', icon: '📚', label: 'Find related articles' },
  ];

  return (
    <div
      className="fixed z-[60] min-w-[220px] rounded-lg shadow-xl py-1 animate-in fade-in duration-150"
      style={{
        left: x, top: y, transform: 'translate(-50%, -100%)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
      }}
      onMouseDown={(e) => e.stopPropagation()}>
      {actions.map((action) => (
        <button key={action.id} onClick={() => { onAction(action.id); onClose(); }}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors"
          style={{ color: 'var(--text)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span>{action.icon}</span><span>{action.label}</span>
        </button>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', marginTop: '4px', paddingTop: '4px' }}>
        {!showCustomInput ? (
          <button onClick={() => setShowCustomInput(true)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <span className="flex items-center gap-2"><span>✏️</span><span>Custom question...</span></span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⌘K</span>
          </button>
        ) : (
          <div className="px-3 py-2">
            <input autoFocus value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && customPrompt.trim()) { onAction('custom', customPrompt.trim()); onClose(); }
                if (e.key === 'Escape') onClose();
              }}
              placeholder="Type your question..."
              className="w-full rounded px-3 py-1.5 text-sm focus:outline-none"
              style={{
                background: 'var(--bg)', border: '1px solid var(--border)',
                color: 'var(--text)', caretColor: 'var(--accent)',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/chat/ChatWidget.tsx packages/web/src/components/chat/ChatInput.tsx packages/web/src/components/chat/ChatMessage.tsx packages/web/src/components/chat/MessageRenderer.tsx packages/web/src/components/chat/ToolCallIndicator.tsx packages/web/src/components/chat/ContextMenu.tsx
git commit -m "feat(web): unify chat UI to amber design language with streaming support"
```

---

### Task 5: useChat Hook — Single Session & Edit Support

**Files:**
- Modify: `packages/web/src/hooks/useChat.ts`

- [ ] **Step 1: Update useChat with new capabilities**

Replace the entire file `packages/web/src/hooks/useChat.ts`:

```typescript
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

  // Find the most recent conversation for this context, or create a new one
  const findOrCreateSession = useCallback(async (articleSlug?: string) => {
    const convs = await api.listConversations();
    setConversations(convs);

    // Find matching conversation
    const match = articleSlug
      ? convs.find((c: Conversation) => c.articleSlug === articleSlug)
      : convs.find((c: Conversation) => !c.articleSlug);

    if (match) {
      setActiveConversationId(match.id);
      const msgs = await api.getMessages(match.id);
      setMessages(msgs);
      return match.id;
    }

    // Create new
    return createConversation(articleSlug);
  }, [createConversation]);

  const sendMessage = useCallback(async (
    content: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string },
  ) => {
    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation(context?.articleSlug);
    }

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

  // Edit a user message: update content, delete all messages after it, re-send
  const editMessage = useCallback(async (
    messageId: string,
    newContent: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string },
  ) => {
    if (!activeConversationId) return;

    // Update message on backend
    await api.updateMessage(activeConversationId, messageId, newContent);
    // Delete all messages after this one
    await api.deleteMessagesAfter(activeConversationId, messageId);

    // Reload messages to get clean state
    const msgs = await api.getMessages(activeConversationId);
    setMessages(msgs);

    // Re-send with the new content to get a fresh response
    await sendMessage(newContent, context);
  }, [activeConversationId, sendMessage]);

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
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/hooks/useChat.ts
git commit -m "feat(web): add session auto-find, message edit, and conversation management to useChat"
```

---

### Task 6: ChatPanel — Single Session Mode

**Files:**
- Modify: `packages/web/src/components/chat/ChatPanel.tsx`
- Modify: `packages/web/src/components/chat/ChatMessages.tsx`

- [ ] **Step 1: Rewrite ChatPanel for single-session mode**

Replace the entire file `packages/web/src/components/chat/ChatPanel.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { LoginButton } from '@/components/auth/LoginButton';
import { Plus, X } from 'lucide-react';

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
          <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>AI Assistant</span>
          <button onClick={onClose} className="text-lg transition-colors" style={{ color: 'var(--text-muted)' }}>&times;</button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>Sign in to start chatting</p>
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
          <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>AI Assistant</span>
          {articleSlug && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>|</span>
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>Reading: {articleSlug}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => createConversation(articleSlug)}
            className="p-1.5 rounded-md transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            title="New conversation">
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
```

- [ ] **Step 2: Update ChatMessages to pass id and edit callback**

Replace the entire file `packages/web/src/components/chat/ChatMessages.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import type { ChatMessage } from '@/hooks/useChat';

interface Props {
  messages: ChatMessage[];
  onEditMessage?: (id: string, newContent: string) => void;
}

export function ChatMessages({ messages, onEditMessage }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm" style={{ color: 'var(--text-dim)' }}>
        Ask me anything about Claude Code's source code and architecture.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.map((msg) => (
        <ChatMessageComponent
          key={msg.id} id={msg.id} role={msg.role} content={msg.content}
          isStreaming={msg.isStreaming}
          onEdit={msg.role === 'user' ? onEditMessage : undefined}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/chat/ChatPanel.tsx packages/web/src/components/chat/ChatMessages.tsx
git commit -m "feat(web): simplify ChatPanel to single-session mode"
```

---

### Task 7: UserMenu — Nav Bar Logout

**Files:**
- Create: `packages/web/src/components/UserMenu.tsx`
- Modify: `packages/web/src/components/Nav.tsx`

- [ ] **Step 1: Create UserMenu component**

Create file `packages/web/src/components/UserMenu.tsx`:

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { LogOut, MessageSquare, ChevronDown } from 'lucide-react';
import Link from 'next/link';

interface Props { locale: string; }

export function UserMenu({ locale }: Props) {
  const { user, logout } = useAuthContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  if (!user) {
    return (
      <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/auth/github`}
        className="nav-btn" style={{ fontSize: '13px' }}>
        Sign in
      </a>
    );
  }

  const handleLogout = () => {
    logout();
    setOpen(false);
    window.location.href = `/${locale}`;
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors"
        style={{ color: 'var(--text-dim)' }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-card-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="h-7 w-7 rounded-full" style={{ border: '1px solid var(--border)' }} />
        ) : (
          <div className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium"
            style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
            {user.name?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg shadow-xl py-1 z-50"
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            backdropFilter: 'blur(20px)',
          }}>
          <div className="px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user.name}</div>
          </div>

          <Link href={`/${locale}/chat`} onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <MessageSquare size={14} />
            对话历史
          </Link>

          <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />

          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--red)' }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <LogOut size={14} />
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add UserMenu to Nav**

In `packages/web/src/components/Nav.tsx`, add the import at the top (after line 8):

```tsx
import { UserMenu } from './UserMenu';
```

Then replace the closing `<div>` group in the nav (lines 46-53) — the one containing `nav-search` and `LocaleSwitcher`:

From:
```tsx
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="nav-search">
          <Search className="h-3 w-3" />
          <span>{t(locale, 'nav.search')}</span>
          <kbd>⌘K</kbd>
        </div>
        <LocaleSwitcher />
      </div>
```

To:
```tsx
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="nav-search">
          <Search className="h-3 w-3" />
          <span>{t(locale, 'nav.search')}</span>
          <kbd>⌘K</kbd>
        </div>
        <LocaleSwitcher />
        <UserMenu locale={locale} />
      </div>
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/UserMenu.tsx packages/web/src/components/Nav.tsx
git commit -m "feat(web): add user menu with logout to nav bar"
```

---

### Task 8: Standalone Chat Page

**Files:**
- Create: `packages/web/src/app/[locale]/chat/page.tsx`
- Create: `packages/web/src/components/chat/ChatPage.tsx`
- Create: `packages/web/src/components/chat/ChatSidebar.tsx`

- [ ] **Step 1: Create ChatSidebar component**

Create file `packages/web/src/components/chat/ChatSidebar.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Conversation } from '@/hooks/useChat';

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function ChatSidebar({ conversations, activeId, onSelect, onNew, onRename, onDelete }: Props) {
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
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col h-full" style={{ width: '280px', borderRight: '1px solid var(--border)', background: 'var(--bg-card)' }}>
      <div className="p-3">
        <button onClick={onNew}
          className="w-full flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(245,158,11,0.2)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-dim)'}>
          <Plus size={16} />
          新建对话
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
                  <span className="text-xs" style={{ color: 'var(--red)' }}>Delete?</span>
                  <div className="flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onDelete(conv.id); setDeletingId(null); }}
                      className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: 'var(--red)' }}>Yes</button>
                    <button onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                      className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--text-muted)' }}>No</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: conv.id === activeId ? 'var(--text-bright)' : 'var(--text)' }}>
                      {conv.title || '未命名对话'}
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
    </div>
  );
}
```

- [ ] **Step 2: Create ChatPage client component**

Create file `packages/web/src/components/chat/ChatPage.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { useChat } from '@/hooks/useChat';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { ChatSidebar } from './ChatSidebar';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { LoginButton } from '@/components/auth/LoginButton';
import { MessageSquare } from 'lucide-react';

export function ChatPage() {
  const { user } = useAuthContext();
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
          <h2 className="text-xl font-medium mb-2" style={{ color: 'var(--text)' }}>AI Assistant</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>Sign in to access your conversations</p>
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
                Ask about Claude Code
              </h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-dim)' }}>
                Select a conversation from the sidebar or start a new one.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['How does the agent loop work?', 'Explain the permission system', 'What tools are available?'].map((q) => (
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
```

- [ ] **Step 3: Create chat page server component**

Create file `packages/web/src/app/[locale]/chat/page.tsx`:

```tsx
import { ChatPage } from '@/components/chat/ChatPage';

export default function ChatRoute() {
  return <ChatPage />;
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/chat/ChatSidebar.tsx packages/web/src/components/chat/ChatPage.tsx packages/web/src/app/[locale]/chat/page.tsx
git commit -m "feat(web): add standalone ChatGPT-style chat page"
```

---

### Task 9: Article Page — Text Selection Context Menu

**Files:**
- Modify: `packages/web/src/app/[locale]/articles/[slug]/ArticleShell.tsx`
- Modify: `packages/web/src/app/[locale]/articles/[slug]/page.tsx`

- [ ] **Step 1: Integrate text selection and context menu in ArticleShell**

In `packages/web/src/app/[locale]/articles/[slug]/ArticleShell.tsx`, add imports after line 4:

```tsx
import { useTextSelection } from '@/hooks/useTextSelection';
import { ContextMenu } from '@/components/chat/ContextMenu';
import { getChatWidgetHandle } from '@/components/chat/ChatWidget';
```

Add this after the `isClickScrolling` and `headingsRef` refs (after line 76):

```tsx
const { selection, clearSelection } = useTextSelection(contentRef);

const handleContextAction = useCallback((action: string, customPrompt?: string) => {
  if (!selection) return;
  const widget = getChatWidgetHandle();
  if (!widget) return;

  let message = '';
  switch (action) {
    case 'explain':
      message = `Please explain the following text:\n\n"${selection.text}"`;
      break;
    case 'find_code':
      message = `Find source code related to:\n\n"${selection.text}"`;
      break;
    case 'find_articles':
      message = `Find articles related to:\n\n"${selection.text}"`;
      break;
    case 'custom':
      message = `About the following text: "${selection.text}"\n\n${customPrompt}`;
      break;
    default:
      message = `${selection.text}`;
  }

  widget.open(message, { selectedText: selection.text });
  clearSelection();
}, [selection, clearSelection]);
```

Then, inside the return JSX, add the ContextMenu right before the closing `</div>` of `article-page` (before the last `</div>` at line 271):

```tsx
{selection && (
  <ContextMenu
    x={selection.x}
    y={selection.y}
    selectedText={selection.text}
    onAction={handleContextAction}
    onClose={clearSelection}
  />
)}
```

- [ ] **Step 2: Pass articleSlug and articleContent to ChatWidget**

In `packages/web/src/app/[locale]/articles/[slug]/page.tsx`, the `ChatWidget` is rendered in the layout, not in the article page itself. The layout at `packages/web/src/app/[locale]/layout.tsx` renders `<ChatWidget />` without props. The article page cannot directly pass props to it.

Since `ChatWidget` uses a global handle (`getChatWidgetHandle`), the context menu integration from Step 1 communicates via the handle's `open()` method. No changes needed to `page.tsx` or `layout.tsx` for this — the handle pattern already bridges the gap.

However, for the ChatWidget to know the current article context, we should pass `articleSlug` via the widget open call. The `ChatPanel` already accepts `articleSlug` as a prop. Since the widget is in the layout and doesn't know the current article, the context menu passes it through the `open()` method's context parameter, and the `ChatPanel` `pendingMessage.context` will carry `selectedText`.

No changes needed to `page.tsx`.

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/[locale]/articles/[slug]/ArticleShell.tsx
git commit -m "feat(web): integrate text selection context menu on article pages"
```

---

### Task 10: Final Verification

- [ ] **Step 1: Verify frontend compiles**

Run: `cd packages/web && npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Verify backend compiles**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Manual smoke test checklist**

1. Open the site → nav bar should show "Sign in" when logged out
2. Log in via GitHub → nav bar should show avatar with dropdown
3. Click avatar → dropdown with "对话历史", "退出登录" visible
4. Click "退出登录" → logged out, redirected to home
5. Log in again → click floating chat button → popup opens without sidebar
6. Send a message → response streams character by character with blinking amber cursor
7. After streaming completes → markdown renders with code highlighting
8. Click "+" in popup header → new conversation starts
9. Navigate to `/chat` → full page with sidebar and chat area
10. Create new conversation, rename it, delete another
11. Edit a sent message → subsequent messages deleted, new response generated
12. Go to an article page → select text → context menu appears
13. Click "Explain this" → chat popup opens with the selected text as message
14. All colors are amber/orange throughout — no violet remnants

- [ ] **Step 4: Commit any fixes from smoke testing**

```bash
git add -A
git commit -m "fix(web): address issues found during smoke testing"
```
