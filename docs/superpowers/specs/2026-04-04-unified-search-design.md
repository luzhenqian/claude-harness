# Unified Search Feature Design

## Overview

Replace the existing static JSON-based search in the homepage SearchBar with a unified search experience powered by the backend's hybrid semantic + full-text search. Users can search both code and articles from a single search bar with results displayed in a dropdown panel.

## Backend API

### New Endpoint: `GET /search`

A new `SearchController` in a dedicated `SearchModule`, importing `IndexModule` to use the existing `SearchService`.

**Parameters:**

| Param    | Type   | Required | Default | Description                     |
|----------|--------|----------|---------|---------------------------------|
| `q`      | string | yes      | —       | Search query, minimum 2 chars   |
| `locale` | string | no       | `en`    | Locale for filtering articles   |
| `limit`  | number | no       | `10`    | Max results per category        |

**Response:**

```json
{
  "code": [
    {
      "filePath": "src/index/search.service.ts",
      "name": "searchCode",
      "chunkType": "function",
      "content": "async searchCode(query: string)...",
      "startLine": 10,
      "endLine": 30,
      "score": 0.85
    }
  ],
  "articles": [
    {
      "articleSlug": "getting-started",
      "heading": "Installation",
      "content": "To install the project...",
      "locale": "en",
      "score": 0.78
    }
  ]
}
```

**Implementation:**

- Inject existing `SearchService`
- Call `searchCode()` and `searchArticles()` in parallel
- Each category sorted by score descending
- No cross-category ranking needed
- No authentication required (public endpoint)
- Swagger-documented

### Module Structure

- `packages/api/src/search/search.controller.ts` — controller with GET /search
- `packages/api/src/search/search.module.ts` — imports IndexModule

## Frontend SearchBar Redesign

### Trigger Mechanism

- Debounce 300ms on input for automatic search
- Enter key triggers immediate search (cancels pending debounce)
- Minimum 2 characters to trigger request
- `AbortController` cancels previous in-flight request on new search

### Dropdown Panel Layout

Two sections with headers:

1. **Code** section:
   - Icon + function/class name + chunkType badge (function/class/interface/type)
   - File path shown below in muted text
   - Click navigates to `/code/{filePath}#L{startLine}`

2. **Articles** section:
   - Icon + heading text + articleSlug in muted text
   - Click navigates to `/{locale}/articles/{articleSlug}`

- Max 5 results per category displayed
- "No results" message when both categories empty
- Loading spinner during search

### Keyboard Navigation

- Up/Down arrows navigate between results across both sections
- Enter opens the highlighted result
- Esc closes the dropdown
- Click outside closes the dropdown

### Component Architecture

- Rewrite existing `packages/web/src/components/SearchBar.tsx`
- Remove static `search-index.json` loading logic
- Add search API call function in `packages/web/src/lib/api.ts`
- Use `useLocale()` from `next-intl` for locale parameter
- Use Radix UI `Popover` for dropdown panel
- Use Next.js `Link` for result navigation
- All state managed locally within the component

### Internationalization

Add search-related strings to all three locale files (`en.json`, `zh.json`, `ja.json`):
- Search placeholder text
- "No results" message
- Section headers ("Code", "Articles")

## Out of Scope

- Search history
- Autocomplete / search suggestions
- Result content highlighting
- Removal of `search-index.json` (may be used elsewhere)
- Dedicated search results page
- Authentication for search endpoint
