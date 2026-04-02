import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, Message, ToolDef, StreamChunk } from '../llm-provider.interface';

export class AnthropicProvider implements LLMProvider {
  readonly name = 'anthropic';
  private client: Anthropic;

  constructor(apiKey: string, private chatModel: string) {
    this.client = new Anthropic({ apiKey });
  }

  async *chat(messages: Message[], tools?: ToolDef[]): AsyncIterable<StreamChunk> {
    const systemMessage = messages.find((m) => m.role === 'system');
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const anthropicMessages = nonSystemMessages.map((m) => {
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant' as const,
          content: [
            ...(m.content ? [{ type: 'text' as const, text: m.content }] : []),
            ...m.toolCalls.map((tc) => ({
              type: 'tool_use' as const,
              id: tc.id,
              name: tc.name,
              input: JSON.parse(tc.arguments),
            })),
          ],
        };
      }
      if (m.role === 'tool') {
        return {
          role: 'user' as const,
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: m.toolCallId!,
              content: m.content,
            },
          ],
        };
      }
      return { role: m.role as 'user' | 'assistant', content: m.content };
    });

    const params: any = {
      model: this.chatModel,
      max_tokens: 4096,
      messages: anthropicMessages,
      stream: true,
    };
    if (systemMessage) params.system = systemMessage.content;
    if (tools?.length) {
      params.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    const stream = this.client.messages.stream(params);
    let currentToolId = '';
    let currentToolArgs = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'tool_use') {
          currentToolId = event.content_block.id;
          currentToolArgs = '';
          yield {
            type: 'tool_call_start',
            id: event.content_block.id,
            name: event.content_block.name,
          };
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield { type: 'text_delta', delta: event.delta.text };
        } else if (event.delta.type === 'input_json_delta') {
          currentToolArgs += event.delta.partial_json;
          yield {
            type: 'tool_call_delta',
            id: currentToolId,
            argsDelta: event.delta.partial_json,
          };
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolId) {
          yield {
            type: 'tool_call_end',
            id: currentToolId,
            arguments: currentToolArgs,
          };
          currentToolId = '';
          currentToolArgs = '';
        }
      }
    }

    const finalMessage = await stream.finalMessage();
    yield {
      type: 'done',
      usage: {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      },
    };
  }

  async generateEmbedding(_text: string): Promise<number[]> {
    throw new Error(
      'Anthropic does not provide an embedding API. Use a separate embedding provider.',
    );
  }
}
