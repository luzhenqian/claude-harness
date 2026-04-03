# Daily Token Quota Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce daily per-user token quotas (input/output separately) with pre-check before LLM calls and usage recording after.

**Architecture:** New `quota` NestJS module with two entities (TokenUsage, SystemConfig), three services, and a guard. The guard intercepts `sendMessage` to check quota before the LLM call. After streaming completes, actual usage is recorded. MastraService is extended to return token usage from the AI SDK stream result.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, Vitest

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `packages/api/src/quota/entities/token-usage.entity.ts` | TypeORM entity for `token_usages` table |
| `packages/api/src/quota/entities/system-config.entity.ts` | TypeORM entity for `system_configs` table |
| `packages/api/src/quota/token-usage.service.ts` | Record usage, query daily totals |
| `packages/api/src/quota/system-config.service.ts` | Read system configuration |
| `packages/api/src/quota/token-quota.service.ts` | Quota check logic combining usage + config |
| `packages/api/src/quota/guards/token-quota.guard.ts` | NestJS guard that enforces quota on sendMessage |
| `packages/api/src/quota/quota.module.ts` | NestJS module wiring |
| `packages/api/src/migrations/1743724800000-AddTokenQuota.ts` | Migration for new tables + seed data |
| `packages/api/src/quota/__tests__/token-quota.service.spec.ts` | Unit tests for quota logic |

### Modified files

| File | Change |
|------|--------|
| `packages/api/src/app.module.ts` | Import QuotaModule, register new entities + migration |
| `packages/api/src/agent/mastra.service.ts` | Return token usage from agent stream result |
| `packages/api/src/chat/chat.controller.ts` | Add TokenQuotaGuard, record usage after stream |
| `packages/api/src/chat/chat.module.ts` | Import QuotaModule |
| `packages/web/src/hooks/useChat.ts` | Handle 429 response before reading stream |

---

### Task 1: Database Migration

**Files:**
- Create: `packages/api/src/migrations/1743724800000-AddTokenQuota.ts`
- Modify: `packages/api/src/app.module.ts:17,27-28` (import migration, add to migrations array)

- [ ] **Step 1: Create the migration file**

