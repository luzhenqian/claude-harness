# AI Assistant UI Redesign

Date: 2026-04-03

## Overview

Redesign the AI assistant feature to: add logout functionality, simplify the chat popup to single-session mode, create a full ChatGPT-style conversation history page, implement streaming markdown rendering, unify the UI with the site's amber/orange design language, and fix the broken text selection context menu on article pages.

## 1. Navigation Bar User Menu (Logout)

### Current State
No user info or logout option exposed in the UI. Backend `POST /auth/logout` and frontend `useAuth.logout()` already exist.

### Design
- Nav bar right side: "登录" button when logged out, user avatar (32px circle) when logged in
- Click avatar → dropdown menu:
  - User name + email (display only)
  - "对话历史" link → navigates to `/chat`
  - Divider
  - "退出登录" button → calls `logout()`, redirects to home
- Dropdown style: `var(--bg-card)` background, `var(--border)` border, `backdrop-filter: blur`, consistent with nav bar
- Dismiss: click outside or press Esc

### Components
- New: `UserMenu` component (nav bar avatar + dropdown)
- Modified: nav layout in root layout to include `UserMenu`

## 2. Chat Popup Simplification (Single Session Mode)

### Current State
480×600px popup with ConversationList sidebar (252px), very cramped.

### Design
- Remove ConversationList from popup entirely
- Session logic on open:
  - On article page → find most recent conversation for that article; if none, auto-create
  - Not on article page → continue most recent general conversation; if none, auto-create
- Header:
  - Left: "AI Assistant" title + article context hint (if applicable)
  - Right: "+" button (new conversation) + "×" close button
- Colors: `var(--bg-card)` background, `var(--border)` border, `var(--accent)` for title/buttons
- Size: 480×600px unchanged
- Border radius and shadow consistent with site cards (`rounded-xl`, subtle amber glow)

### Components
- Modified: `ChatPanel.tsx` — remove ConversationList, add session auto-selection logic
- Modified: `ChatWidget.tsx` — style updates

## 3. Standalone Chat Page (`/[locale]/chat`)

### Current State
Does not exist.

### Layout
ChatGPT-style: left sidebar (conversation list) + right chat area.

### Left Panel (280px)
- Top: "+ 新建对话" button (amber accent)
- Conversation list: sorted by `updatedAt` desc, shows title (or "未命名对话") + relative time
- Each item on hover: rename icon (pencil) + delete icon (trash)
- Delete: inline confirmation (no modal)
- Rename: click edit icon → title becomes input, Enter or blur to save
- Active conversation: `var(--accent-dim)` background + `var(--accent)` left border
- Collapsible on mobile (hamburger toggle)

### Right Chat Area
- Reuses `ChatMessages` + `ChatInput` components
- Message editing: user messages show edit icon on hover → click transforms message into editable textarea → confirm re-sends, deletes all subsequent messages and regenerates
- Centered layout, max-width 768px (matches article content width)
- Empty state: welcome message + suggested quick prompts

### Styles
All site CSS variables: `var(--bg)` page background, `var(--bg-card)` panels, `var(--accent)` highlights.

### New Files
- `packages/web/src/app/[locale]/chat/page.tsx` — page component
- `packages/web/src/components/chat/ChatPage.tsx` — main client component
- `packages/web/src/components/chat/ChatSidebar.tsx` — conversation list for full page

### API Changes
- Backend `POST /conversations/:id/messages/:messageId/edit` — edit a message content, delete all messages after it, return updated conversation
- Or handle client-side: delete messages after edited one via existing API, then re-send

## 4. Streaming Markdown Rendering

### Current State
Backend SSE streaming works. Frontend `useChat` accumulates `text_delta` chunks. But `react-markdown` fully re-renders the Markdown tree on every prop change, causing visual "all at once" appearance.

### Design

**During streaming (`isStreaming=true`):**
- Render raw text with `whitespace-pre-wrap`, no react-markdown
- Append blinking cursor `▊` at end of text
- Cursor: `@keyframes blink`, opacity toggles 0↔1, 0.6s period, `var(--accent)` color

