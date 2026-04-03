# Daily Token Quota System

## Overview

Add per-user daily token usage limits to prevent unlimited consumption. All users share the same quota, configured in the database. Input and output tokens are limited separately.

## Data Model

### `token_usages` table

| Column          | Type      | Description                        |
|-----------------|-----------|------------------------------------|
| id              | UUID PK   | Primary key                        |
| user_id         | UUID FK   | References users.id                |
| conversation_id | UUID FK   | References conversations.id        |
| input_tokens    | INTEGER   | Input tokens consumed              |
| output_tokens   | INTEGER   | Output tokens consumed             |
| provider        | VARCHAR   | LLM provider name (e.g. anthropic) |
| model           | VARCHAR   | Model name (e.g. claude-sonnet-4-6)  |
| created_at      | TIMESTAMP | Record creation time               |

Index: `(user_id, created_at)` for daily aggregation queries.

### `system_configs` table

| Column     | Type           | Description        |
|------------|----------------|--------------------|
| id         | UUID PK        | Primary key        |
| key        | VARCHAR UNIQUE | Configuration key  |
| value      | JSONB          | Configuration data |
| updated_at | TIMESTAMP      | Last update time   |

Initial seed data:

```json
{
  "key": "token_limits",
  "value": {
    "dailyInputTokens": 500000,
    "dailyOutputTokens": 100000,
    "estimatedOutputTokens": 4096
  }
}
```

## Quota Check Flow

1. User sends a message → `ChatController.sendMessage()`
2. `TokenQuotaGuard` runs before the handler
3. Guard calls `TokenQuotaService.checkQuota(userId)`:
   - Query today's usage: `SUM(input_tokens)`, `SUM(output_tokens)` where `user_id = ?` and `created_at >= UTC today 00:00`
   - Load limits from `SystemConfigService.get('token_limits')`
   - Input check: `usedInput < dailyInputTokens`
   - Output check: `usedOutput + estimatedOutputTokens <= dailyOutputTokens`
   - If either fails → throw HTTP 429
4. Request proceeds to MastraService for LLM streaming
5. After stream completes, `TokenUsageService.record()` saves actual usage from the `done` event

## Pre-check Logic

- **Input tokens**: check that cumulative daily input is still under the limit (single message input is relatively small, so a simple less-than check suffices)
- **Output tokens**: check that `usedOutput + estimatedOutputTokens (4096)` does not exceed the limit, since actual output is unknown before the LLM responds
- Actual token values (from the LLM provider's `done` event) are recorded after the response completes, so real usage may slightly exceed the limit on the final request of the day

## New Module: `quota`

Location: `packages/api/src/quota/`

### Entities

- `TokenUsage` — maps to `token_usages` table
- `SystemConfig` — maps to `system_configs` table

### Services

- `TokenUsageService` — record usage, query daily totals
- `SystemConfigService` — read/update system configuration
- `TokenQuotaService` — combines the above two; implements `checkQuota(userId)`

### Guard

- `TokenQuotaGuard` — NestJS Guard that calls `TokenQuotaService.checkQuota()`, throws 429 on failure

## Changes to Existing Code

- `ChatController.sendMessage()` — add `@UseGuards(TokenQuotaGuard)` decorator
- `ChatController.sendMessage()` — after stream ends, call `TokenUsageService.record()` with actual usage from the `done` event
- `ChatModule` — import `QuotaModule`
- New migration file for `token_usages` and `system_configs` tables with seed data

## 429 Error Response

```json
{
  "statusCode": 429,
  "message": "Daily token limit exceeded",
  "details": {
    "dailyInputLimit": 500000,
    "dailyOutputLimit": 100000,
    "usedInput": 495000,
    "usedOutput": 98000,
    "resetsAt": "2026-04-04T00:00:00Z"
  }
}
```

## Frontend Handling

Catch HTTP 429 in the chat send logic (in `api-client.ts` or the chat hook). Display an error message to the user indicating the daily quota is exhausted and when it resets. No new UI components needed — reuse existing error display mechanisms.

## Daily Reset

Quota resets at UTC 00:00 each day. No cron job or explicit reset is needed — the aggregation query naturally scopes to `created_at >= today UTC 00:00`.

## Configuration

All limits are stored in the `system_configs` table and can be updated via direct database access. No admin UI is included in this phase.