```typescript
// packages/api/src/migrations/1743724800000-AddTokenQuota.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTokenQuota1743724800000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE token_usages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        input_tokens INTEGER NOT NULL DEFAULT 0,
        output_tokens INTEGER NOT NULL DEFAULT 0,
        provider VARCHAR NOT NULL,
        model VARCHAR NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_token_usages_user_created ON token_usages (user_id, created_at)`);

    await queryRunner.query(`
      CREATE TABLE system_configs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key VARCHAR NOT NULL UNIQUE,
        value JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      INSERT INTO system_configs (key, value) VALUES (
        'token_limits',
        '{"dailyInputTokens": 500000, "dailyOutputTokens": 100000, "estimatedOutputTokens": 4096}'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS token_usages');
    await queryRunner.query('DROP TABLE IF EXISTS system_configs');
  }
}
```

- [ ] **Step 2: Register migration in AppModule**

In `packages/api/src/app.module.ts`, add the import and include in migrations array:

```typescript
// Add import at top
import { AddTokenQuota1743724800000 } from './migrations/1743724800000-AddTokenQuota';

// In the migrations array (line 28), add:
migrations: [InitialSchema1712102400000, AddTokenQuota1743724800000],
```

- [ ] **Step 3: Run the migration**

Run: `cd packages/api && pnpm typeorm migration:run -d src/config/database.config.ts`
Expected: Migration executes successfully, creates `token_usages` and `system_configs` tables.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/migrations/1743724800000-AddTokenQuota.ts packages/api/src/app.module.ts
git commit -m "feat(api): add token_usages and system_configs migration"
```

---

### Task 2: TypeORM Entities

**Files:**
- Create: `packages/api/src/quota/entities/token-usage.entity.ts`
- Create: `packages/api/src/quota/entities/system-config.entity.ts`
- Modify: `packages/api/src/app.module.ts:27` (add entities to entities array)

- [ ] **Step 1: Create TokenUsage entity**

```typescript
// packages/api/src/quota/entities/token-usage.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Conversation } from '../../chat/entities/conversation.entity';

@Entity('token_usages')
@Index(['userId', 'createdAt'])
export class TokenUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @Column({ name: 'input_tokens', type: 'integer', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'integer', default: 0 })
  outputTokens: number;

  @Column()
  provider: string;

  @Column()
  model: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

- [ ] **Step 2: Create SystemConfig entity**

```typescript
// packages/api/src/quota/entities/system-config.entity.ts
import {
  Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn,
} from 'typeorm';

@Entity('system_configs')
export class SystemConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  key: string;

  @Column({ type: 'jsonb', default: {} })
  value: Record<string, any>;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

- [ ] **Step 3: Register entities in AppModule**

In `packages/api/src/app.module.ts`:

```typescript
// Add imports at top
import { TokenUsage } from './quota/entities/token-usage.entity';
import { SystemConfig } from './quota/entities/system-config.entity';

// In entities array (line 27), add:
entities: [User, Conversation, Message, LlmProvider, CodeChunk, ArticleChunk, TokenUsage, SystemConfig],
```

- [ ] **Step 4: Verify build**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/quota/entities/ packages/api/src/app.module.ts
git commit -m "feat(api): add TokenUsage and SystemConfig entities"
```

---

### Task 3: SystemConfigService

**Files:**
- Create: `packages/api/src/quota/system-config.service.ts`

- [ ] **Step 1: Create SystemConfigService**

```typescript
// packages/api/src/quota/system-config.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfig } from './entities/system-config.entity';

export interface TokenLimits {
  dailyInputTokens: number;
  dailyOutputTokens: number;
  estimatedOutputTokens: number;
}

@Injectable()
export class SystemConfigService {
  constructor(
    @InjectRepository(SystemConfig) private readonly repo: Repository<SystemConfig>,
  ) {}

  async getTokenLimits(): Promise<TokenLimits> {
    const config = await this.repo.findOne({ where: { key: 'token_limits' } });
    if (!config) {
      return { dailyInputTokens: 500000, dailyOutputTokens: 100000, estimatedOutputTokens: 4096 };
    }
    return config.value as TokenLimits;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/quota/system-config.service.ts
git commit -m "feat(api): add SystemConfigService for token limits config"
```

---

### Task 4: TokenUsageService

**Files:**
- Create: `packages/api/src/quota/token-usage.service.ts`

- [ ] **Step 1: Create TokenUsageService**

```typescript
// packages/api/src/quota/token-usage.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TokenUsage } from './entities/token-usage.entity';

export interface DailyUsage {
  inputTokens: number;
  outputTokens: number;
}

@Injectable()
export class TokenUsageService {
  constructor(
    @InjectRepository(TokenUsage) private readonly repo: Repository<TokenUsage>,
  ) {}

  async getDailyUsage(userId: string): Promise<DailyUsage> {
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    const result = await this.repo
      .createQueryBuilder('tu')
      .select('COALESCE(SUM(tu.input_tokens), 0)', 'inputTokens')
      .addSelect('COALESCE(SUM(tu.output_tokens), 0)', 'outputTokens')
      .where('tu.user_id = :userId', { userId })
      .andWhere('tu.created_at >= :todayUtc', { todayUtc })
      .getRawOne();

    return {
      inputTokens: parseInt(result.inputTokens, 10),
      outputTokens: parseInt(result.outputTokens, 10),
    };
  }

  async record(params: {
    userId: string;
    conversationId: string;
    inputTokens: number;
    outputTokens: number;
    provider: string;
    model: string;
  }): Promise<TokenUsage> {
    const usage = this.repo.create(params);
    return this.repo.save(usage);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/quota/token-usage.service.ts
git commit -m "feat(api): add TokenUsageService for recording and querying usage"
```

---

### Task 5: TokenQuotaService + Tests

**Files:**
- Create: `packages/api/src/quota/token-quota.service.ts`
- Create: `packages/api/src/quota/__tests__/token-quota.service.spec.ts`

- [ ] **Step 1: Write the test file**

```typescript
// packages/api/src/quota/__tests__/token-quota.service.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException } from '@nestjs/common';
import { TokenQuotaService } from '../token-quota.service';
import { TokenUsageService } from '../token-usage.service';
import { SystemConfigService } from '../system-config.service';

describe('TokenQuotaService', () => {
  let service: TokenQuotaService;
  let usageService: Partial<TokenUsageService>;
  let configService: Partial<SystemConfigService>;

  beforeEach(() => {
    usageService = {
      getDailyUsage: vi.fn(),
    };
    configService = {
      getTokenLimits: vi.fn().mockResolvedValue({
        dailyInputTokens: 500000,
        dailyOutputTokens: 100000,
        estimatedOutputTokens: 4096,
      }),
    };
    service = new TokenQuotaService(
      usageService as TokenUsageService,
      configService as SystemConfigService,
    );
  });

  it('should pass when usage is well under limits', async () => {
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 1000, outputTokens: 500 });
    await expect(service.checkQuota('user-1')).resolves.not.toThrow();
  });

  it('should throw 429 when input tokens exceed limit', async () => {
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 500000, outputTokens: 0 });
    await expect(service.checkQuota('user-1')).rejects.toThrow(HttpException);
    await expect(service.checkQuota('user-1')).rejects.toMatchObject({ status: 429 });
  });

  it('should throw 429 when output tokens plus estimate exceed limit', async () => {
    // 100000 - 4096 = 95904 is the max usedOutput before rejection
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 0, outputTokens: 95905 });
    await expect(service.checkQuota('user-1')).rejects.toThrow(HttpException);
  });

  it('should pass when output is exactly at threshold', async () => {
    // 95904 + 4096 = 100000, which equals the limit
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 0, outputTokens: 95904 });
    await expect(service.checkQuota('user-1')).resolves.not.toThrow();
  });

  it('should include details in the 429 response', async () => {
    (usageService.getDailyUsage as any).mockResolvedValue({ inputTokens: 500001, outputTokens: 0 });
    try {
      await service.checkQuota('user-1');
      expect.unreachable('should have thrown');
    } catch (e: any) {
      const response = e.getResponse();
      expect(response.details).toHaveProperty('dailyInputLimit', 500000);
      expect(response.details).toHaveProperty('dailyOutputLimit', 100000);
      expect(response.details).toHaveProperty('usedInput', 500001);
      expect(response.details).toHaveProperty('resetsAt');
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run src/quota/__tests__/token-quota.service.spec.ts`
Expected: FAIL — `TokenQuotaService` module not found.

- [ ] **Step 3: Create TokenQuotaService**

```typescript
// packages/api/src/quota/token-quota.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import { TokenUsageService } from './token-usage.service';
import { SystemConfigService } from './system-config.service';

@Injectable()
export class TokenQuotaService {
  constructor(
    private readonly usageService: TokenUsageService,
    private readonly configService: SystemConfigService,
  ) {}

  async checkQuota(userId: string): Promise<void> {
    const [usage, limits] = await Promise.all([
      this.usageService.getDailyUsage(userId),
      this.configService.getTokenLimits(),
    ]);

    const inputExceeded = usage.inputTokens >= limits.dailyInputTokens;
    const outputExceeded = usage.outputTokens + limits.estimatedOutputTokens > limits.dailyOutputTokens;

    if (inputExceeded || outputExceeded) {
      const tomorrow = new Date();
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      tomorrow.setUTCHours(0, 0, 0, 0);

      throw new HttpException({
        statusCode: 429,
        message: 'Daily token limit exceeded',
        details: {
          dailyInputLimit: limits.dailyInputTokens,
          dailyOutputLimit: limits.dailyOutputTokens,
          usedInput: usage.inputTokens,
          usedOutput: usage.outputTokens,
          resetsAt: tomorrow.toISOString(),
        },
      }, 429);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd packages/api && npx vitest run src/quota/__tests__/token-quota.service.spec.ts`
Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/quota/token-quota.service.ts packages/api/src/quota/__tests__/
git commit -m "feat(api): add TokenQuotaService with quota check logic and tests"
```

---

### Task 6: TokenQuotaGuard

**Files:**
- Create: `packages/api/src/quota/guards/token-quota.guard.ts`

- [ ] **Step 1: Create the guard**

```typescript
// packages/api/src/quota/guards/token-quota.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { TokenQuotaService } from '../token-quota.service';

@Injectable()
export class TokenQuotaGuard implements CanActivate {
  constructor(private readonly quotaService: TokenQuotaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string };
    await this.quotaService.checkQuota(user.id);
    return true;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/quota/guards/
git commit -m "feat(api): add TokenQuotaGuard for request-level quota enforcement"
```

---

### Task 7: QuotaModule

**Files:**
- Create: `packages/api/src/quota/quota.module.ts`

- [ ] **Step 1: Create the module**

```typescript
// packages/api/src/quota/quota.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenUsage } from './entities/token-usage.entity';
import { SystemConfig } from './entities/system-config.entity';
import { TokenUsageService } from './token-usage.service';
import { SystemConfigService } from './system-config.service';
import { TokenQuotaService } from './token-quota.service';
import { TokenQuotaGuard } from './guards/token-quota.guard';

@Module({
  imports: [TypeOrmModule.forFeature([TokenUsage, SystemConfig])],
  providers: [TokenUsageService, SystemConfigService, TokenQuotaService, TokenQuotaGuard],
  exports: [TokenUsageService, TokenQuotaService, TokenQuotaGuard],
})
export class QuotaModule {}
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/quota/quota.module.ts
git commit -m "feat(api): add QuotaModule wiring entities, services, and guard"
```

---

### Task 8: Extend MastraService to Return Token Usage

**Files:**
- Modify: `packages/api/src/agent/mastra.service.ts`

The current `MastraStreamEvent` type does not include a `done` event with usage data. The Mastra agent's `stream()` result exposes a `usage` promise (from the AI SDK) that resolves after the stream finishes.

- [ ] **Step 1: Add `done` event type to MastraStreamEvent**

In `packages/api/src/agent/mastra.service.ts`, update the interface:

```typescript
// Replace the existing MastraStreamEvent interface (line 13-16)
export interface MastraStreamEvent {
  type: 'tool_call' | 'tool_result' | 'text_delta' | 'steps' | 'done' | 'error';
  [key: string]: any;
}
```

- [ ] **Step 2: Yield `done` event with usage after stream completes**

In `packages/api/src/agent/mastra.service.ts`, after the `for await` loop and the steps yield (after line 108), add usage extraction:

```typescript
      // After: if (steps.length > 0) { yield { type: 'steps', steps }; }

      // Extract token usage from the stream result
      const usage = await (result as any).usage;
      yield {
        type: 'done',
        usage: {
          inputTokens: usage?.promptTokens ?? 0,
          outputTokens: usage?.completionTokens ?? 0,
        },
      };
```

Note: The Mastra agent wraps the AI SDK, which exposes `usage` with `promptTokens` and `completionTokens`. If the property names differ at runtime, this step should be verified and adjusted during implementation.

- [ ] **Step 3: Verify build**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/agent/mastra.service.ts
git commit -m "feat(api): emit done event with token usage from MastraService"
```

---

### Task 9: Integrate Guard and Usage Recording in ChatController

**Files:**
- Modify: `packages/api/src/chat/chat.controller.ts`
- Modify: `packages/api/src/chat/chat.module.ts`

- [ ] **Step 1: Import QuotaModule in ChatModule**

In `packages/api/src/chat/chat.module.ts`:

```typescript
// Add import
import { QuotaModule } from '../quota/quota.module';

// Add QuotaModule to imports array
@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), AgentModule, IndexModule, QuotaModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
```

- [ ] **Step 2: Add guard and usage recording to ChatController**

In `packages/api/src/chat/chat.controller.ts`:

Add imports at top:

```typescript
import { TokenQuotaGuard } from '../quota/guards/token-quota.guard';
import { TokenUsageService } from '../quota/token-usage.service';
```

Add `TokenUsageService` to constructor:

```typescript
constructor(
  private readonly chatService: ChatService,
  private readonly mastraService: MastraService,
  private readonly tokenUsageService: TokenUsageService,
) {}
```

Add `@UseGuards(TokenQuotaGuard)` to the `sendMessage` method (line 78). Note: `JwtAuthGuard` is already applied at the class level, so the JWT guard runs first, then the quota guard:

```typescript
@Post(':id/messages')
@UseGuards(TokenQuotaGuard)
async sendMessage(
```

Inside the `sendMessage` method, capture usage from the `done` event and record it. Replace the streaming `try` block (lines 104-119) with:

```typescript
    let fullResponse = '';
    let tokenUsage = { inputTokens: 0, outputTokens: 0 };
    try {
      for await (const event of this.mastraService.run(conversationMessages, {
        articleSlug: body.context?.articleSlug,
        articleContent: body.context?.articleContent,
        selectedText: body.context?.selectedText,
      })) {
        if (event.type === 'done') {
          tokenUsage = event.usage;
        } else {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        if (event.type === 'text_delta') fullResponse += event.delta;
      }

      await this.chatService.saveMessage(id, 'assistant', fullResponse);

      // Record token usage
      await this.tokenUsageService.record({
        userId: user.id,
        conversationId: id,
        inputTokens: tokenUsage.inputTokens,
        outputTokens: tokenUsage.outputTokens,
        provider: 'default',
        model: 'default',
      });

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
```

- [ ] **Step 3: Verify build**

Run: `cd packages/api && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/api/src/chat/chat.controller.ts packages/api/src/chat/chat.module.ts
git commit -m "feat(api): enforce token quota guard and record usage on sendMessage"
```

---

### Task 10: Frontend 429 Handling

**Files:**
- Modify: `packages/web/src/hooks/useChat.ts`

The `api.sendMessage` uses raw `fetch` (not `apiFetch`), so it returns a `Response` object. Currently the code reads the body stream without checking the response status. We need to check for 429 before reading the stream.

- [ ] **Step 1: Add error state to useChat**

In `packages/web/src/hooks/useChat.ts`, add an `error` state and expose it:

```typescript
// After the existing useState declarations (around line 34)
const [error, setError] = useState<string | null>(null);
```

Add `error` and `clearError` to the return object:

```typescript
return {
  conversations, activeConversationId, messages, isStreaming, currentToolCall, error,
  loadConversations, selectConversation, createConversation,
  findOrCreateSession, sendMessage, editMessage, stopStreaming,
  deleteConversation, renameConversation, clearError: () => setError(null),
};
```

- [ ] **Step 2: Handle 429 in streamResponse**

In `packages/web/src/hooks/useChat.ts`, in the `streamResponse` callback, after the `api.sendMessage` call (line 86), add a status check before reading the stream:

```typescript
    try {
      const response = await api.sendMessage(convId, content, context, { skipUserMessage: options?.skipUserMessage });

      if (response.status === 429) {
        const body = await response.json();
        const resetsAt = body.details?.resetsAt;
        const resetTime = resetsAt ? new Date(resetsAt).toLocaleTimeString() : '';
        setError(
          `Daily token limit reached. Quota resets at ${resetTime} UTC.`
        );
        // Remove the optimistic assistant message
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
        return;
      }

      if (!response.ok) {
        setError(`Error: ${response.status} ${response.statusText}`);
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
        return;
      }

      const reader = response.body?.getReader();
      // ... rest of stream reading unchanged
```

- [ ] **Step 3: Clear error on new message send**

In `packages/web/src/hooks/useChat.ts`, at the start of the `sendMessage` callback (line 142), clear previous errors:

```typescript
  const sendMessage = useCallback(async (
    content: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string },
  ) => {
    setError(null);
    let convId = activeConversationId;
    // ... rest unchanged
```

Do the same at the start of `editMessage`:

```typescript
  const editMessage = useCallback(async (
    messageId: string,
    newContent: string,
    context?: { articleSlug?: string; selectedText?: string; articleContent?: string },
  ) => {
    setError(null);
    if (!activeConversationId) return;
    // ... rest unchanged
```

- [ ] **Step 4: Verify build**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No type errors. (Note: any component that destructures useChat return will need to handle the new `error` property — check if TypeScript flags any issues.)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useChat.ts
git commit -m "feat(web): handle 429 token quota exceeded in chat UI"
```

---

### Task 11: Display Error in Chat UI

**Files:**
- Modify: The component that uses `useChat` and renders the chat input area (likely `packages/web/src/components/chat/ChatPanel.tsx` or `ChatPage.tsx`)

- [ ] **Step 1: Find the component that uses useChat and renders the chat area**

Read `packages/web/src/components/chat/ChatPanel.tsx` and `packages/web/src/components/chat/ChatPage.tsx` to find where `useChat()` is called and where messages are rendered.

- [ ] **Step 2: Add error display**

In the component that calls `useChat()`, destructure `error` and `clearError`, and render an error banner above the chat input when `error` is non-null:

```tsx
{error && (
  <div className="mx-4 mb-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
    <span>{error}</span>
    <button onClick={clearError} className="ml-4 text-red-400 hover:text-red-300">&times;</button>
  </div>
)}
```

The exact placement depends on the component structure found in step 1. Place it between the message list and the input area.

- [ ] **Step 3: Verify build**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/chat/
git commit -m "feat(web): display token quota exceeded error in chat UI"
```

---

### Task 12: Manual End-to-End Verification

- [ ] **Step 1: Start the API and web dev servers**

Run: `pnpm dev` (or equivalent turbo command)

- [ ] **Step 2: Test normal flow**

1. Log in and send a chat message
2. Verify the message streams normally
3. Check the database: `SELECT * FROM token_usages ORDER BY created_at DESC LIMIT 5;`
4. Verify a row was inserted with non-zero input_tokens and output_tokens

- [ ] **Step 3: Test quota exceeded flow**

1. Temporarily update the system config to a very low limit:
   `UPDATE system_configs SET value = '{"dailyInputTokens": 1, "dailyOutputTokens": 1, "estimatedOutputTokens": 4096}' WHERE key = 'token_limits';`
2. Send a chat message
3. Verify the 429 error is shown in the UI with the reset time
4. Restore the config:
   `UPDATE system_configs SET value = '{"dailyInputTokens": 500000, "dailyOutputTokens": 100000, "estimatedOutputTokens": 4096}' WHERE key = 'token_limits';`

- [ ] **Step 4: Run all tests**

Run: `cd packages/api && npx vitest run`
Expected: All tests pass.

- [ ] **Step 5: Final commit (if any adjustments needed)**
