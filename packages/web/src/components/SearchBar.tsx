"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, type SearchResponse } from "@/lib/api-client";

interface SearchBarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchBar({ isOpen, onClose }: SearchBarProps) {
  const t = useTranslations("search");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);

  // All navigable result items flattened for keyboard nav
  const allItems: { type: "code" | "article"; index: number }[] = [];
  if (results) {
    results.code.forEach((_, i) => allItems.push({ type: "code", index: i }));
    results.articles.forEach((_, i) => allItems.push({ type: "article", index: i }));
  }

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQuery("");
      setResults(null);
      setActiveIndex(-1);
    }
  }, [isOpen]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults(null);
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
      onClose();
      return;
    }
    if (e.key === "Enter") {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (activeIndex >= 0 && activeIndex < allItems.length) {
        const el = overlayRef.current?.querySelector(`[data-search-index="${activeIndex}"]`) as HTMLAnchorElement;
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
  }, [allItems.length, activeIndex, doSearch, query, onClose]);

  const handleResultClick = () => {
    onClose();
  };

  if (!isOpen) return null;

  const hasCode = results && results.code.length > 0;
  const hasArticles = results && results.articles.length > 0;
  const hasResults = hasCode || hasArticles;
  const showResults = query.length >= 2;
  let flatIndex = 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div ref={overlayRef} className="w-full max-w-2xl mx-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] shadow-2xl">
        <div className="flex items-center border-b border-[var(--border)] px-3">
          <svg className="h-4 w-4 shrink-0 text-neutral-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent px-3 py-3 text-sm focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-[var(--border)] px-1.5 py-0.5 text-xs text-neutral-500">Esc</kbd>
        </div>

        {showResults && (
          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="px-3 py-3 text-sm text-neutral-500">{t("loading")}</div>
            )}

            {!loading && !hasResults && (
              <div className="px-3 py-3 text-sm text-neutral-500">{t("noResults")}</div>
            )}

            {!loading && hasResults && (
              <div className="grid grid-cols-2 divide-x divide-[var(--border)]">
                <div className="py-1">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t("codeSection")}
                  </div>
                  {hasCode ? results!.code.slice(0, 5).map((item, i) => {
                    const idx = flatIndex++;
                    return (
                      <Link
                        key={`code-${i}`}
                        href={`/code/${item.filePath}#L${item.startLine}`}
                        data-search-index={idx}
                        className={`block px-3 py-2 text-sm hover:bg-neutral-800 ${activeIndex === idx ? "bg-neutral-800" : ""}`}
                        onClick={handleResultClick}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-[var(--foreground)]">{item.name}</span>
                          <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-xs text-neutral-400">{item.chunkType}</span>
                        </div>
                        <div className="truncate text-xs text-neutral-500">{item.filePath}</div>
                      </Link>
                    );
                  }) : (
                    <div className="px-3 py-2 text-sm text-neutral-600">—</div>
                  )}
                </div>

                <div className="py-1">
                  <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    {t("articlesSection")}
                  </div>
                  {hasArticles ? results!.articles.slice(0, 5).map((item, i) => {
                    const idx = flatIndex++;
                    return (
                      <Link
                        key={`article-${i}`}
                        href={`/articles/${item.articleSlug}`}
                        data-search-index={idx}
                        className={`block px-3 py-2 text-sm hover:bg-neutral-800 ${activeIndex === idx ? "bg-neutral-800" : ""}`}
                        onClick={handleResultClick}
                      >
                        <div className="font-medium text-[var(--foreground)]">{item.heading}</div>
                        <div className="truncate text-xs text-neutral-500">{item.articleSlug}</div>
                      </Link>
                    );
                  }) : (
                    <div className="px-3 py-2 text-sm text-neutral-600">—</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
