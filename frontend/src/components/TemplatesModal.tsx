import React, { useMemo, useState } from 'react';
import { X, LayoutTemplate, Search, Plus, ArrowRight } from 'lucide-react';
import { DIAGRAM_TEMPLATES } from '../data/templates';
import type { DiagramTemplate } from '../types';
import { PaginationBar } from './PaginationBar';

interface TemplatesModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  onApplyToCurrent: (tpl: DiagramTemplate) => void;
  onCreateNewFromTemplate: (tpl: DiagramTemplate) => void;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  open,
  onClose,
  darkMode,
  onApplyToCurrent,
  onCreateNewFromTemplate,
}) => {
  const [category, setCategory] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(DIAGRAM_TEMPLATES.map((t) => t.category)))],
    []
  );

  const filtered = useMemo(() => {
    return DIAGRAM_TEMPLATES.filter((t) =>
      category === 'All' ? true : t.category === category
    ).filter((t) =>
      query.trim()
        ? t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.description.toLowerCase().includes(query.toLowerCase()) ||
          t.category.toLowerCase().includes(query.toLowerCase())
        : true
    );
  }, [category, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedTemplates = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs" />

      <div
        className={`relative z-10 w-full max-w-4xl max-h-[86vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden animate-pop ${
          darkMode
            ? 'bg-[#151824] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b shrink-0 ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e0095f]/12 text-[#e0095f] flex items-center justify-center">
              <LayoutTemplate className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Pro Diagram Templates</h2>
              <p className="text-xs opacity-65">
                {DIAGRAM_TEMPLATES.length} ready-to-edit blueprints across every Mermaid diagram type
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <Search className="w-3.5 h-3.5 opacity-55" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search templates..."
                className="bg-transparent text-xs outline-none w-40"
              />
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
        </div>

        {/* Category Filter Strip */}
        <div
          className={`flex items-center gap-1.5 px-5 py-2.5 border-b overflow-x-auto shrink-0 ${
            darkMode ? 'border-slate-800 bg-[#121520]' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setCategory(cat);
                setPage(1);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                category === cat
                  ? 'bg-[#e0095f] text-white shadow-sm'
                  : darkMode
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template Cards Grid (Paginated) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pagedTemplates.map((tpl) => (
            <div
              key={tpl.id}
              className={`flex flex-col justify-between p-4 rounded-2xl border transition-all ${
                darkMode
                  ? 'border-slate-800 bg-slate-900/50 hover:border-[#e0095f]/60'
                  : 'border-slate-200/90 bg-slate-50/50 hover:border-[#e0095f]/50 hover:bg-white hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    {tpl.category}
                  </span>
                  {tpl.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-[#e0095f]/12 text-[#e0095f] text-[10px] font-bold">
                      {tpl.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-bold leading-snug">{tpl.title}</h3>
                <p className="text-xs opacity-70 mt-1.5 leading-relaxed">{tpl.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onCreateNewFromTemplate(tpl);
                    onClose();
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-[11px] font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onApplyToCurrent(tpl);
                    onClose();
                  }}
                  className={`flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 hover:bg-slate-800'
                      : 'border-slate-200 bg-white hover:bg-slate-100'
                  }`}
                  title="Replace current diagram code"
                >
                  <span>Replace</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          </div>
          <PaginationBar
            page={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            darkMode={darkMode}
            itemLabel="template"
          />
        </div>
      </div>
    </div>
  );
};
