"use client";

import { motion } from "motion/react";

const MODULE_COLORS = [
  'var(--accent)',
  'var(--blue)',
  'var(--green)',
  'var(--purple)',
  'var(--cyan)',
];

interface ModulesClientProps {
  modules: { name: string; path: string; fileCount: number; lineCount: number; description: string }[];
}

export default function ModulesClient({ modules }: ModulesClientProps) {
  return (
    <section className="treemap-section" style={{ marginTop: '60px', marginBottom: '100px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="section-header"
      >
        <div>
          <div className="section-title">All Modules</div>
          <h2 className="section-subtitle">模块索引</h2>
          <p style={{ color: 'var(--text-dim)', marginTop: '12px', fontSize: '15px' }}>Claude Code 源码包含 {modules.length} 个顶层模块，按代码行数排序。</p>
        </div>
      </motion.div>

      <div className="treemap-container" style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}>
        {modules.map((mod, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.02, ease: [0.16, 1, 0.3, 1] }}
            className="tree-cell cell-xl"
            style={{ '--cell-color': MODULE_COLORS[index % MODULE_COLORS.length], gridColumn: 'span 4' } as React.CSSProperties}
          >
            <div>
              <div className="tree-cell-name">{mod.name}/</div>
              <div className="tree-cell-desc">{mod.description}</div>
            </div>
            <div className="tree-cell-stats">
              <span>{mod.fileCount} Files</span>
              <span>{mod.lineCount.toLocaleString()} LOC</span>
            </div>
            <div className="tree-cell-bar"><div className="tree-cell-bar-fill" style={{ width: '100%' }}></div></div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
