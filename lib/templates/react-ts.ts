import type { ProjectFiles } from "@/lib/types/project";
import { getStarterFiles } from "@/lib/sandpack/starter";

export const REACT_TS_DEPS: Record<string, string> = {
  react: "^19.0.0",
  "react-dom": "^19.0.0",
};

export const REACT_TS_RUN = { cmd: "npm", args: ["run", "dev"] };

export function getReactTsTemplate(): ProjectFiles {
  // Reuse istniejacy starter Sandpacka
  return getStarterFiles();
}
