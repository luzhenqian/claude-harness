import moduleStats from "../../../../generated/module-stats.json";
import ModulesClient from "./ModulesClient";

export default function ModulesPage() {
  return <ModulesClient modules={moduleStats} />;
}
