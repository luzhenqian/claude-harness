import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getArticleList } from "@/lib/articles";

export default async function ArticlesPage() {
  const t = useTranslations("articles");
  const articles = await getArticleList();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-neutral-400">{t("description")}</p>
      <div className="space-y-4">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/articles/${article.slug}`}
            className="block rounded-lg border border-[var(--border)] p-4 hover:border-[var(--accent)] transition-colors"
          >
            <h2 className="font-semibold">{article.title}</h2>
            {article.description && (
              <p className="mt-1 text-sm text-neutral-400">{article.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
