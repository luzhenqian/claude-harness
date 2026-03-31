"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";

const localeLabels: Record<string, string> = {
  en: "EN",
  zh: "中文",
  ja: "日本語",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <select
      value={locale}
      onChange={(e) => {
        router.replace(pathname, { locale: e.target.value });
      }}
      className="rounded border border-[var(--border)] bg-transparent px-2 py-1 text-xs text-neutral-300 focus:border-[var(--accent)] focus:outline-none"
    >
      {Object.entries(localeLabels).map(([key, label]) => (
        <option key={key} value={key} className="bg-[var(--bg)]">
          {label}
        </option>
      ))}
    </select>
  );
}
