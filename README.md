[English](./README.md) | [中文](./README-zh.md) | [日本語](./README-ja.md)

# Claude Harness

> Deconstructing Claude Code — interactive source code analysis, guided walkthroughs, and deep architectural exploration.

**Claude Harness** is an open-source platform for exploring and understanding the internals of [Claude Code](https://docs.anthropic.com/en/docs/claude-code), Anthropic's official AI coding agent. Through interactive code browsing, in-depth technical articles, and module-level analysis, it transforms 500K+ lines of TypeScript into an accessible learning experience.

## Why This Project Exists

Claude Code is one of the most sophisticated AI agent harnesses ever built — a masterclass in tool design, context management, permission governance, and multi-agent coordination. But understanding its architecture from raw source alone is daunting.

Claude Harness makes that architecture legible. It provides:

- **Guided articles** that walk through each subsystem with real code references
- **Interactive code browser** with syntax highlighting and full-text search
- **Module visualizations** that reveal the structural relationships in the codebase

Whether you're building your own AI agent, studying harness engineering patterns, or simply curious about how Claude Code works under the hood — this project is for you.

## At a Glance

| Metric | Value |
|--------|-------|
| Source Files Analyzed | **1,902** |
| Lines of Code | **514,587** |
| Modules Mapped | **35** |
| Technical Articles | **31+** |
| Languages | English, 中文, 日本語 |

## Key Features

### Interactive Code Browser

Browse the full Claude Code source tree with a file explorer, syntax highlighting powered by [Shiki](https://shiki.matsu.io/), and instant client-side search via [FlexSearch](https://github.com/nextapps-de/flexsearch).

### In-Depth Technical Articles

31 guided walkthroughs covering every major subsystem:

| # | Article |
|---|---------|
| 01 | [The Big Picture: How a 512,000-Line AI CLI Is Built](./content/articles/en/01-overview.mdx) |
| 02 | [The Query Engine: The Complete Lifecycle of a Conversation](./content/articles/en/02-query-engine.mdx) |
| 03 | [The Tool System: How AI Safely Interacts with the Outside World](./content/articles/en/03-tool-system.mdx) |
| 04 | [The Streaming Tool Executor: How to Safely Let AI Operate Multiple Tools Simultaneously](./content/articles/en/04-streaming-tool-executor.mdx) |
| 05 | [The Permission System: Walking the Tightrope Between Autonomy and Safety](./content/articles/en/05-permission-system.mdx) |
| 06 | [Context Management: When Even a Million Tokens Aren't Enough](./content/articles/en/06-context-management.mdx) |
| 07 | [Startup Performance: How a Heavy CLI Achieves Fast Cold Starts](./content/articles/en/07-startup-performance.mdx) |
| 08 | [Multi-Agent Orchestration: How the Coordinator Pattern Enables AI Collaboration](./content/articles/en/08-multi-agent.mdx) |
| 09 | [Persistent Memory: How AI Remembers You Across Sessions](./content/articles/en/09-memory-system.mdx) |
| 10 | [Bridge System: Bidirectional Communication Architecture Between CLI and IDE](./content/articles/en/10-bridge-system.mdx) |
| 11 | [MCP Protocol Integration: How AI Tools Connect to Everything](./content/articles/en/11-mcp-integration.mdx) |
| 12 | [Plugins and Skills: A Three-Layer Extensibility Architecture](./content/articles/en/12-plugins-skills.mdx) |
| 13 | [OAuth and Authentication: The Full Pipeline from Keychain to Token Refresh](./content/articles/en/13-auth.mdx) |
| 14 | [Terminal UI Framework: Building a CLI with React](./content/articles/en/14-terminal-ui.mdx) |
| 15 | [Keybindings and Vim Mode: Editor-Level Interaction in a CLI](./content/articles/en/15-keybindings-vim.mdx) |
| 16 | [Screen System: Designing Fullscreen Interaction Modes](./content/articles/en/16-screens.mdx) |
| 17 | [State Management: React State Architecture Without Redux](./content/articles/en/17-state-management.mdx) |
| 18 | [Telemetry and Observability: OpenTelemetry in a CLI Application](./content/articles/en/18-telemetry.mdx) |
| 19 | [Configuration System: Schema Validation, Migrations, and Multi-Source Merging](./content/articles/en/19-config-system.mdx) |
| 20 | [Feature Flags and Conditional Compilation: The Art of Compile-Time Code Elimination](./content/articles/en/20-feature-flags.mdx) |
| 21 | [The File Operations Trio: Design Philosophy of Read, Write, and Edit](./content/articles/en/21-file-operations.mdx) |
| 22 | [BashTool: Letting AI Safely Execute Shell Commands](./content/articles/en/22-bash-tool.mdx) |
| 23 | [The Search System: The Glob + Grep + Full-Text Search Combination](./content/articles/en/23-search-system.mdx) |
| 24 | [Web Tools: How AI Accesses the Internet](./content/articles/en/24-web-tools.mdx) |
| 25 | [LSP Integration: How Language Server Protocol Enhances AI Coding](./content/articles/en/25-lsp-integration.mdx) |
| 26 | [The Buddy System: A Virtual Pet Game Inside Your Codebase](./content/articles/en/26-buddy-system.mdx) |
| 27 | [The Output Style System: Bringing Brand Identity to Terminal Output](./content/articles/en/27-output-styles.mdx) |
| 28 | [Remote Execution and Scheduled Triggers: The Headless AI Agent](./content/articles/en/28-remote-execution.mdx) |
| 29 | [Session Management: Interruption, Resumption, and Sharing](./content/articles/en/29-session-management.mdx) |
| 30 | [API Client: Deep Integration with the Anthropic API](./content/articles/en/30-api-client.mdx) |
| 31 | [Error Handling and Self-Healing: How AI Recovers from Failures](./content/articles/en/31-error-recovery.mdx) |

### Module Explorer

Visualize the 35 major modules with file counts, line counts, and descriptions:

```
utils          564 files   181K lines   Utility functions
components     389 files    82K lines   Ink UI components (~140)
services       130 files    54K lines   External service integrations
tools          184 files    51K lines   Agent tool implementations (~40)
commands       207 files    27K lines   Slash commands (~50)
hooks          104 files    19K lines   React hooks
ink             96 files    20K lines   Ink renderer wrapper
...and 28 more
```

### Multi-Language Support

Full internationalization with English, Chinese (中文), and Japanese (日本語) — with locale-aware routing and automatic fallback.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| Code Highlighting | [Shiki](https://shiki.matsu.io/) |
| Search | [FlexSearch](https://github.com/nextapps-de/flexsearch) |
| Articles | [MDX](https://mdxjs.com/) via next-mdx-remote |
| i18n | [next-intl](https://next-intl.dev/) |
| Animations | [Motion](https://motion.dev/) |
| Diagrams | [Mermaid](https://mermaid.js.org/) |
| Monorepo | [Turbo](https://turbo.build/) |
| Deployment | [Vercel](https://vercel.com/) |

## Getting Started

### Prerequisites

- **Node.js 22+** (see `.node-version`)
- **pnpm** (or npm)

### Installation

```bash
# Clone the repository
git clone https://github.com/anthropics/claude-harness.git
cd claude-harness

# Install dependencies
pnpm install

# Generate metadata (file tree, module stats, search index)
pnpm generate

# Start development server
pnpm dev
```

The app will be available at `http://localhost:3000`.

### Build for Production

```bash
pnpm build
```

## Project Structure

```
claude-harness/
├── content/
│   └── articles/
│       ├── en/                    # English articles
│       ├── zh/                    # Chinese articles (31 guides)
│       └── ja/                    # Japanese articles
│
├── packages/
│   ├── claude-code-source/        # (source no longer distributed — see its README)
│   ├── scripts/                   # Metadata generation pipeline
│   │   └── src/
│   │       ├── generate-file-tree.ts
│   │       ├── generate-module-stats.ts
│   │       ├── generate-search-index.ts
│   │       └── generate-source-summary.ts
│   │
│   └── web/                       # Next.js web application
│       └── src/
│           ├── app/[locale]/      # Locale-aware pages
│           │   ├── articles/      # Article list & detail
│           │   ├── code/          # Interactive code browser
│           │   └── modules/       # Module explorer
│           ├── components/        # Shared UI components
│           ├── lib/               # Utilities & data loading
│           └── i18n/              # Internationalization config
│
├── turbo.json                     # Turbo monorepo config
├── vercel.json                    # Vercel deployment config
└── package.json                   # Root workspace config
```

## Data Generation Pipeline

The `pnpm generate` command runs four scripts that process Claude Code source (provided locally) into structured metadata:

1. **File Tree** — Recursively scans the source directory into a hierarchical JSON tree (1,902 entries)
2. **Module Stats** — Analyzes 35 top-level modules with file/line counts
3. **Source Summary** — Aggregates totals across the entire codebase
4. **Search Index** — Builds a full-text FlexSearch index for client-side search

These generated files power the web UI's code browser, module explorer, and search functionality.

## Architecture

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
                  |  (not distributed) |
                  +--------------------+
```

## Contributing

Contributions are welcome! Here are some ways to help:

- **Add articles** — Write new technical walkthroughs in `content/articles/`
- **Translate** — Help expand English and Japanese article coverage
- **Improve UI** — Enhance the code browser, module explorer, or search experience
- **Fix bugs** — Check the Issues tab for open items

### Writing Articles

Articles are MDX files in `content/articles/{locale}/`. Each file needs frontmatter:

```mdx
---
title: "Your Article Title"
description: "Brief description"
order: 32
tags: ["tag1", "tag2"]
readTime: "15 min"
---

Your content here...
```

## Related Projects

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — Anthropic's official AI coding agent

## License

MIT
