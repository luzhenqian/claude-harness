import { MDXRemote } from "next-mdx-remote/rsc";
import { getArticle, getArticleList } from "@/lib/articles";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { mdxComponents } from "@/components/mdx";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getArticleList("en");
  return articles.map((a) => ({ slug: a.slug }));
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

  return (
    <article className="prose prose-invert mx-auto max-w-4xl prose-headings:text-[var(--fg)] prose-a:text-[var(--accent)] prose-strong:text-[var(--fg)]">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <h1 className="mb-3 text-3xl font-bold leading-tight tracking-tight">
          {article.meta.title}
        </h1>
        {article.meta.description && (
          <p className="text-lg text-neutral-400">{article.meta.description}</p>
        )}
      </header>
      <MDXRemote source={article.content} components={mdxComponents} />
    </article>
  );
}
