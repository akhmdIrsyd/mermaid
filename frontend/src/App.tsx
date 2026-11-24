import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authApi, getAuthToken, setAuthToken } from './api/client';
import type { AuthUser } from './types';
import { useWorkspace } from './store/useWorkspace';
import { renderMermaidDiagram } from './utils/mermaidEngine';
import { executeExport } from './utils/export';
import { decodeShareHash } from './utils/share';
import { AuthPage } from './components/AuthPage';
import { AccountModal } from './components/AccountModal';
import { SuperAdminModal } from './components/SuperAdminModal';
import { TopBar } from './components/TopBar';
import { CodeEditorPanel } from './components/CodeEditorPanel';
import { CanvasWorkspace } from './components/CanvasWorkspace';
import { FileSidebar } from './components/FileSidebar';
import { ExportModal } from './components/ExportModal';
import { ShareModal } from './components/ShareModal';
import { HistoryPanel } from './components/HistoryPanel';
import { CommentsPanel } from './components/CommentsPanel';
import { NotesPanel } from './components/NotesPanel';
import { DocsModal } from './components/DocsModal';
import { TemplatesModal } from './components/TemplatesModal';
import { PresentationOverlay } from './components/PresentationOverlay';

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  // Restore session from JWT token on initial load
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setAuthChecking(false);
      return;
    }

    let cancelled = false;
    authApi
      .me()
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch(() => {
        if (!cancelled) {
          setAuthToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (authChecking) {
    return (
      <div className="h-screen w-screen flex items-center justify-center canvas-grid-light text-slate-700">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-slate-200 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f41b72] to-[#c90652] animate-pulse" />
          <div className="text-xs font-bold tracking-wide">Memuat sesi Mermaid Studio...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthenticated={setUser} />;
  }

  return (
    <AuthenticatedWorkspace
      user={user}
      onUserUpdated={setUser}
      onLogout={handleLogout}
    />
  );
}

interface AuthenticatedWorkspaceProps {
  user: AuthUser;
  onUserUpdated: (user: AuthUser) => void;
  onLogout: () => void;
}

const AuthenticatedWorkspace: React.FC<AuthenticatedWorkspaceProps> = ({
  user,
  onUserUpdated,
  onLogout,
}) => {
  const ws = useWorkspace(user, onLogout);
  const { activeDiagram, activeFolder, darkMode } = ws;

  const [codeOpen, setCodeOpen] = useState(true);
  const [editorWidth, setEditorWidth] = useState(390);
  const [autoUpdate, setAutoUpdate] = useState(true);

  const [renderedSvg, setRenderedSvg] = useState('');
  const [liveExportSvg, setLiveExportSvg] = useState('');
  const [bindFn, setBindFn] = useState<((el: Element) => void) | undefined>(undefined);
  const [renderError, setRenderError] = useState<string | undefined>(undefined);
  const [errorLine, setErrorLine] = useState<number | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [superAdminOpen, setSuperAdminOpen] = useState(false);
  const [presentationOpen, setPresentationOpen] = useState(() => {
    const shared = decodeShareHash(window.location.hash);
    return Boolean(shared?.presentation);
  });

  const [activeDrawer, setActiveDrawer] = useState<'none' | 'comments' | 'notes' | 'history'>(
    'none'
  );
  const [jumpToLine, setJumpToLine] = useState<{ line: number; token: number } | null>(null);

  const renderRequestRef = useRef(0);

  const runRender = useCallback(async (sourceCode: string) => {
    const reqId = ++renderRequestRef.current;
    const res = await renderMermaidDiagram(sourceCode);
    if (reqId !== renderRequestRef.current) return;

    if (res.error) {
      setRenderError(res.error);
      setErrorLine(res.errorLine ?? null);
    } else {
      setRenderedSvg(res.svg);
      setBindFn(() => res.bindFunctions);
      setRenderError(undefined);
      setErrorLine(null);
    }
  }, []);

  // Debounced auto-render when autoUpdate is enabled
  useEffect(() => {
    if (!autoUpdate || ws.loading) return;
    const timer = setTimeout(() => {
      runRender(activeDiagram.code);
    }, 180);
    return () => clearTimeout(timer);
  }, [activeDiagram.code, activeDiagram.id, autoUpdate, ws.loading, runRender]);

  // Always render immediately when switching diagrams or right after DB finishes loading
  useEffect(() => {
    if (ws.loading) return;
    runRender(activeDiagram.code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDiagram.id, ws.loading]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const handleJumpToLine = useCallback((line: number) => {
    setCodeOpen(true);
    setJumpToLine({ line, token: Date.now() });
  }, []);

  const handleToggleDrawer = useCallback((drawer: 'comments' | 'notes' | 'history') => {
    setActiveDrawer((prev) => (prev === drawer ? 'none' : drawer));
  }, []);

  if (ws.loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center canvas-grid-light text-slate-700">
        <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white border border-slate-200 shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#f41b72] to-[#c90652] animate-pulse" />
          <div className="text-xs font-bold tracking-wide">
            Mengambil workspace dari database PostgreSQL...
          </div>
        </div>
      </div>
    );
  }

  const unresolvedCommentsCount = activeDiagram.comments.filter((c) => !c.resolved).length;

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden ${
        darkMode ? 'bg-[#0f111a] text-slate-100' : 'bg-[#fafbfc] text-slate-900'
      }`}
    >
      {/* Top Navigation Bar */}
      <TopBar
        user={user}
        syncStatus={ws.syncStatus}
        diagram={activeDiagram}
        folder={activeFolder}
        darkMode={darkMode}
        onToggleDarkMode={ws.toggleDarkMode}
        onOpenSidebar={() => setSidebarOpen(true)}
        onRename={(title) => ws.updateActiveDiagram((d) => ({ ...d, title }), true)}
        onToggleFavorite={() =>
          ws.updateActiveDiagram((d) => ({ ...d, favorite: !d.favorite }), true)
        }
        onToggleLocked={() =>
          ws.updateActiveDiagram((d) => ({ ...d, locked: !d.locked }), true)
        }
        onDuplicate={() => ws.duplicateDiagram(activeDiagram.id)}
        onDelete={() => ws.deleteDiagram(activeDiagram.id)}
        onExportMmd={() =>
          executeExport(liveExportSvg || renderedSvg, activeDiagram.code, {
            format: 'mmd',
            scale: 2,
            background: 'white',
            customBackground: '#ffffff',
            padding: 20,
            filename: activeDiagram.title,
          })
        }
        onOpenExport={() => setExportOpen(true)}
        onOpenShare={() => setShareOpen(true)}
        onOpenPresentation={() => setPresentationOpen(true)}
        onOpenAccount={() => setAccountOpen(true)}
        onOpenSuperAdmin={() => setSuperAdminOpen(true)}
        onLogout={onLogout}
        activeDrawer={activeDrawer}
        onToggleDrawer={handleToggleDrawer}
        unresolvedCommentsCount={unresolvedCommentsCount}
      />

      {/* Main Split Workspace */}
      <div className="relative flex-1 min-h-0 flex overflow-hidden">
        {codeOpen && (
          <div className="p-3 pr-0 h-full z-20 shrink-0 hidden sm:block">
            <CodeEditorPanel
              code={activeDiagram.code}
              onChange={ws.setActiveCode}
              autoUpdate={autoUpdate}
              onToggleAutoUpdate={() => setAutoUpdate((a) => !a)}
              onManualRender={() => runRender(activeDiagram.code)}
              onOpenDocs={() => setDocsOpen(true)}
              onClose={() => setCodeOpen(false)}
              locked={activeDiagram.locked}
              darkMode={darkMode}
              error={renderError}
              errorLine={errorLine}
              jumpToLine={jumpToLine}
              width={editorWidth}
              onResizeWidth={setEditorWidth}
            />
          </div>
        )}

        {codeOpen && (
          <div className="sm:hidden fixed inset-x-3 top-16 bottom-3 z-30">
            <CodeEditorPanel
              code={activeDiagram.code}
              onChange={ws.setActiveCode}
              autoUpdate={autoUpdate}
              onToggleAutoUpdate={() => setAutoUpdate((a) => !a)}
              onManualRender={() => runRender(activeDiagram.code)}
              onOpenDocs={() => setDocsOpen(true)}
              onClose={() => setCodeOpen(false)}
              locked={activeDiagram.locked}
              darkMode={darkMode}
              error={renderError}
              errorLine={errorLine}
              jumpToLine={jumpToLine}
              width={Math.min(window.innerWidth - 24, 420)}
              onResizeWidth={setEditorWidth}
            />
          </div>
        )}

        {/* Center Interactive Canvas */}
        <CanvasWorkspace
          svg={renderedSvg}
          bindFunctions={bindFn}
          code={activeDiagram.code}
          onChangeCode={ws.setActiveCode}
          onForceRender={runRender}
          locked={activeDiagram.locked}
          onToggleLocked={() =>
            ws.updateActiveDiagram((d) => ({ ...d, locked: !d.locked }), true)
          }
          darkMode={darkMode}
          codeOpen={codeOpen}
          onOpenCode={() => setCodeOpen(true)}
          onOpenTemplates={() => setTemplatesOpen(true)}
          onJumpToLine={handleJumpToLine}
          placementMode={activeDiagram.placementMode || 'auto'}
          manualOffsets={activeDiagram.manualOffsets || {}}
          edgeAdjustments={activeDiagram.edgeAdjustments || {}}
          onChangePlacementMode={ws.setPlacementMode}
          onCommitNodeOffset={ws.setManualNodeOffset}
          onCommitNodeOffsetsBatch={ws.setManualNodeOffsetsBatch}
          onCommitEdgeAdjustment={ws.setEdgeAdjustment}
          onResetManualOffsets={ws.resetManualOffsets}
          onLiveSvgChange={setLiveExportSvg}
          stickyNotes={activeDiagram.stickyNotes || []}
          onAddStickyNote={(x, y) => ws.addStickyNote(x, y)}
          onUpdateStickyNote={ws.updateStickyNote}
          onDeleteStickyNote={ws.deleteStickyNote}
          pinnedComments={activeDiagram.comments}
          onAddPinnedComment={(text, pos) => ws.addComment(text, user.name, pos)}
          onSelectCommentDrawer={() => setActiveDrawer('comments')}
        />

        {/* Right Collaboration / History / Notes Drawers */}
        <HistoryPanel
          open={activeDrawer === 'history'}
          onClose={() => setActiveDrawer('none')}
          darkMode={darkMode}
          currentCode={activeDiagram.code}
          versions={activeDiagram.versions}
          locked={activeDiagram.locked}
          onSaveCheckpoint={ws.saveManualVersion}
          onRestoreVersion={ws.restoreVersion}
          onDeleteVersion={ws.deleteVersion}
        />

        <CommentsPanel
          open={activeDrawer === 'comments'}
          onClose={() => setActiveDrawer('none')}
          darkMode={darkMode}
          comments={activeDiagram.comments}
          onAddComment={(text) => ws.addComment(text, user.name)}
          onReplyComment={(cid, text) => ws.replyComment(cid, text, user.name)}
          onToggleResolve={ws.toggleResolveComment}
          onDeleteComment={ws.deleteComment}
        />

        <NotesPanel
          open={activeDrawer === 'notes'}
          onClose={() => setActiveDrawer('none')}
          darkMode={darkMode}
          notes={activeDiagram.notes}
          onChangeNotes={(notes) => ws.updateActiveDiagram((d) => ({ ...d, notes }))}
        />
      </div>

      {/* Overlays & Modals */}
      <FileSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        darkMode={darkMode}
        folders={ws.folders}
        diagrams={ws.diagrams}
        activeDiagramId={activeDiagram.id}
        onSelectDiagram={ws.selectDiagram}
        onCreateDiagram={ws.createDiagram}
        onDuplicateDiagram={ws.duplicateDiagram}
        onDeleteDiagram={ws.deleteDiagram}
        onCreateFolder={ws.createFolder}
        onDeleteFolder={ws.deleteFolder}
        onMoveDiagram={ws.moveDiagramToFolder}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onImportMmd={(title, code) => ws.createDiagram({ title, code })}
        onExportWorkspace={ws.exportWorkspaceJson}
        onImportWorkspace={ws.importWorkspaceJson}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        darkMode={darkMode}
        svg={liveExportSvg || renderedSvg}
        code={activeDiagram.code}
        title={activeDiagram.title}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        darkMode={darkMode}
        title={activeDiagram.title}
        code={activeDiagram.code}
      />

      <DocsModal
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        darkMode={darkMode}
        onInsertExample={(exampleCode) => {
          if (!activeDiagram.locked) {
            ws.setActiveCode(exampleCode);
          }
        }}
      />

      <TemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        darkMode={darkMode}
        onApplyToCurrent={(tpl) => {
          if (!activeDiagram.locked) {
            ws.updateActiveDiagram(
              (d) => ({
                ...d,
                title: tpl.title,
                code: tpl.code,
              }),
              true
            );
          }
        }}
        onCreateNewFromTemplate={(tpl) => {
          ws.createDiagram({
            title: tpl.title,
            code: tpl.code,
            notes: tpl.description,
          });
        }}
      />

      <AccountModal
        open={accountOpen}
        onClose={() => setAccountOpen(false)}
        darkMode={darkMode}
        user={user}
        diagramsCount={ws.diagrams.length}
        foldersCount={ws.folders.length}
        onUserUpdated={onUserUpdated}
        onLogout={onLogout}
      />

      {user.role === 'super_admin' && superAdminOpen && (
        <SuperAdminModal
          open={superAdminOpen}
          onClose={() => setSuperAdminOpen(false)}
          darkMode={darkMode}
          currentUser={user}
          onCloneDiagramToMyWorkspace={(title, code) => ws.createDiagram({ title, code })}
        />
      )}

      <PresentationOverlay
        open={presentationOpen}
        onClose={() => setPresentationOpen(false)}
        title={activeDiagram.title}
        svg={liveExportSvg || renderedSvg}
        initialDarkMode={darkMode}
      />
    </div>
  );
};

export default App;
