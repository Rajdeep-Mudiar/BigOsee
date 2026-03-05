"use client";

import { useRef, useCallback, useEffect, useMemo } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useCodeStore } from "@/stores/codeStore";
import { useTimelineStore } from "@/stores/timelineStore";
import { useTheme } from "@/components/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";

export default function EditorPanel() {
  const { code, setCode } = useCodeStore();
  const { snapshots, currentStep } = useTimelineStore();
  const { theme } = useTheme();
  const { isDesktop, isMobile } = useBreakpoint();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);
  const decorationsRef = useRef<string[]>([]);

  const currentLine = snapshots[currentStep]?.line;

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor;
  }, []);

  // highlight active line
  const highlightLine = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !currentLine) return;

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, [
      {
        range: {
          startLineNumber: currentLine,
          startColumn: 1,
          endLineNumber: currentLine,
          endColumn: 1,
        },
        options: {
          isWholeLine: true,
          className: "active-line-highlight",
          glyphMarginClassName: "active-line-glyph",
        },
      },
    ]);
  }, [currentLine]);

  // trigger highlight whenever step changes
  useEffect(() => {
    if (editorRef.current && currentLine) {
      highlightLine();
    }
  }, [currentLine, highlightLine]);

  // Responsive Monaco editor options
  const editorOptions = useMemo(
    () => ({
      fontSize: isMobile ? 12 : 13,
      fontFamily: "var(--font-mono)",
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      padding: { top: 8, bottom: 8 },
      lineNumbers: "on" as const,
      renderLineHighlight: "none" as const,
      automaticLayout: true,
      tabSize: 4,
      wordWrap: isDesktop ? ("off" as const) : ("on" as const),
      contextmenu: false,
      overviewRulerLanes: 0,
      lineNumbersMinChars: isMobile ? 2 : 3,
      glyphMargin: isDesktop,
      folding: false,
      scrollbar: {
        verticalScrollbarSize: 5,
        horizontalScrollbarSize: 5,
      },
    }),
    [isMobile, isDesktop],
  );

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 rounded-(--radius-panel) border border-border bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-3 lg:px-4 py-1.5 lg:py-2 border-b border-border">
        <span className="text-[10px] font-semibold tracking-widest text-text-muted uppercase">
          Editor
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          defaultLanguage="javascript"
          value={code}
          onChange={(val) => setCode(val || "")}
          onMount={handleMount}
          theme={theme === "light" ? "vs" : "vs-dark"}
          options={editorOptions}
          beforeMount={(monaco) => {
            monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
              noSemanticValidation: true,
              noSyntaxValidation: true,
              noSuggestionDiagnostics: true,
            });
          }}
        />
      </div>
    </div>
  );
}
