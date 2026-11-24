import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Plus,
  FolderPlus,
  Search,
  Heart,
  Folder,
  FileCode2,
  Trash2,
  Copy,
  Upload,
  Download,
  LayoutTemplate,
  Sparkles,
} from 'lucide-react';
import type { DiagramDocument, DiagramFolder } from '../types';
import { detectDiagramType } from '../utils/frontmatter';
import { PaginationBar } from './PaginationBar';

interface FileSidebarProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  folders: DiagramFolder[];
  diagrams: DiagramDocument[];
  activeDiagramId: string;
  onSelectDiagram: (id: string) => void;
  onCreateDiagram: (opts?: { folderId?: string }) => void;
  onDuplicateDiagram: (id: string) => void;
  onDeleteDiagram: (id: string) => void;
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveDiagram: (diagramId: string, folderId: string) => void;
  onOpenTemplates: () => void;
  onImportMmd: (title: string, code: string) => void;
  onExportWorkspace: () => void;
  onImportWorkspace: (json: string) => boolean;
}

export const FileSidebar: React.FC<FileSidebarProps> = ({
  open,
  onClose,
  darkMode,
  folders,
  diagrams,
  activeDiagramId,
  onSelectDiagram,
  onCreateDiagram,
  onDuplicateDiagram,
  onDeleteDiagram,
  onCreateFolder,
  onDeleteFolder,
  onMoveDiagram,
  onOpenTemplates,
  onImportMmd,
  onExportWorkspace,
  onImportWorkspace,
}) => {
  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredDiagrams = useMemo(() => {
    return diagrams
      .filter((d) => {
        if (selectedFolder === 'favorites') return d.favorite;
        if (selectedFolder !== 'all') return d.folderId === selectedFolder;
        return true;
      })
      .filter((d) =>
        search.trim()
          ? d.title.toLowerCase().includes(search.toLowerCase()) ||
            d.code.toLowerCase().includes(search.toLowerCase())
          : true
      )
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [diagrams, selectedFolder, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDiagrams.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedDiagrams = useMemo(
    () => filteredDiagrams.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filteredDiagrams, safePage]
  );

  if (!open) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      if (file.name.endsWith('.json')) {
        const ok = onImportWorkspace(content);
        setImportStatus(ok ? 'Workspace backup restored!' : 'Invalid workspace JSON file.');
      } else {
        const cleanTitle = file.name.replace(/\.(mmd|mermaid|md|txt)$/i, '');
        onImportMmd(cleanTitle || 'Imported Diagram', content);
        setImportStatus(`Imported "${cleanTitle}"`);
      }
      setTimeout(() => setImportStatus(null), 3000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/35 backdrop-blur-[2px] transition-opacity"
      />

      {/* Drawer */}
      <aside
        className={`relative z-10 w-80 max-w-[88vw] h-full flex flex-col border-r shadow-2xl animate-pop ${
          darkMode
            ? 'bg-[#121520] border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-4 py-3.5 border-b ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f41b72] to-[#d00756] flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">Mermaid Studio</div>
              <div className="text-[10px] font-semibold text-[#e0095f]">
                PRO WORKSPACE · UNLIMITED
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Actions */}
        <div className="p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onCreateDiagram({
                  folderId:
                    selectedFolder !== 'all' && selectedFolder !== 'favorites'
                      ? selectedFolder
                      : 'personal',
                });
                onClose();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-semibold shadow-sm cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Diagram
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenTemplates();
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                darkMode
                  ? 'border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-200'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5 text-[#e0095f]" />
              Templates
            </button>
          </div>

          {/* Search */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border ${
              darkMode
                ? 'bg-slate-900/70 border-slate-800 text-slate-200'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Search className="w-3.5 h-3.5 opacity-50 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search diagrams or code..."
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
        </div>

        {/* Folders Strip */}
        <div className="px-3 pb-2 space-y-1">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-55">
              Collections
            </span>
            <button
              type="button"
              onClick={() => setCreatingFolder((v) => !v)}
              className="text-[11px] font-semibold text-[#e0095f] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <FolderPlus className="w-3 h-3" />
              New
            </button>
          </div>

          {creatingFolder && (
            <div className="flex items-center gap-1.5 mb-2">
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && folderName.trim()) {
                    onCreateFolder(folderName.trim());
                    setFolderName('');
                    setCreatingFolder(false);
                  }
                }}
                placeholder="Folder name..."
                autoFocus
                className={`flex-1 px-2.5 py-1 rounded-lg border text-xs outline-none ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700'
                    : 'bg-white border-slate-300'
                }`}
              />
              <button
                type="button"
                onClick={() => {
                  if (folderName.trim()) {
                    onCreateFolder(folderName.trim());
                    setFolderName('');
                    setCreatingFolder(false);
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-[#e0095f] text-white text-xs font-semibold cursor-pointer"
              >
                Add
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setSelectedFolder('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                selectedFolder === 'all'
                  ? 'bg-[#e0095f]/12 text-[#e0095f]'
                  : darkMode
                  ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({diagrams.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFolder('favorites')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                selectedFolder === 'favorites'
                  ? 'bg-[#e0095f]/12 text-[#e0095f]'
                  : darkMode
                  ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Heart className="w-3 h-3" />
              Favorites ({diagrams.filter((d) => d.favorite).length})
            </button>

            {folders.map((f) => (
              <div key={f.id} className="inline-flex items-center group">
                <button
                  type="button"
                  onClick={() => setSelectedFolder(f.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer transition-colors ${
                    selectedFolder === f.id
                      ? 'bg-[#e0095f]/12 text-[#e0095f]'
                      : darkMode
                      ? 'bg-slate-800/70 text-slate-300 hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Folder className="w-3 h-3" />
                  <span>{f.name}</span>
                </button>
                {f.id !== 'personal' && (
                  <button
                    type="button"
                    onClick={() => onDeleteFolder(f.id)}
                    className="ml-0.5 p-0.5 text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Delete folder"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Diagrams List (Paginated for zero lag) */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
          {pagedDiagrams.length === 0 ? (
            <div className="py-10 text-center text-xs opacity-60">
              No matching diagrams found.
            </div>
          ) : (
            <>
              {pagedDiagrams.map((doc) => {
              const isActive = doc.id === activeDiagramId;
              const typeLabel = detectDiagramType(doc.code);
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDiagram(doc.id);
                    onClose();
                  }}
                  className={`group p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? 'border-[#e0095f] bg-[#e0095f]/8'
                      : darkMode
                      ? 'border-slate-800/90 hover:border-slate-700 bg-slate-900/40'
                      : 'border-slate-200/70 hover:border-slate-300 bg-slate-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <FileCode2
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isActive ? 'text-[#e0095f]' : 'opacity-50'
                        }`}
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate flex items-center gap-1.5">
                          <span className="truncate">{doc.title}</span>
                          {doc.favorite && (
                            <Heart className="w-3 h-3 fill-[#e0095f] text-[#e0095f] shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] opacity-60">
                          <span>{typeLabel}</span>
                          <span>·</span>
                          <span>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <button
                        type="button"
                        onClick={() => onDuplicateDiagram(doc.id)}
                        className="p-1 rounded-md hover:bg-slate-500/15 cursor-pointer"
                        title="Duplicate"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteDiagram(doc.id)}
                        className="p-1 rounded-md hover:bg-rose-500/15 text-rose-500 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Folder Selector on Hover/Active */}
                  {folders.length > 1 && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 flex items-center justify-between"
                    >
                      <select
                        value={doc.folderId}
                        onChange={(e) => onMoveDiagram(doc.id, e.target.value)}
                        className={`text-[10px] rounded-md px-1.5 py-0.5 border outline-none ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-slate-300'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      >
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px] opacity-45">
                        {doc.versions.length} versions
                      </span>
                    </div>
                  )}
                </div>
              );
              })}
              <div className="pt-1.5">
                <PaginationBar
                  page={safePage}
                  totalPages={totalPages}
                  totalItems={filteredDiagrams.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  darkMode={darkMode}
                  compact
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Import / Backup Controls */}
        <div
          className={`p-3 border-t space-y-2 ${
            darkMode ? 'border-slate-800 bg-[#151824]' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          {importStatus && (
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 px-1">
              {importStatus}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".mmd,.mermaid,.md,.txt,.json"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                darkMode
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Import .mmd / JSON
            </button>
            <button
              type="button"
              onClick={onExportWorkspace}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl border text-[11px] font-semibold cursor-pointer ${
                darkMode
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              Backup JSON
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
