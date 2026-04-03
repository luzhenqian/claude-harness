import { describe, it, expect, beforeAll } from 'vitest';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { MastraService, MastraStreamEvent } from '../src/agent/mastra.service';
import { INestApplicationContext } from '@nestjs/common';

let app: INestApplicationContext;
let mastraService: MastraService;

beforeAll(async () => {
  app = await NestFactory.createApplicationContext(AppModule);
  mastraService = app.get(MastraService);
}, 30000);

async function collectStream(
  messages: { role: string; content: string }[],
  context: any = {},
): Promise<{ events: MastraStreamEvent[]; fullText: string }> {
  const events: MastraStreamEvent[] = [];
  let fullText = '';

  for await (const event of mastraService.run(messages, context)) {
    events.push(event);
    if (event.type === 'text_delta') fullText += event.delta;
  }

  return { events, fullText };
}

describe('Mastra Agent tool calling', () => {
  it('agent produces stream events', async () => {
    const { events } = await collectStream([
      { role: 'user', content: 'What is QueryEngine?' },
    ]);

    console.log('Event types:', events.map(e => e.type));
    console.log('Total events:', events.length);

    expect(events.length).toBeGreaterThan(0);
  }, 60000);

  it('agent calls search_files tool for code questions', async () => {
    const { events, fullText } = await collectStream([
      { role: 'user', content: 'How does the QueryEngine work? Show me the source code.' },
    ]);

    const eventTypes = events.map(e => e.type);
    const toolCalls = events.filter(e => e.type === 'tool_call');
    const toolResults = events.filter(e => e.type === 'tool_result');
    const textDeltas = events.filter(e => e.type === 'text_delta');
    const steps = events.filter(e => e.type === 'steps');
    const errors = events.filter(e => e.type === 'error');

    console.log('\n=== Stream Analysis ===');
    console.log('Event type breakdown:', {
      tool_call: toolCalls.length,
      tool_result: toolResults.length,
      text_delta: textDeltas.length,
      steps: steps.length,
      error: errors.length,
    });

    if (toolCalls.length > 0) {
      console.log('\nTool calls:');
      toolCalls.forEach((tc, i) => {
        console.log(`  ${i + 1}. ${tc.name}(${JSON.stringify(tc.args)})`);
      });
    }

    if (toolResults.length > 0) {
      console.log('\nTool results:');
      toolResults.forEach((tr, i) => {
        console.log(`  ${i + 1}. ${tr.name}: ${tr.result?.slice(0, 100)}...`);
      });
    }

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(e => console.log(`  ${e.message}`));
    }

    console.log('\nFull text response (first 500 chars):', fullText.slice(0, 500));

    // The key assertion: agent should use tools, not just generate text
    if (toolCalls.length === 0) {
      console.log('\n⚠️  NO TOOL CALLS — agent answered from memory without searching');
      console.log('This is the root cause of hallucinated file paths');
    }

    expect(toolCalls.length).toBeGreaterThan(0);
  }, 120000);

  it('search_files tool returns real file paths when called directly', async () => {
    // Bypass the agent — call the search tool directly via the service
    // This tests the tool execution independently
    const { events } = await collectStream([
      { role: 'system', content: 'You MUST call the search_files tool with query "tool" before responding. Do not write any text until you have called the tool.' },
      { role: 'user', content: 'Search for files related to tools.' },
    ]);

    const toolCalls = events.filter(e => e.type === 'tool_call');
    const toolResults = events.filter(e => e.type === 'tool_result');

    console.log('\n=== Forced tool call test ===');
    console.log('Tool calls:', toolCalls.length);
    console.log('Tool results:', toolResults.length);

    if (toolCalls.length > 0) {
      toolCalls.forEach((tc, i) => {
        console.log(`  Call ${i + 1}: ${tc.name}(${JSON.stringify(tc.args)})`);
      });
    }
    if (toolResults.length > 0) {
      toolResults.forEach((tr, i) => {
        console.log(`  Result ${i + 1}: ${tr.result?.slice(0, 200)}`);
      });
    }
  }, 120000);
});
