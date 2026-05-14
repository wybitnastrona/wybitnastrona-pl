import type { ProjectFiles } from "@/lib/types/project";
import {
  getViteReactStarterFiles,
  VITE_REACT_RUN,
} from "@/lib/webcontainer/vite-react-starter";

/**
 * React + Vite + TypeScript w WebContainer.
 *
 * Dependencies sa zaszyte w `package.json` startera (z konkretnymi wersjami,
 * tak zeby `npm install` w WC byl deterministyczny). Pole `REACT_TS_DEPS`
 * pozostawione jako informacja dla kodu spoza WC (export ZIP, dashboard).
 */
export const REACT_TS_DEPS: Record<string, string> = {
  react: "^19.0.0",
  "react-dom": "^19.0.0",
  vite: "^5.4.10",
  "@vitejs/plugin-react": "^4.3.4",
};

export const REACT_TS_RUN = VITE_REACT_RUN;

export function getReactTsTemplate(): ProjectFiles {
  return getViteReactStarterFiles();
}
