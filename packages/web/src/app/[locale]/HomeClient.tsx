"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { SearchBar } from "@/components/SearchBar";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: "easeOut" as const } },
};

function MotionLink({ href, className, style, variants, children }: {
  href: string;
  className?: string;
  style?: React.CSSProperties;
  variants?: Variants;
  children: React.ReactNode;
}) {
  return (
    <motion.div variants={variants} style={style} className={className}>
      <Link href={href} style={{ display: 'block', height: '100%', textDecoration: 'none', color: 'inherit' }}>
        {children}
      </Link>
    </motion.div>
  );
}

import { t, formatTemplate, getArticleTag, heroDescription } from "@/lib/ui-translations";

const cellSizes = ['cell-xl', 'cell-lg', 'cell-md', 'cell-sm', 'cell-sm'];
const cellColors = ['var(--accent)', 'var(--blue)', 'var(--green)', 'var(--purple)', 'var(--cyan)'];

interface HomeClientProps {
  locale: string;
  articles: { slug: string; title: string; description: string; order: number; readTime: number }[];
  moduleStats: { name: string; fileCount: number; lineCount: number; description: string }[];
  sourceSummary: { totalFiles: number; totalLines: number; totalModules: number };
}

export default function HomeClient({ locale, articles, moduleStats, sourceSummary }: HomeClientProps) {
  const displayArticles = articles.slice(0, 3);
  const displayModules = moduleStats.slice(0, 5);

  const totalFiles = sourceSummary.totalFiles;
  const totalLinesK = Math.floor(sourceSummary.totalLines / 1000);
  const totalModules = sourceSummary.totalModules;

  // Calculate max lineCount among displayed modules for bar width percentages
  const maxLines = Math.max(...displayModules.map(m => m.lineCount));

  return (
    <>
      {/* HERO SECTION */}
      <section className="hero">
        <motion.div
          className="hero-badge"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="pulse-dot"></div>
          {t(locale, 'home.badge')}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {t(locale, 'home.heading').split('<highlight>').map((part, i) => {
            if (i === 0) return part;
            const [highlight, rest] = part.split('</highlight>');
            return <span key={i}><span className="highlight">{highlight}</span>{rest}</span>;
          })}
        </motion.h1>

        <motion.p
          className="hero-desc"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {heroDescription(locale, totalFiles, totalLinesK)}
        </motion.p>

        <motion.div
          className="w-full max-w-xl mx-auto mt-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <SearchBar />
        </motion.div>

        <motion.div
          className="stats-bar"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="stat" variants={itemVariants}>
            <span className="stat-value">{totalFiles.toLocaleString()}+</span>
            <span className="stat-label">{t(locale, 'home.statFiles')}</span>
          </motion.div>
          <motion.div className="stat" variants={itemVariants}>
            <span className="stat-value">{totalLinesK}k+</span>
            <span className="stat-label">{t(locale, 'home.statLines')}</span>
          </motion.div>
          <motion.div className="stat" variants={itemVariants}>
            <span className="stat-value">{totalModules}</span>
            <span className="stat-label">{t(locale, 'home.statModules')}</span>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: "easeOut" }}
        >
          <div className="code-window">
            <div className="code-titlebar">
              <div className="dot-r"></div>
              <div className="dot-y"></div>
              <div className="dot-g"></div>
              <span>agent-loop.ts</span>
            </div>
            <div className="code-body">
              <div><span className="ln">1</span><span className="kw">async function</span> <span className="fn">runAgentLoop</span><span className="op">(</span>ctx<span className="op">:</span> <span className="tp">Context</span><span className="op">)</span> <span className="op">{"{"}</span></div>
              <div><span className="ln">2</span>  <span className="kw">while</span> <span className="op">(</span><span className="kw">true</span><span className="op">)</span> <span className="op">{"{"}</span></div>
              <div><span className="ln">3</span>    <span className="cm">{t(locale, 'home.codeComment1')}</span></div>
              <div><span className="ln">4</span>    <span className="kw">const</span> tools <span className="op">=</span> <span className="kw">await</span> <span className="fn">getAvailableTools</span><span className="op">(</span>ctx<span className="op">)</span><span className="op">;</span></div>
              <div><span className="ln">5</span>    </div>
              <div><span className="ln">6</span>    <span className="cm">{t(locale, 'home.codeComment2')}</span></div>
              <div><span className="ln">7</span>    <span className="kw">const</span> response <span className="op">=</span> <span className="kw">await</span> <span className="fn">callClaude</span><span className="op">(</span>ctx<span className="op">,</span> tools<span className="op">)</span><span className="op">;</span></div>
              <div><span className="ln">8</span>    </div>
              <div><span className="ln">9</span>    <span className="cm">{t(locale, 'home.codeComment3')}</span></div>
              <div><span className="ln">10</span>    <span className="kw">if</span> <span className="op">(</span>response<span className="op">.</span><span className="tp">type</span> <span className="op">===</span> <span className="str">{`'tool_calls'`}</span><span className="op">)</span> <span className="op">{"{"}</span></div>
              <div><span className="ln">11</span>      <span className="kw">await</span> <span className="fn">executeTools</span><span className="op">(</span>ctx<span className="op">,</span> response<span className="op">.</span><span className="tp">calls</span><span className="op">)</span><span className="op">;</span></div>
              <div><span className="ln">12</span>    <span className="op">{"}"}</span> <span className="kw">else</span> <span className="op">{"{"}</span></div>
              <div><span className="ln">13</span>      <span className="kw">return</span> response<span className="op">.</span><span className="tp">text</span><span className="op">;</span></div>
              <div><span className="ln">14</span>    <span className="op">{"}"}</span></div>
              <div><span className="ln">15</span>  <span className="op">{"}"}</span></div>
              <div><span className="ln">16</span><span className="op">{"}"}</span></div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* TREEMAP SECTION */}
      <motion.section
        className="treemap-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <motion.div className="section-header" variants={itemVariants}>
          <div>
            <div className="section-title">Architecture</div>
            <h2 className="section-subtitle">{t(locale, 'home.archSubtitle')}</h2>
          </div>
          <Link href={`/${locale}/modules`} className="section-link">{t(locale, 'home.archLink')} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></Link>
        </motion.div>

        <motion.div className="treemap-container" variants={containerVariants}>
          {displayModules.map((mod, i) => (
            <MotionLink
              key={mod.name}
              href={`/${locale}/modules`}
              className={`tree-cell ${cellSizes[i]}`}
              style={{ '--cell-color': cellColors[i] } as React.CSSProperties}
              variants={scaleVariants}
            >
              <div>
                <div className="tree-cell-name">{mod.name}</div>
                <div className="tree-cell-desc">{mod.description}</div>
              </div>
              <div className="tree-cell-stats">
                <span>{mod.fileCount} Files</span>
                <span>{(mod.lineCount / 1000).toFixed(1)}k LOC</span>
              </div>
              <div className="tree-cell-bar">
                <div className="tree-cell-bar-fill" style={{ width: `${Math.round((mod.lineCount / maxLines) * 100)}%` }}></div>
              </div>
            </MotionLink>
          ))}
        </motion.div>
      </motion.section>

      {/* ARTICLES SECTION */}
      <motion.section
        className="articles-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <motion.div className="section-header" variants={itemVariants}>
          <div>
            <div className="section-title">Deep Dives</div>
            <h2 className="section-subtitle">{t(locale, 'home.articlesSubtitle')}</h2>
          </div>
          <Link href={`/${locale}/articles`} className="section-link">{t(locale, 'home.articlesLink')} <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></Link>
        </motion.div>

        <motion.div className="articles-grid" variants={containerVariants}>
          {displayArticles.map((article, i) => {
            const { tag, tagClass } = getArticleTag(locale, article.order);
            const orderStr = String(article.order).padStart(2, '0');
            return (
              <motion.div key={article.slug} variants={itemVariants} className={i === 0 ? 'featured' : ''}>
                <Link
                  href={`/${locale}/articles/${article.slug}`}
                  className="article-card"
                  style={{ display: 'block', textDecoration: 'none', height: '100%' }}
                >
                  <div className="article-meta">
                    <span className={`article-tag ${tagClass}`}>{tag}</span>
                    <span className="article-num">{orderStr}</span>
                  </div>
                  <h3 className="article-title">{article.title}</h3>
                  <p className="article-desc">{article.description}</p>
                  <div className="article-footer">
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> {formatTemplate(t(locale, 'article.readTime'), { readTime: article.readTime })}</span>
                    {i === 0 && (
                      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> {t(locale, 'home.deepDive')}</span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.section>

      {/* ROADMAP SECTION */}
      <motion.section
        className="roadmap-section"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={containerVariants}
      >
        <motion.div className="section-header" variants={itemVariants}>
          <div>
            <div className="section-title">Roadmap</div>
            <h2 className="section-subtitle">{t(locale, 'home.roadmapSubtitle')}</h2>
          </div>
        </motion.div>

        <motion.div className="roadmap" variants={containerVariants}>
          <motion.div className="roadmap-step" variants={itemVariants}>
            <div className="roadmap-dot" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>01</div>
            <div className="roadmap-label">{t(locale, 'home.roadmap1Label')}</div>
            <div className="roadmap-sub">{t(locale, 'home.roadmap1Sub')}</div>
          </motion.div>
          <motion.div className="roadmap-step" variants={itemVariants}>
            <div className="roadmap-dot" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>02</div>
            <div className="roadmap-label">{t(locale, 'home.roadmap2Label')}</div>
            <div className="roadmap-sub">{t(locale, 'home.roadmap2Sub')}</div>
          </motion.div>
          <motion.div className="roadmap-step" variants={itemVariants}>
            <div className="roadmap-dot" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>03</div>
            <div className="roadmap-label">{t(locale, 'home.roadmap3Label')}</div>
            <div className="roadmap-sub">{t(locale, 'home.roadmap3Sub')}</div>
          </motion.div>
          <motion.div className="roadmap-step" variants={itemVariants}>
            <div className="roadmap-dot" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>04</div>
            <div className="roadmap-label">{t(locale, 'home.roadmap4Label')}</div>
            <div className="roadmap-sub">{t(locale, 'home.roadmap4Sub')}</div>
          </motion.div>
        </motion.div>
      </motion.section>
    </>
  );
}
