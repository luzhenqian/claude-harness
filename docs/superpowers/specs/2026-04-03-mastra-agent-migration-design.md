# Mastra Agent Migration Design

Date: 2026-04-03

## Overview

Replace the custom `AgentService` agent loop with Mastra framework. Improve search accuracy with a two-step tool design (search files first, then read content). Add visible thinking process to the chat UI. Integrate Mastra into the existing NestJS app via its Express adapter.

## 1. Architecture

### Current
```
ChatController → AgentService (custom async generator loop) → LLM Provider → Tools
```

### Target
```
NestJS App (Express)
├── /auth/*          — NestJS AuthController (unchanged)
├── /conversations/* — NestJS ChatController
│   └── sendMessage  — calls Mastra Agent.stream()
└── Mastra Express Adapter (mounted on same Express instance)
    └── Agent: "claude-harness-assistant"
        ├── model: loaded from DB llm_providers table
        ├── tools: [search_files, read_file, search_articles, read_article]
        └── instructions: buildSystemPrompt(context)
```

NestJS remains the primary framework. Mastra is used as a library (`@mastra/core`) for the Agent and Tool primitives. The Mastra Express adapter is mounted on the NestJS underlying Express instance to get streaming support.

### Integration Point

In `main.ts`, get the Express instance from NestJS and mount Mastra:

```typescript
const app = await NestFactory.create(AppModule);
const expressApp = app.getHttpAdapter().getInstance();
// Mount Mastra agent routes on /api/mastra/*
```

ChatController's `sendMessage` endpoint calls the Mastra Agent directly (not through HTTP), using `agent.stream()` and forwarding the structured events as SSE to the frontend.

## 2. Tool Design

Four tools in two symmetric pairs. The key insight: search tools return **metadata only** (file paths, names, scores), not content. Content is retrieved in a second step via read tools. This gives the AI precise file references.

### Source Code Pair

**`search_files`**
- Description: Search source code files by semantic meaning. Returns file paths and function/class names, not code content.
- Input: `{ query: string, limit?: number }`
- Output: List of matches with `filePath`, `chunkType`, `name`, `startLine`, `endLine`, `score`
- Implementation: Query `code_chunks` table with vector + text search, but return only metadata (no `content` field)

**`read_file`**
- Description: Read source code file content. Use after search_files to get actual code.
- Input: `{ file_path: string, start_line?: number, end_line?: number }`
- Output: File content (full or line range) as a fenced code block
- Implementation: Read from filesystem (same as current ReadFileTool)

### Article Pair

**`search_articles`**
- Description: Search articles about Claude Code architecture. Returns article slugs and section headings, not full content.
- Input: `{ query: string, limit?: number }`
- Output: List of matches with `articleSlug`, `heading`, `score`
- Implementation: Query `article_chunks` table, return metadata only

**`read_article`**
- Description: Read a specific article's full content.
- Input: `{ slug: string, locale?: string }`
- Output: Article frontmatter + content
- Implementation: Read MDX file from filesystem (same as current GetArticleTool)

### Expected AI Behavior

User asks "查询引擎怎么工作":
1. AI calls `search_files({ query: "query engine async generator" })`
2. Gets back: `QueryEngine.ts` (class, L184-L1177, score 0.95), `services/query/queryLoop.ts` (function, L10-L80, score 0.82)
3. AI calls `read_file({ file_path: "QueryEngine.ts", start_line: 184, end_line: 300 })`
4. Gets actual code content
5. AI generates answer with `[source:QueryEngine.ts#L184-L300]` reference

## 3. Stream Format

Mastra's `agent.stream()` returns structured events. We normalize them into SSE events for the frontend:

```
data: {"type":"tool_call","name":"search_files","args":{"query":"query engine"}}
data: {"type":"tool_result","name":"search_files","result":"Found: QueryEngine.ts (class, L184-L1177)..."}
data: {"type":"tool_call","name":"read_file","args":{"file_path":"QueryEngine.ts","start_line":184,"end_line":300}}
data: {"type":"tool_result","name":"read_file","result":"..."}
data: {"type":"text_delta","delta":"QueryEngine 的核心是..."}
data: {"type":"text_delta","delta":"一个异步生成器..."}
data: {"type":"steps","steps":[{"tool":"search_files","query":"query engine","resultCount":3},{"tool":"read_file","file":"QueryEngine.ts","lines":"L184-L300"}]}
data: [DONE]
```

### Event Types

