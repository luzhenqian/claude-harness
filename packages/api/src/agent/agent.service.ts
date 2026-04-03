import { Injectable } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { Message, StreamChunk, ToolCall } from '../llm/llm-provider.interface';
import { AgentTool } from './tools/tool.interface';
import { buildSystemPrompt, ChatContext } from './prompt.builder';

const MAX_TOOL_ROUNDS = 10;

@Injectable()
export class AgentService {
  constructor(private readonly llmService: LlmService) {}

  async *run(
    conversationMessages: Message[],
    tools: AgentTool[],
    context: ChatContext,
  ): AsyncIterable<StreamChunk> {
    const provider = await this.llmService.getChatProvider();
    const systemPrompt = buildSystemPrompt(context);
    const toolDefs = tools.map((t) => t.definition);
    const toolMap = new Map(tools.map((t) => [t.definition.name, t]));

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      ...conversationMessages,
    ];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const pendingToolCalls = new Map<string, ToolCall>();
      let hasToolCalls = false;

      for await (const chunk of provider.chat(messages, toolDefs)) {
        yield chunk;

        if (chunk.type === 'tool_call_start') {
          pendingToolCalls.set(chunk.id, {
            id: chunk.id,
            name: chunk.name,
            arguments: '',
          });
          hasToolCalls = true;
        }
        if (chunk.type === 'tool_call_end') {
          const tc = pendingToolCalls.get(chunk.id);
          if (tc) tc.arguments = chunk.arguments;
        }
        if (chunk.type === 'done') break;
      }

      if (!hasToolCalls) return;

      const completedCalls = Array.from(pendingToolCalls.values()).filter(
        (tc) => tc.name && tc.arguments,
      );
      if (completedCalls.length === 0) return;

      messages.push({ role: 'assistant', content: '', toolCalls: completedCalls });

      for (const tc of completedCalls) {
        const tool = toolMap.get(tc.name);
        if (!tool) {
          messages.push({
            role: 'tool',
            content: `Error: unknown tool "${tc.name}"`,
            toolCallId: tc.id,
          });
          continue;
        }
        const args = JSON.parse(tc.arguments);
        const result = await tool.execute(args);
        messages.push({ role: 'tool', content: result, toolCallId: tc.id });
      }
    }
  }
}
