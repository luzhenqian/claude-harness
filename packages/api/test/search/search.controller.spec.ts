import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SearchController } from '../../src/search/search.controller';
import { SearchService } from '../../src/index/search.service';

describe('SearchController', () => {
  let controller: SearchController;
  let mockSearchService: any;

  beforeEach(() => {
    mockSearchService = {
      searchCode: vi.fn().mockResolvedValue([
        { id: '1', filePath: 'src/utils.ts', chunkType: 'function', name: 'helper', content: 'function helper() {}', startLine: 1, endLine: 3, score: 0.9, metadata: {} },
      ]),
      searchArticles: vi.fn().mockResolvedValue([
        { id: '2', articleSlug: 'getting-started', locale: 'en', heading: 'Install', content: 'npm install...', score: 0.8, metadata: {} },
      ]),
    };
    controller = new SearchController(mockSearchService);
  });

  it('should return code and article results', async () => {
    const result = await controller.search('helper', 'en', 5);
    expect(result).toHaveProperty('code');
    expect(result).toHaveProperty('articles');
    expect(result.code).toHaveLength(1);
    expect(result.articles).toHaveLength(1);
    expect(mockSearchService.searchCode).toHaveBeenCalledWith('helper', 5);
    expect(mockSearchService.searchArticles).toHaveBeenCalledWith('helper', 5, 'en');
  });

  it('should use default locale and limit', async () => {
    await controller.search('test');
    expect(mockSearchService.searchCode).toHaveBeenCalledWith('test', 10);
    expect(mockSearchService.searchArticles).toHaveBeenCalledWith('test', 10, 'en');
  });

  it('should throw on short query', async () => {
    await expect(controller.search('a')).rejects.toThrow();
  });
});
