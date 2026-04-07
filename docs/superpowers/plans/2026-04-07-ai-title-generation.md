# AI 对话标题生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 LLM 自动生成对话标题，替代截断用户第一条消息的方式。

**Architecture:** 在 `LlmService` 新增 `getTitleProvider()` 方法，支持专用 title provider 配置，降级到 chat provider。在 `ChatService` 新增 `generateTitle()` 方法调用 LLM 生成标题。在 `ChatController` 中第一轮对话完成后异步触发标题生成，不阻塞 SSE 响应流。

**Tech Stack:** NestJS, TypeORM, 现有 LLM provider 抽象层 (Anthropic/OpenAI/Gemini)

---

### Task 1: LlmService 新增 getTitleProvider()

**Files:**
- Modify: `packages/api/src/llm/llm.service.ts`

- [ ] **Step 1: 在 loadProviders() 中处理 title 类型**

在 `packages/api/src/llm/llm.service.ts` 中，新增 `titleProviders` map 和 `defaultTitleId`，在 `loadProviders()` 中处理 `type === 'title'` 的记录：

```typescript
// 在类顶部新增（与现有 chatProviders/embeddingProviders 并列）
private titleProviders = new Map<string, LLMProvider>();
private defaultTitleId: string | null = null;

// 在 loadProviders() 中，在 for 循环内新增 else if 分支（在 embedding 分支之后）
} else if (record.type === 'title') {
  this.titleProviders.set(record.id, provider);
  if (record.isDefault) this.defaultTitleId = record.id;
}

// 在 loadProviders() 的 clear 段新增
this.titleProviders.clear();
```

- [ ] **Step 2: 新增 getTitleProvider() 方法**

在 `packages/api/src/llm/llm.service.ts` 中，在 `getEmbeddingProvider()` 方法之后新增：

```typescript
async getTitleProvider(): Promise<LLMProvider> {
  if (!this.titleProviders.size && !this.chatProviders.size) await this.loadProviders();
  // 优先使用专用 title provider
  if (this.titleProviders.size) {
    const provider = this.defaultTitleId
      ? this.titleProviders.get(this.defaultTitleId)
      : this.titleProviders.values().next().value;
    if (provider) return provider;
  }
  // 降级到 chat provider
  return this.getChatProvider();
}
```

- [ ] **Step 3: 验证编译通过**

Run: `cd packages/api && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/llm/llm.service.ts
git commit -m "feat(llm): add getTitleProvider with fallback to chat provider"
```

---

### Task 2: ChatService 新增 generateTitle()

**Files:**
- Modify: `packages/api/src/chat/chat.service.ts`
- Modify: `packages/api/src/chat/chat.module.ts`

- [ ] **Step 1: ChatModule 导入 LlmModule**

在 `packages/api/src/chat/chat.module.ts` 中添加 LlmModule 导入：

```typescript
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), AgentModule, IndexModule, QuotaModule, LlmModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
```

- [ ] **Step 2: ChatService 注入 LlmService 并实现 generateTitle()**

在 `packages/api/src/chat/chat.service.ts` 中：

添加导入：
```typescript
import { LlmService } from '../llm/llm.service';
import { Message as LlmMessage } from '../llm/llm-provider.interface';
```

修改构造函数，注入 LlmService：
```typescript
constructor(
  @InjectRepository(Conversation) private readonly convRepo: Repository<Conversation>,
  @InjectRepository(Message) private readonly msgRepo: Repository<Message>,
  private readonly llmService: LlmService,
) {}
```

在类末尾新增 `generateTitle()` 方法：
```typescript
async generateTitle(userMessage: string, assistantMessage: string): Promise<string> {
  const provider = await this.llmService.getTitleProvider();
  const messages: LlmMessage[] = [
    {
      role: 'system',
      content: '根据以下对话的第一轮内容，生成一个简短的标题（10个字以内）。直接输出标题文本，不要加引号、标点或其他格式。',
    },
    { role: 'user', content: userMessage },
    { role: 'assistant', content: assistantMessage },
    { role: 'user', content: '请为以上对话生成一个简短标题。' },
  ];

  let title = '';
  for await (const chunk of provider.chat(messages)) {
    if (chunk.type === 'text_delta') {
      title += chunk.delta;
    }
  }
  return title.trim();
}
```

- [ ] **Step 3: 验证编译通过**

Run: `cd packages/api && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/chat/chat.service.ts packages/api/src/chat/chat.module.ts
git commit -m "feat(chat): add generateTitle using LLM provider"
```

---

### Task 3: ChatController 异步调用标题生成

**Files:**
- Modify: `packages/api/src/chat/chat.controller.ts`

- [ ] **Step 1: 修改 sendMessage 中的标题生成逻辑**

在 `packages/api/src/chat/chat.controller.ts` 中，将第 191-194 行的标题生成逻辑替换为：

旧代码：
```typescript
      if (messages.length <= 1 && !conv.title) {
        const title = body.content.slice(0, 50) + (body.content.length > 50 ? '...' : '');
        await this.chatService.updateConversation(id, user.id, { title });
      }
```

新代码：
```typescript
      if (messages.length <= 1 && !conv.title) {
        // 设置临时标题
        const tempTitle = body.content.slice(0, 50) + (body.content.length > 50 ? '...' : '');
        await this.chatService.updateConversation(id, user.id, { title: tempTitle });

        // 异步生成 AI 标题，不阻塞响应
        this.chatService.generateTitle(body.content, fullResponse).then(async (aiTitle) => {
          if (aiTitle) {
            await this.chatService.updateConversation(id, user.id, { title: aiTitle });
          }
        }).catch(() => {
          // 失败时保留临时标题，不做处理
        });
      }
```

- [ ] **Step 2: 验证编译通过**

Run: `cd packages/api && npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 3: 手动测试**

1. 启动服务：`cd packages/api && npm run start:dev`
2. 创建新对话，发送第一条消息
3. 验证：侧边栏先显示截断的临时标题，片刻后更新为 AI 生成的标题
4. 验证：不配置 title provider 时，降级到 chat provider 正常工作
5. 验证：后续消息不会重复生成标题

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/chat/chat.controller.ts
git commit -m "feat(chat): async AI title generation with fallback"
```
