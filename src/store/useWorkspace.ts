import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DiagramComment,
  DiagramDocument,
  DiagramFolder,
  EdgeAdjustment,
  NodeOffset,
  PlacementMode,
  StickyNote,
  VersionSnapshot,
} from '../types';
import { createInitialWorkspaceData } from '../data/templates';
import { decodeShareHash } from '../utils/share';

const STORAGE_KEY = 'mermaid-studio-pro-workspace-v1';

interface PersistedWorkspace {
  folders: DiagramFolder[];
  diagrams: DiagramDocument[];
  activeDiagramId: string;
  darkMode: boolean;
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadInitialWorkspace(): PersistedWorkspace {
  const shared = decodeShareHash(window.location.hash);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedWorkspace;
      if (Array.isArray(parsed.diagrams) && parsed.diagrams.length > 0) {
        if (shared) {
          const imported: DiagramDocument = {
            id: uid('shared'),
            title: shared.title || 'Shared Diagram',
            folderId: parsed.folders?.[0]?.id || 'personal',
            code: shared.code,
            notes: 'Imported from shared link.',
            favorite: false,
            locked: false,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            versions: [
              {
                id: uid('ver'),
                timestamp: Date.now(),
                label: 'Imported via Share Link',
                code: shared.code,
                isManual: true,
              },
            ],
            comments: [],
            stickyNotes: [],
          };
          // Clear hash cleanly so reload doesn't duplicate
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          return {
            folders: parsed.folders?.length ? parsed.folders : createInitialWorkspaceData().folders,
            diagrams: [imported, ...parsed.diagrams],
            activeDiagramId: imported.id,
            darkMode: Boolean(parsed.darkMode),
          };
        }

        const exists = parsed.diagrams.some((d) => d.id === parsed.activeDiagramId);
        return {
          folders: parsed.folders?.length ? parsed.folders : createInitialWorkspaceData().folders,
          diagrams: parsed.diagrams,
          activeDiagramId: exists ? parsed.activeDiagramId : parsed.diagrams[0].id,
          darkMode: Boolean(parsed.darkMode),
        };
      }
    }
  } catch {
    // Fallback to clean seed
  }

  const seed = createInitialWorkspaceData();
  if (shared) {
    const imported: DiagramDocument = {
      id: uid('shared'),
      title: shared.title || 'Shared Diagram',
      folderId: 'personal',
      code: shared.code,
      notes: 'Imported from shared link.',
      favorite: false,
      locked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          id: uid('ver'),
          timestamp: Date.now(),
          label: 'Imported via Share Link',
          code: shared.code,
          isManual: true,
        },
      ],
      comments: [],
      stickyNotes: [],
    };
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    return {
      folders: seed.folders,
      diagrams: [imported, ...seed.diagrams],
      activeDiagramId: imported.id,
      darkMode: false,
    };
  }

  return {
    folders: seed.folders,
    diagrams: seed.diagrams,
    activeDiagramId: seed.diagrams[0].id,
    darkMode: false,
  };
}

