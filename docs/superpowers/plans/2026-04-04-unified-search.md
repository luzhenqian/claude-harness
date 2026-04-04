# Unified Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static JSON search bar with a unified search powered by the backend's hybrid semantic + full-text search, covering both code and articles.

**Architecture:** New `SearchModule` with a `SearchController` exposing `GET /search` that calls the existing `SearchService` in parallel for code and articles. Frontend `SearchBar` component rewritten to call this API with debounce, displaying results in a categorized dropdown panel.

**Tech Stack:** NestJS (backend controller), Next.js + React (frontend component), Radix UI (dropdown), next-intl (i18n), TypeORM/pgvector (existing search infrastructure)

---

### Task 1: Backend — SearchController and SearchModule

**Files:**
- Create: `packages/api/src/search/search.controller.ts`
- Create: `packages/api/src/search/search.module.ts`
- Modify: `packages/api/src/app.module.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/api/test/search/search.controller.spec.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/api && npx vitest run test/search/search.controller.spec.ts`
Expected: FAIL — cannot find `../../src/search/search.controller`

- [ ] **Step 3: Create SearchController**

Create `packages/api/src/search/search.controller.ts`:

```typescript
import { Controller, Get, Query, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiOkResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { SearchService, CodeSearchResult, ArticleSearchResult } from '../index/search.service';

interface SearchResponse {
  code: CodeSearchResult[];
  articles: ArticleSearchResult[];
}

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Unified search across code and articles' })
  @ApiQuery({ name: 'q', description: 'Search query (min 2 chars)', required: true })
  @ApiQuery({ name: 'locale', description: 'Locale for article filtering', required: false })
  @ApiQuery({ name: 'limit', description: 'Max results per category', required: false })
  @ApiOkResponse({ description: 'Search results grouped by category' })
  @ApiBadRequestResponse({ description: 'Query too short' })
  async search(
    @Query('q') q: string,
    @Query('locale') locale: string = 'en',
    @Query('limit') limit: number = 10,
  ): Promise<SearchResponse> {
    if (!q || q.length < 2) {
      throw new HttpException('Query must be at least 2 characters', HttpStatus.BAD_REQUEST);
    }

    const [code, articles] = await Promise.all([
      this.searchService.searchCode(q, limit),
      this.searchService.searchArticles(q, limit, locale),
    ]);

    return { code, articles };
  }
}
```

- [ ] **Step 4: Create SearchModule**

Create `packages/api/src/search/search.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { IndexModule } from '../index/index.module';

@Module({
  imports: [IndexModule],
  controllers: [SearchController],
})
export class SearchModule {}
```

- [ ] **Step 5: Register SearchModule in AppModule**

In `packages/api/src/app.module.ts`, add the import and register the module:

Add import at top:
```typescript
import { SearchModule } from './search/search.module';
```

Add `SearchModule` to the `imports` array after `SourceModule`:
```typescript
imports: [
  // ... existing imports ...
  SourceModule,
  SearchModule,
],
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/api && npx vitest run test/search/search.controller.spec.ts`
Expected: PASS — all 3 tests green

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/search/ packages/api/test/search/ packages/api/src/app.module.ts
git commit -m "feat(api): add unified search endpoint GET /search"
```

---

### Task 2: Frontend — Add search API method

**Files:**
- Modify: `packages/web/src/lib/api-client.ts`

- [ ] **Step 1: Add search method to api client**

In `packages/web/src/lib/api-client.ts`, add the search type and method to the `api` object:

Add before the `api` export:
```typescript
export interface SearchResponse {
  code: {
    filePath: string;
    name: string;
    chunkType: string;
    content: string;
    startLine: number;
    endLine: number;
    score: number;
  }[];
  articles: {
    articleSlug: string;
    heading: string;
    content: string;
    locale: string;
    score: number;
  }[];
}
```

Add to the `api` object:
```typescript
search: (q: string, locale: string, limit: number = 5) =>
  apiFetch<SearchResponse>(`/search?q=${encodeURIComponent(q)}&locale=${locale}&limit=${limit}`),
```

- [ ] **Step 2: Commit**

```bash
git add packages/web/src/lib/api-client.ts
git commit -m "feat(web): add search API method to api client"
```

---

### Task 3: Frontend — Add i18n search strings

**Files:**
- Modify: `packages/web/messages/en.json`
- Modify: `packages/web/messages/zh.json`
- Modify: `packages/web/messages/ja.json`

- [ ] **Step 1: Add search strings to en.json**

Add a `"search"` section to `packages/web/messages/en.json`:

```json
"search": {
  "placeholder": "Search code and articles...",
  "noResults": "No results found",
  "codeSection": "Code",
  "articlesSection": "Articles",
  "loading": "Searching..."
}
```

- [ ] **Step 2: Add search strings to zh.json**

Add a `"search"` section to `packages/web/messages/zh.json`:

```json
"search": {
  "placeholder": "搜索代码和文章...",
  "noResults": "未找到结果",
  "codeSection": "代码",
  "articlesSection": "文章",
  "loading": "搜索中..."
}
```

- [ ] **Step 3: Add search strings to ja.json**

Add a `"search"` section to `packages/web/messages/ja.json`:

```json
"search": {
  "placeholder": "コードと記事を検索...",
  "noResults": "結果が見つかりません",
  "codeSection": "コード",
  "articlesSection": "記事",
  "loading": "検索中..."
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/messages/
git commit -m "feat(web): add i18n strings for unified search"
```

---

### Task 4: Frontend — Rewrite SearchBar component

**Files:**
- Modify: `packages/web/src/components/SearchBar.tsx`

- [ ] **Step 1: Rewrite SearchBar with API-powered search and dropdown**

Replace the entire content of `packages/web/src/components/SearchBar.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, type SearchResponse } from "@/lib/api-client";

