import { Injectable } from '@nestjs/common';
import { Agent } from '@mastra/core/agent';
import { createOpenAI } from '@ai-sdk/openai';
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
    // Get model config from DB and build a typed AI SDK provider
    const config = await this.llmService.getChatProviderConfig();
    const openaiProvider = createOpenAI({
      apiKey: config.apiKey,
      ...(config.baseUrl ? { baseURL: config.baseUrl } : {}),
    });
    // Use .chat() to force Chat Completions API, not Responses API
    const model = openaiProvider.chat(config.model);

    // Create tools
    const tools = {
      search_files: createSearchFilesTool(this.searchService),
      read_file: createReadFileTool(this.sourceRoot),
      search_articles: createSearchArticlesTool(this.searchService),
      read_article: createReadArticleTool(this.articlesRoot),
    };

    // Create agent
    const agent = new Agent({
      id: 'claude-harness-assistant',
      name: 'Claude Harness Assistant',
      instructions: buildSystemPrompt(context),
      model,
      tools,
    });

    // Build messages for Mastra
    const messages = conversationMessages.map((m) => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    })) as any;

    // Track steps for thinking process
    const steps: { tool: string; args: any; resultPreview: string }[] = [];

    try {
      const result = await agent.stream(messages);

      // Read the full stream from Mastra and translate events
      for await (const chunk of result.fullStream) {
        if (chunk.type === 'tool-call') {
          const payload = (chunk as any).payload;
          const toolCallEvent: MastraStreamEvent = {
            type: 'tool_call',
            name: payload.toolName,
            args: payload.args,
          };
          yield toolCallEvent;
        } else if (chunk.type === 'tool-result') {
          const payload = (chunk as any).payload;
          const resultStr = typeof payload.result === 'string'
            ? payload.result
            : JSON.stringify(payload.result);
          const preview = resultStr.length > 200 ? resultStr.slice(0, 200) + '...' : resultStr;
          steps.push({ tool: payload.toolName, args: payload.args, resultPreview: preview });
          const toolResultEvent: MastraStreamEvent = {
            type: 'tool_result',
            name: payload.toolName,
            result: preview,
          };
          yield toolResultEvent;
        } else if (chunk.type === 'text-delta') {
          const payload = (chunk as any).payload;
          yield { type: 'text_delta', delta: payload.text };
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
