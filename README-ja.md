[English](./README.md) | [中文](./README-zh.md) | [日本語](./README-ja.md)

# Claude Harness

> Claude Code を解剖する — インタラクティブなソースコード分析、ガイド付きウォークスルー、アーキテクチャの深層探索。

**Claude Harness** は、[Claude Code](https://docs.anthropic.com/en/docs/claude-code)（Anthropic 公式 AI コーディングエージェント）の内部構造を探索・理解するためのオープンソースプラットフォームです。インタラクティブなコードブラウジング、詳細な技術記事、モジュールレベルの分析を通じて、50万行以上の TypeScript ソースコードを分かりやすい学習リソースに変換します。

## このプロジェクトの目的

Claude Code は、これまでに構築された中で最も洗練された AI エージェントツールの一つです — ツール設計、コンテキスト管理、権限ガバナンス、マルチエージェント連携において模範的な存在です。しかし、生のソースコードだけでそのアーキテクチャを理解するのは極めて困難です。

Claude Harness は、そのアーキテクチャを読みやすく、探索可能にします：

- **ガイド付き記事** — 実際のコード参照と共に各サブシステムを解説
- **インタラクティブコードブラウザ** — シンタックスハイライト＋全文検索でソースコードを随時参照
- **モジュール可視化** — コードベースの構造関係と規模分布を明示

AI エージェントの構築、ツールオーケストレーションパターンの研究、または Claude Code の内部動作への純粋な好奇心 — このプロジェクトはあなたのためにあります。

## データ概要

| 指標 | 値 |
|------|-----|
| 分析ソースファイル数 | **1,902** |
| コード行数 | **514,587** |
| マッピングモジュール数 | **35** |
| 技術記事 | **31+** |
| 対応言語 | English, 中文, 日本語 |

## 主な機能

### インタラクティブコードブラウザ

Claude Code の完全なソースツリーをブラウズ。ファイルエクスプローラー、[Shiki](https://shiki.matsu.io/) によるシンタックスハイライト、[FlexSearch](https://github.com/nextapps-de/flexsearch) によるクライアントサイド即時検索を搭載。

### 詳細な技術記事

全主要サブシステムをカバーする31本のガイド付き技術解説：

| # | 記事 |
|---|------|
| 01 | [全体像：512,000行のコードで構築されたAI CLIの仕組み](./content/articles/ja/01-overview.mdx) |
| 02 | [クエリエンジン：一回の対話の完全なライフサイクル](./content/articles/ja/02-query-engine.mdx) |
| 03 | [ツールシステム：AIはいかにして安全に外部世界と対話するのか](./content/articles/ja/03-tool-system.mdx) |
| 04 | [ストリーミングツールエグゼキュータ：AIが複数のツールを安全に同時操作する仕組み](./content/articles/ja/04-streaming-tool-executor.mdx) |
| 05 | [権限システム：「自律性」と「安全性」の間で綱渡り](./content/articles/ja/05-permission-system.mdx) |
| 06 | [コンテキスト管理：100万トークンでも足りない時](./content/articles/ja/06-context-management.mdx) |
| 07 | [起動パフォーマンス：ヘビー級 CLI はいかにして高速コールドスタートを実現するか](./content/articles/ja/07-startup-performance.mdx) |
| 08 | [マルチ Agent オーケストレーション：Coordinator パターンで複数の AI を協調させる方法](./content/articles/ja/08-multi-agent.mdx) |
| 09 | [永続化メモリ：AIにセッションを超えてあなたを覚えさせる方法](./content/articles/ja/09-memory-system.mdx) |
| 10 | [Bridge システム：CLI と IDE の双方向通信アーキテクチャ](./content/articles/ja/10-bridge-system.mdx) |
| 11 | [MCP プロトコル統合：AI ツールをあらゆるサービスに接続する方法](./content/articles/ja/11-mcp-integration.mdx) |
| 12 | [プラグインとスキル：三層拡張性アーキテクチャ](./content/articles/ja/12-plugins-skills.mdx) |
| 13 | [OAuth と認証：Keychain から Token リフレッシュまでの全体設計](./content/articles/ja/13-auth.mdx) |
| 14 | [ターミナル UI フレームワーク：React でコマンドラインインターフェースを構築する](./content/articles/ja/14-terminal-ui.mdx) |
| 15 | [キーバインドと Vim モード：CLI でエディタ級のインタラクションを実現する](./content/articles/ja/15-keybindings-vim.mdx) |
| 16 | [スクリーンシステム：全画面インタラクションモードの設計](./content/articles/ja/16-screens.mdx) |
| 17 | [状態管理：Redux を使わない React 状態アーキテクチャ](./content/articles/ja/17-state-management.mdx) |
| 18 | [テレメトリとオブザーバビリティ：CLI における OpenTelemetry の活用](./content/articles/ja/18-telemetry.mdx) |
| 19 | [設定システム：Schema バリデーション、マイグレーション、マルチソースマージ](./content/articles/ja/19-config-system.mdx) |
| 20 | [Feature Flag と条件付きコンパイル：コンパイル時のデッドコード除去](./content/articles/ja/20-feature-flags.mdx) |
| 21 | [ファイル操作の三銃士：Read、Write、Edit の設計哲学](./content/articles/ja/21-file-operations.mdx) |
| 22 | [BashTool：AI による安全なシェルコマンド実行](./content/articles/ja/22-bash-tool.mdx) |
| 23 | [検索システム：Glob + Grep + 全文検索のコンビネーション](./content/articles/ja/23-search-system.mdx) |
| 24 | [Web ツール：AI はどのようにインターネットにアクセスするか](./content/articles/ja/24-web-tools.mdx) |
| 25 | [LSP 統合：Language Server Protocol が AI コーディングをどう強化するか](./content/articles/ja/25-lsp-integration.mdx) |
| 26 | [Buddy システム：コードベースの中のペット育成ゲーム](./content/articles/ja/26-buddy-system.mdx) |
| 27 | [出力スタイルシステム：ターミナル出力にもブランド感を](./content/articles/ja/27-output-styles.mdx) |
| 28 | [リモート実行と定時トリガー：Headless AI Agent](./content/articles/ja/28-remote-execution.mdx) |
| 29 | [セッション管理：中断・復元・共有](./content/articles/ja/29-session-management.mdx) |
| 30 | [API クライアント：Anthropic API との深い統合](./content/articles/ja/30-api-client.mdx) |
| 31 | [エラー処理と自己修復：AI はどのように失敗から回復するか](./content/articles/ja/31-error-recovery.mdx) |

### モジュールエクスプローラー

35の主要モジュールをファイル数、コード行数、説明と共に可視化：

```
utils          564 ファイル   181K 行   ユーティリティ関数
components     389 ファイル    82K 行   Ink UI コンポーネント (~140)
services       130 ファイル    54K 行   外部サービス統合
tools          184 ファイル    51K 行   エージェントツール実装 (~40)
commands       207 ファイル    27K 行   スラッシュコマンド (~50)
hooks          104 ファイル    19K 行   React Hooks
ink             96 ファイル    20K 行   Ink レンダラーラッパー
...他28モジュール
```

### 多言語サポート

英語、中国語、日本語の完全な国際化対応 — ロケールベースのルーティングと自動フォールバック。

## 技術スタック

| レイヤー | テクノロジー |
|----------|-------------|
| フレームワーク | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) + [Tailwind CSS 4](https://tailwindcss.com/) |
| コードハイライト | [Shiki](https://shiki.matsu.io/) |
| 検索 | [FlexSearch](https://github.com/nextapps-de/flexsearch) |
| 記事 | [MDX](https://mdxjs.com/) via next-mdx-remote |
| 国際化 | [next-intl](https://next-intl.dev/) |
| アニメーション | [Motion](https://motion.dev/) |
| ダイアグラム | [Mermaid](https://mermaid.js.org/) |
| モノレポ | [Turbo](https://turbo.build/) |
| デプロイ | [Vercel](https://vercel.com/) |

## はじめに

### 前提条件

- **Node.js 22+**（`.node-version` を参照）
- **pnpm**（または npm）

### インストールと実行

```bash
# リポジトリをクローン
git clone https://github.com/anthropics/claude-harness.git
cd claude-harness

# 依存関係をインストール
pnpm install

# メタデータを生成（ファイルツリー、モジュール統計、検索インデックス）
pnpm generate

# 開発サーバーを起動
pnpm dev
```

アプリケーションは `http://localhost:3000` でアクセスできます。

### プロダクションビルド

```bash
pnpm build
```

## プロジェクト構造

```
claude-harness/
├── content/
│   └── articles/
│       ├── en/                    # 英語記事
│       ├── zh/                    # 中国語記事（31本）
│       └── ja/                    # 日本語記事
│
├── packages/
│   ├── claude-code-source/        # （ソースコードは配布終了 — README を参照）
│   ├── scripts/                   # メタデータ生成パイプライン
│   │   └── src/
│   │       ├── generate-file-tree.ts
│   │       ├── generate-module-stats.ts
│   │       ├── generate-search-index.ts
│   │       └── generate-source-summary.ts
│   │
│   └── web/                       # Next.js Web アプリケーション
│       └── src/
│           ├── app/[locale]/      # ロケール対応ページ
│           │   ├── articles/      # 記事一覧と詳細
│           │   ├── code/          # インタラクティブコードブラウザ
│           │   └── modules/       # モジュールエクスプローラー
│           ├── components/        # 共有 UI コンポーネント
│           ├── lib/               # ユーティリティとデータローディング
│           └── i18n/              # 国際化設定
│
├── turbo.json                     # Turbo モノレポ設定
├── vercel.json                    # Vercel デプロイ設定
└── package.json                   # ルートワークスペース設定
```

## データ生成パイプライン

`pnpm generate` コマンドは4つのスクリプトを実行し、ローカルに用意した Claude Code ソースを構造化メタデータに処理します：

1. **ファイルツリー** — ソースディレクトリを再帰的にスキャンし、階層 JSON ツリーを生成（1,902エントリ）
2. **モジュール統計** — 35のトップレベルモジュールのファイル数・行数を分析
3. **ソースサマリー** — コードベース全体の集計データを生成
4. **検索インデックス** — クライアントサイド検索用の FlexSearch 全文インデックスを構築

これらの生成ファイルが、Web UI のコードブラウザ、モジュールエクスプローラー、検索機能を駆動します。

## アーキテクチャ

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
                  |   (配布終了)        |
                  +--------------------+
```

## コントリビューション

コントリビューションを歓迎します！参加方法：

- **記事を執筆** — `content/articles/` に新しい技術解説を追加
- **翻訳** — 英語・日本語の記事カバレッジ拡大にご協力ください
- **UI を改善** — コードブラウザ、モジュールエクスプローラー、検索体験の向上
- **バグ修正** — Issues タブの未解決項目をご確認ください

### 記事の執筆

記事は `content/articles/{locale}/` 内の MDX ファイルです。各ファイルには frontmatter が必要です：

```mdx
---
title: "記事タイトル"
description: "簡潔な説明"
order: 32
tags: ["タグ1", "タグ2"]
readTime: "15 min"
---

本文...
```

## 関連プロジェクト

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — Anthropic 公式 AI コーディングエージェント

## ライセンス

MIT
