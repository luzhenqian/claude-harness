"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { LocaleSwitcher } from "./LocaleSwitcher";
import { t } from "@/lib/ui-translations";
import { UserMenu } from './UserMenu';

export function Nav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

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
    <>
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
          <div className="nav-search" onClick={() => document.dispatchEvent(new CustomEvent("search-focus"))} style={{ cursor: 'pointer' }}>
            <Search className="h-3 w-3" />
            <span>{t(locale, 'nav.search')}</span>
            <kbd>⌘K</kbd>
          </div>
          <LocaleSwitcher />
          <UserMenu locale={locale} />
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "mobile-menu-link",
                  pathname === item.path ? "active" : ""
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export function Footer() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  const isArticleDetail = segments.length >= 3 && segments[1] === 'articles';
  const isChatPage = segments.length >= 2 && segments[1] === 'chat';
  if (isArticleDetail || isChatPage) return null;

  const locale = segments[0] || 'en';

  return (
    <footer>
      <div>&copy; 2026 Claude Harness. {t(locale, 'nav.footer')}</div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <a href="https://github.com/luzhenqian/claude-harness" target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
    </footer>
  );
}
