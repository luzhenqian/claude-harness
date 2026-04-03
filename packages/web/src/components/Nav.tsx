"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { t } from "@/lib/ui-translations";
import { UserMenu } from './UserMenu';

export function Nav() {
  const pathname = usePathname();

  // Hide nav on article detail pages (e.g. /zh/articles/overview)
  const segments = pathname.split('/').filter(Boolean);
  const isArticleDetail = segments.length >= 3 && segments[1] === 'articles';
  if (isArticleDetail) return null;

  // Extract locale prefix for links
  const locale = segments[0] || 'en';

  const navItems = [
    { name: t(locale, 'nav.articles'), path: `/${locale}/articles` },
    { name: t(locale, 'nav.code'), path: `/${locale}/code` },
    { name: t(locale, 'nav.modules'), path: `/${locale}/modules` },
  ];

  return (
    <nav>
      <Link href={`/${locale}`} className="nav-logo">
        <div className="dot"></div>
        Claude Harness
      </Link>
      <div className="nav-links">
        {navItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={cn(
              pathname === item.path ? "active" : ""
            )}
          >
            {item.name}
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div className="nav-search">
          <Search className="h-3 w-3" />
          <span>{t(locale, 'nav.search')}</span>
          <kbd>⌘K</kbd>
        </div>
        <LocaleSwitcher />
        <UserMenu locale={locale} />
      </div>
    </nav>
  );
}

export function Footer() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  const isArticleDetail = segments.length >= 3 && segments[1] === 'articles';
  if (isArticleDetail) return null;

  const locale = segments[0] || 'en';

  return (
    <footer>
      <div>&copy; 2026 Claude Harness. {t(locale, 'nav.footer')}</div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <a href="#">GitHub</a>
        <a href="#">Twitter</a>
        <a href="#">Discord</a>
      </div>
    </footer>
  );
}
