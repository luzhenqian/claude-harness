"use client";

import Link from "next/link";
import { motion, type Variants } from "motion/react";

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

const cellSizes = ['cell-xl', 'cell-lg', 'cell-md', 'cell-sm', 'cell-sm'];
const cellColors = ['var(--accent)', 'var(--blue)', 'var(--green)', 'var(--purple)', 'var(--cyan)'];

interface HomeClientProps {
  locale: string;
  articles: { slug: string; title: string; description: string; order: number }[];
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
          v0.2.29 源码解析已更新
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          拆解 <span className="highlight">Claude Code</span> 源码
        </motion.h1>

        <motion.p
          className="hero-desc"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          深入探索 Anthropic 官方 CLI 工具的内部机制。从架构设计、Agent 循环到终端渲染，全面解析 {totalFiles.toLocaleString()}+ 个文件、{totalLinesK}k+ 行 TypeScript 代码。
        </motion.p>

        <motion.div
          className="stats-bar"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="stat" variants={itemVariants}>
            <span className="stat-value">{totalFiles.toLocaleString()}+</span>
            <span className="stat-label">源文件</span>
          </motion.div>
          <motion.div className="stat" variants={itemVariants}>
            <span className="stat-value">{totalLinesK}k+</span>
            <span className="stat-label">代码行数</span>
          </motion.div>
          <motion.div className="stat" variants={itemVariants}>
            <span className="stat-value">{totalModules}</span>
            <span className="stat-label">核心模块</span>
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
              <div><span className="ln">3</span>    <span className="cm">{"// 1. 收集上下文与工具"}</span></div>
              <div><span className="ln">4</span>    <span className="kw">const</span> tools <span className="op">=</span> <span className="kw">await</span> <span className="fn">getAvailableTools</span><span className="op">(</span>ctx<span className="op">)</span><span className="op">;</span></div>
              <div><span className="ln">5</span>    </div>
              <div><span className="ln">6</span>    <span className="cm">{"// 2. 调用 Claude API"}</span></div>
              <div><span className="ln">7</span>    <span className="kw">const</span> response <span className="op">=</span> <span className="kw">await</span> <span className="fn">callClaude</span><span className="op">(</span>ctx<span className="op">,</span> tools<span className="op">)</span><span className="op">;</span></div>
              <div><span className="ln">8</span>    </div>
              <div><span className="ln">9</span>    <span className="cm">{"// 3. 处理工具调用或返回结果"}</span></div>
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
            <h2 className="section-subtitle">核心模块拆解</h2>
          </div>
          <Link href={`/${locale}/modules`} className="section-link">查看完整架构图 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></Link>
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
            <h2 className="section-subtitle">深度解析文章</h2>
          </div>
          <Link href={`/${locale}/articles`} className="section-link">浏览所有文章 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></Link>
        </motion.div>

        <motion.div className="articles-grid" variants={containerVariants}>
          {displayArticles.map((article, i) => {
            const { tag, tagClass } = getArticleTag(article.order);
            const orderStr = String(article.order).padStart(2, '0');
            return (
              <motion.div key={article.slug} variants={itemVariants} className={i === 0 ? 'featured' : ''} style={i === 0 ? { gridColumn: 'span 2' } : undefined}>
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
                    <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> 15 min read</span>
                    {i === 0 && (
                      <span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> 深入源码</span>
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
            <h2 className="section-subtitle">解析计划</h2>
          </div>
        </motion.div>

        <motion.div className="roadmap" variants={containerVariants}>
          <motion.div className="roadmap-step" variants={itemVariants}>
            <div className="roadmap-dot" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>01</div>
            <div className="roadmap-label">基础架构与启动</div>
            <div className="roadmap-sub">CLI 入口、配置加载、鉴权流程</div>
          </motion.div>
          <motion.div className="roadmap-step" variants={itemVariants}>
            <div className="roadmap-dot" style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>02</div>
            <div className="roadmap-label">Agent 核心循环</div>
            <div className="roadmap-sub">Prompt 构建、API 交互、工具调度</div>
          </motion.div>
          <motion.div className="roadmap-step" variants={itemVariants}>
            <div className="roadmap-dot" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>03</div>
            <div className="roadmap-label">工具库实现</div>
            <div className="roadmap-sub">文件操作、Bash 执行、AST 分析</div>
          </motion.div>
          <motion.div className="roadmap-step" variants={itemVariants}>
            <div className="roadmap-dot" style={{ borderColor: 'var(--accent)', color: 'var(--accent)', boxShadow: '0 0 20px var(--accent-glow)' }}>04</div>
            <div className="roadmap-label">终端 UI 渲染</div>
            <div className="roadmap-sub">Ink 组件树、流式输出、交互处理</div>
          </motion.div>
        </motion.div>
      </motion.section>
    </>
  );
}
