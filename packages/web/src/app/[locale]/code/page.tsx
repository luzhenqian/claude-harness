import fileTree from "../../../../generated/file-tree.json";
import CodeBrowserClient from "./CodeBrowserClient";

interface TreeNode {
  name: string;
  path: string;
  type: "directory" | "file";
  children?: TreeNode[];
}

export default function CodePage() {
  return <CodeBrowserClient tree={fileTree as TreeNode[]} />;
}
