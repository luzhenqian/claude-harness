import { getArticleList } from "@/lib/articles";
import { getLocale } from "next-intl/server";
import ArticlesClient from "./ArticlesClient";

export default async function ArticlesPage() {
  const locale = await getLocale();
  const articles = await getArticleList(locale);
  return <ArticlesClient locale={locale} articles={articles} />;
}
