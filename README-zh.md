[English](./README.md) | [中文](./README-zh.md) | [日本語](./README-ja.md)

# Claude Harness

> 解构 Claude Code — 交互式源码分析、深度技术解读与架构探索平台。

**Claude Harness** 是一个开源平台，用于探索和理解 [Claude Code](https://docs.anthropic.com/en/docs/claude-code)（Anthropic 官方 AI 编程代理）的内部实现。通过交互式代码浏览、深度技术文章和模块级分析，将 50 万行 TypeScript 源码转化为可理解的学习资源。

## 为什么做这个项目

Claude Code 是目前最精密的 AI 代理工具之一 — 在工具设计、上下文管理、权限治理和多代理协作方面堪称典范。但仅凭原始源码去理解其架构，门槛极高。

Claude Harness 让这套架构变得可读、可探索：

- **引导式文章** — 结合真实代码引用，逐一解读每个子系统
- **交互式代码浏览器** — 语法高亮 + 全文搜索，随时查阅源码
- **模块可视化** — 揭示代码库的结构关系与规模分布

无论你是在构建自己的 AI 代理、研究工具编排模式，还是单纯好奇 Claude Code 的工作原理 — 这个项目都适合你。

## 数据概览

| 指标 | 数值 |
|------|------|
| 分析源文件数 | **1,902** |
| 代码行数 | **514,587** |
| 映射模块数 | **35** |
| 技术文章 | **31+** |
| 支持语言 | English, 中文, 日本語 |

## 核心功能

### 交互式代码浏览器

浏览完整的 Claude Code 源码目录树，支持文件浏览器导航、[Shiki](https://shiki.matsu.io/) 语法高亮，以及基于 [FlexSearch](https://github.com/nextapps-de/flexsearch) 的客户端即时搜索。

### 深度技术文章

31 篇引导式技术解读，覆盖每个核心子系统：

| # | 文章 |
|---|------|
| 01 | [全景：512,000 行代码的 AI CLI 是怎么构建的](./content/articles/zh/01-overview.mdx) |
| 02 | [查询引擎：一次对话的完整生命周期](./content/articles/zh/02-query-engine.mdx) |
| 03 | [工具系统：AI 如何安全地与外部世界交互](./content/articles/zh/03-tool-system.mdx) |
| 04 | [流式工具执行器：如何安全地让 AI 同时操作多个工具](./content/articles/zh/04-streaming-tool-executor.mdx) |
| 05 | [权限系统：在"自主"与"安全"之间走钢丝](./content/articles/zh/05-permission-system.mdx) |
| 06 | [上下文管理：当百万 Token 也不够用时](./content/articles/zh/06-context-management.mdx) |
| 07 | [启动性能：一个重型 CLI 如何做到快速冷启动](./content/articles/zh/07-startup-performance.mdx) |
| 08 | [多 Agent 编排：Coordinator 模式如何让多个 AI 协同工作](./content/articles/zh/08-multi-agent.mdx) |
| 09 | [持久化记忆：如何让 AI 跨会话记住你](./content/articles/zh/09-memory-system.mdx) |
| 10 | [Bridge 系统：CLI 与 IDE 的双向通信架构](./content/articles/zh/10-bridge-system.mdx) |
| 11 | [MCP 协议集成：如何让 AI 工具连接一切](./content/articles/zh/11-mcp-integration.mdx) |
| 12 | [插件与技能：三层可扩展性架构](./content/articles/zh/12-plugins-skills.mdx) |
| 13 | [OAuth 与认证：从 Keychain 到 Token 刷新的全链路](./content/articles/zh/13-auth.mdx) |
| 14 | [终端 UI 框架：用 React 构建命令行界面](./content/articles/zh/14-terminal-ui.mdx) |
| 15 | [键绑定与 Vim 模式：在 CLI 中实现编辑器级交互](./content/articles/zh/15-keybindings-vim.mdx) |
| 16 | [屏幕系统：全屏交互模式的设计](./content/articles/zh/16-screens.mdx) |
| 17 | [状态管理：没有 Redux 的 React 状态架构](./content/articles/zh/17-state-management.mdx) |
| 18 | [遥测与可观测性：OpenTelemetry 在 CLI 中的应用](./content/articles/zh/18-telemetry.mdx) |
| 19 | [配置系统：Schema 验证、迁移与多来源合并](./content/articles/zh/19-config-system.mdx) |
| 20 | [Feature Flag 与条件编译：编译期的代码消除术](./content/articles/zh/20-feature-flags.mdx) |
| 21 | [文件操作三剑客：Read、Write、Edit 的设计哲学](./content/articles/zh/21-file-operations.mdx) |
| 22 | [BashTool：让 AI 安全执行 Shell 命令](./content/articles/zh/22-bash-tool.mdx) |
| 23 | [搜索系统：Glob + Grep + 全文搜索的组合拳](./content/articles/zh/23-search-system.mdx) |
| 24 | [Web 工具：AI 如何访问互联网](./content/articles/zh/24-web-tools.mdx) |
| 25 | [LSP 集成：Language Server Protocol 如何增强 AI 编码](./content/articles/zh/25-lsp-integration.mdx) |
| 26 | [Buddy 系统：代码库里的宠物养成游戏](./content/articles/zh/26-buddy-system.mdx) |
| 27 | [输出样式系统：让终端输出也有品牌感](./content/articles/zh/27-output-styles.mdx) |
| 28 | [远程执行与定时触发：Headless AI Agent](./content/articles/zh/28-remote-execution.mdx) |
| 29 | [会话管理：中断、恢复与共享](./content/articles/zh/29-session-management.mdx) |
| 30 | [API 客户端：与 Anthropic API 的深度集成](./content/articles/zh/30-api-client.mdx) |
| 31 | [错误处理与自愈：AI 如何从失败中恢复](./content/articles/zh/31-error-recovery.mdx) |

### 模块浏览器

可视化展示 35 个核心模块的文件数、代码行数与功能描述：

```
utils          564 文件   181K 行   工具函数
components     389 文件    82K 行   Ink UI 组件 (~140 个)
services       130 文件    54K 行   外部服务集成
tools          184 文件    51K 行   代理工具实现 (~40 个)
commands       207 文件    27K 行   斜杠命令 (~50 个)
hooks          104 文件    19K 行   React Hooks
ink             96 文件    20K 行   Ink 渲染器封装
...以及另外 28 个模块
```

### 多语言支持

完整的国际化支持，覆盖英文、中文和日文 — 提供基于 locale 的路由和自动回退机制。

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| 代码高亮 | [Shiki](https://shiki.matsu.io/) |
| 搜索 | [FlexSearch](https://github.com/nextapps-de/flexsearch) |
| 文章 | [MDX](https://mdxjs.com/) via next-mdx-remote |
| 国际化 | [next-intl](https://next-intl.dev/) |
| 动画 | [Motion](https://motion.dev/) |
| 图表 | [Mermaid](https://mermaid.js.org/) |
| Monorepo | [Turbo](https://turbo.build/) |
| 部署 | [Vercel](https://vercel.com/) |

## 快速开始

### 环境要求

- **Node.js 22+**（见 `.node-version`）
- **pnpm**（或 npm）

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/anthropics/claude-harness.git
cd claude-harness

# 安装依赖
pnpm install

# 生成元数据（文件树、模块统计、搜索索引）
pnpm generate

# 启动开发服务器
pnpm dev
```

应用将在 `http://localhost:3000` 可用。

### 生产构建

```bash
pnpm build
```

## 项目结构

```
claude-harness/
├── content/
│   └── articles/
│       ├── en/                    # 英文文章
│       ├── zh/                    # 中文文章（31 篇）
│       └── ja/                    # 日文文章
│
├── packages/
│   ├── claude-code-source/        # （源码不再分发 — 详见其 README）
│   ├── scripts/                   # 元数据生成管线
│   │   └── src/
│   │       ├── generate-file-tree.ts
│   │       ├── generate-module-stats.ts
│   │       ├── generate-search-index.ts
│   │       └── generate-source-summary.ts
│   │
│   └── web/                       # Next.js Web 应用
│       └── src/
│           ├── app/[locale]/      # 基于 locale 的页面
│           │   ├── articles/      # 文章列表与详情
│           │   ├── code/          # 交互式代码浏览器
│           │   └── modules/       # 模块浏览器
│           ├── components/        # 共享 UI 组件
│           ├── lib/               # 工具函数与数据加载
│           └── i18n/              # 国际化配置
│
├── turbo.json                     # Turbo monorepo 配置
├── vercel.json                    # Vercel 部署配置
└── package.json                   # 根工作区配置
```

## 数据生成管线

`pnpm generate` 命令运行四个脚本，将本地提供的 Claude Code 源码处理为结构化元数据：

1. **文件树** — 递归扫描源码目录，生成层级 JSON 树（1,902 个条目）
2. **模块统计** — 分析 35 个顶级模块的文件数与代码行数
3. **源码摘要** — 汇总整个代码库的总体数据
4. **搜索索引** — 构建 FlexSearch 全文索引，供客户端搜索使用

这些生成的文件驱动了 Web UI 的代码浏览器、模块浏览器和搜索功能。

## 架构

```
+---------------------------------------------------+
|                  Web Application                   |
|                                                    |
|  +----------+ +----------+ +--------+ +---------+  |
|  | Articles | |   Code   | | Module | | Search  |  |
|  |  (MDX)   | | Browser  | |Explorer| | (Flex)  |  |
|  +----+-----+ +----+-----+ +---+----+ +----+----+  |
|       |             |           |           |       |
|  +----v-------------v-----------v-----------v----+  |
|  |             Generated Metadata                |  |
|  |  file-tree.json module-stats.json search-idx  |  |
|  +------------------------+----------------------+  |
+---------------------------|-------------------------+
                            |
                  +---------v---------+
                  | Generation Scripts |
                  | (packages/scripts) |
                  +---------+---------+
                            |
                  +---------v---------+
                  | Claude Code Source |
                  |    (不再分发)       |
                  +--------------------+
```

## 参与贡献

欢迎贡献！以下是一些参与方式：

- **撰写文章** — 在 `content/articles/` 中添加新的技术解读
- **翻译** — 帮助扩展英文和日文文章覆盖率
- **改进 UI** — 优化代码浏览器、模块浏览器或搜索体验
- **修复 Bug** — 查看 Issues 中的待处理项

### 撰写文章

文章是 `content/articles/{locale}/` 中的 MDX 文件，每个文件需要包含 frontmatter：

```mdx
---
title: "文章标题"
description: "简要描述"
order: 32
tags: ["标签1", "标签2"]
readTime: "15 min"
---

正文内容...
```

## 相关项目

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — Anthropic 官方 AI 编程代理

## 许可证

MIT
