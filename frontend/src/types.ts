export type DiagramDirection = 'LR' | 'TB' | 'TD' | 'RL' | 'BT';

export type LayoutEngine = 'dagre' | 'elk';

export type LayoutMode = 'hierarchical' | 'adaptive' | 'orthogonal' | 'balanced';

export type PlacementMode = 'auto' | 'manual';

export interface NodeOffset {
  dx: number;
  dy: number;
}

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

export interface EdgeAnchorSpec {
  side: AnchorSide;
  /** Normalized position along the side (0.1 to 0.9, 0.5 = center) */
  t: number;
}

export interface EdgeAdjustment {
  /** World-space offset applied to the arrow's midpoint/bend handle relative to the chord midpoint */
  bendDx: number;
  bendDy: number;
  /** Optional custom attachment point on the source node perimeter */
  startAnchor?: EdgeAnchorSpec;
  /** Optional custom attachment point on the target node perimeter */
  endAnchor?: EdgeAnchorSpec;
  /** Optional per-edge routing override */
  routeStyle?: 'auto' | 'curved' | 'orthogonal' | 'straight';
}

export interface SelectedEdgeInfo {
  edgeKey: string;
  sourceId: string | null;
  targetId: string | null;
}

export type DiagramLook = 'classic' | 'handDrawn';

export type CurveType =
  | 'basis'
  | 'linear'
  | 'stepBefore'
  | 'stepAfter'
  | 'cardinal'
  | 'monotoneX'
  | 'catmullRom'
  | 'natural';

export type MermaidThemeName =
  | 'base'
  | 'default'
  | 'neutral'
  | 'dark'
  | 'forest'
  | 'neo'
  | 'neo-dark'
  | 'redux'
  | 'redux-dark'
  | 'ocean'
  | 'rose'
  | 'midnight';

export interface ThemeVariablesConfig {
  fontFamily?: string;
  fontSize?: string;
  primaryColor?: string;
  primaryTextColor?: string;
  primaryBorderColor?: string;
  lineColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
  background?: string;
  clusterBkg?: string;
  clusterBorder?: string;
}

export interface FlowchartConfig {
  nodeSpacing?: number;
  rankSpacing?: number;
  curve?: CurveType;
  padding?: number;
  layout?: LayoutEngine;
}

export interface MermaidFrontmatterConfig {
  theme: string;
  look: DiagramLook;
  layout: LayoutEngine;
  layoutMode: LayoutMode;
  elk?: {
    mergeEdges?: boolean;
    nodePlacementStrategy?: string;
    cycleBreakingStrategy?: string;
  };
  themeVariables: ThemeVariablesConfig;
  flowchart: FlowchartConfig;
}

export interface VersionSnapshot {
  id: string;
  timestamp: number;
  label: string;
  code: string;
  isManual?: boolean;
}

export interface CommentReply {
  id: string;
  author: string;
  text: string;
  createdAt: number;
}

export interface DiagramComment {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  resolved: boolean;
  pinned?: { x: number; y: number };
  replies: CommentReply[];
}

export interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: 'amber' | 'rose' | 'sky' | 'emerald' | 'violet';
}

export interface DiagramFolder {
  id: string;
  name: string;
  createdAt: number;
}

export interface DiagramDocument {
  id: string;
  title: string;
  folderId: string;
  code: string;
  notes: string;
  favorite: boolean;
  locked: boolean;
  placementMode?: PlacementMode;
  manualOffsets?: Record<string, NodeOffset>;
  edgeAdjustments?: Record<string, EdgeAdjustment>;
  createdAt: number;
  updatedAt: number;
  versions: VersionSnapshot[];
  comments: DiagramComment[];
  stickyNotes: StickyNote[];
}

export interface DiagramTemplate {
  id: string;
  title: string;
  category:
    | 'Flowchart'
    | 'Architecture'
    | 'Sequence'
    | 'Database'
    | 'Planning'
    | 'Charts & Data'
    | 'Software';
  description: string;
  badge?: string;
  code: string;
}

export interface SnippetItem {
  id: string;
  label: string;
  category: string;
  description: string;
  code: string;
}

export interface SelectedNodeInfo {
  rawId: string;
  nodeId: string;
  label: string;
  lineNumber: number | null;
}

export type CanvasGridStyle = 'cross' | 'dots' | 'none';
export type EditorMode = 'code' | 'visual';
export type CanvasTool = 'pan' | 'select' | 'comment';

export type UserRole = 'user' | 'super_admin';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive?: boolean;
  darkMode?: boolean;
  createdAt?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  superAdmins: number;
  totalDiagrams: number;
  totalFolders: number;
}

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  diagramCount: number;
  folderCount: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AdminDiagramRecord {
  id: string;
  userId: string;
  ownerName: string;
  ownerEmail: string;
  folderId: string;
  title: string;
  codeLength?: number;
  code?: string;
  favorite: boolean;
  locked: boolean;
  updatedAt: number;
  createdAt: number;
}

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';
