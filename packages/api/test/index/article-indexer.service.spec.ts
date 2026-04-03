import { describe, it, expect, beforeEach } from 'vitest';
import { ArticleIndexerService, ArticleChunkData } from '../../src/index/article-indexer.service';

describe('ArticleIndexerService', () => {
  let service: ArticleIndexerService;
  beforeEach(() => { service = new ArticleIndexerService(); });

  it('should split MDX by headings into chunks', () => {
    const mdx = `---
title: "Query Engine"
tags: ["query", "engine"]
order: 2
---

## Overview

The query engine handles all requests.

## Architecture

### Core Loop

The core loop processes messages sequentially.

### Tool Execution

Tools are executed in parallel when possible.
`;
    const chunks = service.parseArticle('query-engine', 'en', mdx);
    expect(chunks.length).toBeGreaterThanOrEqual(3);
    const overview = chunks.find((c) => c.heading === 'Overview');
    expect(overview).toBeDefined();
    expect(overview!.content).toContain('handles all requests');
    expect(overview!.metadata.title).toBe('Query Engine');
    expect(overview!.metadata.tags).toContain('query');
  });

  it('should generate description text for embedding', () => {
    const chunk: ArticleChunkData = {
      articleSlug: 'query-engine', locale: 'en', heading: 'Architecture',
      content: 'The architecture is modular.',
      metadata: { title: 'Query Engine', tags: ['query'] },
    };
    const desc = service.buildDescriptionText(chunk);
    expect(desc).toContain('Query Engine');
    expect(desc).toContain('Architecture');
  });
});
