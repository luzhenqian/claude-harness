# AI 对话标题生成

## 概述

用 LLM 自动生成对话标题，替代当前截断用户第一条消息的方式。

## 架构

### 数据库配置

复用 `llm_providers` 表，新增 `type = 'title'` 类型的记录。无需修改表结构，`type` 字段已支持任意字符串值。

用户可在管理后台配置一条专用的标题生成模型（如 `gpt-4o-mini`、`claude-haiku`）。如未配置，降级到默认 chat provider。

### LlmService 扩展

新增 `getTitleProvider()` 方法：

1. 查找 `type = 'title'` 且 `enabled = true` 的 provider
2. 找到 → 返回该 provider
3. 未找到 → 调用 `getChatProvider()` 降级

### ChatService 扩展

新增 `generateTitle(userMessage: string, assistantMessage: string): Promise<string>` 方法：

- 调用 `getTitleProvider()` 获取模型
- 使用 system prompt 指导 LLM 生成简短标题（10-20 字以内）
- 返回生成的标题字符串

System prompt 大意：
> 根据以下对话的第一轮内容，生成一个简短的中文标题（10-20字以内），直接输出标题文本，不要加引号或其他格式。

### ChatController 修改

修改 `sendMessage` 中的标题生成逻辑（`chat.controller.ts:191-194`）：

1. 第一轮对话完成后，先设临时标题（截断用户消息，保持现有逻辑）
2. 异步调用 `generateTitle()`，不 await、不阻塞响应流
3. LLM 生成完成后更新 `conversation.title`
4. 异步调用中捕获所有异常，失败时保留临时标题

### 降级与容错

| 场景 | 行为 |
|------|------|
| 配置了 title provider | 用 title provider 生成 |
| 未配置 title provider | 降级到默认 chat provider |
| LLM 调用失败 | 保留临时标题（截断的用户消息） |
| LLM 返回空/异常内容 | 保留临时标题 |

## 涉及文件

| 文件 | 改动 |
|------|------|
| `packages/api/src/llm/llm.service.ts` | 新增 `getTitleProvider()` |
| `packages/api/src/chat/chat.service.ts` | 新增 `generateTitle()` |
| `packages/api/src/chat/chat.controller.ts` | 修改标题生成逻辑为异步 LLM 调用 |
