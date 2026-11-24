import React, { useEffect, useRef, useState } from 'react';
import {
  Menu,
  Heart,
  MoreVertical,
  MessageSquare,
  FileText,
  History,
  Download,
  Share2,
  Sun,
  Moon,
  Presentation,
  Copy,
  Trash2,
  FolderOpen,
  FileCode2,
  Check,
  Lock,
  Unlock,
  Cloud,
  CloudUpload,
  CloudOff,
  LogOut,
  UserCog,
  ShieldCheck,
} from 'lucide-react';
import type { AuthUser, DiagramDocument, DiagramFolder, SyncStatus } from '../types';
import { detectDiagramType } from '../utils/frontmatter';

interface TopBarProps {
  user: AuthUser;
  syncStatus: SyncStatus;
  diagram: DiagramDocument;
  folder: DiagramFolder;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenSidebar: () => void;
  onRename: (title: string) => void;
  onToggleFavorite: () => void;
  onToggleLocked: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExportMmd: () => void;
  onOpenExport: () => void;
  onOpenShare: () => void;
  onOpenPresentation: () => void;
  onOpenAccount: () => void;
  onOpenSuperAdmin: () => void;
  onLogout: () => void;
  activeDrawer: 'none' | 'comments' | 'notes' | 'history';
  onToggleDrawer: (drawer: 'comments' | 'notes' | 'history') => void;
  unresolvedCommentsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  syncStatus,
  diagram,
  folder,
  darkMode,
  onToggleDarkMode,
  onOpenSidebar,
  onRename,
  onToggleFavorite,
  onToggleLocked,
  onDuplicate,
  onDelete,
  onExportMmd,
  onOpenExport,
  onOpenShare,
  onOpenPresentation,
  onOpenAccount,
  onOpenSuperAdmin,
  onLogout,
  activeDrawer,
  onToggleDrawer,
  unresolvedCommentsCount,
}) => {
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftTitle, setDraftTitle] = useState(diagram.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const accountMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraftTitle(diagram.title);
  }, [diagram.id, diagram.title]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== diagram.title) {
      onRename(trimmed);
    } else {
      setDraftTitle(diagram.title);
    }
    setEditingTitle(false);
  };

  const diagramType = detectDiagramType(diagram.code);

  return (
    <header
      className={`h-14 px-3 sm:px-4 flex items-center justify-between border-b shrink-0 z-30 select-none transition-colors ${
        darkMode
          ? 'bg-[#121520] border-slate-800/90 text-slate-100'
          : 'bg-white border-slate-200/80 text-slate-800'
      }`}
    >
      {/* Left Cluster: Menu, Brand Logo, Breadcrumb, Favorite, More */}
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenSidebar}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            darkMode
              ? 'hover:bg-slate-800 text-slate-300'
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          title="Files, Folders & Workspace"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mermaid.ai Signature Magenta Rounded Square Brand Badge */}
        <button
          type="button"
          onClick={onOpenSidebar}
          className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f41b72] to-[#d00756] flex items-center justify-center shadow-sm shadow-[#e0095f]/30 shrink-0 cursor-pointer hover:brightness-105 transition"
          title="Mermaid Studio Pro"
        >
          <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white" fill="currentColor">
            <path d="M4.2 5.2C6.8 5.4 9.5 6.8 11.4 9.1c.35.42.85.42 1.2 0C14.5 6.8 17.2 5.4 19.8 5.2c.65-.05 1.2.46 1.2 1.12v2.1c0 3.72-2.06 6.76-5.22 8.2-.42.19-.78.57-.78 1.04v.84c0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1v-.84c0-.47-.36-.85-.78-1.04C5.06 15.18 3 12.14 3 8.42v-2.1c0-.66.55-1.17 1.2-1.12z" />
          </svg>
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 min-w-0 ml-1">
          <button
            type="button"
            onClick={onOpenSidebar}
            className={`hidden md:flex items-center gap-1 text-sm font-medium truncate max-w-[140px] cursor-pointer transition-colors ${
              darkMode
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{folder.name}</span>
          </button>
          <span
            className={`hidden md:inline text-sm ${
              darkMode ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            /
          </span>

          {editingTitle ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitle();
                  if (e.key === 'Escape') {
                    setDraftTitle(diagram.title);
                    setEditingTitle(false);
                  }
                }}
                autoFocus
                className={`px-2 py-0.5 text-sm font-semibold rounded-lg border outline-none w-44 sm:w-56 ${
                  darkMode
                    ? 'bg-slate-900 border-[#e0095f] text-white'
                    : 'bg-white border-[#e0095f] text-slate-900'
                }`}
              />
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  commitTitle();
                }}
                className="p-1 rounded-md bg-[#e0095f] text-white cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className={`text-sm font-semibold truncate max-w-[140px] sm:max-w-[230px] px-1.5 py-0.5 rounded-lg transition-colors cursor-text ${
                darkMode ? 'hover:bg-slate-800 text-slate-100' : 'hover:bg-slate-100 text-slate-800'
              }`}
              title="Click to rename diagram"
            >
              {diagram.title}
            </button>
          )}

          <span
            className={`hidden xl:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${
              darkMode
                ? 'bg-slate-800 text-slate-400'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {diagramType}
          </span>
        </div>

        {/* Favorite Heart */}
        <button
          type="button"
          onClick={onToggleFavorite}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
            diagram.favorite
              ? 'text-[#e0095f] bg-[#e0095f]/10'
              : darkMode
              ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          }`}
          title={diagram.favorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-4 h-4 ${diagram.favorite ? 'fill-current' : ''}`} />
        </button>

        {/* Three Dots Menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              darkMode
                ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title="Diagram actions"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              className={`absolute left-0 top-full mt-1.5 w-52 rounded-xl border shadow-xl py-1.5 z-50 animate-pop ${
                darkMode
                  ? 'bg-[#1a1e2e] border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setEditingTitle(true);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                Rename Diagram
              </button>
              <button
                type="button"
                onClick={() => {
                  onDuplicate();
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                Duplicate Diagram
              </button>
              <button
                type="button"
                onClick={() => {
                  onToggleLocked();
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                {diagram.locked ? (
                  <Unlock className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                )}
                {diagram.locked ? 'Unlock Editing' : 'Lock Diagram'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportMmd();
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 text-slate-400" />
                Download .mmd Source
              </button>
              <button
                type="button"
                onClick={() => {
                  onOpenPresentation();
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <Presentation className="w-3.5 h-3.5 text-slate-400" />
                Presentation Mode
              </button>
              <div className={`my-1 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`} />
              <button
                type="button"
                onClick={() => {
                  onDelete();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Diagram
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Cluster: Comments, Notes, History, Presentation, Dark Mode, Download, Share, Pro Unlocked */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onToggleDrawer('comments')}
          className={`relative p-2 rounded-xl transition-colors cursor-pointer ${
            activeDrawer === 'comments'
              ? 'bg-[#e0095f]/12 text-[#e0095f]'
              : darkMode
              ? 'text-slate-300 hover:bg-slate-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Comments & Canvas Annotations"
        >
          <MessageSquare className="w-4.5 h-4.5" />
          {unresolvedCommentsCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#e0095f] text-white text-[9px] font-bold flex items-center justify-center">
              {unresolvedCommentsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onToggleDrawer('notes')}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            activeDrawer === 'notes'
              ? 'bg-[#e0095f]/12 text-[#e0095f]'
              : darkMode
              ? 'text-slate-300 hover:bg-slate-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Diagram Notes & Documentation"
        >
          <FileText className="w-4.5 h-4.5" />
        </button>

        <button
          type="button"
          onClick={() => onToggleDrawer('history')}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            activeDrawer === 'history'
              ? 'bg-[#e0095f]/12 text-[#e0095f]'
              : darkMode
              ? 'text-slate-300 hover:bg-slate-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Unlimited Version History & Diffs"
        >
          <History className="w-4.5 h-4.5" />
        </button>

        <button
          type="button"
          onClick={onOpenPresentation}
          className={`hidden sm:flex p-2 rounded-xl transition-colors cursor-pointer ${
            darkMode
              ? 'text-slate-300 hover:bg-slate-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Presentation Mode (Fullscreen)"
        >
          <Presentation className="w-4.5 h-4.5" />
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          className={`p-2 rounded-xl transition-colors cursor-pointer ${
            darkMode
              ? 'text-amber-300 hover:bg-slate-800'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title={darkMode ? 'Switch to Light Workspace' : 'Switch to Dark Workspace'}
        >
          {darkMode ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
        </button>

        {/* Download / Export Studio Button */}
        <button
          type="button"
          onClick={onOpenExport}
          className={`p-2 rounded-xl border transition-colors cursor-pointer ${
            darkMode
              ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700'
              : 'bg-[#eaf0f6] border-slate-200/80 text-slate-700 hover:bg-slate-200/80'
          }`}
          title="Export Studio (PNG 8x, SVG, PDF, Markdown)"
        >
          <Download className="w-4.5 h-4.5" />
        </button>

        {/* Live PostgreSQL Sync Indicator */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold ${
            syncStatus === 'error'
              ? 'bg-rose-500/12 text-rose-500'
              : syncStatus === 'saving' || syncStatus === 'loading'
              ? darkMode
                ? 'bg-slate-800 text-sky-400'
                : 'bg-sky-50 text-sky-600'
              : darkMode
              ? 'bg-slate-800/70 text-emerald-400'
              : 'bg-emerald-50 text-emerald-600'
          }`}
          title="Status sinkronisasi ke database PostgreSQL"
        >
          {syncStatus === 'error' ? (
            <>
              <CloudOff className="w-3.5 h-3.5" />
              <span>Sync Error</span>
            </>
          ) : syncStatus === 'saving' || syncStatus === 'loading' ? (
            <>
              <CloudUpload className="w-3.5 h-3.5 animate-pulse" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5" />
              <span>Saved</span>
            </>
          )}
        </div>

        {/* Share Pill Button (Mermaid.ai Dark Charcoal Button) */}
        <button
          type="button"
          onClick={onOpenShare}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1e1b2e] hover:bg-[#2c2842] text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 hidden sm:block" />
          <span>Share</span>
        </button>

        {/* Super Admin Quick Console Button (only for super_admin role) */}
        {user.role === 'super_admin' && (
          <button
            type="button"
            onClick={onOpenSuperAdmin}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-600 hover:brightness-105 text-white text-xs font-bold shadow-sm shadow-amber-500/25 cursor-pointer transition"
            title="Buka Super Admin Console"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </button>
        )}

        {/* User Account Pill & Dropdown */}
        <div className="relative" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-3 py-1 rounded-xl bg-gradient-to-r from-[#e0095f] to-[#b8054c] hover:brightness-105 text-white text-xs font-bold shadow-sm shadow-[#e0095f]/25 cursor-pointer transition"
            title={`Akun: ${user.name} (${user.email})`}
          >
            <span className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-[11px] font-extrabold">
              {user.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="hidden lg:inline max-w-[110px] truncate">{user.name}</span>
          </button>

          {accountMenuOpen && (
            <div
              className={`absolute right-0 top-full mt-2 w-56 rounded-2xl border shadow-2xl py-2 z-50 animate-pop ${
                darkMode
                  ? 'bg-[#1a1e2e] border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div
                className={`px-3.5 py-2 border-b ${
                  darkMode ? 'border-slate-800' : 'border-slate-100'
                }`}
              >
                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                  <span className="truncate">{user.name}</span>
                  {user.role === 'super_admin' && (
                    <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold shrink-0">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-[11px] opacity-65 truncate">{user.email}</div>
              </div>
              {user.role === 'super_admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setAccountMenuOpen(false);
                    onOpenSuperAdmin();
                  }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-amber-600 dark:text-amber-400 cursor-pointer ${
                    darkMode ? 'hover:bg-slate-800' : 'hover:bg-amber-50/70'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Super Admin Console
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onOpenAccount();
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium cursor-pointer ${
                  darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'
                }`}
              >
                <UserCog className="w-3.5 h-3.5 text-slate-400" />
                Pengaturan Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountMenuOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
