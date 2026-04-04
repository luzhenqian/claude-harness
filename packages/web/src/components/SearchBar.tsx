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
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

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

  // ⌘K shortcut and custom search-focus event
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
    const handleSearchFocus = () => {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    document.addEventListener("search-focus", handleSearchFocus);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
      document.removeEventListener("search-focus", handleSearchFocus);
    };
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
        ref={inputRef}
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
