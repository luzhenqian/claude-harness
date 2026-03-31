import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="space-y-12">
      <section className="space-y-4 pt-12">
        <h1 className="text-4xl font-bold">{t("title")}</h1>
        <p className="max-w-2xl text-lg text-neutral-400">
          {t("description")}
        </p>
      </section>

      <section className="grid gap-6 sm:grid-cols-3">
        <Link
          href="/articles"
          className="rounded-lg border border-[var(--border)] p-6 hover:border-[var(--accent)] transition-colors"
        >
          <h2 className="font-semibold mb-2">{t("articles")}</h2>
          <p className="text-sm text-neutral-400">{t("articlesDesc")}</p>
        </Link>
        <Link
          href="/code"
          className="rounded-lg border border-[var(--border)] p-6 hover:border-[var(--accent)] transition-colors"
        >
          <h2 className="font-semibold mb-2">{t("codeBrowser")}</h2>
          <p className="text-sm text-neutral-400">{t("codeBrowserDesc")}</p>
        </Link>
        <Link
          href="/modules"
          className="rounded-lg border border-[var(--border)] p-6 hover:border-[var(--accent)] transition-colors"
        >
          <h2 className="font-semibold mb-2">{t("moduleIndex")}</h2>
          <p className="text-sm text-neutral-400">{t("moduleIndexDesc")}</p>
        </Link>
      </section>
    </div>
  );
}
