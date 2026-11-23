import React, { useState } from 'react';
import { X, BookOpen, Copy, Check, ArrowRight } from 'lucide-react';
import { MERMAID_DOCS_SECTIONS } from '../data/snippets';

interface DocsModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  onInsertExample: (code: string) => void;
}

export const DocsModal: React.FC<DocsModalProps> = ({
  open,
  onClose,
  darkMode,
  onInsertExample,
}) => {
  const [activeId, setActiveId] = useState(MERMAID_DOCS_SECTIONS[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!open) return null;

  const active =
    MERMAID_DOCS_SECTIONS.find((s) => s.id === activeId) || MERMAID_DOCS_SECTIONS[0];

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs" />

      <div
        className={`relative z-10 w-full max-w-3xl max-h-[82vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-pop ${
          darkMode
            ? 'bg-[#151824] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-base">
            <BookOpen className="w-4.5 h-4.5 text-[#e0095f]" />
            <span>Mermaid Syntax Guide &amp; Reference</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col sm:flex-row">
          {/* Left Topics */}
          <div
            className={`sm:w-56 border-b sm:border-b-0 sm:border-r p-2.5 space-y-1 overflow-y-auto shrink-0 ${
              darkMode ? 'border-slate-800 bg-[#121520]' : 'border-slate-100 bg-slate-50/70'
            }`}
          >
            {MERMAID_DOCS_SECTIONS.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveId(sec.id)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  active.id === sec.id
                    ? 'bg-[#e0095f] text-white shadow-sm'
                    : darkMode
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-700 hover:bg-slate-200/60'
                }`}
              >
                {sec.title}
              </button>
            ))}
          </div>

          {/* Right Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <h3 className="text-base font-bold">{active.title}</h3>
              <p className="text-xs opacity-75 mt-1 leading-relaxed">{active.summary}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold">Example Syntax</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(active.id, active.syntax)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                      darkMode
                        ? 'border-slate-700 hover:bg-slate-800'
                        : 'border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {copiedId === active.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onInsertExample(active.syntax);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#e0095f] hover:bg-[#c50753] text-white text-[11px] font-semibold cursor-pointer"
                  >
                    <span>Load in Editor</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <pre
                className={`p-3.5 rounded-xl border text-xs font-mono overflow-x-auto leading-relaxed ${
                  darkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                {active.syntax}
              </pre>
            </div>

            <div>
              <div className="text-xs font-bold mb-2">Pro Tips</div>
              <ul className="space-y-1.5">
                {active.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs opacity-85">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e0095f] mt-1.5 shrink-0" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
