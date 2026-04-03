import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchService } from '../../src/index/search.service';
import { DataSource } from 'typeorm';

describe('SearchService', () => {
  let service: SearchService;
  let mockDataSource: any;
  let mockEmbeddingService: any;

  beforeEach(() => {
    mockDataSource = {
      query: vi.fn().mockResolvedValue([
        { id: '1', file_path: 'services/query.ts', name: 'executeQuery', chunk_type: 'function', content: 'code...', start_line: 10, end_line: 20, metadata: {}, score: 0.95 },
      ]),
    };
    mockEmbeddingService = {
      embed: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
    };
    service = new SearchService(mockDataSource, mockEmbeddingService);
  });

  it('should search code using hybrid query', async () => {
    const results = await service.searchCode('executeQuery', 5);
    expect(mockEmbeddingService.embed).toHaveBeenCalledWith('executeQuery');
    expect(mockDataSource.query).toHaveBeenCalled();
    expect(results).toHaveLength(1);
    expect(results[0].filePath).toBe('services/query.ts');
  });

  it('should search articles', async () => {
    mockDataSource.query.mockResolvedValue([
      { id: '1', article_slug: 'query-engine', locale: 'en', heading: 'Overview', content: 'The query engine...', metadata: { title: 'Query Engine' }, score: 0.9 },
    ]);
    const results = await service.searchArticles('query engine', 5, 'en');
    expect(results).toHaveLength(1);
    expect(results[0].articleSlug).toBe('query-engine');
  });
});
