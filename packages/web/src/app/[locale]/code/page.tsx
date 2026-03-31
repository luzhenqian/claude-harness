import { useTranslations } from "next-intl";
import { FileTree } from "@/components/FileTree";
import { SearchBar } from "@/components/SearchBar";
import fileTree from "../../../../generated/file-tree.json";

export default function CodeIndex() {
  const t = useTranslations("code");

  return (
    <div>
      <div className="mb-4">
        <SearchBar />
      </div>
      <div className="flex h-[calc(100vh-120px)]">
        <div className="w-72 flex-shrink-0">
          <FileTree tree={fileTree} />
        </div>
        <div className="flex-1 flex items-center justify-center text-neutral-500">
          {t("selectFile")}
        </div>
      </div>
    </div>
  );
}
