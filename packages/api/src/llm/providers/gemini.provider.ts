import { Content, GoogleGenerativeAI, Tool } from '@google/generative-ai';
import { LLMProvider, Message, ToolDef, StreamChunk } from '../llm-provider.interface';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';
  private genAI: GoogleGenerativeAI;

  constructor(
    apiKey: string,
    private chatModel: string,
    private embedModel: string,
  ) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *chat(messages: Message[], tools?: ToolDef[]): AsyncIterable<StreamChunk> {
    const model = this.genAI.getGenerativeModel({ model: this.chatModel });
    const systemInstruction = messages.find((m) => m.role === 'system')?.content;
    const nonSystemMessages = messages.filter((m) => m.role !== 'system');

    const contents: Content[] = nonSystemMessages.map((m) => {
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'model',
          parts: [
            ...(m.content ? [{ text: m.content }] : []),
            ...m.toolCalls.map((tc) => ({
              functionCall: { name: tc.name, args: JSON.parse(tc.arguments) },
            })),
          ],
        };
      }
      if (m.role === 'tool') {
        return {
          role: 'function' as const,
          parts: [
            {
              functionResponse: {
                name: m.toolCallId!,
                response: { result: m.content },
              },
            },
          ],
        };
      }
      return {
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      };
    });

    const genTools: Tool[] | undefined = tools?.length
      ? [
          {
            functionDeclarations: tools.map((t) => ({
              name: t.name,
              description: t.description,
              parameters: t.parameters as any,
            })),
          },
        ]
      : undefined;

    const result = await model.generateContentStream({
      contents,
      systemInstruction: systemInstruction || undefined,
      tools: genTools,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of result.stream) {
      const candidate = chunk.candidates?.[0];
      if (!candidate) continue;
      for (const part of candidate.content?.parts || []) {
        if (part.text) {
          yield { type: 'text_delta', delta: part.text };
        }
        if (part.functionCall) {
          const id = `gemini-${Date.now()}`;
          const args = JSON.stringify(part.functionCall.args);
          yield { type: 'tool_call_start', id, name: part.functionCall.name };
          yield { type: 'tool_call_delta', id, argsDelta: args };
          yield { type: 'tool_call_end', id, arguments: args };
        }
      }
      if (chunk.usageMetadata) {
        inputTokens = chunk.usageMetadata.promptTokenCount || 0;
        outputTokens = chunk.usageMetadata.candidatesTokenCount || 0;
      }
    }

    yield { type: 'done', usage: { inputTokens, outputTokens } };
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({ model: this.embedModel });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
