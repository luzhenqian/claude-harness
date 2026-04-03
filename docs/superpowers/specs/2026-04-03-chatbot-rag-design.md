# AI Chatbot with RAG — Design Spec

## Overview

为 Claude Harness 教育平台添加 AI 聊天功能，用户可以通过对话方式询问 Claude Code 源码的实现细节、架构设计等问题。系统使用 Agent 式 RAG，LLM 作为 Agent 自主调度搜索和读取工具来收集信息后生成回答。

## Architecture

三层结构，全部在现有 Turbo monorepo 中：

```
packages/web (Next.js)       ← 前端：聊天 UI + 右键菜单
packages/api (NestJS)        ← 后端：Agent 编排 + RAG + 认证
PostgreSQL + pgvector        ← 数据层：对话、向量、全文索引
```

前后端通过 REST API + SSE（Server-Sent Events）流式通信。

### 后端模块划分 (packages/api)

| Module | 职责 |
|--------|------|
| **AuthModule** | OAuth 登录（GitHub / Google）+ JWT session 管理 |
| **ChatModule** | 对话 CRUD、消息持久化、对话标题自动生成 |
| **AgentModule** | LLM Agent 编排，管理工具调用循环 |
| **LLMModule** | 多平台 LLM 适配（OpenAI / Anthropic / Gemini） |
| **IndexModule** | 源码 AST 解析、文章切分、embedding 生成、索引管理 |

## Agent 工作流程

1. **构建 System Prompt** — 注入当前文章内容（如在文章页）、选中文本（如有）、最近 N 条对话历史、可用工具定义
2. **LLM 决策循环** — Agent 自主选择调用工具，可多轮调用直到信息充足：
   - `search_code(query)` — pgvector 相似度 + tsvector 全文搜索源码，返回 top-K 代码片段 + 文件路径 + 分数
   - `read_file(file_path, start_line?, end_line?)` — 读取完整源码文件或指定行范围
   - `search_articles(query)` — 搜索相关文章片段
   - `get_article(article_slug)` — 获取完整文章内容
3. **流式生成回答** — SSE 推送到前端，包含特殊引用标记：
   - `[source:path/file.ts#L10-L20]` — 源码引用，前端渲染为可点击链接跳转到代码浏览器
   - `[article:slug-name]` — 文章引用，前端渲染为可点击链接跳转到文章页
4. **持久化** — 用户消息、AI 回复、工具调用记录存入 messages 表

## Frontend Interaction

### 浮动聊天窗口

- 页面右下角圆形浮动按钮（FAB），全局可见
- 点击展开聊天面板，包含：
  - 顶部栏：标题 + 当前上下文提示（如正在阅读的文章）+ 历史列表按钮 + 关闭按钮
  - 左侧面板（可收起）：对话历史列表，支持新建/切换/删除对话
  - 消息区域：对话气泡，AI 回复中展示工具调用过程（搜索、读取文件的状态指示）
  - 底部输入框 + 发送按钮
- 消息渲染支持：Markdown + 语法高亮代码块 + Mermaid 图表 + 可点击的源码/文章引用链接
- 设计风格与现有站点保持一致，追求高度优雅的交互体验

### 文章页选中文本右键菜单

- 在文章详情页，选中文本后出现自定义右键菜单
- 预设操作：
  - 🔍 解释这段内容
  - 📄 查找相关源码
  - 📚 查找相关文章
- 自定义操作：
  - ✏️ 自定义提问...（⌘K 快捷键）
- 选中的文本自动作为上下文附带发送到聊天窗口

### 对话历史管理

- 持久化所有对话，用户登录后可查看完整历史
- 对话标题在首次提问后自动生成
- 支持切换、继续历史对话

## Data Model

### users

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| provider | VARCHAR | 'github' \| 'google' |
| provider_id | VARCHAR | OAuth 平台用户 ID |
| email | VARCHAR | |
| name | VARCHAR | |
| avatar_url | VARCHAR | |
| created_at | TIMESTAMPTZ | |

UNIQUE(provider, provider_id)

### conversations

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| user_id | UUID FK → users | |
| title | VARCHAR | 自动生成或用户修改 |
| article_slug | VARCHAR NULLABLE | 发起对话时所在的文章 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

INDEX(user_id, updated_at DESC)

### messages

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| conversation_id | UUID FK → conversations | |
| role | VARCHAR | 'user' \| 'assistant' \| 'tool' |
| content | TEXT | 消息内容（Markdown） |
| tool_calls | JSONB NULLABLE | Agent 的工具调用记录 |
| tool_name | VARCHAR NULLABLE | 工具名称（role=tool 时） |
| context | JSONB NULLABLE | {article_slug?, selected_text?, source_file?} |
| created_at | TIMESTAMPTZ | |

INDEX(conversation_id, created_at ASC)

### code_chunks

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| file_path | VARCHAR | |
| chunk_type | VARCHAR | 'function' \| 'class' \| 'interface' \| 'type' \| 'module' |
| name | VARCHAR | 函数名/类名 |
| content | TEXT | 源码内容 |
| start_line | INT | |
| end_line | INT | |
| embedding | VECTOR(1536) | pgvector |
| tsv | TSVECTOR | 全文搜索 |
| metadata | JSONB | {exports, params, returnType...} |
| content_hash | VARCHAR | 用于增量更新检测 |
| version | VARCHAR | 用于蓝绿切换 |

INDEX USING ivfflat(embedding vector_cosine_ops)
INDEX USING gin(tsv)