**After streaming completes:**
- Switch to `react-markdown` for full Markdown rendering (code highlighting, Mermaid diagrams, link transforms, etc.)

**Rationale:**
- Avoids react-markdown repeatedly rebuilding DOM during streaming (eliminates flicker and perf issues)
- Users see smooth character-by-character text flow with cursor
- Final result still gets full Markdown treatment

### Components
- Modified: `ChatMessage.tsx` — conditional rendering based on `isStreaming`
- Modified: `MessageRenderer.tsx` — no changes needed (only used for final render)
- New: CSS keyframe animation for cursor blink in `globals.css`

## 5. Article Page Text Selection Context Menu

### Current State
`useTextSelection` hook and `ContextMenu` component both exist but are not integrated into `ArticleShell`.

### Design

**Integration:**
- `ArticleShell` imports `useTextSelection`, bound to article content container ref
- When text selected → `ContextMenu` appears centered above selection

**Menu Actions:**
- "解释这段内容" (`explain`)
- "查找相关源码" (`find_code`)
- "查找相关文章" (`find_articles`)
- Custom question input (free text about the selection)

**Interaction Flow:**
1. Select text → menu appears above selection (centered)
2. Click action → opens chat popup (if not already open), sends selected text + action as message
3. If popup already open → sends in current session
4. Click outside or deselect → menu disappears

**Style Updates:**
- ContextMenu: violet → amber (`var(--bg-card)` bg, `var(--border)` border, `var(--accent-dim)` hover)

### Components
- Modified: `ArticleShell.tsx` — integrate `useTextSelection` + `ContextMenu`
- Modified: `ContextMenu.tsx` — color updates
- Modified: `ChatWidget.tsx` — expose method to programmatically open and send message

## 6. UI Style Unification

### Color Mapping

| Current (violet) | Replacement (amber/site vars) |
|---|---|
| `violet-400/500/600` buttons/accent | `var(--accent)` (#f59e0b) |
| `violet-500/25` shadow/glow | `var(--accent-glow)` |
| `bg-neutral-900` background | `var(--bg-card)` |
| `border-neutral-800` border | `var(--border)` |
| `neutral-100` text | `var(--text)` / `var(--text-bright)` |
| `neutral-400/500` secondary text | `var(--text-dim)` / `var(--text-muted)` |

### Per-Component Changes
- **Floating button:** gradient from `violet→blue` → amber with subtle warm gradient, amber glow shadow
- **ChatMessage (user):** `violet-600` bg → amber-tinted background (e.g., `var(--accent)` at ~15% opacity with amber border)
- **ChatMessage (assistant):** `neutral-800` bg → `var(--bg-elevated)`
- **ChatInput:** violet focus border → amber focus border
- **ToolCallIndicator:** violet spinner → amber spinner (`var(--accent)`)
- **Streaming cursor:** amber color
- **All hover states:** `var(--accent-dim)` or `var(--bg-card-hover)`
- **LoginButton:** update to match amber theme
- **ConversationList (new ChatSidebar):** amber active state

## Technical Notes

### Existing Infrastructure (No Changes Needed)
- `useChat` hook — streaming logic, conversation CRUD
- `useAuth` hook — login/logout state management
- `useTextSelection` hook — text selection detection
- `api-client.ts` — all REST endpoints
- Backend chat controller, service, entities — full CRUD already implemented
- Backend SSE streaming — working correctly

### Message Edit Strategy
Client-side approach using existing APIs:
1. User clicks edit on a message → textarea appears with current content
2. User confirms edit → frontend calls `PATCH /conversations/:id` to update the message content
3. Frontend deletes all messages after the edited one (via new `DELETE /conversations/:id/messages?after=:messageId` endpoint)
4. Frontend re-sends the edited message content through the normal `sendMessage` flow to regenerate the assistant response

New backend endpoint needed: `DELETE /conversations/:id/messages?after=:messageId` — deletes all messages in a conversation created after the specified message ID.

### Dependencies
- No new packages needed
- All existing deps sufficient: react-markdown, react-syntax-highlighter, lucide-react

### Routing
- New page: `/[locale]/chat` (with i18n support via next-intl)
