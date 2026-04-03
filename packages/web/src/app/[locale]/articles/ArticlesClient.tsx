"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { t, formatTemplate, getArticleTag } from "@/lib/ui-translations";

interface ArticlesClientProps {
  locale: string;
  articles: { slug: string; title: string; description: string; order: number; readTime: number }[];
}

export default function ArticlesClient({ locale, articles }: ArticlesClientProps) {
  return (
    <section className="articles-section" style={{ marginTop: '60px', marginBottom: '100px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="section-header"
      >
        <div>
          <div className="section-title">All Articles</div>
          <h2 className="section-subtitle">{t(locale, 'articles.subtitle')}</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: '12px', fontSize: '15px' }}>{t(locale, 'articles.desc')}</p>
        </div>
      </motion.div>

      <div className="articles-grid">
        {articles.map((article, index) => {
          const { tag, tagClass } = getArticleTag(locale, article.order);
          const readTime = formatTemplate(t(locale, 'article.readTime'), { readTime: article.readTime });

          return (
            <motion.div
              key={article.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href={`/${locale}/articles/${article.slug}`} className="article-card" style={{ display: 'block', textDecoration: 'none' }}>
                <div className="article-meta">
                  <span className={`article-tag ${tagClass}`}>{tag}</span>
                  <span className="article-num">{String(article.order).padStart(2, '0')}</span>
                </div>
                <h3 className="article-title">{article.title}</h3>
                <p className="article-desc">{article.description}</p>
                <div className="article-footer">
                  <span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {readTime}
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
