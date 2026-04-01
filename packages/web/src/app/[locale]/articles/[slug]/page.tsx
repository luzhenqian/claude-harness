import { getArticle, getArticleList } from "@/lib/articles";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/mdx";
import { CodeBlockCopyScript } from "@/components/mdx/CodeBlock";
import remarkGfm from "remark-gfm";
import ArticleShell from "./ArticleShell";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = new Set<string>();
  for (const locale of ["en", "zh", "ja"]) {
    try {
      const articles = await getArticleList(locale);
      console.log(`[generateStaticParams] ${locale}: found ${articles.length} articles`);
      for (const a of articles) slugs.add(a.slug);
    } catch (e) {
      console.log(`[generateStaticParams] ${locale}: ${e}`);
    }
  }
  console.log(`[generateStaticParams] Total slugs: ${slugs.size}`);
  return [...slugs].map((slug) => ({ slug }));
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const locale = await getLocale();

  let article;
  try {
    article = await getArticle(slug, locale);
  } catch {
    notFound();
  }

  let totalArticles = 0;
  try {
    const allArticles = await getArticleList(locale);
    totalArticles = allArticles.length;
  } catch {
    totalArticles = 31;
  }

  return (
    <ArticleShell
      locale={locale}
      title={article.meta.title}
      description={article.meta.description}
      order={article.meta.order}
      totalArticles={totalArticles}
      tags={article.meta.tags}
      readTime={article.meta.readTime}
      moduleCount={article.meta.moduleCount}
    >
      <MDXRemote
        source={article.content}
        components={mdxComponents}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
      />
      <CodeBlockCopyScript />
    </ArticleShell>
  );
}
