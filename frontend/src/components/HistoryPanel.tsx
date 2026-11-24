import React, { useMemo, useState } from 'react';
import { X, History, RotateCcw, BookmarkPlus, Trash2, GitCompare } from 'lucide-react';
import type { VersionSnapshot } from '../types';
import { PaginationBar } from './PaginationBar';

interface HistoryPanelProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  currentCode: string;
  versions: VersionSnapshot[];
  locked: boolean;
  onSaveCheckpoint: (label: string) => void;
  onRestoreVersion: (id: string) => void;
  onDeleteVersion: (id: string) => void;
}

function computeSimpleDiff(oldText: string, newText: string) {
  const oldLines = oldText.split(/\r?\n/);
  const newLines = newText.split(/\r?\n/);
  const maxLen = Math.max(oldLines.length, newLines.length);
  const rows: { type: 'same' | 'added' | 'removed' | 'changed'; oldLine?: string; newLine?: string; lineNum: number }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const a = oldLines[i];
    const b = newLines[i];
    if (a === b) {
      rows.push({ type: 'same', oldLine: a, newLine: b, lineNum: i + 1 });
    } else if (a === undefined) {
      rows.push({ type: 'added', newLine: b, lineNum: i + 1 });
    } else if (b === undefined) {
      rows.push({ type: 'removed', oldLine: a, lineNum: i + 1 });
    } else {
      rows.push({ type: 'changed', oldLine: a, newLine: b, lineNum: i + 1 });
    }
  }
  return rows;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  open,
  onClose,
  darkMode,
  currentCode,
  versions,
  locked,
  onSaveCheckpoint,
  onRestoreVersion,
  onDeleteVersion,
}) => {
  const [label, setLabel] = useState('');
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const totalPages = Math.max(1, Math.ceil(versions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedVersions = useMemo(
    () => versions.slice((safePage - 1) * pageSize, safePage * pageSize),
    [versions, safePage]
  );

  const previewVersion = useMemo(
    () => versions.find((v) => v.id === previewId) || null,
    [versions, previewId]
  );

  const diffRows = useMemo(() => {
    if (!previewVersion) return [];
    return computeSimpleDiff(previewVersion.code, currentCode).filter((r) => r.type !== 'same');
  }, [previewVersion, currentCode]);

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
          <History className="w-4 h-4 text-[#e0095f]" />
          <span>Version History</span>
          <span className="px-1.5 py-0.5 rounded-full bg-[#e0095f]/12 text-[#e0095f] text-[10px]">
            Unlimited
          </span>
        </div>
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

      {/* Create Named Checkpoint */}
      <div
        className={`p-3 border-b space-y-2 ${
          darkMode ? 'border-slate-800 bg-[#1a1e2e]/50' : 'border-slate-100 bg-slate-50/70'
        }`}
      >
        <div className="flex gap-1.5">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onSaveCheckpoint(label);
                setLabel('');
              }
            }}
            placeholder="Checkpoint name (e.g. v2 Architecture)..."
            className={`flex-1 px-2.5 py-1.5 rounded-xl border text-xs outline-none ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          />
          <button
            type="button"
            onClick={() => {
              onSaveCheckpoint(label);
              setLabel('');
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-semibold shrink-0 cursor-pointer"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            Save
          </button>
        </div>
      </div>

      {/* Diff Inspector if a version is selected */}
      {previewVersion && (
        <div
          className={`p-3 border-b max-h-56 overflow-y-auto ${
            darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold flex items-center gap-1.5">
              <GitCompare className="w-3.5 h-3.5 text-[#e0095f]" />
              Diff vs Current ({diffRows.length} changed lines)
            </span>
            <button
              type="button"
              onClick={() => setPreviewId(null)}
              className="text-[10px] font-semibold opacity-65 hover:opacity-100 cursor-pointer"
            >
              Close
            </button>
          </div>

          {diffRows.length === 0 ? (
            <div className="text-[11px] opacity-65 py-2">Identical to current diagram code.</div>
          ) : (
            <div className="space-y-1 font-mono text-[10px]">
              {diffRows.slice(0, 30).map((row, idx) => (
                <div key={idx} className="rounded overflow-hidden">
                  {row.oldLine !== undefined && (
                    <div className="px-2 py-0.5 bg-rose-500/15 text-rose-700 dark:text-rose-300 truncate">
                      - L{row.lineNum}: {row.oldLine}
                    </div>
                  )}
                  {row.newLine !== undefined && (
                    <div className="px-2 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 truncate">
                      + L{row.lineNum}: {row.newLine}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Versions Timeline (Paginated) */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {versions.length === 0 ? (
          <div className="text-center py-12 text-xs opacity-60">
            No saved checkpoints yet. Auto-snapshots are captured as you edit, or save a named
            checkpoint above.
          </div>
        ) : (
          <>
            {pagedVersions.map((ver) => (
            <div
              key={ver.id}
              className={`p-3 rounded-xl border transition-colors ${
                previewId === ver.id
                  ? 'border-[#e0095f] bg-[#e0095f]/6'
                  : darkMode
                  ? 'border-slate-800 bg-slate-900/40'
                  : 'border-slate-200/80 bg-slate-50/40'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                    <span>{ver.label}</span>
                    {ver.isManual && (
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-[9px] font-bold">
                        PINNED
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] opacity-60 mt-0.5">
                    {new Date(ver.timestamp).toLocaleString()} · {ver.code.split('\n').length} lines
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteVersion(ver.id)}
                  className="p-1 rounded hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 cursor-pointer"
                  title="Delete snapshot"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-2 mt-2.5">
                <button
                  type="button"
                  onClick={() => setPreviewId(previewId === ver.id ? null : ver.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                    darkMode
                      ? 'border-slate-700 hover:bg-slate-800'
                      : 'border-slate-200 bg-white hover:bg-slate-100'
                  }`}
                >
                  <GitCompare className="w-3 h-3" />
                  {previewId === ver.id ? 'Hide Diff' : 'Compare'}
                </button>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => onRestoreVersion(ver.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#1e1b2e] hover:bg-[#2c2842] text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            </div>
            ))}
            <div className="pt-1">
              <PaginationBar
                page={safePage}
                totalPages={totalPages}
                totalItems={versions.length}
                pageSize={pageSize}
                onPageChange={setPage}
                darkMode={darkMode}
                compact
              />
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
