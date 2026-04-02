import OpenAI from 'openai';
import { LLMProvider, Message, ToolDef, StreamChunk } from '../llm-provider.interface';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  private client: OpenAI;

  constructor(apiKey: string, private chatModel: string, private embedModel: string) {
    this.client = new OpenAI({ apiKey });
  }

  async *chat(messages: Message[], tools?: ToolDef[]): AsyncIterable<StreamChunk> {
    const openaiMessages = messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool' as const, content: m.content, tool_call_id: m.toolCallId! };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant' as const,
          content: m.content || null,
          tool_calls: m.toolCalls.map((tc) => ({
            id: tc.id, type: 'function' as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        };
      }
      return { role: m.role as 'system' | 'user' | 'assistant', content: m.content };
    });

    const params: any = { model: this.chatModel, messages: openaiMessages, stream: true };
    if (tools?.length) {
      params.tools = tools.map((t) => ({
        type: 'function',
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    const stream = await this.client.chat.completions.create(params);
    const toolCallBuffers = new Map<number, { id: string; name: string; args: string }>();

    for await (const event of stream as any) {
      const choice = event.choices?.[0];
      if (!choice) continue;
      const delta = choice.delta;

      if (delta?.content) {
        yield { type: 'text_delta', delta: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index;
          if (tc.id) {
            toolCallBuffers.set(idx, { id: tc.id, name: tc.function?.name || '', args: '' });
            yield { type: 'tool_call_start', id: tc.id, name: tc.function?.name || '' };
          }
          if (tc.function?.arguments) {
            const buf = toolCallBuffers.get(idx)!;
            buf.args += tc.function.arguments;
            yield { type: 'tool_call_delta', id: buf.id, argsDelta: tc.function.arguments };
          }
        }
      }

      if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
        for (const [, buf] of toolCallBuffers) {
          yield { type: 'tool_call_end', id: buf.id, arguments: buf.args };
        }
        toolCallBuffers.clear();
      }

      if (event.usage) {
        yield { type: 'done', usage: { inputTokens: event.usage.prompt_tokens, outputTokens: event.usage.completion_tokens } };
      }
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({ model: this.embedModel, input: text });
    return response.data[0].embedding;
  }
}