export function useWorkspace() {
  const [state, setState] = useState<PersistedWorkspace>(() => loadInitialWorkspace());
  const lastAutoSnapshotRef = useRef<Record<string, number>>({});

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota safeguard
    }
  }, [state]);

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
    (updater: (doc: DiagramDocument) => DiagramDocument) => {
      setState((prev) => ({
        ...prev,
        diagrams: prev.diagrams.map((d) =>
          d.id === prev.activeDiagramId ? { ...updater(d), updatedAt: Date.now() } : d
        ),
      }));
    },
    []
  );

  const setActiveCode = useCallback(
    (nextCode: string) => {
      setState((prev) => {
        const now = Date.now();
        return {
          ...prev,
          diagrams: prev.diagrams.map((d) => {
            if (d.id !== prev.activeDiagramId) return d;
            if (d.code === nextCode) return d;

            let versions = d.versions;
            const lastSnap = lastAutoSnapshotRef.current[d.id] || 0;
            // Auto-snapshot every 45 seconds when code meaningfully changes
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

            return {
              ...d,
              code: nextCode,
              updatedAt: now,
              versions,
            };
          }),
        };
      });
    },
    []
  );

  const selectDiagram = useCallback((id: string) => {
    setState((prev) => ({ ...prev, activeDiagramId: id }));
  }, []);

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
      return newDoc;
    },
    [activeFolder.id]
  );

  const duplicateDiagram = useCallback((id: string) => {
    setState((prev) => {
      const source = prev.diagrams.find((d) => d.id === id);
      if (!source) return prev;
      const now = Date.now();
      const copy: DiagramDocument = {
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
        diagrams: [copy, ...prev.diagrams],
        activeDiagramId: copy.id,
      };
    });
  }, []);

  const deleteDiagram = useCallback((id: string) => {
    setState((prev) => {
      const remaining = prev.diagrams.filter((d) => d.id !== id);
      if (remaining.length === 0) {
        const seed = createInitialWorkspaceData();
        return {
          ...prev,
          diagrams: [seed.diagrams[0]],
          activeDiagramId: seed.diagrams[0].id,
        };
      }
      return {
        ...prev,
        diagrams: remaining,
        activeDiagramId: prev.activeDiagramId === id ? remaining[0].id : prev.activeDiagramId,
      };
    });
  }, []);

  const createFolder = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const folder: DiagramFolder = { id: uid('fld'), name: trimmed, createdAt: Date.now() };
    setState((prev) => ({ ...prev, folders: [...prev.folders, folder] }));
  }, []);

  const deleteFolder = useCallback((folderId: string) => {
    if (folderId === 'personal') return;
    setState((prev) => ({
      ...prev,
      folders: prev.folders.filter((f) => f.id !== folderId),
      diagrams: prev.diagrams.map((d) =>
        d.folderId === folderId ? { ...d, folderId: 'personal' } : d
      ),
    }));
  }, []);

  const moveDiagramToFolder = useCallback((diagramId: string, folderId: string) => {
    setState((prev) => ({
      ...prev,
      diagrams: prev.diagrams.map((d) => (d.id === diagramId ? { ...d, folderId } : d)),
    }));
  }, []);

  const saveManualVersion = useCallback(
    (label: string) => {
      updateActiveDiagram((doc) => {
        const snap: VersionSnapshot = {
          id: uid('ver'),
          timestamp: Date.now(),
          label: label.trim() || `Checkpoint #${doc.versions.length + 1}`,
          code: doc.code,
          isManual: true,
        };
        return { ...doc, versions: [snap, ...doc.versions] };
      });
    },
    [updateActiveDiagram]
  );

  const restoreVersion = useCallback(
    (versionId: string) => {
      updateActiveDiagram((doc) => {
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
      });
    },
    [updateActiveDiagram]
  );

  const deleteVersion = useCallback(
    (versionId: string) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        versions: doc.versions.filter((v) => v.id !== versionId),
      }));
    },
    [updateActiveDiagram]
  );

  const addComment = useCallback(
    (text: string, author = 'You', pinned?: { x: number; y: number }) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const comment: DiagramComment = {
        id: uid('cmt'),
        author,
        text: trimmed,
        createdAt: Date.now(),
        resolved: false,
        pinned,
        replies: [],
      };
      updateActiveDiagram((doc) => ({ ...doc, comments: [comment, ...doc.comments] }));
    },
    [updateActiveDiagram]
  );

  const replyComment = useCallback(
    (commentId: string, text: string, author = 'You') => {
      const trimmed = text.trim();
      if (!trimmed) return;
      updateActiveDiagram((doc) => ({
        ...doc,
        comments: doc.comments.map((c) =>
          c.id === commentId
            ? {
                ...c,
                replies: [
                  ...c.replies,
                  { id: uid('rep'), author, text: trimmed, createdAt: Date.now() },
                ],
              }
            : c
        ),
      }));
    },
    [updateActiveDiagram]
  );

  const toggleResolveComment = useCallback(
    (commentId: string) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        comments: doc.comments.map((c) =>
          c.id === commentId ? { ...c, resolved: !c.resolved } : c
        ),
      }));
    },
    [updateActiveDiagram]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        comments: doc.comments.filter((c) => c.id !== commentId),
      }));
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
      updateActiveDiagram((doc) => ({
        ...doc,
        stickyNotes: [...(doc.stickyNotes || []), note],
      }));
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
      updateActiveDiagram((doc) => ({
        ...doc,
        stickyNotes: (doc.stickyNotes || []).filter((n) => n.id !== id),
      }));
    },
    [updateActiveDiagram]
  );

  const setPlacementMode = useCallback(
    (mode: PlacementMode) => {
      updateActiveDiagram((doc) => ({
        ...doc,
        placementMode: mode,
        // Switching back to Auto resets manual node & arrow adjustments cleanly
        manualOffsets: mode === 'auto' ? {} : doc.manualOffsets || {},
        edgeAdjustments: mode === 'auto' ? {} : doc.edgeAdjustments || {},
      }));
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
    updateActiveDiagram((doc) => ({
      ...doc,
      manualOffsets: {},
      edgeAdjustments: {},
    }));
  }, [updateActiveDiagram]);

  const toggleDarkMode = useCallback(() => {
    setState((prev) => ({ ...prev, darkMode: !prev.darkMode }));
  }, []);

  const exportWorkspaceJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [state]);

  const importWorkspaceJson = useCallback((rawJson: string): boolean => {
    try {
      const parsed = JSON.parse(rawJson) as PersistedWorkspace;
      if (!Array.isArray(parsed.diagrams) || parsed.diagrams.length === 0) return false;
      setState({
        folders: parsed.folders?.length ? parsed.folders : createInitialWorkspaceData().folders,
        diagrams: parsed.diagrams,
        activeDiagramId: parsed.diagrams[0].id,
        darkMode: Boolean(parsed.darkMode),
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
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
