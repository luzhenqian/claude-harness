import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import matter from "gray-matter";

const ARTICLES_BASE = resolve(process.cwd(), "../../content/articles");

export interface ArticleMeta {
  slug: string;
  title: string;
  description: string;
  order: number;
  tags: string[];
  readTime: number;
  moduleCount: number;
  modules: string[];
}

function getArticlesDir(locale: string): string {
  return resolve(ARTICLES_BASE, locale);
}

export async function getArticleList(locale: string): Promise<ArticleMeta[]> {
  const dir = getArticlesDir(locale);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    // Fallback to English if locale dir doesn't exist
    files = await readdir(getArticlesDir("en"));
  }
  const articles: ArticleMeta[] = [];

  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;
    const raw = await readFile(resolve(dir, file), "utf-8");
    const { data } = matter(raw);
    articles.push({
      slug: file.replace(/\.mdx$/, ""),
      title: data.title || file,
      description: data.description || "",
      order: data.order ?? 999,
      tags: data.tags || [],
      readTime: data.readTime ?? 10,
      moduleCount: data.moduleCount ?? 0,
      modules: data.modules || [],
    });
  }

  return articles.sort((a, b) => a.order - b.order);
}

export async function getArticle(slug: string, locale: string): Promise<{ meta: ArticleMeta; content: string }> {
  const dir = getArticlesDir(locale);
  let filePath = resolve(dir, `${slug}.mdx`);

  // Prevent path traversal
  if (!filePath.startsWith(ARTICLES_BASE)) {
    throw new Error("Invalid slug");
  }

  // Fallback to English if file doesn't exist in locale
  try {
    await readFile(filePath, "utf-8");
  } catch {
    filePath = resolve(getArticlesDir("en"), `${slug}.mdx`);
  }

  const raw = await readFile(filePath, "utf-8");
  const { data, content } = matter(raw);
  return {
    meta: {
      slug,
      title: data.title || slug,
      description: data.description || "",
      order: data.order ?? 999,
      tags: data.tags || [],
      readTime: data.readTime ?? 10,
      moduleCount: data.moduleCount ?? 0,
      modules: data.modules || [],
    },
    content,
  };
}
