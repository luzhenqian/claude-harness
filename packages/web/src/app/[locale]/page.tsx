import { getArticleList } from "@/lib/articles";
import { getLocale } from "next-intl/server";
import moduleStats from "../../../generated/module-stats.json";
import sourceSummary from "../../../generated/source-summary.json";
import HomeClient from "./HomeClient";

export default async function Home() {
  const locale = await getLocale();
  const articles = await getArticleList(locale);
  return <HomeClient locale={locale} articles={articles} moduleStats={moduleStats} sourceSummary={sourceSummary} />;
}
