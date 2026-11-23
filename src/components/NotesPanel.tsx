import React, { useState } from 'react';
import { X, FileText, Eye, Edit3 } from 'lucide-react';

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  notes: string;
  onChangeNotes: (notes: string) => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  open,
  onClose,
  darkMode,
  notes,
  onChangeNotes,
}) => {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');

  if (!open) return null;

  return (
    <aside
      className={`w-80 sm:w-96 h-full border-l flex flex-col shrink-0 z-20 animate-pop ${
        darkMode
          ? 'bg-[#151824] border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          darkMode ? 'border-slate-800' : 'border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <FileText className="w-4 h-4 text-[#e0095f]" />
          <span>Diagram Notes</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode(mode === 'edit' ? 'preview' : 'edit')}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
              darkMode ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {mode === 'edit' ? (
              <>
                <Eye className="w-3 h-3" />
                Preview
              </>
            ) : (
              <>
                <Edit3 className="w-3 h-3" />
                Edit
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`p-1 rounded-lg cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'edit' ? (
          <textarea
            value={notes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Write architecture documentation, assumptions, metrics, or design decisions here..."
            className={`w-full h-full min-h-[300px] bg-transparent text-xs leading-relaxed outline-none resize-none font-mono ${
              darkMode ? 'text-slate-200' : 'text-slate-700'
            }`}
          />
        ) : (
          <div className="space-y-2.5 text-xs leading-relaxed">
            {notes.trim() ? (
              notes.split('\n').map((line, i) => {
                if (line.startsWith('### ')) {
                  return (
                    <h4 key={i} className="text-xs font-bold mt-3">
                      {line.slice(4)}
                    </h4>
                  );
                }
                if (line.startsWith('## ')) {
                  return (
                    <h3 key={i} className="text-sm font-bold text-[#e0095f] mt-2">
                      {line.slice(3)}
                    </h3>
                  );
                }
                if (line.startsWith('# ')) {
                  return (
                    <h2 key={i} className="text-base font-extrabold mt-2">
                      {line.slice(2)}
                    </h2>
                  );
                }
                if (line.startsWith('- ')) {
                  return (
                    <div key={i} className="flex gap-2 pl-1">
                      <span className="text-[#e0095f]">•</span>
                      <span>{line.slice(2)}</span>
                    </div>
                  );
                }
                if (!line.trim()) return <div key={i} className="h-1" />;
                return <p key={i}>{line}</p>;
              })
            ) : (
              <div className="opacity-50 text-center py-10">No notes written yet.</div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
