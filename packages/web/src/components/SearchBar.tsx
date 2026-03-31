"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface SearchResult {
  path: string;
  line: number;
  text: string;
}

export function SearchBar() {
  const t = useTranslations("code");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [index, setIndex] = useState<{ path: string; lines: { num: number; text: string }[] }[]>([]);

  useEffect(() => {
    fetch("/search-index.json")
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => {});
  }, []);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.length < 3) {
        setResults([]);
        return;
      }
      const lower = q.toLowerCase();
      const matches: SearchResult[] = [];
      for (const file of index) {
        for (const line of file.lines) {
          if (line.text.toLowerCase().includes(lower)) {
            matches.push({ path: file.path, line: line.num, text: line.text.trim() });
            if (matches.length >= 50) break;
          }
        }
        if (matches.length >= 50) break;
      }
      setResults(matches);
    },
    [index]
  );

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={t("searchPlaceholder")}
        value={query}
        onChange={(e) => search(e.target.value)}
        className="w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
      />
      {results.length > 0 && (
        <div className="absolute z-10 mt-1 max-h-80 w-full overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--bg)]">
          {results.map((r, i) => (
            <Link
              key={`${r.path}:${r.line}:${i}`}
              href={`/code/${r.path}`}
              className="block border-b border-[var(--border)] px-3 py-2 text-sm hover:bg-neutral-900"
              onClick={() => { setQuery(""); setResults([]); }}
            >
              <span className="font-mono text-xs text-[var(--accent)]">{r.path}:{r.line}</span>
              <p className="truncate text-neutral-400">{r.text}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
