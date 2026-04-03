# Mastra Agent Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom AgentService with Mastra framework, implement two-step tool design (search files → read content), and add visible thinking process to chat UI.

**Architecture:** Install Mastra as a library in the NestJS backend. Create a MastraService that builds an Agent with four Zod-typed tools. ChatController calls agent.stream() and translates Mastra events to SSE. Frontend useChat parses new event types and renders a ThinkingProcess component.

**Tech Stack:** @mastra/core, zod, NestJS 11, React 19, Next.js 16

---

## File Structure

### New Files
- `packages/api/src/agent/mastra.service.ts` — Mastra Agent factory, creates agent per request with DB model config
- `packages/api/src/agent/tools/search-files.tool.ts` — Mastra createTool, file-level vector search
- `packages/api/src/agent/tools/read-file.mastra.ts` — Mastra createTool, read file content
- `packages/api/src/agent/tools/search-articles.mastra.ts` — Mastra createTool, article-level vector search
- `packages/api/src/agent/tools/read-article.tool.ts` — Mastra createTool, read full article
- `packages/web/src/components/chat/ThinkingProcess.tsx` — Collapsible thinking steps component

### Modified Files
- `packages/api/package.json` — add @mastra/core, zod
- `packages/api/src/agent/agent.module.ts` — replace AgentService with MastraService
- `packages/api/src/agent/prompt.builder.ts` — update tool names in instructions
- `packages/api/src/chat/chat.controller.ts` — use MastraService, new SSE event format
- `packages/web/src/hooks/useChat.ts` — parse tool_call, tool_result, steps events; track thinkingSteps
- `packages/web/src/components/chat/ChatMessage.tsx` — render ThinkingProcess above assistant messages
- `packages/web/src/components/chat/ToolCallIndicator.tsx` — update tool name labels

### Deleted Files
- `packages/api/src/agent/agent.service.ts` — replaced by MastraService
- `packages/api/src/agent/tools/tool.interface.ts` — Mastra has its own tool types
- `packages/api/src/agent/tools/search-code.tool.ts` — replaced by search-files.tool.ts
- `packages/api/src/agent/tools/read-file.tool.ts` — replaced by read-file.mastra.ts
- `packages/api/src/agent/tools/search-articles.tool.ts` — replaced by search-articles.mastra.ts
- `packages/api/src/agent/tools/get-article.tool.ts` — replaced by read-article.tool.ts

---

### Task 1: Install Dependencies

**Files:**
- Modify: `packages/api/package.json`

- [ ] **Step 1: Install @mastra/core and zod**

Run:
```bash
cd packages/api && npm install @mastra/core zod
```

- [ ] **Step 2: Verify installation**

Run:
```bash
node -e "require('@mastra/core'); console.log('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add packages/api/package.json packages/api/package-lock.json
git commit -m "chore(api): install @mastra/core and zod"
```

---

### Task 2: Create Mastra Tools

**Files:**
- Create: `packages/api/src/agent/tools/search-files.tool.ts`
- Create: `packages/api/src/agent/tools/read-file.mastra.ts`
- Create: `packages/api/src/agent/tools/search-articles.mastra.ts`
- Create: `packages/api/src/agent/tools/read-article.tool.ts`

- [ ] **Step 1: Create search-files tool**

Create file `packages/api/src/agent/tools/search-files.tool.ts`:

```typescript
import { createTool } from '@mastra/core';
import { z } from 'zod';

export function createSearchFilesTool(searchService: {
  searchCode: (query: string, limit: number) => Promise<any[]>;
}) {
  return createTool({
    id: 'search_files',
    description:
      'Search source code files by semantic meaning. Returns file paths, function/class names, and line ranges — NOT code content. Use read_file after this to get actual code.',
    inputSchema: z.object({
      query: z.string().describe('The search query describing what to find'),
      limit: z.number().optional().default(10).describe('Maximum number of results'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        filePath: z.string(),
        chunkType: z.string(),
        name: z.string(),
        startLine: z.number(),
        endLine: z.number(),
        score: z.number(),
      })),
    }),
    execute: async ({ context: { query, limit } }) => {
      const results = await searchService.searchCode(query, limit || 10);
      if (results.length === 0) return { results: [] };
      return {
        results: results.map((r: any) => ({
          filePath: r.filePath,
          chunkType: r.chunkType || 'code',
          name: r.name,
          startLine: r.startLine,
          endLine: r.endLine,
          score: r.score,
        })),
      };
    },
  });
}
```