export function SearchBar() {
  const t = useTranslations("search");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  // All navigable result items flattened for keyboard nav
  const allItems: { type: "code" | "article"; index: number }[] = [];
  if (results) {
    results.code.forEach((_, i) => allItems.push({ type: "code", index: i }));
    results.articles.forEach((_, i) => allItems.push({ type: "article", index: i }));
  }

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const data = await api.search(q, locale);
      if (!controller.signal.aborted) {
        setResults(data);
        setOpen(true);
        setActiveIndex(-1);
      }
    } catch {
      if (!controller.signal.aborted) {
        setResults(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [locale]);

  const handleChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  }, [doSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (activeIndex >= 0 && activeIndex < allItems.length) {
        // Navigate to active item — handled by the Link click
        const el = containerRef.current?.querySelector(`[data-search-index="${activeIndex}"]`) as HTMLAnchorElement;
        el?.click();
      } else {
        doSearch(query);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < allItems.length - 1 ? prev + 1 : 0));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : allItems.length - 1));
    }
  }, [allItems.length, activeIndex, doSearch, query]);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const closeAndReset = () => {
    setQuery("");
    setResults(null);
    setOpen(false);
    setActiveIndex(-1);
  };

  const hasCode = results && results.code.length > 0;
  const hasArticles = results && results.articles.length > 0;
  const hasResults = hasCode || hasArticles;
  let flatIndex = 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder={t("placeholder")}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => results && setOpen(true)}
        className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
      />

      {open && query.length >= 2 && (
        <div className="absolute z-50 mt-1 max-h-96 w-full overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg)] shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-neutral-500">{t("loading")}</div>
          )}

          {!loading && !hasResults && (
            <div className="px-3 py-2 text-sm text-neutral-500">{t("noResults")}</div>
          )}

          {!loading && hasCode && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {t("codeSection")}
              </div>
              {results!.code.slice(0, 5).map((item, i) => {
                const idx = flatIndex++;
                return (
                  <Link
                    key={`code-${i}`}
                    href={`/code/${item.filePath}#L${item.startLine}`}
                    data-search-index={idx}
                    className={`block px-3 py-2 text-sm hover:bg-neutral-800 ${activeIndex === idx ? "bg-neutral-800" : ""}`}
                    onClick={closeAndReset}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--foreground)]">{item.name}</span>
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">{item.chunkType}</span>
                    </div>
                    <div className="truncate text-xs text-neutral-500">{item.filePath}</div>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && hasArticles && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                {t("articlesSection")}
              </div>
              {results!.articles.slice(0, 5).map((item, i) => {
                const idx = flatIndex++;
                return (
                  <Link
                    key={`article-${i}`}
                    href={`/articles/${item.articleSlug}`}
                    data-search-index={idx}
                    className={`block px-3 py-2 text-sm hover:bg-neutral-800 ${activeIndex === idx ? "bg-neutral-800" : ""}`}
                    onClick={closeAndReset}
                  >
                    <div className="font-medium text-[var(--foreground)]">{item.heading}</div>
                    <div className="truncate text-xs text-neutral-500">{item.articleSlug}</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd packages/web && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/SearchBar.tsx
git commit -m "feat(web): rewrite SearchBar with API-powered unified search"
```

---

### Task 5: Frontend — Integrate SearchBar into homepage

**Files:**
- Modify: `packages/web/src/app/[locale]/HomeClient.tsx`

- [ ] **Step 1: Add SearchBar to the hero section**

In `packages/web/src/app/[locale]/HomeClient.tsx`:

Add import at top:
```typescript
import { SearchBar } from "@/components/SearchBar";
```

Add the SearchBar inside the hero section, after the `hero-desc` paragraph and before the `stats-bar` div. Wrap it in a motion.div for consistent animation:

```tsx
<motion.div
  className="w-full max-w-xl mx-auto mt-6"
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, delay: 0.35 }}
>
  <SearchBar />
</motion.div>
```

- [ ] **Step 2: Verify the page builds**

Run: `cd packages/web && npx next build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/app/[locale]/HomeClient.tsx
git commit -m "feat(web): add SearchBar to homepage hero section"
```

---

### Task 6: Manual Integration Test

- [ ] **Step 1: Start backend and frontend**

Run: `cd packages/api && npm run start:dev` (in one terminal)
Run: `cd packages/web && npm run dev` (in another terminal)

- [ ] **Step 2: Verify search works end-to-end**

1. Open the homepage in browser
2. Type a query (3+ chars) in the search bar
3. Verify dropdown shows code and article results in separate sections
4. Verify keyboard navigation (up/down arrows, enter, escape) works
5. Verify clicking a code result navigates to `/code/{path}#L{line}`
6. Verify clicking an article result navigates to `/{locale}/articles/{slug}`
7. Verify switching locale changes article results
8. Verify "no results" message shows for nonsense queries

- [ ] **Step 3: Final commit if any fixes needed**
