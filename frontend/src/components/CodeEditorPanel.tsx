import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  StreamLanguage,
  HighlightStyle,
  syntaxHighlighting,
  bracketMatching,
} from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { tags } from '@lezer/highlight';
import {
  Code2,
  BookOpen,
  X,
  ChevronsUpDown,
  Braces,
  Sparkles,
  Play,
  AlertTriangle,
  Wand2,
  Search,
  Copy,
  Check,
  WrapText,
} from 'lucide-react';
import { CODE_SNIPPETS } from '../data/snippets';
import { autoFixMermaidCode, formatMermaidCode } from '../utils/mermaidEngine';

// Lightweight custom CodeMirror StreamLanguage for Mermaid + YAML frontmatter
const mermaidStreamLanguage = StreamLanguage.define<{ inFrontmatter: boolean }>({
  startState: () => ({ inFrontmatter: false }),
  token(stream, state) {
    if (stream.sol()) {
      if (stream.match(/^---\s*$/)) {
        state.inFrontmatter = !state.inFrontmatter;
        return 'meta';
      }
      if (stream.match(/^\s*%%.*$/)) {
        return 'comment';
      }
    }

    if (state.inFrontmatter) {
      if (stream.match(/#.*$/)) return 'comment';
      if (stream.match(/^\s*[a-zA-Z_][\w-]*(?=\s*:)/)) return 'propertyName';
      if (stream.match(/'[^']*'|"[^"]*"/)) return 'string';
      if (stream.match(/\b\d+(?:\.\d+)?(?:px|em|rem|%)?\b/)) return 'number';
      if (stream.match(/\b(true|false|base|default|dark|forest|neutral|dagre|elk|classic|handDrawn|basis|linear|cardinal|stepBefore|stepAfter|monotoneX|catmullRom|natural)\b/)) {
        return 'atom';
      }
      stream.next();
      return null;
    }

    if (stream.match(/%%.*$/)) return 'comment';
    if (stream.match(/"(?:[^"\\]|\\.)*"/)) return 'string';
    if (stream.match(/'(?:[^'\\]|\\.)*'/)) return 'string';
    if (
      stream.match(
        /\b(flowchart|graph|subgraph|end|direction|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|gantt|pie|mindmap|timeline|gitGraph|journey|quadrantChart|architecture-beta|xychart-beta|sankey-beta|block-beta|kanban|participant|actor|autonumber|Note|over|alt|else|opt|loop|par|rect|activate|deactivate|style|classDef|class|linkStyle|click|title|section|dateFormat|axisFormat|commit|branch|checkout|merge|service|group|in|bar|line|x-axis|y-axis)\b/
      )
    ) {
      return 'keyword';
    }
    if (stream.match(/\b(LR|RL|TB|TD|BT|PK|FK|UK)\b/)) return 'typeName';
    if (stream.match(/(-->|-.->|==>|---|-\.-|--x|--o|o--o|<-->|->>|-->>|->|\|\|--o\{|\|\|--\|\{|\}o--\|\|)/)) {
      return 'operator';
    }
    if (stream.match(/#[0-9a-fA-F]{3,8}\b/)) return 'atom';
    if (stream.match(/\b\d+(?:\.\d+)?\b/)) return 'number';
    if (stream.match(/[\[\]\(\)\{\}\|]/)) return 'bracket';

    stream.next();
    return null;
  },
});

const lightHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#9333ea', fontWeight: '600' },
  { tag: tags.propertyName, color: '#be185d', fontWeight: '500' },
  { tag: tags.string, color: '#b45309' },
  { tag: tags.comment, color: '#94a3b8', fontStyle: 'italic' },
  { tag: tags.operator, color: '#e0095f', fontWeight: '600' },
  { tag: tags.typeName, color: '#0284c7', fontWeight: '600' },
  { tag: tags.number, color: '#0d9488' },
  { tag: tags.atom, color: '#2563eb' },
  { tag: tags.meta, color: '#64748b', fontWeight: '600' },
  { tag: tags.bracket, color: '#475569' },
]);

const darkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#c084fc', fontWeight: '600' },
  { tag: tags.propertyName, color: '#f472b6', fontWeight: '500' },
  { tag: tags.string, color: '#fbbf24' },
  { tag: tags.comment, color: '#64748b', fontStyle: 'italic' },
  { tag: tags.operator, color: '#fb7185', fontWeight: '600' },
  { tag: tags.typeName, color: '#38bdf8', fontWeight: '600' },
  { tag: tags.number, color: '#2dd4bf' },
  { tag: tags.atom, color: '#60a5fa' },
  { tag: tags.meta, color: '#94a3b8', fontWeight: '600' },
  { tag: tags.bracket, color: '#94a3b8' },
]);

interface CodeEditorPanelProps {
  code: string;
  onChange: (nextCode: string) => void;
  autoUpdate: boolean;
  onToggleAutoUpdate: () => void;
  onManualRender: () => void;
  onOpenDocs: () => void;
  onClose: () => void;
  locked: boolean;
  darkMode: boolean;
  error?: string;
  errorLine?: number | null;
  jumpToLine?: { line: number; token: number } | null;
  width: number;
  onResizeWidth: (w: number) => void;
}

export const CodeEditorPanel: React.FC<CodeEditorPanelProps> = React.memo(({
  code,
  onChange,
  autoUpdate,
  onToggleAutoUpdate,
  onManualRender,
  onOpenDocs,
  onClose,
  locked,
  darkMode,
  error,
  errorLine,
  jumpToLine,
  width,
  onResizeWidth,
}) => {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompartmentRef = useRef(new Compartment());
  const readOnlyCompartmentRef = useRef(new Compartment());
  const wrapCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [snippetsOpen, setSnippetsOpen] = useState(false);
  const [snippetCategory, setSnippetCategory] = useState<string>('All');
  const [wordWrap, setWordWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fixNotice, setFixNotice] = useState<string | null>(null);

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(CODE_SNIPPETS.map((s) => s.category)))],
    []
  );

  const filteredSnippets = useMemo(
    () =>
      snippetCategory === 'All'
        ? CODE_SNIPPETS
        : CODE_SNIPPETS.filter((s) => s.category === snippetCategory),
    [snippetCategory]
  );

  const buildThemeExtension = (isDark: boolean) => [
    syntaxHighlighting(isDark ? darkHighlight : lightHighlight),
    EditorView.theme(
      {
        '&': {
          backgroundColor: isDark ? '#151824' : '#ffffff',
          color: isDark ? '#e2e8f0' : '#1e293b',
        },
        '.cm-content': {
          caretColor: '#e0095f',
          padding: '12px 0 28px 0',
        },
        '.cm-gutters': {
          backgroundColor: isDark ? '#151824' : '#ffffff',
          color: isDark ? '#475569' : '#94a3b8',
          paddingLeft: '6px',
        },
        '.cm-activeLine': {
          backgroundColor: isDark ? 'rgba(224, 9, 95, 0.08)' : 'rgba(224, 9, 95, 0.045)',
        },
        '.cm-activeLineGutter': {
          color: isDark ? '#e2e8f0' : '#334155',
          fontWeight: '600',
        },
        '.cm-selectionBackground, ::selection': {
          backgroundColor: isDark
            ? 'rgba(224, 9, 95, 0.28) !important'
            : 'rgba(224, 9, 95, 0.16) !important',
        },
        '.cm-cursor': {
          borderLeftColor: '#e0095f',
          borderLeftWidth: '2px',
        },
      },
      { dark: isDark }
    ),
  ];

  // Mount CodeMirror
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const state = EditorState.create({
      doc: code,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        drawSelection(),
        history(),
        bracketMatching(),
        highlightSelectionMatches(),
        mermaidStreamLanguage,
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        themeCompartmentRef.current.of(buildThemeExtension(darkMode)),
        readOnlyCompartmentRef.current.of(EditorState.readOnly.of(locked)),
        wrapCompartmentRef.current.of(wordWrap ? EditorView.lineWrapping : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorContainerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external code updates cleanly
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== code) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: code },
      });
    }
  }, [code]);

  // Sync dark mode
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: themeCompartmentRef.current.reconfigure(buildThemeExtension(darkMode)),
    });
  }, [darkMode]);

  // Sync locked state
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartmentRef.current.reconfigure(EditorState.readOnly.of(locked)),
    });
  }, [locked]);

  // Sync word wrap
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: wrapCompartmentRef.current.reconfigure(wordWrap ? EditorView.lineWrapping : []),
    });
  }, [wordWrap]);

  // Jump to line on node click or error click
  useEffect(() => {
    const view = viewRef.current;
    if (!view || !jumpToLine) return;
    const lineNum = Math.min(Math.max(1, jumpToLine.line), view.state.doc.lines);
    const line = view.state.doc.line(lineNum);
    view.dispatch({
      selection: { anchor: line.from, head: line.to },
      effects: EditorView.scrollIntoView(line.from, { y: 'center' }),
    });
    view.focus();
  }, [jumpToLine]);

  const insertSnippet = (snippetCode: string) => {
    if (locked) return;
    const view = viewRef.current;
    if (!view) {
      onChange(`${code.trimEnd()}\n${snippetCode}\n`);
      return;
    }
    const sel = view.state.selection.main;
    const insertText = `\n${snippetCode}\n`;
    view.dispatch({
      changes: { from: sel.from, to: sel.to, insert: insertText },
      selection: { anchor: sel.from + insertText.length },
    });
    view.focus();
  };

  const handleFormat = () => {
    if (locked) return;
    onChange(formatMermaidCode(code));
  };

  const handleAutoFix = () => {
    if (locked) return;
    const { fixed, changes } = autoFixMermaidCode(code);
    if (changes.length > 0) {
      onChange(fixed);
      setFixNotice(changes[0]);
      setTimeout(() => setFixNotice(null), 3000);
    } else {
      setFixNotice('No automatic syntax fixes found.');
      setTimeout(() => setFixNotice(null), 2500);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = width;
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(680, Math.max(280, startWidth + (ev.clientX - startX)));
      onResizeWidth(next);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <aside
      style={{ width }}
      className={`relative flex flex-col h-full rounded-2xl border shadow-xl transition-colors overflow-hidden select-none ${
        darkMode
          ? 'bg-[#151824] border-slate-800/90 text-slate-100 shadow-black/40'
          : 'bg-white border-slate-200/90 text-slate-800 shadow-slate-900/8'
      }`}
    >
      {/* Top Bar of Floating Code Card (exact Mermaid.ai layout) */}
      <div
        className={`flex items-center justify-between px-3.5 py-2.5 border-b shrink-0 ${
          darkMode ? 'bg-[#1a1e2e] border-slate-800' : 'bg-[#f1f5f9]/75 border-slate-200/80'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 font-semibold text-sm tracking-tight">
            <Code2 className="w-4 h-4 text-[#e0095f]" />
            <span>Code</span>
          </div>

          <div className={`h-4 w-px ${darkMode ? 'bg-slate-700' : 'bg-slate-300'}`} />

          {/* Auto-Update toggle */}
          <button
            type="button"
            onClick={onToggleAutoUpdate}
            className="flex items-center gap-1.5 text-xs font-medium cursor-pointer group"
            title="Automatically re-render diagram while typing"
          >
            <span
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                autoUpdate
                  ? 'bg-[#1e3a4c] dark:bg-[#e0095f]'
                  : darkMode
                  ? 'bg-slate-700'
                  : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  autoUpdate ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </span>
            <span className={darkMode ? 'text-slate-300' : 'text-slate-600'}>Auto-Update</span>
          </button>

          {!autoUpdate && (
            <button
              type="button"
              onClick={onManualRender}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#e0095f] hover:bg-[#c50753] text-white text-[11px] font-semibold shadow-sm cursor-pointer"
              title="Render diagram now"
            >
              <Play className="w-3 h-3 fill-current" />
              Run
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenDocs}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              darkMode
                ? 'hover:bg-slate-800 text-slate-300'
                : 'hover:bg-slate-200/70 text-slate-600'
            }`}
            title="Mermaid Syntax Docs & Reference"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Docs</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors cursor-pointer ${
              darkMode
                ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'hover:bg-slate-200/70 text-slate-500 hover:text-slate-800'
            }`}
            title="Collapse Code Editor"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle Secondary Utility Strip */}
      <div
        className={`flex items-center justify-between px-3 py-1.5 border-b text-[11px] shrink-0 ${
          darkMode
            ? 'bg-[#151824] border-slate-800/80 text-slate-400'
            : 'bg-white border-slate-100 text-slate-500'
        }`}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleFormat}
            disabled={locked}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer disabled:opacity-40 ${
              darkMode ? 'hover:bg-slate-800 hover:text-slate-200' : 'hover:bg-slate-100 hover:text-slate-800'
            }`}
            title="Auto-indent & format Mermaid code"
          >
            <Sparkles className="w-3 h-3" />
            Format
          </button>
          <button
            type="button"
            onClick={() => setWordWrap((w) => !w)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              wordWrap
                ? 'bg-[#e0095f]/10 text-[#e0095f] font-medium'
                : darkMode
                ? 'hover:bg-slate-800 hover:text-slate-200'
                : 'hover:bg-slate-100 hover:text-slate-800'
            }`}
            title="Toggle line wrapping"
          >
            <WrapText className="w-3 h-3" />
            Wrap
          </button>
          <button
            type="button"
            onClick={() => {
              viewRef.current?.focus();
            }}
            className={`hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 hover:text-slate-200' : 'hover:bg-slate-100 hover:text-slate-800'
            }`}
            title="Press Ctrl+F inside editor to Search & Replace"
          >
            <Search className="w-3 h-3" />
            Ctrl+F
          </button>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 hover:text-slate-200' : 'hover:bg-slate-100 hover:text-slate-800'
          }`}
          title="Copy Mermaid source code"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* CodeMirror Surface */}
      <div className="flex-1 min-h-0 relative select-text overflow-hidden">
        <div ref={editorContainerRef} className="w-full h-full" />

        {fixNotice && (
          <div className="absolute bottom-3 left-3 right-3 px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium shadow-lg flex items-center gap-2 animate-pop">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{fixNotice}</span>
          </div>
        )}
      </div>

      {/* Live Syntax Error Banner */}
      {error && (
        <div
          className={`px-3 py-2.5 border-t text-xs shrink-0 ${
            darkMode
              ? 'bg-rose-950/60 border-rose-900/70 text-rose-200'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-semibold flex items-center gap-2">
                  <span>Syntax Error</span>
                  {errorLine && (
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-600 dark:text-rose-300 font-mono text-[10px]">
                      Line {errorLine}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11px] opacity-90 line-clamp-2 font-mono break-words">
                  {error}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoFix}
              disabled={locked}
              className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold shadow-sm cursor-pointer disabled:opacity-40"
              title="Attempt automatic syntax repair"
            >
              <Wand2 className="w-3 h-3" />
              Fix
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Snippets Drawer (exact Mermaid.ai bottom bar) */}
      <div
        className={`border-t shrink-0 ${
          darkMode ? 'border-slate-800 bg-[#1a1e2e]' : 'border-slate-200/80 bg-[#f8fafc]'
        }`}
      >
        <button
          type="button"
          onClick={() => setSnippetsOpen((v) => !v)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800/70 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
          }`}
        >
          <span className="flex items-center gap-2">
            <Braces className="w-3.5 h-3.5 text-slate-400" />
            <span>Snippets</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium ${
                darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-200/80 text-slate-600'
              }`}
            >
              {CODE_SNIPPETS.length}
            </span>
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {snippetsOpen && (
          <div
            className={`border-t max-h-56 overflow-y-auto p-2.5 space-y-2 animate-pop ${
              darkMode ? 'border-slate-800 bg-[#151824]' : 'border-slate-200/70 bg-white'
            }`}
          >
            <div className="flex flex-wrap gap-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSnippetCategory(cat)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors cursor-pointer ${
                    snippetCategory === cat
                      ? 'bg-[#e0095f] text-white'
                      : darkMode
                      ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {filteredSnippets.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={locked}
                  onClick={() => insertSnippet(item.code)}
                  className={`text-left p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-40 ${
                    darkMode
                      ? 'border-slate-800 hover:border-[#e0095f]/50 hover:bg-slate-800/70'
                      : 'border-slate-200/80 hover:border-[#e0095f]/40 hover:bg-rose-50/40'
                  }`}
                >
                  <div className="text-[11px] font-semibold truncate">{item.label}</div>
                  <div
                    className={`text-[10px] truncate mt-0.5 ${
                      darkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {item.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right-Edge Resize Handle */}
      <div
        onMouseDown={startResize}
        className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-[#e0095f]/35 active:bg-[#e0095f]/60 transition-colors z-20"
        title="Drag to resize code panel"
      />
    </aside>
  );
});
