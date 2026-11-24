import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AuthUser,
  DiagramComment,
  DiagramDocument,
  DiagramFolder,
  EdgeAdjustment,
  NodeOffset,
  PlacementMode,
  StickyNote,
  SyncStatus,
  VersionSnapshot,
} from '../types';
import { createInitialWorkspaceData } from '../data/templates';
import { decodeShareHash } from '../utils/share';
import { workspaceApi, ApiError } from '../api/client';

interface WorkspaceState {
  folders: DiagramFolder[];
  diagrams: DiagramDocument[];
  activeDiagramId: string;
  darkMode: boolean;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

const EMPTY_SEED = createInitialWorkspaceData();

export function useWorkspace(user: AuthUser | null, onUnauthorized: () => void) {
  const [state, setState] = useState<WorkspaceState>({
    folders: EMPTY_SEED.folders,
    diagrams: EMPTY_SEED.diagrams,
    activeDiagramId: EMPTY_SEED.diagrams[0].id,
    darkMode: false,
  });

  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const lastAutoSnapshotRef = useRef<Record<string, number>>({});
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latestDiagramsRef = useRef<Record<string, DiagramDocument>>({});

  useEffect(() => {
    const map: Record<string, DiagramDocument> = {};
    for (const d of state.diagrams) map[d.id] = d;
    latestDiagramsRef.current = map;
  }, [state.diagrams]);

  const handleApiError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      console.error('[Workspace Sync Error]', err);
      setSyncStatus('error');
    },
    [onUnauthorized]
  );

  // Debounced PostgreSQL save for a specific diagram
  const scheduleDiagramSave = useCallback(
    (diagram: DiagramDocument, immediate = false) => {
      if (!user) return;
      const existingTimer = saveTimersRef.current[diagram.id];
      if (existingTimer) clearTimeout(existingTimer);

      const performSave = async () => {
        setSyncStatus('saving');
        try {
          const latest = latestDiagramsRef.current[diagram.id] || diagram;
          await workspaceApi.saveDiagram(latest);
          setSyncStatus('saved');
        } catch (err) {
          handleApiError(err);
        }
      };

      if (immediate) {
        void performSave();
      } else {
        setSyncStatus('saving');
        saveTimersRef.current[diagram.id] = setTimeout(() => {
          delete saveTimersRef.current[diagram.id];
          void performSave();
        }, 420);
      }
    },
    [user, handleApiError]
  );

  // Fetch user's workspace from PostgreSQL upon login
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    setSyncStatus('loading');

    (async () => {
      try {
        const data = await workspaceApi.getWorkspace();
        if (cancelled) return;

        let nextDiagrams = data.diagrams;
        let nextActiveId = data.activeDiagramId;

        // If user opened a #pako:... shared link, import it straight into their DB account!
        const shared = decodeShareHash(window.location.hash);
        if (shared) {
          const now = Date.now();
          const imported: DiagramDocument = {
            id: uid('shared'),
            title: shared.title || 'Shared Diagram',
            folderId: data.folders[0]?.id || 'personal',
            code: shared.code,
            notes: 'Imported from shared link.',
            favorite: false,
            locked: false,
            placementMode: 'auto',
            manualOffsets: {},
            edgeAdjustments: {},
            createdAt: now,
            updatedAt: now,
            versions: [
              {
                id: uid('ver'),
                timestamp: now,
                label: 'Imported via Share Link',
                code: shared.code,
                isManual: true,
              },
            ],
            comments: [],
            stickyNotes: [],
          };
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          await workspaceApi.saveDiagram(imported);
          await workspaceApi.updatePreferences({ activeDiagramId: imported.id });
          nextDiagrams = [imported, ...data.diagrams];
          nextActiveId = imported.id;
        }

        setState({
          folders: data.folders,
          diagrams: nextDiagrams,
          activeDiagramId: nextActiveId,
          darkMode: data.darkMode,
        });
        setSyncStatus('saved');
      } catch (err) {
        if (!cancelled) handleApiError(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      Object.values(saveTimersRef.current).forEach(clearTimeout);
      saveTimersRef.current = {};
    };
  }, [user, handleApiError]);

  const activeDiagram = useMemo(
    () => state.diagrams.find((d) => d.id === state.activeDiagramId) || state.diagrams[0],
    [state.diagrams, state.activeDiagramId]
  );

  const activeFolder = useMemo(
    () =>
      state.folders.find((f) => f.id === activeDiagram?.folderId) ||
      state.folders[0] || { id: 'personal', name: 'Personal files', createdAt: 0 },
    [state.folders, activeDiagram]
  );

  const updateActiveDiagram = useCallback(
    (updater: (doc: DiagramDocument) => DiagramDocument, immediate = false) => {
      let updatedDoc: DiagramDocument | null = null;
      setState((prev) => ({
        ...prev,
        diagrams: prev.diagrams.map((d) => {
          if (d.id !== prev.activeDiagramId) return d;
          updatedDoc = { ...updater(d), updatedAt: Date.now() };
          return updatedDoc;
        }),
      }));
      if (updatedDoc) {
        scheduleDiagramSave(updatedDoc, immediate);
      }
    },
    [scheduleDiagramSave]
  );

  const setActiveCode = useCallback(
    (nextCode: string) => {
      let updatedDoc: DiagramDocument | null = null;
      setState((prev) => {
        const now = Date.now();
        return {
          ...prev,
          diagrams: prev.diagrams.map((d) => {
            if (d.id !== prev.activeDiagramId) return d;
            if (d.code === nextCode) return d;

            let versions = d.versions;
            const lastSnap = lastAutoSnapshotRef.current[d.id] || 0;
            if (now - lastSnap > 45_000 && Math.abs(d.code.length - nextCode.length) > 8) {
              lastAutoSnapshotRef.current[d.id] = now;
              const snap: VersionSnapshot = {
                id: uid('auto'),
                timestamp: now,
                label: 'Auto-saved snapshot',
                code: d.code,
                isManual: false,
              };
              versions = [snap, ...d.versions].slice(0, 60);
            }

            updatedDoc = {
              ...d,
              code: nextCode,
              updatedAt: now,
              versions,
            };
            return updatedDoc;
          }),
        };
      });
      if (updatedDoc) {
        scheduleDiagramSave(updatedDoc, false);
      }
    },
    [scheduleDiagramSave]
  );

  const selectDiagram = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, activeDiagramId: id }));
      if (user) {
        workspaceApi.updatePreferences({ activeDiagramId: id }).catch(handleApiError);
      }
    },
    [user, handleApiError]
  );

  const createDiagram = useCallback(
    (opts?: { title?: string; code?: string; folderId?: string; notes?: string }) => {
      const now = Date.now();
      const newDoc: DiagramDocument = {
        id: uid('diag'),
        title: opts?.title || 'Untitled Diagram',
        folderId: opts?.folderId || activeFolder.id || 'personal',
        code:
          opts?.code ||
          `---\nconfig:\n  theme: base\n  themeVariables:\n    primaryColor: '#ffffff'\n    primaryTextColor: '#111111'\n    primaryBorderColor: '#333333'\n    lineColor: '#333333'\n  flowchart:\n    nodeSpacing: 30\n    rankSpacing: 35\n    curve: basis\n    padding: 14\n    layout: dagre\n---\nflowchart LR\n  A["<b>Start</b>"] --> B["<b>Process</b>"] --> C(["<b>Finish</b>"])\n`,
        notes: opts?.notes || '',
        favorite: false,
        locked: false,
        placementMode: 'auto',
        manualOffsets: {},
        edgeAdjustments: {},
        createdAt: now,
        updatedAt: now,
        versions: [],
        comments: [],
        stickyNotes: [],
      };

      setState((prev) => ({
        ...prev,
        diagrams: [newDoc, ...prev.diagrams],
        activeDiagramId: newDoc.id,
      }));

      if (user) {
        setSyncStatus('saving');
        Promise.all([
          workspaceApi.saveDiagram(newDoc),
          workspaceApi.updatePreferences({ activeDiagramId: newDoc.id }),
        ])
          .then(() => setSyncStatus('saved'))
          .catch(handleApiError);
      }

      return newDoc;
    },
    [activeFolder.id, user, handleApiError]
  );

  const duplicateDiagram = useCallback(
    (id: string) => {
      let createdCopy: DiagramDocument | null = null;
      setState((prev) => {
        const source = prev.diagrams.find((d) => d.id === id);
        if (!source) return prev;
        const now = Date.now();
        createdCopy = {
          ...source,
          id: uid('diag'),
          title: `${source.title} (Copy)`,
          favorite: false,
          createdAt: now,
          updatedAt: now,
          versions: [
            {
              id: uid('ver'),
              timestamp: now,
              label: 'Duplicated checkpoint',
              code: source.code,
              isManual: true,
            },
          ],
        };
        return {
          ...prev,
          diagrams: [createdCopy, ...prev.diagrams],
          activeDiagramId: createdCopy.id,
        };
      });

      if (createdCopy && user) {
        const copyDoc: DiagramDocument = createdCopy;
        setSyncStatus('saving');
        Promise.all([
          workspaceApi.saveDiagram(copyDoc),
          workspaceApi.updatePreferences({ activeDiagramId: copyDoc.id }),
        ])
          .then(() => setSyncStatus('saved'))
          .catch(handleApiError);
      }
    },
    [user, handleApiError]
  );

  const deleteDiagram = useCallback(
    (id: string) => {
      let nextActiveId = '';
      let fallbackDoc: DiagramDocument | null = null;

      setState((prev) => {
        const remaining = prev.diagrams.filter((d) => d.id !== id);
        if (remaining.length === 0) {
          const seed = createInitialWorkspaceData();
          fallbackDoc = { ...seed.diagrams[0], id: uid('diag'), updatedAt: Date.now() };
          nextActiveId = fallbackDoc.id;
          return {
            ...prev,
            diagrams: [fallbackDoc],
            activeDiagramId: fallbackDoc.id,
          };
        }
        nextActiveId = prev.activeDiagramId === id ? remaining[0].id : prev.activeDiagramId;
        return {
          ...prev,
          diagrams: remaining,
          activeDiagramId: nextActiveId,
        };
      });

      if (user) {
        setSyncStatus('saving');
        const ops: Promise<unknown>[] = [workspaceApi.deleteDiagram(id)];
        if (fallbackDoc) ops.push(workspaceApi.saveDiagram(fallbackDoc));
        if (nextActiveId) ops.push(workspaceApi.updatePreferences({ activeDiagramId: nextActiveId }));
        Promise.all(ops)
          .then(() => setSyncStatus('saved'))
          .catch(handleApiError);
      }
    },
    [user, handleApiError]
  );

  const createFolder = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const folder: DiagramFolder = { id: uid('fld'), name: trimmed, createdAt: Date.now() };
      setState((prev) => ({ ...prev, folders: [...prev.folders, folder] }));
      if (user) {
        setSyncStatus('saving');
        workspaceApi
          .saveFolder(folder)
          .then(() => setSyncStatus('saved'))
          .catch(handleApiError);
      }
    },
    [user, handleApiError]
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      if (folderId === 'personal') return;
      setState((prev) => ({
        ...prev,
        folders: prev.folders.filter((f) => f.id !== folderId),
        diagrams: prev.diagrams.map((d) =>
          d.folderId === folderId ? { ...d, folderId: 'personal' } : d
        ),
      }));
      if (user) {
        setSyncStatus('saving');
        workspaceApi
          .deleteFolder(folderId)
          .then(() => setSyncStatus('saved'))
          .catch(handleApiError);
      }
    },
    [user, handleApiError]
  );

  const moveDiagramToFolder = useCallback(
    (diagramId: string, folderId: string) => {
      let movedDoc: DiagramDocument | null = null;
      setState((prev) => ({
        ...prev,
        diagrams: prev.diagrams.map((d) => {
          if (d.id !== diagramId) return d;
          movedDoc = { ...d, folderId, updatedAt: Date.now() };
          return movedDoc;
        }),
      }));
      if (movedDoc) {
        scheduleDiagramSave(movedDoc, true);
      }
    },
    [scheduleDiagramSave]
  );

  const saveManualVersion = useCallback(
    (label: string) => {
      updateActiveDiagram(
        (doc) => {
          const snap: VersionSnapshot = {
            id: uid('ver'),
            timestamp: Date.now(),
            label: label.trim() || `Checkpoint #${doc.versions.length + 1}`,
            code: doc.code,
            isManual: true,
          };
          return { ...doc, versions: [snap, ...doc.versions] };
        },
        true
      );
    },
    [updateActiveDiagram]
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      updateActiveDiagram(
        (doc) => {
          const target = doc.versions.find((v) => v.id === versionId);
          if (!target) return doc;
          const backup: VersionSnapshot = {
            id: uid('ver'),
            timestamp: Date.now(),
            label: `Before restoring "${target.label}"`,
            code: doc.code,
            isManual: false,
          };
          return {
            ...doc,
            code: target.code,
            versions: [backup, ...doc.versions],
          };
        },
        true
      );
    },
    [updateActiveDiagram]
  );

  const deleteVersion = useCallback(
    (versionId: string) => {
      updateActiveDiagram(
        (doc) => ({
          ...doc,
          versions: doc.versions.filter((v) => v.id !== versionId),
        }),
        true
      );
    },
    [updateActiveDiagram]
  );

  const addComment = useCallback(
    (text: string, author?: string, pinned?: { x: number; y: number }) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const comment: DiagramComment = {
        id: uid('cmt'),
        author: author || user?.name || 'You',
        text: trimmed,
        createdAt: Date.now(),
        resolved: false,
        pinned,
        replies: [],
      };
      updateActiveDiagram((doc) => ({ ...doc, comments: [comment, ...doc.comments] }), true);
    },
    [updateActiveDiagram, user?.name]
  );

  const replyComment = useCallback(
    (commentId: string, text: string, author?: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      updateActiveDiagram(
        (doc) => ({
          ...doc,
          comments: doc.comments.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  replies: [
                    ...c.replies,
                    {
                      id: uid('rep'),
                      author: author || user?.name || 'You',
                      text: trimmed,
                      createdAt: Date.now(),
                    },
                  ],
                }
              : c
          ),
        }),
        true
      );
    },
    [updateActiveDiagram, user?.name]
  );

  const toggleResolveComment = useCallback(
    (commentId: string) => {
      updateActiveDiagram(
        (doc) => ({
          ...doc,
          comments: doc.comments.map((c) =>
            c.id === commentId ? { ...c, resolved: !c.resolved } : c
          ),
        }),
        true
      );
    },
    [updateActiveDiagram]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      updateActiveDiagram(
        (doc) => ({
          ...doc,
          comments: doc.comments.filter((c) => c.id !== commentId),
        }),
        true
      );
    },
    [updateActiveDiagram]
  );

  const addStickyNote = useCallback(
    (x: number, y: number, color: StickyNote['color'] = 'amber') => {
      const note: StickyNote = {
        id: uid('note'),
        x,
        y,
        text: 'Add annotation note...',
        color,
      };
      updateActiveDiagram(
        (doc) => ({
          ...doc,
          stickyNotes: [...(doc.stickyNotes || []), note],
        }),
        true
      );
    },
    [updateActiveDiagram]
  );

  const updateStickyNote = useCallback(
    (id: string, patch: Partial<StickyNote>) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        stickyNotes: (doc.stickyNotes || []).map((n) => (n.id === id ? { ...n, ...patch } : n)),
      }));
    },
    [updateActiveDiagram]
  );

  const deleteStickyNote = useCallback(
    (id: string) => {
      updateActiveDiagram(
        (doc) => ({
          ...doc,
          stickyNotes: (doc.stickyNotes || []).filter((n) => n.id !== id),
        }),
        true
      );
    },
    [updateActiveDiagram]
  );

  const setPlacementMode = useCallback(
    (mode: PlacementMode) => {
      updateActiveDiagram(
        (doc) => ({
          ...doc,
          placementMode: mode,
          manualOffsets: mode === 'auto' ? {} : doc.manualOffsets || {},
          edgeAdjustments: mode === 'auto' ? {} : doc.edgeAdjustments || {},
        }),
        true
      );
    },
    [updateActiveDiagram]
  );

  const setManualNodeOffset = useCallback(
    (nodeId: string, offset: NodeOffset) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        placementMode: 'manual',
        manualOffsets: {
          ...(doc.manualOffsets || {}),
          [nodeId]: offset,
        },
      }));
    },
    [updateActiveDiagram]
  );

  const setManualNodeOffsetsBatch = useCallback(
    (updates: Record<string, NodeOffset>) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        placementMode: 'manual',
        manualOffsets: {
          ...(doc.manualOffsets || {}),
          ...updates,
        },
      }));
    },
    [updateActiveDiagram]
  );

  const setEdgeAdjustment = useCallback(
    (edgeKey: string, adjustment: EdgeAdjustment | null) => {
      updateActiveDiagram((doc) => {
        const next = { ...(doc.edgeAdjustments || {}) };
        if (adjustment === null) {
          delete next[edgeKey];
        } else {
          next[edgeKey] = adjustment;
        }
        return {
          ...doc,
          placementMode: 'manual',
          edgeAdjustments: next,
        };
      });
    },
    [updateActiveDiagram]
  );

  const resetManualOffsets = useCallback(() => {
    updateActiveDiagram(
      (doc) => ({
        ...doc,
        manualOffsets: {},
        edgeAdjustments: {},
      }),
      true
    );
  }, [updateActiveDiagram]);

  const toggleDarkMode = useCallback(() => {
    setState((prev) => {
      const nextDark = !prev.darkMode;
      if (user) {
        workspaceApi.updatePreferences({ darkMode: nextDark }).catch(handleApiError);
      }
      return { ...prev, darkMode: nextDark };
    });
  }, [user, handleApiError]);

  const exportWorkspaceJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state]);

  const importWorkspaceJson = useCallback(
    (rawJson: string): boolean => {
      try {
        const parsed = JSON.parse(rawJson) as WorkspaceState;
        if (!Array.isArray(parsed.diagrams) || parsed.diagrams.length === 0) return false;
        const folders = parsed.folders?.length ? parsed.folders : EMPTY_SEED.folders;
        setState({
          folders,
          diagrams: parsed.diagrams,
          activeDiagramId: parsed.diagrams[0].id,
          darkMode: Boolean(parsed.darkMode),
        });
        if (user) {
          setSyncStatus('saving');
          workspaceApi
            .importWorkspace({
              folders,
              diagrams: parsed.diagrams,
              darkMode: Boolean(parsed.darkMode),
            })
            .then(() => setSyncStatus('saved'))
            .catch(handleApiError);
        }
        return true;
      } catch {
        return false;
      }
    },
    [user, handleApiError]
  );

  return {
    loading,
    syncStatus,
    folders: state.folders,
    diagrams: state.diagrams,
    activeDiagram,
    activeFolder,
    darkMode: state.darkMode,
    toggleDarkMode,
    selectDiagram,
    updateActiveDiagram,
    setActiveCode,
    createDiagram,
    duplicateDiagram,
    deleteDiagram,
    createFolder,
    deleteFolder,
    moveDiagramToFolder,
    saveManualVersion,
    restoreVersion,
    deleteVersion,
    addComment,
    replyComment,
    toggleResolveComment,
    deleteComment,
    addStickyNote,
    updateStickyNote,
    deleteStickyNote,
    setPlacementMode,
    setManualNodeOffset,
    setManualNodeOffsetsBatch,
    setEdgeAdjustment,
    resetManualOffsets,
    exportWorkspaceJson,
    importWorkspaceJson,
  };
}