### article_chunks

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| article_slug | VARCHAR | |
| locale | VARCHAR | 'en' \| 'zh' \| 'ja' |
| heading | VARCHAR | 所属章节标题 |
| content | TEXT | 文章片段内容 |
| embedding | VECTOR(1536) | pgvector |
| tsv | TSVECTOR | 全文搜索 |
| metadata | JSONB | {title, tags, order...} |
| content_hash | VARCHAR | 用于增量更新检测 |
| version | VARCHAR | 用于蓝绿切换 |

INDEX USING ivfflat(embedding vector_cosine_ops)
INDEX USING gin(tsv)

### llm_providers

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | VARCHAR | 'openai' \| 'anthropic' \| 'gemini' |
| type | VARCHAR | 'chat' \| 'embedding' |
| model | VARCHAR | 模型 ID |
| api_key | VARCHAR ENCRYPTED | 加密存储 |
| is_default | BOOLEAN | |
| config | JSONB | {temperature, max_tokens, ...} |
| enabled | BOOLEAN | |

## LLM Multi-Platform Adapter

### 统一接口

```typescript
interface LLMProvider {
  chat(messages: Message[], tools?: ToolDef[]): AsyncIterable<StreamChunk>;
  generateEmbedding(text: string): Promise<number[]>;
}
```

### StreamChunk 统一格式

```typescript
type StreamChunk =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_call_start'; id: string; name: string }
  | { type: 'tool_call_delta'; id: string; args_delta: string }
  | { type: 'tool_call_end'; id: string }
  | { type: 'done'; usage: { input_tokens: number; output_tokens: number } };
```

### 三个实现

- **OpenAIProvider** — SDK: `openai`, Chat: gpt-4o / gpt-4o-mini, Embed: text-embedding-3-small
- **AnthropicProvider** — SDK: `@anthropic-ai/sdk`, Chat: claude-sonnet-4-6 / haiku, Embed: 不提供（使用独立 embedding 提供方）
- **GeminiProvider** — SDK: `@google/generative-ai`, Chat: gemini-2.5-pro / flash, Embed: text-embedding-004

### Embedding 与 Chat 分离

Embedding 模型必须固定（向量数据库中所有 embedding 必须由同一模型生成），Chat 模型可自由切换。`llm_providers` 表通过 `type` 字段区分。

## Indexing Pipeline

### 源码索引

1. 扫描 `packages/claude-code-source/src/` 下所有 TypeScript 文件
2. 对比 content_hash，过滤出变更文件
3. ts-morph AST 解析，提取：函数声明/箭头函数、类+方法、接口/类型别名、顶层 export、JSDoc 注释
4. 拼接结构化描述文本（文件路径 + 名称 + 参数签名 + 返回类型 + 源码）
5. 生成 embedding 向量 + tsvector
6. 批量 upsert 到 code_chunks 表

### 文章索引

1. 扫描 `content/articles/{locale}/` 下所有 MDX 文件
2. 对比 content_hash，过滤出变更文章
3. gray-matter 提取 frontmatter，按 heading (## / ###) 切分章节
4. 拼接描述文本（文章标题 + 章节标题 + 标签 + 内容）
5. 生成 embedding 向量 + tsvector
6. 按 locale 独立存储，批量 upsert 到 article_chunks 表

### 触发方式

- `pnpm --filter api index:all` — 全量索引
- `pnpm --filter api index:code` — 仅源码
- `pnpm --filter api index:articles` — 仅文章
- 默认增量模式（对比 content_hash），`--force` 强制全量重建
- `--blue-green` 蓝绿切换：写入新版本表，建好索引后原子切换（适合源码大版本升级）

## Index Update Strategy

### 增量更新（日常）

文件/文章内容 hash 不变则跳过，只处理变更部分。以 `file_path`（源码）或 `(article_slug, locale)`（文章）为更新单位，删除旧 chunks 后重新插入。

### 蓝绿切换（大版本升级）

全量重建写入新版本表（如 `code_chunks_v2`），建好索引后通过表重命名原子切换，零停机。

## Technology Stack (Backend)

| Layer | Technology |
|-------|-----------|
| Framework | NestJS |
| ORM | TypeORM + typeorm-naming-strategies |
| Database | PostgreSQL + pgvector 扩展 |
| AST Parser | ts-morph |
| MDX Parser | gray-matter |
| Auth | Passport.js（GitHub + Google OAuth strategies） |
| LLM SDKs | openai, @anthropic-ai/sdk, @google/generative-ai |
| Streaming | SSE (Server-Sent Events) |

## API Endpoints

### Auth
- `GET /auth/github` — GitHub OAuth 登录
- `GET /auth/github/callback` — GitHub OAuth 回调
- `GET /auth/google` — Google OAuth 登录
- `GET /auth/google/callback` — Google OAuth 回调
- `GET /auth/me` — 获取当前用户信息
- `POST /auth/logout` — 登出

### Chat
- `GET /conversations` — 获取用户的对话列表
- `POST /conversations` — 创建新对话
- `DELETE /conversations/:id` — 删除对话
- `PATCH /conversations/:id` — 更新对话（标题等）
- `GET /conversations/:id/messages` — 获取对话消息历史
- `POST /conversations/:id/messages` — 发送消息（返回 SSE 流）

### Admin (索引管理)
- `POST /admin/index/code` — 触发源码索引
- `POST /admin/index/articles` — 触发文章索引
- `GET /admin/index/status` — 查看索引状态
