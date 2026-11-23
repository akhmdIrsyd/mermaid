import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  Lock,
  Unlock,
  Hand,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ArrowRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Shapes,
  Type,
  LayoutTemplate,
  Cloud,
  Paintbrush,
  Grid3X3,
  MessageSquarePlus,
  X,
  Trash2,
  Sparkles,
  Map as MapIcon,
  RotateCcw,
  ChevronDown,
  Magnet,
} from 'lucide-react';
import type {
  CanvasGridStyle,
  CanvasTool,
  CurveType,
  DiagramComment,
  DiagramDirection,
  DiagramLook,
  EdgeAdjustment,
  EditorMode,
  LayoutMode,
  NodeOffset,
  PlacementMode,
  SelectedEdgeInfo,
  SelectedNodeInfo,
  StickyNote,
} from '../types';
import {
  LAYOUT_MODE_OPTIONS,
  THEME_PRESETS,
  applyLayoutModeToConfig,
  detectDirection,
  parseFrontmatterConfig,
  updateDirectionInCode,
  updateFrontmatterInCode,
} from '../utils/frontmatter';
import { CLOUD_BLOCKS, QUICK_SHAPES } from '../data/snippets';
import { extractNodeIdFromElement, findNodeLineInCode } from '../utils/mermaidEngine';
import {
  createManualSvgController,
  extractCanonicalClusterKey,
  extractCanonicalNodeId,
  type ManualSvgController,
} from '../utils/manualLayout';
import { NodeStyleInspector } from './NodeStyleInspector';

// Custom crisp icons matching Mermaid.ai's Layout & Placement pills
const LayoutIcon: React.FC<{ mode: LayoutMode; className?: string }> = ({
  mode,
  className = 'w-4.5 h-4.5',
}) => {
  if (mode === 'hierarchical') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="5" r="2.2" />
        <circle cx="6" cy="18" r="2.2" />
        <circle cx="12" cy="18" r="2.2" />
        <circle cx="18" cy="18" r="2.2" />
        <path d="M12 7.2V12M6 15.8V13a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2.8M12 12v3.8" />
      </svg>
    );
  }
  if (mode === 'adaptive') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="7" cy="6" r="2.2" />
        <circle cx="7" cy="18" r="2.2" />
        <circle cx="17" cy="18" r="2.2" />
        <path d="M7 8.2v7.6M7 11.5c0 2.5 10 1 10 4.3" />
      </svg>
    );
  }
  if (mode === 'orthogonal') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="16" cy="5.5" r="2" />
        <circle cx="6" cy="12" r="2" />
        <circle cx="17" cy="12" r="2" />
        <circle cx="14" cy="18.5" r="2" />
        <path d="M8 12h7M11.5 12V7.5a2 2 0 0 1 2-2H14M11.5 12v4.5a2 2 0 0 0 2 2H12" />
      </svg>
    );
  }
  // balanced (grid)
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M4 8.5h16M4 15.5h16M8.5 4v16M15.5 4v16" />
    </svg>
  );
};

const PlacementIcon: React.FC<{ mode: PlacementMode; className?: string }> = ({
  mode,
  className = 'w-4.5 h-4.5',
}) => {
  if (mode === 'auto') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14" />
        <path d="M12 4v5m0 0-2.5-2.5M12 9l2.5-2.5" />
        <path d="M12 20v-5m0 0-2.5 2.5M12 15l2.5 2.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="13.5" width="7" height="5.5" rx="1.2" />
      <rect x="13" y="5" width="7" height="5.5" rx="1.2" />
      <path d="M4 7.75h6m0 0L7.5 5.25M10 7.75 7.5 10.25" />
      <path d="M20 16.25h-6m0 0 2.5-2.5M14 16.25l2.5 2.5" />
    </svg>
  );
};

interface CanvasWorkspaceProps {
  svg: string;
  bindFunctions?: (el: Element) => void;
  code: string;
  onChangeCode: (next: string) => void;
  onForceRender: (nextCode: string) => void;
  locked: boolean;
  onToggleLocked: () => void;
  darkMode: boolean;
  codeOpen: boolean;
  onOpenCode: () => void;
  onOpenTemplates: () => void;
  onJumpToLine: (line: number) => void;
  placementMode: PlacementMode;
  manualOffsets: Record<string, NodeOffset>;
  edgeAdjustments: Record<string, EdgeAdjustment>;
  onChangePlacementMode: (mode: PlacementMode) => void;
  onCommitNodeOffset: (nodeId: string, offset: NodeOffset) => void;
  onCommitNodeOffsetsBatch: (updates: Record<string, NodeOffset>) => void;
  onCommitEdgeAdjustment: (edgeKey: string, adjustment: EdgeAdjustment | null) => void;
  onResetManualOffsets: () => void;
  onLiveSvgChange: (serializedSvg: string) => void;
  stickyNotes: StickyNote[];
  onAddStickyNote: (x: number, y: number) => void;
  onUpdateStickyNote: (id: string, patch: Partial<StickyNote>) => void;
  onDeleteStickyNote: (id: string) => void;
  pinnedComments: DiagramComment[];
  onAddPinnedComment: (text: string, pos: { x: number; y: number }) => void;
  onSelectCommentDrawer: () => void;
}

const DIRECTION_OPTIONS: { value: DiagramDirection; label: string; icon: React.ReactNode }[] = [
  { value: 'LR', label: 'Left to right', icon: <ArrowRight className="w-3.5 h-3.5" /> },
  { value: 'TB', label: 'Top to bottom', icon: <ArrowDown className="w-3.5 h-3.5" /> },
  { value: 'RL', label: 'Right to left', icon: <ArrowLeft className="w-3.5 h-3.5" /> },
  { value: 'BT', label: 'Bottom to top', icon: <ArrowUp className="w-3.5 h-3.5" /> },
];

const CURVE_OPTIONS: { value: CurveType; label: string }[] = [
  { value: 'basis', label: 'Smooth (Basis)' },
  { value: 'linear', label: 'Straight (Linear)' },
  { value: 'cardinal', label: 'Curved (Cardinal)' },
  { value: 'stepAfter', label: 'Orthogonal (90°)' },
  { value: 'monotoneX', label: 'Monotone X' },
  { value: 'natural', label: 'Natural Spline' },
];

