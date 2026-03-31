import { useTranslations } from "next-intl";
import { ModuleCard } from "@/components/ModuleCard";
import moduleStats from "../../../../generated/module-stats.json";

export default function ModulesPage() {
  const t = useTranslations("modules");

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t("title")}</h1>
      <p className="text-neutral-400">
        {t("description", { count: moduleStats.length })}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moduleStats.map((mod) => (
          <ModuleCard key={mod.name} {...mod} />
        ))}
      </div>
    </div>
  );
}
