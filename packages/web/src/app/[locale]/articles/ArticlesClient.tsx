"use client";

import { motion } from "motion/react";
import Link from "next/link";

interface ArticlesClientProps {
  locale: string;
  articles: { slug: string; title: string; description: string; order: number }[];
}

function getArticleTag(order: number): { tag: string; tagClass: string } {
  const tags: Record<number, { tag: string; tagClass: string }> = {
    1: { tag: '架构解析', tagClass: 'tag-arch' },
    2: { tag: '核心机制', tagClass: 'tag-perf' },
    3: { tag: '工具系统', tagClass: 'tag-agent' },
    4: { tag: '并发模型', tagClass: 'tag-sec' },
    5: { tag: '安全机制', tagClass: 'tag-sec' },
    6: { tag: '内存管理', tagClass: 'tag-mem' },
    7: { tag: '性能优化', tagClass: 'tag-perf' },
    8: { tag: '架构解析', tagClass: 'tag-arch' },
    9: { tag: '核心机制', tagClass: 'tag-mem' },
  };
  return tags[order] || { tag: '源码解析', tagClass: 'tag-sec' };
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
          <h2 className="section-subtitle">深度解析文章</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: '12px', fontSize: '15px' }}>Claude Code 架构与内部实现的源码导读。</p>
        </div>
      </motion.div>

      <div className="articles-grid">
        {articles.map((article, index) => {
          const { tag, tagClass } = getArticleTag(article.order);
          const readTime = `${Math.max(8, 20 - article.order)} min read`;

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