| Type | Description | When |
|------|-------------|------|
| `tool_call` | AI is calling a tool | Before each tool execution |
| `tool_result` | Tool returned a result | After each tool execution |
| `text_delta` | Streaming text chunk | During final response generation |
| `steps` | Complete thinking process summary | After all tool calls, before [DONE] |
| `error` | Error occurred | On failure |

## 4. Frontend Changes

### useChat Hook

Adapt to parse new event types. Track:
- `messages` — conversation messages (unchanged)
- `isStreaming` — streaming state (unchanged)
- `currentToolCall` — current tool being executed (name + args), for real-time indicator
- `thinkingSteps` — accumulated steps from `steps` event, attached to assistant message

### ThinkingProcess Component

New component displayed above assistant message bubble (collapsed by default):

```
[▸ 思考过程 (2 步)]           ← collapsed
[▾ 思考过程 (2 步)]           ← expanded
  1. 搜索文件: "query engine" → 找到 3 个文件
  2. 读取文件: QueryEngine.ts L184-L300
```

Styling: subtle, muted text, amber accent for expand toggle. Matches the existing chat UI design language.

### ToolCallIndicator

Keep existing component but update to show tool name and args from `tool_call` events:
- `search_files` → "正在搜索相关文件..."
- `read_file` → "正在读取 QueryEngine.ts..."
- `search_articles` → "正在搜索相关文章..."
- `read_article` → "正在读取文章..."

### ChatMessage

Add optional `thinkingSteps` prop. When present, render `ThinkingProcess` component above the message bubble.

## 5. Model Configuration

Mastra Agent needs a model identifier. On initialization, read from `llm_providers` table:

```typescript
const provider = await llmService.getChatProvider();
// Convert to Mastra format: "openai/claude-sonnet-4-6"
const modelId = `${provider.name}/${provider.model}`;
```

For embedding (used by search tools), continue using the existing `EmbeddingService` which reads from the same DB table.

The Mastra Agent is created dynamically per request (or cached and refreshed when provider config changes), not at module initialization time, since the model can be changed via DB.

## 6. Files Changed

### Backend — Delete
- `packages/api/src/agent/agent.service.ts` — replaced by Mastra Agent
- `packages/api/src/agent/tools/search-code.tool.ts` — replaced by Mastra tool
- `packages/api/src/agent/tools/read-file.tool.ts` — replaced
- `packages/api/src/agent/tools/search-articles.tool.ts` — replaced
- `packages/api/src/agent/tools/get-article.tool.ts` — replaced
- `packages/api/src/agent/tools/tool.interface.ts` — no longer needed

### Backend — Create
- `packages/api/src/agent/mastra.service.ts` — Mastra Agent factory, creates agent with tools and model from DB
- `packages/api/src/agent/tools/search-files.tool.ts` — Mastra createTool, file-level search
- `packages/api/src/agent/tools/read-file.tool.ts` — Mastra createTool, read file content
- `packages/api/src/agent/tools/search-articles.tool.ts` — Mastra createTool, article-level search
- `packages/api/src/agent/tools/read-article.tool.ts` — Mastra createTool, read article content

### Backend — Modify
- `packages/api/src/agent/prompt.builder.ts` — update tool reference format in prompt
- `packages/api/src/agent/agent.module.ts` — replace AgentService with MastraService
- `packages/api/src/chat/chat.controller.ts` — sendMessage uses MastraService, new SSE event format
- `packages/api/src/main.ts` — mount Mastra Express adapter
- `packages/api/package.json` — add @mastra/core, @mastra/express, zod dependencies

### Frontend — Modify
- `packages/web/src/hooks/useChat.ts` — parse new event types (tool_call, tool_result, steps)
- `packages/web/src/components/chat/ChatMessage.tsx` — add ThinkingProcess above assistant messages
- `packages/web/src/components/chat/ToolCallIndicator.tsx` — update labels for new tool names

### Frontend — Create
- `packages/web/src/components/chat/ThinkingProcess.tsx` — collapsible thinking steps display

## 7. Dependencies

### New packages (backend)
- `@mastra/core` — Agent, createTool, core primitives
- `@mastra/express` — Express adapter for mounting alongside NestJS
- `zod` — Schema validation for tool inputs/outputs (Mastra requirement)

### Existing packages (no change)
- `openai` — used by Mastra's model routing under the hood
- All NestJS packages — unchanged
- TypeORM, pgvector — unchanged

## 8. Migration Safety

- Existing conversation data is unaffected (same DB schema for conversations/messages)
- The `code_chunks` and `article_chunks` tables are unchanged — same vector search queries
- Frontend gracefully degrades: if backend sends old-format events, useChat still works (backward compat during rollout)
- Auth, Chat CRUD, and all other endpoints are completely unaffected
