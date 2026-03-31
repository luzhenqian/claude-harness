import { getTranslations } from "next-intl/server";
import { readSourceFile } from "@/lib/source";
import { FileTree } from "@/components/FileTree";
import { CodeViewer } from "@/components/CodeViewer";
import { SearchBar } from "@/components/SearchBar";
import fileTree from "../../../../../generated/file-tree.json";

interface Props {
  params: Promise<{ path: string[] }>;
}

export default async function CodePage({ params }: Props) {
  const t = await getTranslations("code");
  const { path } = await params;
  const filePath = path.join("/");
  let code: string | null = null;
  let error: string | null = null;

  try {
    code = await readSourceFile(filePath);
  } catch {
    error = t("fileNotFound", { path: filePath });
  }

  return (
    <div>
      <div className="mb-4">
        <SearchBar />
      </div>
      <div className="flex h-[calc(100vh-120px)]">
        <div className="w-72 flex-shrink-0">
          <FileTree tree={fileTree} />
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h2 className="mb-4 font-mono text-sm text-neutral-400">{filePath}</h2>
          {error ? (
            <p className="text-red-400">{error}</p>
          ) : code ? (
            <CodeViewer code={code} filename={filePath} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
