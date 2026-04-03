import { describe, it, expect, beforeEach } from 'vitest';
import { CodeIndexerService, CodeChunkData } from '../../src/index/code-indexer.service';

describe('CodeIndexerService', () => {
  let service: CodeIndexerService;

  beforeEach(() => { service = new CodeIndexerService(); });

  it('should extract function declarations from TypeScript source', () => {
    const source = `
export async function executeQuery(query: string): Promise<Result> {
  const parsed = parseInput(query);
  return await runQuery(parsed);
}

function privateHelper() {
  return true;
}
`;
    const chunks = service.parseSource('services/query.ts', source);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const executeQuery = chunks.find((c) => c.name === 'executeQuery');
    expect(executeQuery).toBeDefined();
    expect(executeQuery!.chunkType).toBe('function');
    expect(executeQuery!.filePath).toBe('services/query.ts');
  });

  it('should extract class declarations with methods', () => {
    const source = `
export class QueryEngine {
  private state: State;
  constructor(private config: Config) {}
  async run(input: string): Promise<Output> { return this.process(input); }
}
`;
    const chunks = service.parseSource('services/engine.ts', source);
    const classChunk = chunks.find((c) => c.chunkType === 'class');
    expect(classChunk).toBeDefined();
    expect(classChunk!.name).toBe('QueryEngine');
  });

  it('should extract interfaces and type aliases', () => {
    const source = `
export interface Config { model: string; temperature: number; }
export type Result = { data: string; error?: Error };
`;
    const chunks = service.parseSource('types.ts', source);
    expect(chunks.find((c) => c.name === 'Config' && c.chunkType === 'interface')).toBeDefined();
    expect(chunks.find((c) => c.name === 'Result' && c.chunkType === 'type')).toBeDefined();
  });

  it('should generate description text for embedding', () => {
    const chunk: CodeChunkData = {
      filePath: 'services/query.ts', chunkType: 'function', name: 'executeQuery',
      content: 'async function executeQuery(q: string) {}',
      startLine: 1, endLine: 1,
      metadata: { params: ['q: string'], returnType: 'Promise<Result>' },
    };
    const desc = service.buildDescriptionText(chunk);
    expect(desc).toContain('services/query.ts');
    expect(desc).toContain('executeQuery');
  });
});
