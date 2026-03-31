"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LocaleSwitcher } from "./LocaleSwitcher";

export function Nav() {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <nav className="border-b border-[var(--border)] px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-lg font-bold text-[var(--accent)]">
          claude-harness
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/articles" className={`hover:text-[var(--accent)] ${pathname === "/articles" ? "text-[var(--accent)]" : ""}`}>
            {t("articles")}
          </Link>
          <Link href="/code" className={`hover:text-[var(--accent)] ${pathname.startsWith("/code") ? "text-[var(--accent)]" : ""}`}>
            {t("code")}
          </Link>
          <Link href="/modules" className={`hover:text-[var(--accent)] ${pathname === "/modules" ? "text-[var(--accent)]" : ""}`}>
            {t("modules")}
          </Link>
          <LocaleSwitcher />
        </div>
      </div>
    </nav>
  );
}