const NOTE_COLORS: Record<StickyNote['color'], string> = {
  amber: 'bg-amber-100 border-amber-300 text-amber-950',
  rose: 'bg-rose-100 border-rose-300 text-rose-950',
  sky: 'bg-sky-100 border-sky-300 text-sky-950',
  emerald: 'bg-emerald-100 border-emerald-300 text-emerald-950',
  violet: 'bg-violet-100 border-violet-300 text-violet-950',
};

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  svg,
  bindFunctions,
  code,
  onChangeCode,
  onForceRender,
  locked,
  onToggleLocked,
  darkMode,
  codeOpen,
  onOpenCode,
  onOpenTemplates,
  onJumpToLine,
  placementMode,
  manualOffsets,
  edgeAdjustments,
  onChangePlacementMode,
  onCommitNodeOffset,
  onCommitNodeOffsetsBatch,
  onCommitEdgeAdjustment,
  onResetManualOffsets,
  onLiveSvgChange,
  stickyNotes,
  onAddStickyNote,
  onUpdateStickyNote,
  onDeleteStickyNote,
  pinnedComments,
  onAddPinnedComment,
  onSelectCommentDrawer,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgWrapperRef = useRef<HTMLDivElement | null>(null);
  const manualControllerRef = useRef<ManualSvgController | null>(null);

  const [scale, setScale] = useState(0.95);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [hasAutoFit, setHasAutoFit] = useState(false);
  const pendingAutoFitRef = useRef(false);

  const [editorMode, setEditorMode] = useState<EditorMode>('visual');
  const [tool, setTool] = useState<CanvasTool>('select');
  const [gridStyle, setGridStyle] = useState<CanvasGridStyle>('cross');
  const [showMinimap, setShowMinimap] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showAdvancedLayout, setShowAdvancedLayout] = useState(false);

  const [isPanning, setIsPanning] = useState(false);
  const [spacePressed, setSpacePressed] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, tx: 0, ty: 0 });

  // Dragging a diagram node OR whole subgraph (cluster) in Manual Placement mode
  const draggingItemRef = useRef<{
    kind: 'node' | 'cluster';
    id: string;
    el: Element;
    startClientX: number;
    startClientY: number;
    // Map of target offset key -> original {dx, dy}
    memberOrigOffsets: Record<string, NodeOffset>;
    latestUpdates: Record<string, NodeOffset>;
    moved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  // Dragging an arrow handle (start anchor, bend/midpoint, or end anchor) in Manual Placement mode
  const draggingEdgeRef = useRef<{
    edgeKey: string;
    handleKind: 'start' | 'bend' | 'end';
    startClientX: number;
    startClientY: number;
    latestAdj: EdgeAdjustment;
    moved: boolean;
  } | null>(null);

  // Selected arrow (edge) in Manual Placement mode
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdgeInfo | null>(null);

  // Active dropdown popover
  const [openMenu, setOpenMenu] = useState<
    null | 'theme' | 'layout' | 'direction' | 'placement' | 'shapes' | 'cloud'
  >(null);

  // Selected node in visual mode
  const [selectedNode, setSelectedNode] = useState<SelectedNodeInfo | null>(null);

  // Pending pinned comment draft
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [pinDraft, setPinDraft] = useState('');

  // Dragging sticky note
  const draggingNoteRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const fmConfig = useMemo(() => parseFrontmatterConfig(code), [code]);
  const direction = useMemo(() => detectDirection(code), [code]);
  const movedNodeCount = useMemo(
    () =>
      Object.values(manualOffsets || {}).filter((o) => o.dx !== 0 || o.dy !== 0).length +
      Object.keys(edgeAdjustments || {}).length,
    [manualOffsets, edgeAdjustments]
  );

  // Clear selected arrow when leaving Manual mode
  useEffect(() => {
    if (placementMode !== 'manual') {
      setSelectedEdge(null);
    }
  }, [placementMode]);

  // Inject SVG safely, build ManualSvgController, and re-apply persisted offsets + arrow adjustments
  useEffect(() => {
    const el = svgWrapperRef.current;
    if (!el) return;
    el.innerHTML = svg || '';
    manualControllerRef.current = null;

    if (svg) {
      if (bindFunctions) {
        try {
          bindFunctions(el);
        } catch {
          // non-critical binding
        }
      }
      const svgEl = el.querySelector('svg');
      if (svgEl) {
        const controller = createManualSvgController(svgEl, code);
        manualControllerRef.current = controller;
        const isManual = placementMode === 'manual' && !locked;
        if (placementMode === 'manual') {
          controller.applyOffsets(
            manualOffsets,
            fmConfig.layoutMode,
            edgeAdjustments,
            selectedEdge?.edgeKey || null,
            isManual
          );
          onLiveSvgChange(controller.getSerializedSvg());
        } else {
          onLiveSvgChange(svg);
        }
      }
    } else {
      onLiveSvgChange('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [svg, bindFunctions]);

  // Apply offsets & edge adjustments whenever they change (or when selectedEdge / locked changes)
  useEffect(() => {
    const controller = manualControllerRef.current;
    if (!controller) return;
    const isManual = placementMode === 'manual' && !locked;
    if (placementMode === 'manual') {
      controller.applyOffsets(
        manualOffsets,
        fmConfig.layoutMode,
        edgeAdjustments,
        selectedEdge?.edgeKey || null,
        isManual
      );
    } else {
      controller.applyOffsets({}, fmConfig.layoutMode, {}, null, false);
    }
    onLiveSvgChange(controller.getSerializedSvg());
  }, [
    placementMode,
    manualOffsets,
    edgeAdjustments,
    selectedEdge,
    locked,
    fmConfig.layoutMode,
    onLiveSvgChange,
  ]);

  // Highlight selected node
  useEffect(() => {
    const el = svgWrapperRef.current;
    if (!el) return;
    el.querySelectorAll('.mermaid-selected-node').forEach((n) =>
      n.classList.remove('mermaid-selected-node')
    );
    if (selectedNode) {
      const target = el.querySelector(`[id="${CSS.escape(selectedNode.rawId)}"]`);
      target?.classList.add('mermaid-selected-node');
    }
  }, [selectedNode, svg]);

  const fitToScreen = useCallback(() => {
    const container = containerRef.current;
    const svgEl = svgWrapperRef.current?.querySelector('svg');
    if (!container || !svgEl) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    let svgW = 800;
    let svgH = 500;
    const vb = svgEl.getAttribute('viewBox');
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        svgW = parts[2];
        svgH = parts[3];
      }
    } else {
      const r = svgEl.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        svgW = r.width / scale;
        svgH = r.height / scale;
      }
    }

    const padX = 150;
    const padY = 140;
    const availW = Math.max(200, containerRect.width - padX);
    const availH = Math.max(200, containerRect.height - padY);
    const nextScale = Math.min(1.35, Math.max(0.22, Math.min(availW / svgW, availH / svgH)));
    setScale(Number(nextScale.toFixed(3)));
    setTranslate({ x: 0, y: 0 });
  }, [scale]);

  // Auto-fit on first valid render OR right after a Direction / Layout change
  useEffect(() => {
    if (svg && (!hasAutoFit || pendingAutoFitRef.current)) {
      const t = setTimeout(() => {
        fitToScreen();
        setHasAutoFit(true);
        pendingAutoFitRef.current = false;
      }, 60);
      return () => clearTimeout(t);
    }
  }, [svg, hasAutoFit, fitToScreen]);

  // Spacebar temporary pan
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.closest('.cm-editor')
      ) {
        setSpacePressed(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpacePressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Close popovers on outside click
  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest('[data-canvas-popover]')) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  // Smooth Wheel Zoom toward cursor
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.09 : 0.915;
      const nextScale = Math.min(4, Math.max(0.15, scale * zoomFactor));

      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        const ratio = nextScale / scale;
        setTranslate((prev) => ({
          x: cx - (cx - prev.x) * ratio,
          y: cy - (cy - prev.y) * ratio,
        }));
      }
      setScale(nextScale);
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-canvas-ui]')) return;

    // Comment pin placement mode
    if (tool === 'comment' && e.button === 0) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const worldX = (e.clientX - rect.left - rect.width / 2 - translate.x) / scale;
        const worldY = (e.clientY - rect.top - rect.height / 2 - translate.y) / scale;
        setPendingPin({ x: Math.round(worldX), y: Math.round(worldY) });
        setPinDraft('');
      }
      return;
    }

    // Priority 0: Interactive Arrow Handle or Arrow Hit Path in Manual Placement Mode!
    if (
      placementMode === 'manual' &&
      !locked &&
      tool === 'select' &&
      !spacePressed &&
      e.button === 0 &&
      manualControllerRef.current
    ) {
      const targetEl = e.target as HTMLElement;
      const handleEl = targetEl.closest('[data-edge-handle-key]');
      if (handleEl) {
        const edgeKey = handleEl.getAttribute('data-edge-handle-key') || '';
        const handleKind =
          (handleEl.getAttribute('data-edge-handle-kind') as 'start' | 'bend' | 'end') || 'bend';
        const parsedEdge = manualControllerRef.current.edges.get(edgeKey);
        if (parsedEdge) {
          e.preventDefault();
          e.stopPropagation();
          const curAdj: EdgeAdjustment = edgeAdjustments[edgeKey] || { bendDx: 0, bendDy: 0 };
          setSelectedNode(null);
          setSelectedEdge({
            edgeKey,
            sourceId: parsedEdge.sourceId,
            targetId: parsedEdge.targetId,
          });
          draggingEdgeRef.current = {
            edgeKey,
            handleKind,
            startClientX: e.clientX,
            startClientY: e.clientY,
            latestAdj: { ...curAdj },
            moved: false,
          };
          return;
        }
      }

      const hitEdgeEl = targetEl.closest('[data-edge-hit-key]');
      if (hitEdgeEl) {
        const edgeKey = hitEdgeEl.getAttribute('data-edge-hit-key') || '';
        const parsedEdge = manualControllerRef.current.edges.get(edgeKey);
        if (parsedEdge) {
          e.preventDefault();
          e.stopPropagation();
          const curAdj: EdgeAdjustment = edgeAdjustments[edgeKey] || { bendDx: 0, bendDy: 0 };
          setSelectedNode(null);
          setSelectedEdge({
            edgeKey,
            sourceId: parsedEdge.sourceId,
            targetId: parsedEdge.targetId,
          });
          // Allow immediate click-and-drag directly on the arrow to bend/reposition it!
          draggingEdgeRef.current = {
            edgeKey,
            handleKind: 'bend',
            startClientX: e.clientX,
            startClientY: e.clientY,
            latestAdj: { ...curAdj },
            moved: false,
          };
          return;
        }
      }
    }

    const clickedNode = (e.target as HTMLElement).closest('g.node[data-manual-node-key]');
    let clickedCluster: Element | null = !clickedNode
      ? (e.target as HTMLElement).closest('g.cluster[data-manual-cluster-key]')
      : null;

    // Fallback hit-test by exact screen bounding rect (handles fill:none clusters & overlapping layers cleanly!)
    if (
      !clickedNode &&
      !clickedCluster &&
      placementMode === 'manual' &&
      manualControllerRef.current
    ) {
      let bestArea = Infinity;
      manualControllerRef.current.clusters.forEach((cl) => {
        const targetBoxEl = cl.rectEl || cl.el;
        const r = targetBoxEl.getBoundingClientRect();
        if (
          e.clientX >= r.left &&
          e.clientX <= r.right &&
          e.clientY >= r.top &&
          e.clientY <= r.bottom
        ) {
          const area = r.width * r.height;
          if (area > 0 && area < bestArea) {
            bestArea = area;
            clickedCluster = cl.el;
          }
        }
      });
    }

    // Manual Placement Mode: grab & drag any node OR entire subgraph freely!
    if (
      placementMode === 'manual' &&
      !locked &&
      tool === 'select' &&
      !spacePressed &&
      e.button === 0 &&
      manualControllerRef.current
    ) {
      if (clickedNode) {
        const nodeId = extractCanonicalNodeId(clickedNode);
        if (nodeId && manualControllerRef.current.nodes.has(nodeId)) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedEdge(null);
          const existing = manualOffsets[nodeId] || { dx: 0, dy: 0 };
          clickedNode.classList.add('mermaid-dragging-node');
          draggingItemRef.current = {
            kind: 'node',
            id: nodeId,
            el: clickedNode,
            startClientX: e.clientX,
            startClientY: e.clientY,
            memberOrigOffsets: { [nodeId]: existing },
            latestUpdates: { [nodeId]: existing },
            moved: false,
          };
          return;
        }
      } else if (clickedCluster) {
        const clusterKey = extractCanonicalClusterKey(clickedCluster);
        if (clusterKey && manualControllerRef.current.clusters.has(clusterKey)) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedEdge(null);
          const memberIds = manualControllerRef.current.getClusterMemberNodeIds(clusterKey);
          const origMap: Record<string, NodeOffset> = {};
          if (memberIds.length > 0) {
            for (const mid of memberIds) {
              origMap[mid] = manualOffsets[mid] || { dx: 0, dy: 0 };
            }
          } else {
            const key = `__cluster__:${clusterKey}`;
            origMap[key] = manualOffsets[key] || { dx: 0, dy: 0 };
          }
          clickedCluster.classList.add('mermaid-dragging-cluster');
          draggingItemRef.current = {
            kind: 'cluster',
            id: clusterKey,
            el: clickedCluster,
            startClientX: e.clientX,
            startClientY: e.clientY,
            memberOrigOffsets: origMap,
            latestUpdates: { ...origMap },
            moved: false,
          };
          return;
        }
      }
    }

    const shouldPan = tool === 'pan' || spacePressed || e.button === 1;
    if (shouldPan || (!clickedNode && !clickedCluster && e.button === 0)) {
      if (!shouldPan) {
        setSelectedEdge(null);
      }
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        tx: translate.x,
        ty: translate.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // 0. Live 60fps Arrow Handle Dragging (Move/Bend Arrow OR Slide Start/End Anchor Along Node Border!)
    if (draggingEdgeRef.current && manualControllerRef.current) {
      const drag = draggingEdgeRef.current;
      const controller = manualControllerRef.current;
      const parsedEdge = controller.edges.get(drag.edgeKey);
      if (!parsedEdge) return;

      if (Math.hypot(e.clientX - drag.startClientX, e.clientY - drag.startClientY) > 3) {
        drag.moved = true;
      }

      const worldPt = controller.clientToWorld(e.clientX, e.clientY);
      if (!worldPt) return;

      const nextAdj: EdgeAdjustment = { ...drag.latestAdj };

      if (drag.handleKind === 'start') {
        const snapped = controller.snapPointToEntityAnchor(
          parsedEdge.sourceId,
          worldPt.x,
          worldPt.y
        );
        if (snapped) nextAdj.startAnchor = snapped;
      } else if (drag.handleKind === 'end') {
        const snapped = controller.snapPointToEntityAnchor(
          parsedEdge.targetId,
          worldPt.x,
          worldPt.y
        );
        if (snapped) nextAdj.endAnchor = snapped;
      } else {
        // Bend/reposition midpoint handle smoothly
        const chordMidX = (parsedEdge.liveWorldStart.x + parsedEdge.liveWorldEnd.x) / 2;
        const chordMidY = (parsedEdge.liveWorldStart.y + parsedEdge.liveWorldEnd.y) / 2;
        let bdx = worldPt.x - chordMidX;
        let bdy = worldPt.y - chordMidY;
        if (snapToGrid) {
          bdx = Math.round(bdx / 12) * 12;
          bdy = Math.round(bdy / 12) * 12;
        } else {
          bdx = Math.round(bdx);
          bdy = Math.round(bdy);
        }
        nextAdj.bendDx = bdx;
        nextAdj.bendDy = bdy;
      }

      drag.latestAdj = nextAdj;
      controller.applyOffsets(
        manualOffsets,
        fmConfig.layoutMode,
        { ...edgeAdjustments, [drag.edgeKey]: nextAdj },
        drag.edgeKey,
        true
      );
      return;
    }

    // 1. Live 60fps Manual Node / Subgraph Drag + Auto-Fit Subgraph Resize + Edge Re-Routing
    if (draggingItemRef.current && manualControllerRef.current) {
      const drag = draggingItemRef.current;
      let deltaX = (e.clientX - drag.startClientX) / scale;
      let deltaY = (e.clientY - drag.startClientY) / scale;
      if (Math.hypot(deltaX, deltaY) > 3) {
        drag.moved = true;
      }
      if (snapToGrid) {
        deltaX = Math.round(deltaX / 16) * 16;
        deltaY = Math.round(deltaY / 16) * 16;
      } else {
        deltaX = Math.round(deltaX);
        deltaY = Math.round(deltaY);
      }

      const updates: Record<string, NodeOffset> = {};
      for (const [key, orig] of Object.entries(drag.memberOrigOffsets)) {
        updates[key] = {
          dx: orig.dx + deltaX,
          dy: orig.dy + deltaY,
        };
      }
      drag.latestUpdates = updates;

      const liveOffsets: Record<string, NodeOffset> = {
        ...manualOffsets,
        ...updates,
      };
      manualControllerRef.current.applyOffsets(
        liveOffsets,
        fmConfig.layoutMode,
        edgeAdjustments,
        selectedEdge?.edgeKey || null,
        true
      );
      return;
    }

    // 2. Sticky Note Drag
    if (draggingNoteRef.current) {
      const d = draggingNoteRef.current;
      const dx = (e.clientX - d.startX) / scale;
      const dy = (e.clientY - d.startY) / scale;
      onUpdateStickyNote(d.id, {
        x: Math.round(d.origX + dx),
        y: Math.round(d.origY + dy),
      });
      return;
    }

    // 3. Canvas Pan
    if (!isPanning) return;
    setTranslate({
      x: panStartRef.current.tx + (e.clientX - panStartRef.current.x),
      y: panStartRef.current.ty + (e.clientY - panStartRef.current.y),
    });
  };

  const handleMouseUp = () => {
    if (draggingEdgeRef.current) {
      const drag = draggingEdgeRef.current;
      draggingEdgeRef.current = null;
      if (drag.moved) {
        suppressNextClickRef.current = true;
        onCommitEdgeAdjustment(drag.edgeKey, drag.latestAdj);
        if (manualControllerRef.current) {
          onLiveSvgChange(manualControllerRef.current.getSerializedSvg());
        }
      }
    }

    if (draggingItemRef.current) {
      const drag = draggingItemRef.current;
      drag.el.classList.remove('mermaid-dragging-node', 'mermaid-dragging-cluster');
      draggingItemRef.current = null;
      if (drag.moved) {
        suppressNextClickRef.current = true;
        if (drag.kind === 'node') {
          const offset = drag.latestUpdates[drag.id];
          if (offset) onCommitNodeOffset(drag.id, offset);
        } else {
          onCommitNodeOffsetsBatch(drag.latestUpdates);
        }
        if (manualControllerRef.current) {
          onLiveSvgChange(manualControllerRef.current.getSerializedSvg());
        }
      }
    }
    setIsPanning(false);
    draggingNoteRef.current = null;
  };

  const handleDiagramClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (tool !== 'select' || spacePressed) return;
    const nodeEl = (e.target as HTMLElement).closest('.node');
    if (!nodeEl) {
      setSelectedNode(null);
      return;
    }
    const rawId = nodeEl.getAttribute('id') || '';
    const nodeId = extractNodeIdFromElement(nodeEl);
    if (!nodeId) return;

    const lineNumber = findNodeLineInCode(code, nodeId);
    const label = (nodeEl.textContent || nodeId).trim().slice(0, 60);

    if (editorMode === 'visual') {
      setSelectedNode({ rawId, nodeId, label, lineNumber });
    } else if (lineNumber) {
      onJumpToLine(lineNumber);
    }
  };

  // Frontmatter helpers (always force-render even if Auto-Update is off)
  const applyCodeImmediate = (nextCode: string, shouldRefit = false, clearManual = false) => {
    if (clearManual && placementMode === 'manual') {
      onResetManualOffsets();
    }
    if (shouldRefit) {
      pendingAutoFitRef.current = true;
    }
    onChangeCode(nextCode);
    onForceRender(nextCode);
  };

  const applyThemePreset = (presetId: string) => {
    if (locked) return;
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const nextCode = updateFrontmatterInCode(code, (cfg) => ({
      ...cfg,
      theme: preset.mermaidTheme,
      themeVariables: preset.variables
        ? { ...cfg.themeVariables, ...preset.variables }
        : cfg.themeVariables,
    }));
    applyCodeImmediate(nextCode);
  };

  const updateThemeVariable = (key: keyof typeof fmConfig.themeVariables, value: string) => {
    if (locked) return;
    const nextCode = updateFrontmatterInCode(code, (cfg) => ({
      ...cfg,
      theme: 'base',
      themeVariables: {
        ...cfg.themeVariables,
        [key]: value,
      },
    }));
    applyCodeImmediate(nextCode);
  };

  const selectLayoutMode = (mode: LayoutMode) => {
    if (locked) return;
    const nextCode = updateFrontmatterInCode(code, (cfg) => applyLayoutModeToConfig(cfg, mode));
    applyCodeImmediate(nextCode, true, true);
    setOpenMenu(null);
  };

  const setLookStyle = (look: DiagramLook) => {
    if (locked) return;
    const nextCode = updateFrontmatterInCode(code, (cfg) => ({ ...cfg, look }));
    applyCodeImmediate(nextCode);
  };

  const setDirection = (dir: DiagramDirection) => {
    if (locked) return;
    const nextCode = updateDirectionInCode(code, dir);
    applyCodeImmediate(nextCode, true, true);
    setOpenMenu(null);
  };

  const updateFlowchartSpacing = (patch: Partial<typeof fmConfig.flowchart>) => {
    if (locked) return;
    const nextCode = updateFrontmatterInCode(code, (cfg) => ({
      ...cfg,
      flowchart: { ...cfg.flowchart, ...patch },
    }));
    applyCodeImmediate(nextCode);
  };

  const insertShapeSnippet = (snippetFn: (id: string) => string) => {
    if (locked) return;
    const id = `N${Math.floor(10 + Math.random() * 89)}`;
    onChangeCode(`${code.trimEnd()}\n${snippetFn(id)}\n`);
    setOpenMenu(null);
  };

  const activeThemeLabel = useMemo(() => {
    if (fmConfig.theme === 'base') {
      const matched = THEME_PRESETS.find(
        (p) =>
          p.mermaidTheme === 'base' &&
          p.variables?.primaryBorderColor?.toLowerCase() ===
            fmConfig.themeVariables?.primaryBorderColor?.toLowerCase()
      );
      return matched ? matched.label : 'Base theme';
    }
    const found = THEME_PRESETS.find((p) => p.mermaidTheme === fmConfig.theme);
    return found ? found.label : fmConfig.theme;
  }, [fmConfig]);

  const activeLayoutOption =
    LAYOUT_MODE_OPTIONS.find((m) => m.id === fmConfig.layoutMode) || LAYOUT_MODE_OPTIONS[0];

  const activeDirectionObj =
    DIRECTION_OPTIONS.find((d) => d.value === (direction === 'TD' ? 'TB' : direction)) ||
    DIRECTION_OPTIONS[0];

  const gridClass =
    gridStyle === 'cross'
      ? darkMode
        ? 'canvas-grid-dark'
        : 'canvas-grid-light'
      : gridStyle === 'dots'
      ? darkMode
        ? 'canvas-dots-dark'
        : 'canvas-dots-light'
      : darkMode
      ? 'bg-[#0f111a]'
      : 'bg-[#fafbfc]';

  const pillSurface = (active = false) =>
    active
      ? darkMode
        ? 'bg-[#253244] border-[#38bdf8]/40 text-white'
        : 'bg-[#cde0e5] border-[#b7d1d8] text-slate-900'
      : darkMode
      ? 'bg-[#1a1e2e]/95 border-slate-700/90 text-slate-200 hover:bg-[#23283d]'
      : 'bg-[#e3eff2]/95 border-[#d3e4e9] text-slate-800 hover:bg-[#d6e7ec]';

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative flex-1 h-full overflow-hidden select-none ${gridClass} ${
        tool === 'comment'
          ? 'cursor-crosshair'
          : isPanning || tool === 'pan' || spacePressed
          ? isPanning
            ? 'cursor-grabbing'
            : 'cursor-grab'
          : 'cursor-default'
      }`}
    >
      {/* Top-Left Floating Status Pills */}
      <div
        data-canvas-ui
        className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2"
      >
        {!codeOpen && (
          <button
            type="button"
            onClick={onOpenCode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm cursor-pointer transition-colors ${
              darkMode
                ? 'bg-[#1a1e2e] border-slate-700 text-slate-100 hover:border-[#e0095f]'
                : 'bg-white border-slate-200 text-slate-800 hover:border-[#e0095f]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-[#e0095f]" />
            <span>Code</span>
          </button>
        )}

        {/* Mode Switcher Pill */}
        <div
          className={`flex items-center p-0.5 rounded-xl border text-xs font-semibold shadow-sm ${
            darkMode
              ? 'bg-[#1a1e2e]/90 border-slate-700'
              : 'bg-white/90 border-slate-200/90'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setEditorMode('code');
              setSelectedNode(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              editorMode === 'code'
                ? 'bg-[#fce7f3] text-[#be185d] dark:bg-[#e0095f]/20 dark:text-[#fb7185]'
                : darkMode
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Pure code mode (click node to jump to line)"
          >
            <span>Code only</span>
            <Code2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('visual')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              editorMode === 'visual'
                ? 'bg-[#fce7f3] text-[#be185d] dark:bg-[#e0095f]/20 dark:text-[#fb7185]'
                : darkMode
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Visual & Code mode (click any node to inspect & style visually)"
          >
            <Paintbrush className="w-3 h-3" />
            <span>Visual</span>
          </button>
        </div>

        {/* Lock / Unlock Pill */}
        <button
          type="button"
          onClick={onToggleLocked}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer shadow-sm ${
            locked
              ? 'bg-[#fce7f3] border-[#fbcfe8] text-[#be185d] dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-300'
              : darkMode
              ? 'bg-[#1a1e2e]/90 border-slate-700 text-slate-300 hover:bg-slate-800'
              : 'bg-white/90 border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title={locked ? 'Diagram is locked (read-only). Click to unlock.' : 'Click to lock diagram'}
        >
          <span>{locked ? 'Locked' : 'Editable'}</span>
          {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
        </button>

        {/* Active Manual Placement Banner Pill */}
        {placementMode === 'manual' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-semibold shadow-sm animate-pop">
            <PlacementIcon mode="manual" className="w-3.5 h-3.5" />
            <span>Manual Drag Active</span>
            {movedNodeCount > 0 && (
              <button
                type="button"
                onClick={onResetManualOffsets}
                className="ml-1 px-1.5 py-0.2 rounded bg-white/20 hover:bg-white/30 text-[10px] font-bold cursor-pointer"
                title="Reset all moved nodes"
              >
                Reset ({movedNodeCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Top-Right 4-Pill Mermaid.ai Toolbar: Theme | Layout | Direction | Placement */}
      <div
        data-canvas-ui
        data-canvas-popover
        className="absolute top-4 right-4 z-20 flex flex-wrap items-center justify-end gap-2"
      >
        {/* 1. Theme Studio Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'theme' ? null : 'theme')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-sm backdrop-blur-sm transition-colors cursor-pointer ${pillSurface(openMenu === 'theme')}`}
          >
            <span>{activeThemeLabel}</span>
            <span className="w-4 h-4 rounded-full bg-[conic-gradient(from_0deg,#f43f5e,#f59e0b,#10b981,#3b82f6,#8b5cf6,#f43f5e)] p-[2px] flex items-center justify-center">
              <span
                className={`w-full h-full rounded-full ${
                  darkMode ? 'bg-[#1a1e2e]' : 'bg-white'
                }`}
              />
            </span>
          </button>

          {openMenu === 'theme' && (
            <div
              className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl p-3.5 z-40 animate-pop ${
                darkMode
                  ? 'bg-[#1a1e2e] border-slate-700 text-slate-100'
                  : 'bg-[#f4f9fa] border-[#d7e6ea] text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold">Theme Studio</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e0095f]/10 text-[#e0095f]">
                  Synced to Frontmatter
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-3.5">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    disabled={locked}
                    onClick={() => applyThemePreset(preset.id)}
                    className={`p-2 rounded-xl border text-left transition-all cursor-pointer disabled:opacity-40 ${
                      activeThemeLabel === preset.label
                        ? 'border-[#e0095f] bg-[#e0095f]/10'
                        : darkMode
                        ? 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      {preset.swatches.map((hex, i) => (
                        <span
                          key={i}
                          style={{ backgroundColor: hex }}
                          className="w-3.5 h-3.5 rounded-full border border-black/15"
                        />
                      ))}
                    </div>
                    <div className="text-[11px] font-semibold truncate">{preset.label}</div>
                  </button>
                ))}
              </div>

              <div
                className={`border-t pt-3 space-y-2.5 ${
                  darkMode ? 'border-slate-800' : 'border-slate-200/80'
                }`}
              >
                <div className="text-[11px] font-bold opacity-80">Custom Theme Variables</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700">
                    <span>Node Fill</span>
                    <input
                      type="color"
                      disabled={locked}
                      value={fmConfig.themeVariables.primaryColor || '#ffffff'}
                      onChange={(e) => updateThemeVariable('primaryColor', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700">
                    <span>Text</span>
                    <input
                      type="color"
                      disabled={locked}
                      value={fmConfig.themeVariables.primaryTextColor || '#111111'}
                      onChange={(e) => updateThemeVariable('primaryTextColor', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700">
                    <span>Border</span>
                    <input
                      type="color"
                      disabled={locked}
                      value={fmConfig.themeVariables.primaryBorderColor || '#333333'}
                      onChange={(e) => updateThemeVariable('primaryBorderColor', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border bg-white/80 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700">
                    <span>Lines</span>
                    <input
                      type="color"
                      disabled={locked}
                      value={fmConfig.themeVariables.lineColor || '#333333'}
                      onChange={(e) => updateThemeVariable('lineColor', e.target.value)}
                      className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[10px] font-semibold opacity-70 mb-1">Font Size</span>
                    <select
                      disabled={locked}
                      value={fmConfig.themeVariables.fontSize || '16px'}
                      onChange={(e) => updateThemeVariable('fontSize', e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1 text-xs outline-none ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <option value="12px">12px (Compact)</option>
                      <option value="14px">14px (Balanced)</option>
                      <option value="16px">16px (Standard)</option>
                      <option value="18px">18px (Presentation)</option>
                      <option value="20px">20px (Large)</option>
                    </select>
                  </div>
                  <div>
                    <span className="block text-[10px] font-semibold opacity-70 mb-1">Font Family</span>
                    <select
                      disabled={locked}
                      value={fmConfig.themeVariables.fontFamily || ''}
                      onChange={(e) => updateThemeVariable('fontFamily', e.target.value)}
                      className={`w-full rounded-lg border px-2 py-1 text-xs outline-none ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <option value="">System Default</option>
                      <option value="Inter, sans-serif">Inter</option>
                      <option value="Plus Jakarta Sans, sans-serif">Plus Jakarta Sans</option>
                      <option value="JetBrains Mono, monospace">JetBrains Mono</option>
                      <option value="Georgia, serif">Georgia Serif</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Exact Mermaid.ai Layout Pill (Hierarchical | Adaptive | Orthogonal | Balanced) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'layout' ? null : 'layout')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-sm backdrop-blur-sm transition-colors cursor-pointer ${pillSurface(openMenu === 'layout')}`}
          >
            <span>
              {activeLayoutOption.label}
              {fmConfig.look === 'handDrawn' ? ' · Sketch' : ''}
            </span>
            <LayoutIcon mode={activeLayoutOption.id} className="w-4 h-4" />
          </button>

          {openMenu === 'layout' && (
            <div
              className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl p-3.5 z-40 animate-pop ${
                darkMode
                  ? 'bg-[#1a1e2e] border-slate-700 text-slate-100'
                  : 'bg-[#f4f9fa] border-[#d7e6ea] text-slate-800'
              }`}
            >
              <div className="text-xs font-medium opacity-70 px-1.5 mb-2">Layout</div>

              <div className="space-y-1.5">
                {LAYOUT_MODE_OPTIONS.map((opt) => {
                  const isActive = fmConfig.layoutMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={locked}
                      onClick={() => selectLayoutMode(opt.id)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 ${
                        isActive
                          ? darkMode
                            ? 'bg-[#263547] ring-1 ring-[#38bdf8]/40'
                            : 'bg-[#dfeef2]'
                          : darkMode
                          ? 'hover:bg-slate-800/70'
                          : 'hover:bg-[#e9f3f6]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold font-mono tracking-tight">
                          {opt.label}
                        </span>
                        <LayoutIcon mode={opt.id} className="w-5 h-5 shrink-0 opacity-85" />
                      </div>
                      <p
                        className={`text-xs leading-relaxed ${
                          darkMode ? 'text-slate-300' : 'text-slate-600'
                        }`}
                      >
                        {opt.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Collapsible Look & Fine-Tuning Spacing Controls */}
              <div
                className={`mt-3 pt-2.5 border-t ${
                  darkMode ? 'border-slate-800' : 'border-slate-200/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setShowAdvancedLayout((v) => !v)}
                  className="w-full flex items-center justify-between px-1.5 py-1 text-[11px] font-semibold opacity-75 hover:opacity-100 cursor-pointer"
                >
                  <span>Look, Spacing &amp; Curve Fine-Tuning</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      showAdvancedLayout ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {showAdvancedLayout && (
                  <div className="mt-2.5 px-1.5 space-y-2.5 text-[11px]">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setLookStyle('classic')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                          fmConfig.look !== 'handDrawn'
                            ? 'border-[#e0095f] bg-[#e0095f]/10 text-[#e0095f]'
                            : darkMode
                            ? 'border-slate-700 hover:bg-slate-800'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        Crisp Vector
                      </button>
                      <button
                        type="button"
                        disabled={locked}
                        onClick={() => setLookStyle('handDrawn')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                          fmConfig.look === 'handDrawn'
                            ? 'border-[#e0095f] bg-[#e0095f]/10 text-[#e0095f]'
                            : darkMode
                            ? 'border-slate-700 hover:bg-slate-800'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        Hand-Drawn
                      </button>
                    </div>

                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span>Node Spacing</span>
                        <span className="font-mono font-semibold">
                          {fmConfig.flowchart.nodeSpacing ?? 30}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={100}
                        disabled={locked}
                        value={fmConfig.flowchart.nodeSpacing ?? 30}
                        onChange={(e) =>
                          updateFlowchartSpacing({ nodeSpacing: Number(e.target.value) })
                        }
                        className="w-full accent-[#e0095f]"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span>Rank Spacing</span>
                        <span className="font-mono font-semibold">
                          {fmConfig.flowchart.rankSpacing ?? 35}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={120}
                        disabled={locked}
                        value={fmConfig.flowchart.rankSpacing ?? 35}
                        onChange={(e) =>
                          updateFlowchartSpacing({ rankSpacing: Number(e.target.value) })
                        }
                        className="w-full accent-[#e0095f]"
                      />
                    </div>
                    <div>
                      <label className="block mb-1 font-medium">Connector Curve</label>
                      <select
                        disabled={locked}
                        value={fmConfig.flowchart.curve || 'basis'}
                        onChange={(e) =>
                          updateFlowchartSpacing({ curve: e.target.value as CurveType })
                        }
                        className={`w-full rounded-lg border px-2 py-1 text-xs outline-none ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        {CURVE_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Direction Pill */}
        {direction && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpenMenu(openMenu === 'direction' ? null : 'direction')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-sm backdrop-blur-sm transition-colors cursor-pointer ${pillSurface(openMenu === 'direction')}`}
            >
              <span>{activeDirectionObj.label}</span>
              {activeDirectionObj.icon}
            </button>

            {openMenu === 'direction' && (
              <div
                className={`absolute right-0 top-full mt-2 w-48 rounded-2xl border shadow-2xl p-1.5 z-40 animate-pop ${
                  darkMode
                    ? 'bg-[#1a1e2e] border-slate-700 text-slate-100'
                    : 'bg-[#f4f9fa] border-[#d7e6ea] text-slate-800'
                }`}
              >
                {DIRECTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={locked}
                    onClick={() => setDirection(opt.value)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                      activeDirectionObj.value === opt.value
                        ? darkMode
                          ? 'bg-[#263547] text-white'
                          : 'bg-[#dfeef2] text-slate-900'
                        : darkMode
                        ? 'hover:bg-slate-800'
                        : 'hover:bg-[#e9f3f6]'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {opt.icon}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Exact Mermaid.ai Placement Pill (Auto | Manual) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpenMenu(openMenu === 'placement' ? null : 'placement')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-sm backdrop-blur-sm transition-colors cursor-pointer ${pillSurface(openMenu === 'placement' || placementMode === 'manual')}`}
          >
            <span>{placementMode === 'manual' ? 'Manual' : 'Auto'}</span>
            <PlacementIcon mode={placementMode} className="w-4 h-4" />
          </button>

          {openMenu === 'placement' && (
            <div
              className={`absolute right-0 top-full mt-2 w-80 rounded-2xl border shadow-2xl p-3.5 z-40 animate-pop ${
                darkMode
                  ? 'bg-[#1a1e2e] border-slate-700 text-slate-100'
                  : 'bg-[#f4f9fa] border-[#d7e6ea] text-slate-800'
              }`}
            >
              <div className="text-xs font-medium opacity-70 px-1.5 mb-2">Placement</div>

              <div className="space-y-1.5">
                {/* Auto Placement Option */}
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    onChangePlacementMode('auto');
                    setOpenMenu(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 ${
                    placementMode === 'auto'
                      ? darkMode
                        ? 'bg-[#263547] ring-1 ring-[#38bdf8]/40'
                        : 'bg-[#dfeef2]'
                      : darkMode
                      ? 'hover:bg-slate-800/70'
                      : 'hover:bg-[#e9f3f6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold font-mono tracking-tight">Auto</span>
                    <PlacementIcon mode="auto" className="w-5 h-5 shrink-0 opacity-85" />
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    Nodes are positioned automatically as you add them.
                  </p>
                </button>

                {/* Manual Placement Option */}
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    onChangePlacementMode('manual');
                    setTool('select');
                    setOpenMenu(null);
                  }}
                  className={`w-full text-left p-3.5 rounded-xl transition-all cursor-pointer disabled:opacity-40 ${
                    placementMode === 'manual'
                      ? darkMode
                        ? 'bg-[#263547] ring-1 ring-[#38bdf8]/40'
                        : 'bg-[#dfeef2]'
                      : darkMode
                      ? 'hover:bg-slate-800/70'
                      : 'hover:bg-[#e9f3f6]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-bold font-mono tracking-tight">Manual</span>
                    <PlacementIcon mode="manual" className="w-5 h-5 shrink-0 opacity-85" />
                  </div>
                  <p
                    className={`text-xs leading-relaxed ${
                      darkMode ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    You place and move nodes freely.{' '}
                    <strong className="font-bold">
                      Switching back to Auto resets your choices.
                    </strong>
                  </p>
                </button>
              </div>

              {/* Extra Manual Mode Controls */}
              {placementMode === 'manual' && (
                <div
                  className={`mt-3 pt-2.5 border-t space-y-2 ${
                    darkMode ? 'border-slate-800' : 'border-slate-200/80'
                  }`}
                >
                  <label className="flex items-center justify-between px-1.5 text-xs font-medium cursor-pointer">
                    <span className="flex items-center gap-1.5">
                      <Magnet className="w-3.5 h-3.5 text-[#e0095f]" />
                      Snap to 16px Grid
                    </span>
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={(e) => setSnapToGrid(e.target.checked)}
                      className="accent-[#e0095f] w-3.5 h-3.5"
                    />
                  </label>

                  {movedNodeCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onResetManualOffsets();
                        setOpenMenu(null);
                      }}
                      className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        darkMode
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset {movedNodeCount} Moved Node{movedNodeCount > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Left Vertical Floating Visual Tools Bar */}
      <div
        data-canvas-ui
        data-canvas-popover
        className={`absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 p-1.5 rounded-2xl border shadow-lg backdrop-blur-md ${
          darkMode
            ? 'bg-[#1a1e2e]/95 border-slate-700/90 text-slate-300'
            : 'bg-white/95 border-slate-200/90 text-slate-600'
        }`}
      >
        {/* Quick Insert Shapes */}
        <div className="relative">
          <button
            type="button"
            disabled={locked}
            onClick={() => setOpenMenu(openMenu === 'shapes' ? null : 'shapes')}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-40 ${
              openMenu === 'shapes'
                ? 'bg-[#e0095f]/15 text-[#e0095f]'
                : darkMode
                ? 'hover:bg-slate-800 hover:text-white'
                : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Insert Shapes & Subgraphs"
          >
            <Shapes className="w-4.5 h-4.5" />
          </button>

          {openMenu === 'shapes' && (
            <div
              className={`absolute left-full top-0 ml-2.5 w-64 rounded-2xl border shadow-2xl p-3 z-40 animate-pop ${
                darkMode
                  ? 'bg-[#1a1e2e] border-slate-700 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="text-xs font-bold mb-2">Quick Insert Shape</div>
              <div className="grid grid-cols-2 gap-1.5">
                {QUICK_SHAPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => insertShapeSnippet(s.snippet)}
                    className={`text-left p-2 rounded-xl border transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-700/80 hover:border-[#e0095f] hover:bg-slate-800'
                        : 'border-slate-200 hover:border-[#e0095f] hover:bg-rose-50/40'
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{s.label}</div>
                    <div className="text-[10px] font-mono opacity-60 truncate">
                      {s.syntaxPreview}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Add Sticky Note Annotation */}
        <button
          type="button"
          onClick={() =>
            onAddStickyNote(
              Math.round(-translate.x / scale),
              Math.round(-translate.y / scale) - 140
            )
          }
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Add Draggable Text Note on Canvas"
        >
          <Type className="w-4.5 h-4.5" />
        </button>

        {/* Templates Gallery */}
        <button
          type="button"
          onClick={onOpenTemplates}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Open Pro Diagram Templates Gallery"
        >
          <LayoutTemplate className="w-4.5 h-4.5" />
        </button>

        {/* Cloud / Architecture Blocks */}
        <div className="relative">
          <button
            type="button"
            disabled={locked}
            onClick={() => setOpenMenu(openMenu === 'cloud' ? null : 'cloud')}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer disabled:opacity-40 ${
              openMenu === 'cloud'
                ? 'bg-[#e0095f]/15 text-[#e0095f]'
                : darkMode
                ? 'hover:bg-slate-800 hover:text-white'
                : 'hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Insert Cloud, Data & ML Architecture Blocks"
          >
            <Cloud className="w-4.5 h-4.5" />
          </button>

          {openMenu === 'cloud' && (
            <div
              className={`absolute left-full top-0 ml-2.5 w-64 rounded-2xl border shadow-2xl p-3 z-40 animate-pop ${
                darkMode
                  ? 'bg-[#1a1e2e] border-slate-700 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="text-xs font-bold mb-2">Architecture &amp; ML Blocks</div>
              <div className="space-y-1.5">
                {CLOUD_BLOCKS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => insertShapeSnippet(b.code)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                      darkMode
                        ? 'border-slate-700/80 hover:border-[#e0095f] hover:bg-slate-800'
                        : 'border-slate-200 hover:border-[#e0095f] hover:bg-rose-50/40'
                    }`}
                  >
                    <span className="text-xs font-semibold">{b.label}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 opacity-75">
                      {b.category}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pin Comment Tool */}
        <button
          type="button"
          onClick={() => setTool(tool === 'comment' ? 'select' : 'comment')}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            tool === 'comment'
              ? 'bg-[#e0095f] text-white shadow-sm'
              : darkMode
              ? 'hover:bg-slate-800 hover:text-white'
              : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Pin a Comment Anywhere on Canvas"
        >
          <MessageSquarePlus className="w-4.5 h-4.5" />
        </button>

        {/* Canvas Grid Style Switcher */}
        <button
          type="button"
          onClick={() =>
            setGridStyle((g) => (g === 'cross' ? 'dots' : g === 'dots' ? 'none' : 'cross'))
          }
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title={`Canvas Grid: ${gridStyle} (Click to cycle)`}
        >
          <Grid3X3 className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Right Vertical Floating Zoom & Pan Controls */}
      <div
        data-canvas-ui
        className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1 p-1.5 rounded-2xl border shadow-lg backdrop-blur-md ${
          darkMode
            ? 'bg-[#1a1e2e]/95 border-slate-700/90 text-slate-300'
            : 'bg-white/95 border-slate-200/90 text-slate-600'
        }`}
      >
        <button
          type="button"
          onClick={() => setTool(tool === 'pan' ? 'select' : 'pan')}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            tool === 'pan'
              ? 'bg-[#e0095f]/15 text-[#e0095f]'
              : darkMode
              ? 'hover:bg-slate-800 hover:text-white'
              : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title={tool === 'pan' ? 'Hand Pan Active (Click for Select)' : 'Switch to Hand Pan Tool'}
        >
          {tool === 'pan' ? <Hand className="w-4.5 h-4.5" /> : <MousePointer2 className="w-4.5 h-4.5" />}
        </button>

        <div className={`w-6 h-px my-0.5 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

        <button
          type="button"
          onClick={() => setScale((s) => Math.min(4, Number((s * 1.18).toFixed(3))))}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Zoom In"
        >
          <ZoomIn className="w-4.5 h-4.5" />
        </button>

        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.15, Number((s / 1.18).toFixed(3))))}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Zoom Out"
        >
          <ZoomOut className="w-4.5 h-4.5" />
        </button>

        <button
          type="button"
          onClick={() => {
            setScale(1);
            setTranslate({ x: 0, y: 0 });
          }}
          className={`px-1.5 py-2 rounded-xl text-[11px] font-bold tracking-tight transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title={`Reset 1:1 (Current: ${Math.round(scale * 100)}%)`}
        >
          1:1
        </button>

        <button
          type="button"
          onClick={fitToScreen}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 hover:text-white' : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Fit Diagram to Screen"
        >
          <Maximize2 className="w-4.5 h-4.5" />
        </button>

        <div className={`w-6 h-px my-0.5 ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

        <button
          type="button"
          onClick={() => setShowMinimap((m) => !m)}
          className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
            showMinimap
              ? 'bg-[#e0095f]/15 text-[#e0095f]'
              : darkMode
              ? 'hover:bg-slate-800 hover:text-white'
              : 'hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Toggle Minimap Preview"
        >
          <MapIcon className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Floating Node Style Inspector */}
      {selectedNode && editorMode === 'visual' && (
        <div data-canvas-ui className="absolute bottom-4 left-4 z-30">
          <NodeStyleInspector
            selectedNode={selectedNode}
            code={code}
            locked={locked}
            darkMode={darkMode}
            onChangeCode={onChangeCode}
            onJumpToLine={onJumpToLine}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      )}

      {/* Floating Arrow Position & Route Toolbar (when an arrow is selected in Manual mode) */}
      {selectedEdge && placementMode === 'manual' && !locked && (
        <div
          data-canvas-ui
          className={`absolute bottom-14 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center gap-2 px-3.5 py-2 rounded-2xl border shadow-2xl backdrop-blur-md animate-pop ${
            darkMode
              ? 'bg-[#1a1e2e]/95 border-slate-700 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-800'
          }`}
        >
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e0095f]" />
            <span className="font-mono text-[11px]">
              {selectedEdge.sourceId || '?'} → {selectedEdge.targetId || '?'}
            </span>
          </div>

          <span className={`h-4 w-px ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

          <div className="flex items-center gap-1">
            {(['auto', 'curved', 'orthogonal', 'straight'] as const).map((style) => {
              const currentStyle =
                edgeAdjustments[selectedEdge.edgeKey]?.routeStyle || 'auto';
              return (
                <button
                  key={style}
                  type="button"
                  onClick={() => {
                    const prev = edgeAdjustments[selectedEdge.edgeKey] || {
                      bendDx: 0,
                      bendDy: 0,
                    };
                    onCommitEdgeAdjustment(selectedEdge.edgeKey, {
                      ...prev,
                      routeStyle: style,
                    });
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold capitalize cursor-pointer transition-colors ${
                    currentStyle === style
                      ? 'bg-[#e0095f] text-white'
                      : darkMode
                      ? 'hover:bg-slate-800 text-slate-300'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {style === 'orthogonal' ? '90° Ortho' : style}
                </button>
              );
            })}
          </div>

          <span className={`h-4 w-px ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />

          <button
            type="button"
            onClick={() => onCommitEdgeAdjustment(selectedEdge.edgeKey, null)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
              darkMode
                ? 'hover:bg-slate-800 text-slate-300'
                : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Reset arrow curve & anchors to default"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>

          <button
            type="button"
            onClick={() => setSelectedEdge(null)}
            className={`p-1 rounded-lg cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
            title="Deselect arrow"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Subtle Bottom-Right Status Pill */}
      <div
        data-canvas-ui
        className={`absolute bottom-4 right-4 z-20 flex items-center gap-2.5 px-3 py-1.5 rounded-xl border text-[11px] font-medium shadow-sm backdrop-blur-md ${
          darkMode
            ? 'bg-[#1a1e2e]/90 border-slate-700/80 text-slate-400'
            : 'bg-white/90 border-slate-200/80 text-slate-500'
        }`}
      >
        {tool === 'comment' ? (
          <span className="text-[#e0095f] font-semibold flex items-center gap-1">
            <MessageSquarePlus className="w-3.5 h-3.5" />
            Click anywhere on canvas to pin a comment
          </span>
        ) : placementMode === 'manual' ? (
          <span className="text-teal-600 dark:text-teal-400 font-semibold">
            Manual · Drag nodes, subgraphs, or click any arrow to bend &amp; move anchors
          </span>
        ) : (
          <span>
            {editorMode === 'visual'
              ? 'Click any node to style · Scroll to zoom · Drag canvas to pan'
              : 'Click node to jump to line · Scroll to zoom'}
          </span>
        )}
        <span className={`h-3 w-px ${darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
        <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">
          {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Optional Minimap Card */}
      {showMinimap && svg && (
        <div
          data-canvas-ui
          onClick={fitToScreen}
          className={`absolute bottom-14 right-4 z-20 w-44 h-28 rounded-xl border shadow-xl overflow-hidden p-2 cursor-pointer animate-pop ${
            darkMode
              ? 'bg-[#1a1e2e]/95 border-slate-700'
              : 'bg-white/95 border-slate-200'
          }`}
          title="Click to center & fit diagram"
        >
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none opacity-85 [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:w-auto [&>svg]:h-auto"
            dangerouslySetInnerHTML={{
              __html: svg
                .replace(/\bid="([^"]+)"/g, 'id="mm-$1"')
                .replace(/url\(#([^)]+)\)/g, 'url(#mm-$1)'),
            }}
          />
        </div>
      )}

      {/* World Transform Layer */}
      <div className="w-full h-full flex items-center justify-center">
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.08s ease-out',
          }}
          className="relative flex items-center justify-center"
        >
          {svg ? (
            <div
              ref={svgWrapperRef}
              onClick={handleDiagramClick}
              className={`mermaid-canvas-svg ${
                editorMode === 'visual' && tool === 'select' ? 'mermaid-interactive' : ''
              } ${placementMode === 'manual' && tool === 'select' && !locked ? 'mermaid-manual-placement' : ''}`}
            />
          ) : (
            <div
              className={`px-6 py-8 rounded-2xl border border-dashed text-center max-w-sm ${
                darkMode
                  ? 'border-slate-700 bg-slate-900/50 text-slate-400'
                  : 'border-slate-300 bg-white/80 text-slate-500'
              }`}
            >
              <Sparkles className="w-7 h-7 mx-auto mb-2 text-[#e0095f] opacity-80" />
              <div className="text-sm font-semibold mb-1">Canvas Ready</div>
              <p className="text-xs">
                Write valid Mermaid syntax in the editor or pick a pro template to start rendering.
              </p>
            </div>
          )}

          {/* Draggable Sticky Notes */}
          {stickyNotes.map((note) => (
            <div
              key={note.id}
              data-canvas-ui
              style={{
                left: `calc(50% + ${note.x}px)`,
                top: `calc(50% + ${note.y}px)`,
              }}
              className={`absolute w-48 rounded-xl border shadow-md p-2.5 z-10 ${NOTE_COLORS[note.color]}`}
            >
              <div
                onMouseDown={(e) => {
                  e.stopPropagation();
                  draggingNoteRef.current = {
                    id: note.id,
                    startX: e.clientX,
                    startY: e.clientY,
                    origX: note.x,
                    origY: note.y,
                  };
                }}
                className="flex items-center justify-between mb-1.5 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center gap-1">
                  {(['amber', 'rose', 'sky', 'emerald', 'violet'] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => onUpdateStickyNote(note.id, { color: c })}
                      className={`w-2.5 h-2.5 rounded-full border border-black/20 cursor-pointer ${
                        c === 'amber'
                          ? 'bg-amber-400'
                          : c === 'rose'
                          ? 'bg-rose-400'
                          : c === 'sky'
                          ? 'bg-sky-400'
                          : c === 'emerald'
                          ? 'bg-emerald-400'
                          : 'bg-violet-400'
                      }`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteStickyNote(note.id)}
                  className="p-0.5 rounded hover:bg-black/10 cursor-pointer"
                  title="Delete note"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <textarea
                value={note.text}
                onChange={(e) => onUpdateStickyNote(note.id, { text: e.target.value })}
                rows={3}
                className="w-full bg-transparent text-xs font-medium outline-none resize-none leading-relaxed"
              />
            </div>
          ))}

          {/* Pinned Canvas Comment Markers */}
          {pinnedComments
            .filter((c) => c.pinned && !c.resolved)
            .map((c, idx) => (
              <button
                key={c.id}
                type="button"
                data-canvas-ui
                onClick={onSelectCommentDrawer}
                style={{
                  left: `calc(50% + ${c.pinned!.x}px)`,
                  top: `calc(50% + ${c.pinned!.y}px)`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full rounded-bl-none bg-[#e0095f] text-white text-xs font-bold shadow-lg border-2 border-white flex items-center justify-center hover:scale-110 transition-transform cursor-pointer z-20"
                title={`${c.author}: ${c.text}`}
              >
                {idx + 1}
              </button>
            ))}

          {/* Pending Comment Pin Composer */}
          {pendingPin && (
            <div
              data-canvas-ui
              style={{
                left: `calc(50% + ${pendingPin.x}px)`,
                top: `calc(50% + ${pendingPin.y}px)`,
              }}
              className={`absolute z-30 w-64 rounded-2xl border shadow-2xl p-3 animate-pop ${
                darkMode
                  ? 'bg-[#1a1e2e] border-slate-700 text-slate-100'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold">Pin Comment Here</span>
                <button
                  type="button"
                  onClick={() => {
                    setPendingPin(null);
                    setTool('select');
                  }}
                  className="p-0.5 rounded hover:bg-slate-200/50 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value)}
                placeholder="Write feedback or note..."
                rows={2}
                autoFocus
                className={`w-full rounded-xl border p-2 text-xs outline-none resize-none mb-2 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
              <div className="flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPendingPin(null);
                    setTool('select');
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium opacity-70 hover:opacity-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pinDraft.trim()) {
                      onAddPinnedComment(pinDraft.trim(), pendingPin);
                    }
                    setPendingPin(null);
                    setTool('select');
                  }}
                  className="px-3 py-1 rounded-lg bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-semibold cursor-pointer"
                >
                  Pin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
