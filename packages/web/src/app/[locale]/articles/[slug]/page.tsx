import { MDXRemote } from "next-mdx-remote/rsc";
import { getArticle, getArticleList } from "@/lib/articles";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const articles = await getArticleList();
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  let article;
  try {
    article = await getArticle(slug);
  } catch {
    notFound();
  }

  return (
    <article className="prose prose-invert mx-auto max-w-3xl">
      <h1>{article.meta.title}</h1>
      <MDXRemote source={article.content} />
    </article>
  );
}