- [ ] **Step 2: Create read-file tool**

Create file `packages/api/src/agent/tools/read-file.mastra.ts`:

```typescript
import { createTool } from '@mastra/core';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

export function createReadFileTool(sourceRoot: string) {
  return createTool({
    id: 'read_file',
    description:
      'Read the content of a source code file. Use after search_files to get actual code. Optionally specify line range.',
    inputSchema: z.object({
      file_path: z.string().describe('Path relative to source root (e.g., "QueryEngine.ts" or "services/tools/StreamingToolExecutor.ts")'),
      start_line: z.number().optional().describe('Start line number (1-based)'),
      end_line: z.number().optional().describe('End line number (1-based)'),
    }),
    outputSchema: z.object({
      content: z.string(),
      filePath: z.string(),
      totalLines: z.number(),
    }),
    execute: async ({ context: { file_path, start_line, end_line } }) => {
      const fullPath = resolve(join(sourceRoot, file_path));
      if (!fullPath.startsWith(resolve(sourceRoot))) {
        return { content: 'Error: invalid file path.', filePath: file_path, totalLines: 0 };
      }
      try {
        const raw = await readFile(fullPath, 'utf-8');
        const lines = raw.split('\n');
        if (start_line && end_line) {
          const slice = lines.slice(start_line - 1, end_line);
          return {
            content: `\`\`\`typescript\n${slice.join('\n')}\n\`\`\``,
            filePath: file_path,
            totalLines: lines.length,
          };
        }
        return {
          content: `\`\`\`typescript\n${raw}\n\`\`\``,
          filePath: file_path,
          totalLines: lines.length,
        };
      } catch {
        return { content: `Error: file "${file_path}" not found.`, filePath: file_path, totalLines: 0 };
      }
    },
  });
}
```

- [ ] **Step 3: Create search-articles tool**

Create file `packages/api/src/agent/tools/search-articles.mastra.ts`:

```typescript
import { createTool } from '@mastra/core';
import { z } from 'zod';

export function createSearchArticlesTool(searchService: {
  searchArticles: (query: string, limit: number, locale?: string) => Promise<any[]>;
}) {
  return createTool({
    id: 'search_articles',
    description:
      'Search articles about Claude Code architecture. Returns article slugs and section headings — NOT full content. Use read_article after this to get content.',
    inputSchema: z.object({
      query: z.string().describe('The search query'),
      limit: z.number().optional().default(5).describe('Maximum number of results'),
    }),
    outputSchema: z.object({
      results: z.array(z.object({
        articleSlug: z.string(),
        heading: z.string(),
        score: z.number(),
      })),
    }),
    execute: async ({ context: { query, limit } }) => {
      const results = await searchService.searchArticles(query, limit || 5);
      if (results.length === 0) return { results: [] };
      return {
        results: results.map((r: any) => ({
          articleSlug: r.articleSlug,
          heading: r.heading,
          score: r.score,
        })),
      };
    },
  });
}
```

- [ ] **Step 4: Create read-article tool**

Create file `packages/api/src/agent/tools/read-article.tool.ts`:

```typescript
import { createTool } from '@mastra/core';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';

