"use client";

import {
  SandpackProvider,
  SandpackLayout,
  SandpackPreview,
  SandpackCodeEditor,
  SandpackFileExplorer,
  SandpackConsole,
  type SandpackTheme,
} from "@codesandbox/sandpack-react";
import { STARTER_DEPENDENCIES } from "@/lib/sandpack/starter";
import type { SandpackRunnerProps } from "./sandpack-runner";

const wybitnaTheme: SandpackTheme = {
  colors: {
    surface1: "#0a0a0a",
    surface2: "#141414",
    surface3: "#1f1f1f",
    clickable: "#a1a1aa",
    base: "#fafafa",
    disabled: "#52525b",
    hover: "#e8dcc4",
    accent: "#e8dcc4",
    error: "#fca5a5",
    errorSurface: "#1f1f1f",
  },
  syntax: {
    plain: "#fafafa",
    comment: { color: "#52525b", fontStyle: "italic" },
    keyword: "#e8dcc4",
    tag: "#e8dcc4",
    punctuation: "#a1a1aa",
    definition: "#fde68a",
    property: "#fde68a",
    static: "#fbbf24",
    string: "#86efac",
  },
  font: {
    body: 'var(--font-geist-sans), -apple-system, sans-serif',
    mono: 'var(--font-geist-mono), "Fira Code", monospace',
    size: "13px",
    lineHeight: "20px",
  },
};

export function SandpackInner({
  files,
  mode = "editor",
  showFileExplorer = true,
  showConsole = false,
}: SandpackRunnerProps) {
  return (
    <SandpackProvider
      template="react-ts"
      theme={wybitnaTheme}
      files={files}
      customSetup={{
        dependencies: STARTER_DEPENDENCIES,
      }}
      options={{
        recompileMode: "delayed",
        recompileDelay: 500,
        autorun: true,
        autoReload: true,
      }}
    >
      <SandpackLayout
        style={{
          height: "100%",
          borderRadius: 0,
          border: 0,
          background: "#0a0a0a",
        }}
      >
        {mode === "editor" ? (
          <>
            {showFileExplorer && (
              <SandpackFileExplorer
                style={{ height: "100%", minWidth: 200, maxWidth: 240 }}
              />
            )}
            <SandpackCodeEditor
              showTabs
              showLineNumbers
              showInlineErrors
              wrapContent={false}
              style={{ height: "100%", flex: 1 }}
            />
            <SandpackPreview
              showOpenInCodeSandbox={false}
              showRefreshButton
              style={{ height: "100%", flex: 1 }}
            />
          </>
        ) : (
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showNavigator={false}
            showRefreshButton={false}
            style={{ height: "100%", width: "100%" }}
          />
        )}
      </SandpackLayout>
      {mode === "editor" && showConsole && (
        <div style={{ height: 180, background: "#0a0a0a" }}>
          <SandpackConsole standalone style={{ height: "100%" }} />
        </div>
      )}
    </SandpackProvider>
  );
}