export function createReadArticleTool(articlesRoot: string) {
  return createTool({
    id: 'read_article',
    description: 'Read the full content of a specific article by its slug.',
    inputSchema: z.object({
      slug: z.string().describe('The article slug (e.g., "01-overview")'),
      locale: z.string().optional().default('en').describe('Language: "en", "zh", or "ja"'),
    }),
    outputSchema: z.object({
      content: z.string(),
      title: z.string(),
    }),
    execute: async ({ context: { slug, locale } }) => {
      const lang = locale || 'en';
      const fullPath = resolve(join(articlesRoot, lang, `${slug}.mdx`));
      if (!fullPath.startsWith(resolve(articlesRoot))) {
        return { content: 'Error: invalid article slug.', title: '' };
      }
      try {
        const raw = await readFile(fullPath, 'utf-8');
        // Simple frontmatter extraction without gray-matter
        const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
        if (!match) return { content: raw, title: slug };
        const frontmatter = match[1];
        const body = match[2];
        const titleMatch = frontmatter.match(/title:\s*['"]?(.+?)['"]?\s*$/m);
        const title = titleMatch ? titleMatch[1] : slug;
        return { content: `# ${title}\n\n${body}`, title };
      } catch {
        return { content: `Error: article "${slug}" not found for locale "${lang}".`, title: '' };
      }
    },
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/agent/tools/search-files.tool.ts packages/api/src/agent/tools/read-file.mastra.ts packages/api/src/agent/tools/search-articles.mastra.ts packages/api/src/agent/tools/read-article.tool.ts
git commit -m "feat(api): create Mastra tools for two-step search"
```

---

### Task 3: Create MastraService

**Files:**
- Create: `packages/api/src/agent/mastra.service.ts`
- Modify: `packages/api/src/agent/agent.module.ts`

- [ ] **Step 1: Create MastraService**

Create file `packages/api/src/agent/mastra.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { Agent } from '@mastra/core';
import { LlmService } from '../llm/llm.service';
import { SearchService } from '../index/search.service';
import { buildSystemPrompt, ChatContext } from './prompt.builder';
import { createSearchFilesTool } from './tools/search-files.tool';
import { createReadFileTool } from './tools/read-file.mastra';
import { createSearchArticlesTool } from './tools/search-articles.mastra';
import { createReadArticleTool } from './tools/read-article.tool';
import { join } from 'path';

export interface MastraStreamEvent {
  type: 'tool_call' | 'tool_result' | 'text_delta' | 'steps' | 'error';
  [key: string]: any;
}

@Injectable()
export class MastraService {
  private readonly sourceRoot: string;
  private readonly articlesRoot: string;

  constructor(
    private readonly llmService: LlmService,
    private readonly searchService: SearchService,
  ) {
    const projectRoot = join(__dirname, '..', '..', '..', '..');
    this.sourceRoot = join(projectRoot, 'packages', 'claude-code-source', 'src');
    this.articlesRoot = join(projectRoot, 'content', 'articles');
  }

  async *run(
    conversationMessages: { role: string; content: string }[],
    context: ChatContext,
  ): AsyncIterable<MastraStreamEvent> {
    // Get model config from DB
    const provider = await this.llmService.getChatProvider();
    const modelId = `${provider.name}/${(provider as any).chatModel || 'gpt-4o'}`;

    // Create tools
    const tools = {
      search_files: createSearchFilesTool(this.searchService),
      read_file: createReadFileTool(this.sourceRoot),
      search_articles: createSearchArticlesTool(this.searchService),
      read_article: createReadArticleTool(this.articlesRoot),
    };

    // Create agent
    const agent = new Agent({
      name: 'claude-harness-assistant',
      instructions: buildSystemPrompt(context),
      model: {
        provider: provider.name.toUpperCase(),
        name: (provider as any).chatModel || 'gpt-4o',
        toolChoice: 'auto',
      },
      tools,
    });

    // Build messages for Mastra
    const messages = conversationMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Track steps for thinking process
    const steps: { tool: string; args: any; resultPreview: string }[] = [];

    try {
      const stream = await agent.stream(messages);

      // Read the full stream from Mastra and translate events
      for await (const part of stream.fullStream) {
        if (part.type === 'tool-call') {
          const toolCallEvent: MastraStreamEvent = {
            type: 'tool_call',
            name: part.toolName,
            args: part.args,
          };
          yield toolCallEvent;
        } else if (part.type === 'tool-result') {
          const resultStr = typeof part.result === 'string'
            ? part.result
            : JSON.stringify(part.result);
          const preview = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;
          steps.push({ tool: part.toolName, args: part.args, resultPreview: preview });
          const toolResultEvent: MastraStreamEvent = {
            type: 'tool_result',
            name: part.toolName,
            result: preview,
          };
          yield toolResultEvent;
        } else if (part.type === 'text-delta') {
          yield { type: 'text_delta', delta: part.textDelta };
        }
      }

      // Emit thinking steps summary
      if (steps.length > 0) {
        yield { type: 'steps', steps };
      }
    } catch (error) {
      yield { type: 'error', message: (error as Error).message };
    }
  }
}
```

- [ ] **Step 2: Update agent.module.ts**

Replace the entire file `packages/api/src/agent/agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { MastraService } from './mastra.service';
import { LlmModule } from '../llm/llm.module';
import { IndexModule } from '../index/index.module';

@Module({
  imports: [LlmModule, IndexModule],
  providers: [MastraService],
  exports: [MastraService],
})
export class AgentModule {}
```

- [ ] **Step 3: Check IndexModule exports SearchService**

Read `packages/api/src/index/index.module.ts` and verify `SearchService` is in the `exports` array. If not, add it.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/agent/mastra.service.ts packages/api/src/agent/agent.module.ts
git commit -m "feat(api): create MastraService with Mastra Agent"
```

---

### Task 4: Update ChatController

**Files:**
- Modify: `packages/api/src/chat/chat.controller.ts`

- [ ] **Step 1: Replace AgentService with MastraService in ChatController**

In `packages/api/src/chat/chat.controller.ts`:

Replace the import:
```typescript
import { AgentService } from '../agent/agent.service';
```
with:
```typescript
import { MastraService } from '../agent/mastra.service';
```

Remove these tool imports (no longer needed):
```typescript
import { SearchCodeTool } from '../agent/tools/search-code.tool';
import { ReadFileTool } from '../agent/tools/read-file.tool';
import { SearchArticlesTool } from '../agent/tools/search-articles.tool';
import { GetArticleTool } from '../agent/tools/get-article.tool';
import { Message as LLMMessage } from '../llm/llm-provider.interface';
```

Remove the `sourceRoot` and `articlesRoot` fields and their constructor initialization (lines 20-31).

Update the constructor:
```typescript
constructor(
  private readonly chatService: ChatService,
  private readonly mastraService: MastraService,
) {}
```

Remove `SearchService` from constructor (MastraService handles it internally).

- [ ] **Step 2: Rewrite sendMessage endpoint**

Replace the entire `sendMessage` method (from `@Post(':id/messages')` to end of class) with:

```typescript
@Post(':id/messages')
async sendMessage(
  @Req() req: Request, @Res() res: Response,
  @Param('id') id: string,
  @Body() body: { content: string; context?: { articleSlug?: string; selectedText?: string; articleContent?: string }; skipUserMessage?: boolean },
) {
  const user = req.user as { id: string };
  const conv = await this.chatService.getConversation(id, user.id);
  if (!conv) throw new HttpException('Not found', HttpStatus.NOT_FOUND);

  if (!body.skipUserMessage) {
    await this.chatService.saveMessage(id, 'user', body.content, { context: body.context });
  }

  const messages = await this.chatService.getMessages(id);
  const conversationMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let fullResponse = '';
  try {
    for await (const event of this.mastraService.run(conversationMessages, {
      articleSlug: body.context?.articleSlug,
      articleContent: body.context?.articleContent,
      selectedText: body.context?.selectedText,
    })) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.type === 'text_delta') fullResponse += event.delta;
    }

    await this.chatService.saveMessage(id, 'assistant', fullResponse);

    if (messages.length <= 1 && !conv.title) {
      const title = body.content.slice(0, 50) + (body.content.length > 50 ? '...' : '');
      await this.chatService.updateConversation(id, user.id, { title });
    }

    res.write(`data: [DONE]\n\n`);
  } catch (error) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: (error as Error).message })}\n\n`);
  } finally {
    res.end();
  }
}
```

- [ ] **Step 3: Remove unused import for SearchService from constructor**

Also remove the `SearchService` import at the top if it was there:
```typescript
import { SearchService } from '../index/search.service';
```

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/chat/chat.controller.ts
git commit -m "feat(api): wire ChatController to MastraService"
```

---

### Task 5: Update System Prompt

**Files:**
- Modify: `packages/api/src/agent/prompt.builder.ts`

- [ ] **Step 1: Update tool names and instructions**

In `packages/api/src/agent/prompt.builder.ts`, replace the "How to Answer" section (the numbered list) with:

```typescript
## How to Answer

1. **Always search first.** When a user asks about any concept, module, or feature, use your tools to find the relevant source code BEFORE responding. Do not ask the user to clarify which project — it is always Claude Code.
2. **Two-step search pattern.** First call search_files to find relevant files, then call read_file to read the actual code. Do not guess file paths — only reference files returned by search_files.
3. **Always include source references.** Every time you mention a file, function, class, or module, add a clickable reference tag:
   - Source code: [source:path/to/file.ts#L10-L20]
   - Articles: [article:article-slug]
   - IMPORTANT: Use file paths EXACTLY as returned by search_files. Do NOT invent paths.
4. **For articles, use the same pattern.** Call search_articles first, then read_article for full content.
5. **Include code snippets** when they help explain the answer.
6. **Be concise and precise.** If you're unsure, say so rather than guessing.
7. **Respond in the same language as the user's message.** If the user writes in Chinese, respond in Chinese. If in English, respond in English.`;
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/agent/prompt.builder.ts
git commit -m "feat(api): update system prompt for two-step tool pattern"
```

---

### Task 6: Delete Old Agent Files

**Files:**
- Delete: `packages/api/src/agent/agent.service.ts`
- Delete: `packages/api/src/agent/tools/tool.interface.ts`
- Delete: `packages/api/src/agent/tools/search-code.tool.ts`
- Delete: `packages/api/src/agent/tools/read-file.tool.ts` (old one)
- Delete: `packages/api/src/agent/tools/search-articles.tool.ts` (old one)
- Delete: `packages/api/src/agent/tools/get-article.tool.ts`

- [ ] **Step 1: Remove old files**

```bash
rm packages/api/src/agent/agent.service.ts
rm packages/api/src/agent/tools/tool.interface.ts
rm packages/api/src/agent/tools/search-code.tool.ts
rm packages/api/src/agent/tools/read-file.tool.ts
rm packages/api/src/agent/tools/search-articles.tool.ts
rm packages/api/src/agent/tools/get-article.tool.ts
```

- [ ] **Step 2: Verify backend compiles**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(api): remove old AgentService and tool files"
```

---

### Task 7: Frontend — ThinkingProcess Component

**Files:**
- Create: `packages/web/src/components/chat/ThinkingProcess.tsx`

- [ ] **Step 1: Create ThinkingProcess component**

Create file `packages/web/src/components/chat/ThinkingProcess.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { t } from '@/lib/ui-translations';

export interface ThinkingStep {
  tool: string;
  args: any;
  resultPreview: string;
}

interface Props {
  steps: ThinkingStep[];
}

const TOOL_LABELS: Record<string, Record<string, string>> = {
  search_files: { zh: '搜索文件', en: 'Search files', ja: 'ファイル検索' },
  read_file: { zh: '读取文件', en: 'Read file', ja: 'ファイル読取' },
  search_articles: { zh: '搜索文章', en: 'Search articles', ja: '記事検索' },
  read_article: { zh: '读取文章', en: 'Read article', ja: '記事読取' },
};

export function ThinkingProcess({ steps }: Props) {
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);

  if (steps.length === 0) return null;

  const label = locale === 'zh' ? '思考过程' : locale === 'ja' ? '思考プロセス' : 'Thinking';

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 6,
          border: 'none',
          background: 'transparent',
          color: 'var(--text-muted)',
          fontSize: 12,
          cursor: 'pointer',
          fontFamily: "'JetBrains Mono', monospace",
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-dim)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <span style={{
          display: 'inline-block',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          fontSize: 10,
        }}>
          ▶
        </span>
        {label} ({steps.length} {locale === 'zh' ? '步' : locale === 'ja' ? 'ステップ' : steps.length === 1 ? 'step' : 'steps'})
      </button>

      {expanded && (
        <div style={{
          marginTop: 4,
          marginLeft: 16,
          paddingLeft: 12,
          borderLeft: '2px solid var(--border)',
          animation: 'chat-fade-in 0.15s ease',
        }}>
          {steps.map((step, i) => {
            const toolLabel = TOOL_LABELS[step.tool]?.[locale] || step.tool;
            const argsSummary = step.tool === 'search_files' || step.tool === 'search_articles'
              ? `"${step.args?.query || ''}"` 
              : step.tool === 'read_file'
                ? step.args?.file_path || ''
                : step.args?.slug || '';

            return (
              <div key={i} style={{
                padding: '4px 0',
                fontSize: 12,
                color: 'var(--text-dim)',
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 1.5,
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{i + 1}.</span>{' '}
                <span style={{ color: 'var(--accent)' }}>{toolLabel}</span>
                {argsSummary && (
                  <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>
                    {argsSummary}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/components/chat/ThinkingProcess.tsx
git commit -m "feat(web): create ThinkingProcess collapsible component"
```

---

### Task 8: Frontend — Update useChat Hook

**Files:**
- Modify: `packages/web/src/hooks/useChat.ts`

- [ ] **Step 1: Add thinkingSteps and currentToolCall state**

In `packages/web/src/hooks/useChat.ts`, update the `ChatMessage` interface to include thinkingSteps:

```typescript
export interface ThinkingStep {
  tool: string;
  args: any;
  resultPreview: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: any[];
  isStreaming?: boolean;
  thinkingSteps?: ThinkingStep[];
}
```

Add new state after `abortRef`:

```typescript
const [currentToolCall, setCurrentToolCall] = useState<{ name: string; args?: any } | null>(null);
```

- [ ] **Step 2: Update streamResponse to parse new event types**

Replace the inner `for (const line of lines)` loop in `streamResponse` with:

```typescript
for (const line of lines) {
  if (!line.startsWith('data: ')) continue;
  const data = line.slice(6).trim();
  if (data === '[DONE]') break;
  try {
    const event = JSON.parse(data);
    if (event.type === 'text_delta') {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.isStreaming) {
          updated[updated.length - 1] = { ...last, content: last.content + event.delta };
        }
        return updated;
      });
    } else if (event.type === 'tool_call') {
      setCurrentToolCall({ name: event.name, args: event.args });
    } else if (event.type === 'tool_result') {
      setCurrentToolCall(null);
    } else if (event.type === 'steps') {
      // Attach thinking steps to the streaming assistant message
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.isStreaming) {
          updated[updated.length - 1] = { ...last, thinkingSteps: event.steps };
        }
        return updated;
      });
    }
  } catch {}
}
```

- [ ] **Step 3: Clear currentToolCall in finally block**

Add `setCurrentToolCall(null);` at the beginning of the `finally` block in `streamResponse`.

- [ ] **Step 4: Export currentToolCall from the hook return**

Update the return statement to include `currentToolCall`:

```typescript
return {
  conversations, activeConversationId, messages, isStreaming, currentToolCall,
  loadConversations, selectConversation, createConversation,
  findOrCreateSession, sendMessage, editMessage, stopStreaming,
  deleteConversation, renameConversation,
};
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useChat.ts
git commit -m "feat(web): parse tool_call, tool_result, steps events in useChat"
```

---

### Task 9: Frontend — Update ChatMessage & ToolCallIndicator

**Files:**
- Modify: `packages/web/src/components/chat/ChatMessage.tsx`
- Modify: `packages/web/src/components/chat/ToolCallIndicator.tsx`

- [ ] **Step 1: Add ThinkingProcess to ChatMessage**

In `packages/web/src/components/chat/ChatMessage.tsx`:

Add import at top:
```typescript
import { ThinkingProcess, ThinkingStep } from './ThinkingProcess';
```

Add `thinkingSteps` to the Props interface:
```typescript
interface Props {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  isStreaming?: boolean;
  onEdit?: (id: string, newContent: string) => void;
  thinkingSteps?: ThinkingStep[];
}
```

Update the function signature to destructure `thinkingSteps`:
```typescript
export function ChatMessage({ id, role, content, isStreaming, onEdit, thinkingSteps }: Props) {
```

Add ThinkingProcess rendering right before the message bubble (after the avatar+label section, before the `{editing ? (` block):

```tsx
{/* Thinking process (assistant only) */}
{!isUser && thinkingSteps && thinkingSteps.length > 0 && (
  <ThinkingProcess steps={thinkingSteps} />
)}
```

- [ ] **Step 2: Update ToolCallIndicator labels**

Replace the `TOOL_LABELS` in `packages/web/src/components/chat/ToolCallIndicator.tsx`:

```typescript
const TOOL_LABELS: Record<string, string> = {
  search_files: t(locale, 'chat.searchingCode'),
  read_file: t(locale, 'chat.readingFile'),
  search_articles: t(locale, 'chat.searchingArticles'),
  read_article: t(locale, 'chat.readingArticle'),
};
```

- [ ] **Step 3: Pass thinkingSteps through ChatMessages**

In `packages/web/src/components/chat/ChatMessages.tsx`, update the ChatMessageComponent rendering to pass `thinkingSteps`:

```tsx
<ChatMessageComponent
  key={msg.id} id={msg.id} role={msg.role} content={msg.content}
  isStreaming={msg.isStreaming}
  onEdit={msg.role === 'user' ? onEditMessage : undefined}
  thinkingSteps={(msg as any).thinkingSteps}
/>
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/chat/ChatMessage.tsx packages/web/src/components/chat/ToolCallIndicator.tsx packages/web/src/components/chat/ChatMessages.tsx
git commit -m "feat(web): show thinking process in chat messages"
```

---

### Task 10: Verify & Fix

- [ ] **Step 1: Verify backend compiles**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No errors. If errors, fix them.

- [ ] **Step 2: Verify frontend builds**

Run: `cd packages/web && npx next build`
Expected: Build succeeds.

- [ ] **Step 3: Fix any issues found**

Address any TypeScript or build errors. Common issues:
- Mastra Agent constructor API might differ from docs — check `@mastra/core` types
- IndexModule might need to export SearchService
- Model config format might need adjustment

- [ ] **Step 4: Commit fixes**

```bash
git add -A
git commit -m "fix: address build issues from Mastra migration"
```
