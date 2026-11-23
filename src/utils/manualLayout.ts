import type {
  AnchorSide,
  EdgeAdjustment,
  EdgeAnchorSpec,
  LayoutMode,
  NodeOffset,
} from '../types';

interface Mat2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

interface WorldBox {
  cx: number;
  cy: number;
  width: number;
  height: number;
  dx: number;
  dy: number;
}

interface ParsedNode {
  id: string;
  el: SVGGElement;
  baseLocalPos: { x: number; y: number };
  worldCx: number;
  worldCy: number;
  worldW: number;
  worldH: number;
  worldToParent: Mat2D;
}

interface ParsedCluster {
  key: string;
  id: string;
  el: SVGGElement;
  rectEl: SVGRectElement | null;
  labelEl: SVGGElement | null;
  baseWorldRect: { x: number; y: number; width: number; height: number };
  baseLocalRect: { x: number; y: number; width: number; height: number };
  baseLocalLabelPos: { x: number; y: number } | null;
  labelWorldW: number;
  labelWorldH: number;
  labelCenterOffsetX: number;
  labelTopOffsetY: number;
  worldToRectParent: Mat2D;
  worldToLabelParent: Mat2D;
  padding: { left: number; right: number; top: number; bottom: number };
  memberNodeIds: string[];
  childClusterKeys: string[];
}

export interface ParsedEdge {
  key: string;
  pathEl: SVGPathElement;
  sourceId: string | null;
  targetId: string | null;
  origWorldStart: { x: number; y: number };
  origWorldMid: { x: number; y: number };
  origWorldEnd: { x: number; y: number };
  origD: string;
  origTransform: string;
  worldToPathParent: Mat2D;
  pathParentToWorld: Mat2D;
  labelEl: SVGGElement | null;
  origLocalLabelPos: { x: number; y: number } | null;
  origWorldLabelPos: { x: number; y: number } | null;
  worldToLabelParent: Mat2D | null;
  // Live computed world coordinates (updated every applyOffsets call)
  liveWorldStart: { x: number; y: number };
  liveWorldMid: { x: number; y: number };
  liveWorldEnd: { x: number; y: number };
  liveWorldD: string;
}

export interface ManualSvgController {
  nodes: Map<string, ParsedNode>;
  clusters: Map<string, ParsedCluster>;
  edges: Map<string, ParsedEdge>;
  applyOffsets: (
    offsets: Record<string, NodeOffset>,
    layoutMode: LayoutMode,
    edgeAdjustments?: Record<string, EdgeAdjustment>,
    selectedEdgeKey?: string | null,
    showInteractiveOverlay?: boolean
  ) => void;
  getClusterMemberNodeIds: (clusterKey: string) => string[];
  getEntityWorldBox: (entityId: string | null) => WorldBox | null;
  snapPointToEntityAnchor: (
    entityId: string | null,
    worldX: number,
    worldY: number
  ) => EdgeAnchorSpec | null;
  clientToWorld: (clientX: number, clientY: number) => { x: number; y: number } | null;
  getSerializedSvg: () => string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const IDENTITY_MAT: Mat2D = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

function domMatrixToMat2D(m: DOMMatrix | null | undefined): Mat2D {
  if (!m) return IDENTITY_MAT;
  return { a: m.a, b: m.b, c: m.c, d: m.d, e: m.e, f: m.f };
}

function applyPoint(m: Mat2D, x: number, y: number): { x: number; y: number } {
  return {
    x: m.a * x + m.c * y + m.e,
    y: m.b * x + m.d * y + m.f,
  };
}

function applyDelta(m: Mat2D, dx: number, dy: number): { dx: number; dy: number } {
  return {
    dx: m.a * dx + m.c * dy,
    dy: m.b * dx + m.d * dy,
  };
}

function getElementToRootMatrix(
  el: SVGGraphicsElement | null,
  rootInv: DOMMatrix | null
): DOMMatrix {
  if (!el || !rootInv) return new DOMMatrix();
  try {
    const ctm = el.getScreenCTM();
    if (!ctm) return new DOMMatrix();
    return rootInv.multiply(ctm);
  } catch {
    return new DOMMatrix();
  }
}

function safeInvert(m: DOMMatrix): Mat2D {
  try {
    return domMatrixToMat2D(m.inverse());
  } catch {
    return IDENTITY_MAT;
  }
}

function getWorldBBox(
  el: SVGGraphicsElement,
  rootInv: DOMMatrix | null
): { x: number; y: number; width: number; height: number; cx: number; cy: number } {
  const toRoot = domMatrixToMat2D(getElementToRootMatrix(el, rootInv));
  let bx = 0;
  let by = 0;
  let bw = 0;
  let bh = 0;
  try {
    const b = el.getBBox();
    bx = b.x;
    by = b.y;
    bw = b.width;
    bh = b.height;
  } catch {
    // ignore
  }
  const p1 = applyPoint(toRoot, bx, by);
  const p2 = applyPoint(toRoot, bx + bw, by + bh);
  const x = Math.min(p1.x, p2.x);
  const y = Math.min(p1.y, p2.y);
  const width = Math.abs(p2.x - p1.x);
  const height = Math.abs(p2.y - p1.y);
  return { x, y, width, height, cx: x + width / 2, cy: y + height / 2 };
}

function parseTranslate(transformAttr: string | null): { x: number; y: number } {
  if (!transformAttr) return { x: 0, y: 0 };
  const m = transformAttr.match(/translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/);
  if (!m) return { x: 0, y: 0 };
  return {
    x: parseFloat(m[1]) || 0,
    y: parseFloat(m[2] ?? '0') || 0,
  };
}

function setTranslate(el: Element, x: number, y: number) {
  const existing = el.getAttribute('transform') || '';
  if (/translate\([^)]*\)/.test(existing)) {
    el.setAttribute(
      'transform',
      existing.replace(/translate\([^)]*\)/, `translate(${x.toFixed(2)}, ${y.toFixed(2)})`)
    );
  } else {
    el.setAttribute('transform', `translate(${x.toFixed(2)}, ${y.toFixed(2)}) ${existing}`.trim());
  }
}

export function extractCanonicalNodeId(el: Element): string | null {
  const stamped = el.getAttribute('data-manual-node-key');
  if (stamped) return stamped;
  const dataId = el.getAttribute('data-id');
  if (dataId) return dataId;
  const rawId = el.getAttribute('id') || '';
  if (!rawId) return null;
  const fcMatch = rawId.match(/^flowchart-(.+?)-\d+$/);
  if (fcMatch) return fcMatch[1];
  const stateMatch = rawId.match(/^state-(.+?)-\d+$/);
  if (stateMatch) return stateMatch[1];
  return rawId;
}

export function extractCanonicalClusterKey(el: Element): string | null {
  return el.getAttribute('data-manual-cluster-key') || el.getAttribute('id') || null;
}

function parseSubgraphMembersFromCode(
  code: string,
  knownNodeIds: Set<string>
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  if (!code) return map;

  const body = code.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  const lines = body.split(/\r?\n/);
  const stack: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/%%.*$/, '').trim();
    if (!line) continue;

    const sgMatch = line.match(/^subgraph\s+([A-Za-z0-9_-]+)/i);
    if (sgMatch) {
      const sgId = sgMatch[1];
      stack.push(sgId);
      if (!map.has(sgId)) map.set(sgId, new Set());
      continue;
    }

    if (/^end\b/i.test(line)) {
      stack.pop();
      continue;
    }

    if (stack.length > 0) {
      if (/^(direction|style|classDef|class|linkStyle)\b/i.test(line)) continue;
      const withoutStrings = line
        .replace(/"(?:[^"\\]|\\.)*"/g, ' ')
        .replace(/'(?:[^'\\]|\\.)*'/g, ' ');
      const tokens = withoutStrings.match(/\b[A-Za-z_][A-Za-z0-9_-]*\b/g) || [];
      for (const tok of tokens) {
        if (knownNodeIds.has(tok)) {
          for (const activeSg of stack) {
            map.get(activeSg)?.add(tok);
          }
        }
      }
    }
  }

  return map;
}

function parseEdgeEndpointsFromMeta(
  pathEl: SVGPathElement,
  knownIds: string[]
): { sourceId: string | null; targetId: string | null } {
  const cls = pathEl.getAttribute('class') || '';
  const lsMatch = cls.match(/\bLS-([^\s]+)/);
  const leMatch = cls.match(/\bLE-([^\s]+)/);
  if (lsMatch && leMatch) {
    return { sourceId: lsMatch[1], targetId: leMatch[1] };
  }

  const rawId = pathEl.getAttribute('data-id') || pathEl.getAttribute('id') || '';
  // Strip leading L_ / L- and ALL trailing numeric index suffixes like _0 or _0_0
  const stripped = rawId.replace(/^L[_-]/, '').replace(/(?:[_-]\d+)+$/, '');
  if (stripped && knownIds.length > 0) {
    const sorted = [...knownIds].sort((a, b) => b.length - a.length);
    for (const src of sorted) {
      if (stripped.startsWith(`${src}_`) || stripped.startsWith(`${src}-`)) {
        const rest = stripped.slice(src.length + 1);
        if (knownIds.includes(rest)) {
          return { sourceId: src, targetId: rest };
        }
      }
    }
  }

  return { sourceId: null, targetId: null };
}

function getPathLocalPoints(pathEl: SVGPathElement): {
  start: { x: number; y: number };
  mid: { x: number; y: number };
  end: { x: number; y: number };
} {
  try {
    const total = pathEl.getTotalLength();
    if (total > 0) {
      const p0 = pathEl.getPointAtLength(0);
      const pm = pathEl.getPointAtLength(total / 2);
      const p1 = pathEl.getPointAtLength(total);
      return {
        start: { x: p0.x, y: p0.y },
        mid: { x: pm.x, y: pm.y },
        end: { x: p1.x, y: p1.y },
      };
    }
  } catch {
    // fallback
  }

  const d = pathEl.getAttribute('d') || '';
  const nums = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (nums.length >= 4) {
    const sx = nums[0];
    const sy = nums[1];
    const ex = nums[nums.length - 2];
    const ey = nums[nums.length - 1];
    return {
      start: { x: sx, y: sy },
      mid: { x: (sx + ex) / 2, y: (sy + ey) / 2 },
      end: { x: ex, y: ey },
    };
  }
  return { start: { x: 0, y: 0 }, mid: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
}

function findNearestNodeWorld(
  pt: { x: number; y: number },
  nodes: Map<string, ParsedNode>,
  excludeId?: string | null
): string | null {
  let bestId: string | null = null;
  let bestDist = Infinity;

  nodes.forEach((node) => {
    if (excludeId && node.id === excludeId) return;
    const halfW = node.worldW / 2;
    const halfH = node.worldH / 2;
    const dx = Math.max(0, Math.abs(pt.x - node.worldCx) - halfW);
    const dy = Math.max(0, Math.abs(pt.y - node.worldCy) - halfH);
    const dist = Math.hypot(dx, dy);
    if (dist < bestDist) {
      bestDist = dist;
      bestId = node.id;
    }
  });

  return bestDist < 140 ? bestId : null;
}

/**
 * Evaluate exact point on a node box perimeter from an AnchorSide + normalized t (0.08..0.92).
 */
function evalBoxAnchorSpec(
  box: { cx: number; cy: number; width: number; height: number },
  spec: EdgeAnchorSpec
): { x: number; y: number } {
  const t = Math.min(0.92, Math.max(0.08, spec.t));
  const left = box.cx - box.width / 2;
  const right = box.cx + box.width / 2;
  const top = box.cy - box.height / 2;
  const bottom = box.cy + box.height / 2;

  switch (spec.side) {
    case 'top':
      return { x: left + box.width * t, y: top };
    case 'bottom':
      return { x: left + box.width * t, y: bottom };
    case 'left':
      return { x: left, y: top + box.height * t };
    case 'right':
      return { x: right, y: top + box.height * t };
  }
}

/**
 * Project any world point (wx, wy) onto the closest point along the 4 edges of a box.
 */
function projectPointToBoxAnchor(
  box: { cx: number; cy: number; width: number; height: number },
  wx: number,
  wy: number
): EdgeAnchorSpec {
  const left = box.cx - box.width / 2;
  const right = box.cx + box.width / 2;
  const top = box.cy - box.height / 2;
  const bottom = box.cy + box.height / 2;

  const clampedX = Math.min(right, Math.max(left, wx));
  const clampedY = Math.min(bottom, Math.max(top, wy));

  const candidates: { side: AnchorSide; dist: number; t: number }[] = [
    {
      side: 'top',
      dist: Math.hypot(wx - clampedX, wy - top),
      t: box.width > 0 ? (clampedX - left) / box.width : 0.5,
    },
    {
      side: 'bottom',
      dist: Math.hypot(wx - clampedX, wy - bottom),
      t: box.width > 0 ? (clampedX - left) / box.width : 0.5,
    },
    {
      side: 'left',
      dist: Math.hypot(wx - left, wy - clampedY),
      t: box.height > 0 ? (clampedY - top) / box.height : 0.5,
    },
    {
      side: 'right',
      dist: Math.hypot(wx - right, wy - clampedY),
      t: box.height > 0 ? (clampedY - top) / box.height : 0.5,
    },
  ];

  candidates.sort((a, b) => a.dist - b.dist);
  return {
    side: candidates[0].side,
    t: Math.min(0.92, Math.max(0.08, Number(candidates[0].t.toFixed(3)))),
  };
}

/**
 * Compute flush border intersection facing target point (zero gap!).
 */
function getAutoBoxBorderAnchor(
  box: { cx: number; cy: number; width: number; height: number },
  target: { x: number; y: number }
): { x: number; y: number } {
  const dx = target.x - box.cx;
  const dy = target.y - box.cy;
  const hw = Math.max(4, box.width / 2);
  const hh = Math.max(4, box.height / 2);

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: box.cx, y: box.cy };
  }

  const scaleX = Math.abs(dx) > 0.001 ? hw / Math.abs(dx) : Infinity;
  const scaleY = Math.abs(dy) > 0.001 ? hh / Math.abs(dy) : Infinity;
  const t = Math.min(scaleX, scaleY);

  return {
    x: box.cx + dx * t,
    y: box.cy + dy * t,
  };
}

function pullBackEndpoint(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  pullPx: number
): { x: number; y: number } {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const len = Math.hypot(dx, dy);
  if (len <= pullPx + 6) return { x: toX, y: toY };
  return {
    x: toX - (dx / len) * pullPx,
    y: toY - (dy / len) * pullPx,
  };
}

function buildWorldAndLocalEdgePath(
  wsx: number,
  wsy: number,
  wex: number,
  wey: number,
  bendDx: number,
  bendDy: number,
  routeMode: 'curved' | 'orthogonal' | 'straight',
  worldToLocal: Mat2D,
  tipPullPx = 5
): {
  worldD: string;
  localD: string;
  worldMid: { x: number; y: number };
} {
  const chordMidX = (wsx + wex) / 2;
  const chordMidY = (wsy + wey) / 2;
  const hx = chordMidX + bendDx;
  const hy = chordMidY + bendDy;

  const hasBend = Math.abs(bendDx) > 0.5 || Math.abs(bendDy) > 0.5;
  const pS = applyPoint(worldToLocal, wsx, wsy);

  if (routeMode === 'straight' && !hasBend) {
    const tip = pullBackEndpoint(wsx, wsy, wex, wey, tipPullPx);
    const pE = applyPoint(worldToLocal, tip.x, tip.y);
    return {
      worldD: `M ${wsx.toFixed(1)},${wsy.toFixed(1)} L ${tip.x.toFixed(1)},${tip.y.toFixed(1)}`,
      localD: `M ${pS.x.toFixed(1)},${pS.y.toFixed(1)} L ${pE.x.toFixed(1)},${pE.y.toFixed(1)}`,
      worldMid: { x: hx, y: hy },
    };
  }

  if (routeMode === 'straight' && hasBend) {
    const tip = pullBackEndpoint(hx, hy, wex, wey, tipPullPx);
    const pH = applyPoint(worldToLocal, hx, hy);
    const pE = applyPoint(worldToLocal, tip.x, tip.y);
    return {
      worldD: `M ${wsx.toFixed(1)},${wsy.toFixed(1)} L ${hx.toFixed(1)},${hy.toFixed(1)} L ${tip.x.toFixed(1)},${tip.y.toFixed(1)}`,
      localD: `M ${pS.x.toFixed(1)},${pS.y.toFixed(1)} L ${pH.x.toFixed(1)},${pH.y.toFixed(1)} L ${pE.x.toFixed(1)},${pE.y.toFixed(1)}`,
      worldMid: { x: hx, y: hy },
    };
  }

  if (routeMode === 'orthogonal') {
    const dx = wex - wsx;
    const dy = wey - wsy;
    if (Math.abs(dx) >= Math.abs(dy)) {
      const midX = chordMidX + bendDx;
      const tip = pullBackEndpoint(midX, wey, wex, wey, tipPullPx);
      const wPts = [
        { x: wsx, y: wsy },
        { x: midX, y: wsy },
        { x: midX, y: wey },
        { x: tip.x, y: tip.y },
      ];
      const lPts = wPts.map((p) => applyPoint(worldToLocal, p.x, p.y));
      return {
        worldD: `M ${wPts[0].x.toFixed(1)},${wPts[0].y.toFixed(1)} L ${wPts[1].x.toFixed(1)},${wPts[1].y.toFixed(1)} L ${wPts[2].x.toFixed(1)},${wPts[2].y.toFixed(1)} L ${wPts[3].x.toFixed(1)},${wPts[3].y.toFixed(1)}`,
        localD: `M ${lPts[0].x.toFixed(1)},${lPts[0].y.toFixed(1)} L ${lPts[1].x.toFixed(1)},${lPts[1].y.toFixed(1)} L ${lPts[2].x.toFixed(1)},${lPts[2].y.toFixed(1)} L ${lPts[3].x.toFixed(1)},${lPts[3].y.toFixed(1)}`,
        worldMid: { x: midX, y: chordMidY },
      };
    } else {
      const midY = chordMidY + bendDy;
      const tip = pullBackEndpoint(wex, midY, wex, wey, tipPullPx);
      const wPts = [
        { x: wsx, y: wsy },
        { x: wsx, y: midY },
        { x: wex, y: midY },
        { x: tip.x, y: tip.y },
      ];
      const lPts = wPts.map((p) => applyPoint(worldToLocal, p.x, p.y));
      return {
        worldD: `M ${wPts[0].x.toFixed(1)},${wPts[0].y.toFixed(1)} L ${wPts[1].x.toFixed(1)},${wPts[1].y.toFixed(1)} L ${wPts[2].x.toFixed(1)},${wPts[2].y.toFixed(1)} L ${wPts[3].x.toFixed(1)},${wPts[3].y.toFixed(1)}`,
        localD: `M ${lPts[0].x.toFixed(1)},${lPts[0].y.toFixed(1)} L ${lPts[1].x.toFixed(1)},${lPts[1].y.toFixed(1)} L ${lPts[2].x.toFixed(1)},${lPts[2].y.toFixed(1)} L ${lPts[3].x.toFixed(1)},${lPts[3].y.toFixed(1)}`,
        worldMid: { x: chordMidX, y: midY },
      };
    }
  }

  // Curved mode:
  if (hasBend) {
    const wCx = 2 * hx - chordMidX;
    const wCy = 2 * hy - chordMidY;
    const tip = pullBackEndpoint(wCx, wCy, wex, wey, tipPullPx);
    const pC = applyPoint(worldToLocal, wCx, wCy);
    const pE = applyPoint(worldToLocal, tip.x, tip.y);
    return {
      worldD: `M ${wsx.toFixed(1)},${wsy.toFixed(1)} Q ${wCx.toFixed(1)},${wCy.toFixed(1)} ${tip.x.toFixed(1)},${tip.y.toFixed(1)}`,
      localD: `M ${pS.x.toFixed(1)},${pS.y.toFixed(1)} Q ${pC.x.toFixed(1)},${pC.y.toFixed(1)} ${pE.x.toFixed(1)},${pE.y.toFixed(1)}`,
      worldMid: { x: hx, y: hy },
    };
  }

  // Default smooth S-curve cubic bezier
  const dx = wex - wsx;
  const dy = wey - wsy;
  let wC1: { x: number; y: number };
  let wC2: { x: number; y: number };
  if (Math.abs(dx) >= Math.abs(dy)) {
    const cOff = Math.max(20, Math.min(110, Math.abs(dx) * 0.4));
    wC1 = { x: wsx + (dx >= 0 ? cOff : -cOff), y: wsy };
    wC2 = { x: wex - (dx >= 0 ? cOff : -cOff), y: wey };
  } else {
    const cOff = Math.max(20, Math.min(110, Math.abs(dy) * 0.4));
    wC1 = { x: wsx, y: wsy + (dy >= 0 ? cOff : -cOff) };
    wC2 = { x: wex, y: wey - (dy >= 0 ? cOff : -cOff) };
  }
  const tip = pullBackEndpoint(wC2.x, wC2.y, wex, wey, tipPullPx);
  const lC1 = applyPoint(worldToLocal, wC1.x, wC1.y);
  const lC2 = applyPoint(worldToLocal, wC2.x, wC2.y);
  const pE = applyPoint(worldToLocal, tip.x, tip.y);

  return {
    worldD: `M ${wsx.toFixed(1)},${wsy.toFixed(1)} C ${wC1.x.toFixed(1)},${wC1.y.toFixed(1)} ${wC2.x.toFixed(1)},${wC2.y.toFixed(1)} ${tip.x.toFixed(1)},${tip.y.toFixed(1)}`,
    localD: `M ${pS.x.toFixed(1)},${pS.y.toFixed(1)} C ${lC1.x.toFixed(1)},${lC1.y.toFixed(1)} ${lC2.x.toFixed(1)},${lC2.y.toFixed(1)} ${pE.x.toFixed(1)},${pE.y.toFixed(1)}`,
    worldMid: { x: chordMidX, y: chordMidY },
  };
}

export function createManualSvgController(
  svgRoot: SVGSVGElement,
  sourceCode = ''
): ManualSvgController {
  let rootInv: DOMMatrix | null = null;
  try {
    const rootCtm = svgRoot.getScreenCTM();
    if (rootCtm) rootInv = rootCtm.inverse();
  } catch {
    rootInv = null;
  }

  // 1. Parse all nodes using exact visible shape box in unified world space
  const nodes = new Map<string, ParsedNode>();
  const nodeEls = Array.from(svgRoot.querySelectorAll<SVGGElement>('g.node'));
  for (const el of nodeEls) {
    if (el.querySelector(':scope > g.clusters, :scope > g.nodes')) continue;
    const id = extractCanonicalNodeId(el);
    if (!id) continue;

    el.setAttribute('data-manual-node-key', id);
    const baseLocalPos = parseTranslate(el.getAttribute('transform'));

    // Prefer the exact visual border shape (rect/polygon/circle/ellipse/path.basic) for flush arrow attachment!
    const shapeEl = el.querySelector<SVGGraphicsElement>(
      ':scope > rect, :scope > polygon, :scope > circle, :scope > ellipse, :scope > path.basic, :scope > g.basic rect, :scope > g.basic path'
    );
    const worldBox = getWorldBBox(shapeEl || el, rootInv);
    const parentEl = el.parentElement as SVGGraphicsElement | null;
    const parentToWorld = getElementToRootMatrix(parentEl, rootInv);

    nodes.set(id, {
      id,
      el,
      baseLocalPos,
      worldCx: worldBox.cx,
      worldCy: worldBox.cy,
      worldW: worldBox.width || 120,
      worldH: worldBox.height || 54,
      worldToParent: safeInvert(parentToWorld),
    });
  }

  // 2. Parse all subgraphs / clusters
  const clusters = new Map<string, ParsedCluster>();
  const clusterEls = Array.from(svgRoot.querySelectorAll<SVGGElement>('g.cluster'));

  clusterEls.forEach((el, index) => {
    const rawId = el.getAttribute('data-id') || el.getAttribute('id') || `cluster_${index}`;
    const key = clusters.has(rawId) ? `${rawId}__${index}` : rawId;
    el.setAttribute('data-manual-cluster-key', key);

    const rectEl =
      el.querySelector<SVGRectElement>(':scope > rect') ||
      el.querySelector<SVGRectElement>('rect');
    const labelEl =
      el.querySelector<SVGGElement>(':scope > g.cluster-label') ||
      el.querySelector<SVGGElement>('g.cluster-label');

    const rectParent = (rectEl?.parentElement || el) as SVGGraphicsElement;
    const rectParentToWorld = getElementToRootMatrix(rectParent, rootInv);
    const worldToRectParent = safeInvert(rectParentToWorld);

    let localRx = 0;
    let localRy = 0;
    let localRw = 200;
    let localRh = 120;

    if (rectEl) {
      localRx = parseFloat(rectEl.getAttribute('x') || '0') || 0;
      localRy = parseFloat(rectEl.getAttribute('y') || '0') || 0;
      localRw = parseFloat(rectEl.getAttribute('width') || '0') || 0;
      localRh = parseFloat(rectEl.getAttribute('height') || '0') || 0;
    }

    const baseWorldRect = rectEl ? getWorldBBox(rectEl, rootInv) : getWorldBBox(el, rootInv);
    if (localRw <= 0 || localRh <= 0) {
      localRw = baseWorldRect.width;
      localRh = baseWorldRect.height;
    }

    const labelParent = (labelEl?.parentElement || el) as SVGGraphicsElement;
    const labelParentToWorld = getElementToRootMatrix(labelParent, rootInv);
    const worldToLabelParent = safeInvert(labelParentToWorld);
    const baseLocalLabelPos = labelEl ? parseTranslate(labelEl.getAttribute('transform')) : null;

    let labelWorldW = 120;
    let labelWorldH = 24;
    let labelCenterOffsetX = -60;
    let labelTopOffsetY = 8;

    if (labelEl) {
      const fo = labelEl.querySelector('foreignObject');
      const labelWorldBox = getWorldBBox(labelEl, rootInv);
      if (fo) {
        labelWorldW = parseFloat(fo.getAttribute('width') || '0') || labelWorldBox.width || 120;
        labelWorldH = parseFloat(fo.getAttribute('height') || '0') || labelWorldBox.height || 24;
      } else if (labelWorldBox.width > 0) {
        labelWorldW = labelWorldBox.width;
        labelWorldH = labelWorldBox.height;
      }
      if (baseLocalLabelPos) {
        const labelWorldOrigin = applyPoint(
          domMatrixToMat2D(labelParentToWorld),
          baseLocalLabelPos.x,
          baseLocalLabelPos.y
        );
        labelCenterOffsetX = labelWorldOrigin.x - (baseWorldRect.x + baseWorldRect.width / 2);
        labelTopOffsetY = labelWorldOrigin.y - baseWorldRect.y;
      }
    }

    clusters.set(key, {
      key,
      id: rawId,
      el,
      rectEl,
      labelEl,
      baseWorldRect: {
        x: baseWorldRect.x,
        y: baseWorldRect.y,
        width: baseWorldRect.width,
        height: baseWorldRect.height,
      },
      baseLocalRect: {
        x: localRx,
        y: localRy,
        width: localRw,
        height: localRh,
      },
      baseLocalLabelPos,
      labelWorldW,
      labelWorldH,
      labelCenterOffsetX,
      labelTopOffsetY,
      worldToRectParent,
      worldToLabelParent,
      padding: { left: 24, right: 24, top: Math.max(38, labelWorldH + 16), bottom: 24 },
      memberNodeIds: [],
      childClusterKeys: [],
    });
  });

  // 3. Assign member nodes accurately (code parsing + unified world containment)
  const clustersByArea = Array.from(clusters.values()).sort(
    (a, b) =>
      a.baseWorldRect.width * a.baseWorldRect.height -
      b.baseWorldRect.width * b.baseWorldRect.height
  );

  const knownNodeSet = new Set(nodes.keys());
  const codeMembersMap = parseSubgraphMembersFromCode(sourceCode, knownNodeSet);

  for (const cl of clustersByArea) {
    const fromCode = codeMembersMap.get(cl.id);
    if (fromCode && fromCode.size > 0) {
      cl.memberNodeIds = Array.from(fromCode).filter((nid) => nodes.has(nid));
      continue;
    }

    const r = cl.baseWorldRect;
    const margin = 6;
    nodes.forEach((node) => {
      if (
        node.worldCx >= r.x - margin &&
        node.worldCx <= r.x + r.width + margin &&
        node.worldCy >= r.y - margin &&
        node.worldCy <= r.y + r.height + margin
      ) {
        cl.memberNodeIds.push(node.id);
      }
    });
  }

  for (let i = 0; i < clustersByArea.length; i++) {
    const inner = clustersByArea[i];
    const icx = inner.baseWorldRect.x + inner.baseWorldRect.width / 2;
    const icy = inner.baseWorldRect.y + inner.baseWorldRect.height / 2;
    for (let j = i + 1; j < clustersByArea.length; j++) {
      const outer = clustersByArea[j];
      const r = outer.baseWorldRect;
      if (
        icx >= r.x &&
        icx <= r.x + r.width &&
        icy >= r.y &&
        icy <= r.y + r.height &&
        inner.baseWorldRect.width < r.width &&
        inner.baseWorldRect.height < r.height
      ) {
        outer.childClusterKeys.push(inner.key);
        break;
      }
    }
  }

  for (const cl of clustersByArea) {
    if (cl.memberNodeIds.length === 0) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const nid of cl.memberNodeIds) {
      const n = nodes.get(nid);
      if (!n) continue;
      minX = Math.min(minX, n.worldCx - n.worldW / 2);
      maxX = Math.max(maxX, n.worldCx + n.worldW / 2);
      minY = Math.min(minY, n.worldCy - n.worldH / 2);
      maxY = Math.max(maxY, n.worldCy + n.worldH / 2);
    }

    if (Number.isFinite(minX)) {
      cl.padding = {
        left: Math.max(18, Math.min(64, minX - cl.baseWorldRect.x)),
        right: Math.max(18, Math.min(64, cl.baseWorldRect.x + cl.baseWorldRect.width - maxX)),
        top: Math.max(cl.labelWorldH + 14, Math.min(76, minY - cl.baseWorldRect.y)),
        bottom: Math.max(18, Math.min(64, cl.baseWorldRect.y + cl.baseWorldRect.height - maxY)),
      };
    }
  }

  // 4. Parse all edges & pair edgeLabels accurately in unified world space
  const knownEntityIds = [
    ...Array.from(nodes.keys()),
    ...Array.from(clusters.values()).map((c) => c.id),
  ];

  const edgePaths = Array.from(
    new Set(
      Array.from(
        svgRoot.querySelectorAll<SVGPathElement>(
          'path.flowchart-link, path.edge-thickness-normal, path.edge-thickness-thick, g.edgePaths path'
        )
      )
    )
  );

  const rawLabelEls = Array.from(svgRoot.querySelectorAll<SVGGElement>('g.edgeLabel'));
  const availableLabels = rawLabelEls.map((el) => {
    const parentEl = el.parentElement as SVGGraphicsElement | null;
    const parentToWorld = getElementToRootMatrix(parentEl, rootInv);
    const localPos = parseTranslate(el.getAttribute('transform'));
    const worldPos = applyPoint(domMatrixToMat2D(parentToWorld), localPos.x, localPos.y);
    const hasText = Boolean((el.textContent || '').trim());
    return {
      el,
      localPos,
      worldPos,
      worldToLabelParent: safeInvert(parentToWorld),
      hasText,
      used: false,
    };
  });

  const edges = new Map<string, ParsedEdge>();
  const pairCounter = new Map<string, number>();

  edgePaths.forEach((pathEl, idx) => {
    const origD = pathEl.getAttribute('d') || '';
    const origTransform = pathEl.getAttribute('transform') || '';
    const pathParent = pathEl.parentElement as SVGGraphicsElement | null;
    const pathParentToWorldMat = getElementToRootMatrix(pathParent, rootInv);
    const pathParentToWorld = domMatrixToMat2D(pathParentToWorldMat);
    const worldToPathParent = safeInvert(pathParentToWorldMat);

    const localPts = getPathLocalPoints(pathEl);
    const origWorldStart = applyPoint(pathParentToWorld, localPts.start.x, localPts.start.y);
    const origWorldMid = applyPoint(pathParentToWorld, localPts.mid.x, localPts.mid.y);
    const origWorldEnd = applyPoint(pathParentToWorld, localPts.end.x, localPts.end.y);

    let { sourceId, targetId } = parseEdgeEndpointsFromMeta(pathEl, knownEntityIds);
    if (!sourceId) sourceId = findNearestNodeWorld(origWorldStart, nodes);
    if (!targetId) targetId = findNearestNodeWorld(origWorldEnd, nodes, sourceId);

    const pairBase =
      sourceId && targetId ? `E:${sourceId}->${targetId}` : `E:idx_${idx}`;
    const count = pairCounter.get(pairBase) || 0;
    pairCounter.set(pairBase, count + 1);
    const key = `${pairBase}#${count}`;
    pathEl.setAttribute('data-manual-edge-key', key);

    let matchedLabel: (typeof availableLabels)[number] | null = null;
    let bestLabelDist = 90;
    for (const lbl of availableLabels) {
      if (lbl.used || !lbl.hasText) continue;
      const dist = Math.hypot(lbl.worldPos.x - origWorldMid.x, lbl.worldPos.y - origWorldMid.y);
      if (dist < bestLabelDist) {
        bestLabelDist = dist;
        matchedLabel = lbl;
      }
    }
    if (matchedLabel) matchedLabel.used = true;

    edges.set(key, {
      key,
      pathEl,
      sourceId,
      targetId,
      origWorldStart,
      origWorldMid,
      origWorldEnd,
      origD,
      origTransform,
      worldToPathParent,
      pathParentToWorld,
      labelEl: matchedLabel?.el || null,
      origLocalLabelPos: matchedLabel?.localPos || null,
      origWorldLabelPos: matchedLabel?.worldPos || null,
      worldToLabelParent: matchedLabel?.worldToLabelParent || null,
      liveWorldStart: { ...origWorldStart },
      liveWorldMid: { ...origWorldMid },
      liveWorldEnd: { ...origWorldEnd },
      liveWorldD: '',
    });
  });

  // Live entity world box cache (for snapping & handle dragging)
  let latestNodeBoxes = new Map<string, WorldBox>();
  let latestClusterBoxes = new Map<string, WorldBox>();

  // Elevate every <g class="edgePaths"> and <g class="edgeLabels"> ABOVE <g class="nodes">
  // inside svgRoot and every <g class="root"> so arrows, arrowheads, and labels are NEVER
  // hidden behind subgraph boxes or node fills!
  const containersToElevate: Element[] = [
    svgRoot,
    ...Array.from(svgRoot.querySelectorAll<SVGGElement>('g.root')),
  ];
  for (const containerEl of containersToElevate) {
    const edgePathsG = containerEl.querySelector<SVGGElement>(':scope > g.edgePaths');
    const edgeLabelsG = containerEl.querySelector<SVGGElement>(':scope > g.edgeLabels');
    if (edgePathsG) containerEl.appendChild(edgePathsG);
    if (edgeLabelsG) containerEl.appendChild(edgeLabelsG);
  }

  // Create dedicated SVG overlay group for interactive edge hit targets & drag handles
  const overlayGroup = document.createElementNS(SVG_NS, 'g');
  overlayGroup.setAttribute('class', 'manual-edge-overlay');
  svgRoot.appendChild(overlayGroup);

  const getEntityWorldBox = (entityId: string | null): WorldBox | null => {
    if (!entityId) return null;
    return latestNodeBoxes.get(entityId) || latestClusterBoxes.get(entityId) || null;
  };

  const renderInteractiveEdgeOverlay = (
    selectedEdgeKey: string | null,
    showInteractiveOverlay: boolean
  ) => {
    overlayGroup.innerHTML = '';
    if (!showInteractiveOverlay) return;

    // 1. Wide invisible hit paths for every arrow so clicking ANY arrow is effortless
    edges.forEach((edge) => {
      const hitPath = document.createElementNS(SVG_NS, 'path');
      const d =
        edge.liveWorldD ||
        `M ${edge.liveWorldStart.x.toFixed(1)},${edge.liveWorldStart.y.toFixed(1)} Q ${edge.liveWorldMid.x.toFixed(1)},${edge.liveWorldMid.y.toFixed(1)} ${edge.liveWorldEnd.x.toFixed(1)},${edge.liveWorldEnd.y.toFixed(1)}`;
      hitPath.setAttribute('d', d);
      hitPath.setAttribute('fill', 'none');
      hitPath.setAttribute('stroke', 'transparent');
      hitPath.setAttribute('stroke-width', '14');
      hitPath.setAttribute('data-edge-hit-key', edge.key);
      hitPath.setAttribute('class', 'manual-edge-hit-path');
      overlayGroup.appendChild(hitPath);
    });

    // 2. If an arrow is selected, render highlight + 3 draggable handles (Start, Mid/Bend, End)!
    if (selectedEdgeKey) {
      const sel = edges.get(selectedEdgeKey);
      if (sel) {
        if (sel.liveWorldD) {
          const glow = document.createElementNS(SVG_NS, 'path');
          glow.setAttribute('d', sel.liveWorldD);
          glow.setAttribute('fill', 'none');
          glow.setAttribute('stroke', '#e0095f');
          glow.setAttribute('stroke-width', '3.5');
          glow.setAttribute('stroke-opacity', '0.35');
          glow.setAttribute('pointer-events', 'none');
          overlayGroup.appendChild(glow);
        }

        // Helper to draw crisp handle
        const addHandle = (
          x: number,
          y: number,
          kind: 'start' | 'bend' | 'end',
          titleText: string
        ) => {
          const g = document.createElementNS(SVG_NS, 'g');
          g.setAttribute('transform', `translate(${x.toFixed(1)}, ${y.toFixed(1)})`);
          g.setAttribute('data-edge-handle-key', sel.key);
          g.setAttribute('data-edge-handle-kind', kind);
          g.setAttribute('class', `manual-edge-handle manual-edge-handle-${kind}`);

          const hitCircle = document.createElementNS(SVG_NS, 'circle');
          hitCircle.setAttribute('r', '13');
          hitCircle.setAttribute('fill', 'transparent');
          g.appendChild(hitCircle);

          const circle = document.createElementNS(SVG_NS, 'circle');
          if (kind === 'bend') {
            circle.setAttribute('r', '7');
            circle.setAttribute('fill', '#e0095f');
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '2.2');
          } else {
            circle.setAttribute('r', '6');
            circle.setAttribute('fill', '#ffffff');
            circle.setAttribute('stroke', '#0d9488');
            circle.setAttribute('stroke-width', '2.5');
          }
          g.appendChild(circle);

          const title = document.createElementNS(SVG_NS, 'title');
          title.textContent = titleText;
          g.appendChild(title);

          overlayGroup.appendChild(g);
        };

        addHandle(
          sel.liveWorldStart.x,
          sel.liveWorldStart.y,
          'start',
          'Drag along source node border to move arrow start'
        );
        addHandle(
          sel.liveWorldMid.x,
          sel.liveWorldMid.y,
          'bend',
          'Drag to bend or reposition arrow path'
        );
        addHandle(
          sel.liveWorldEnd.x,
          sel.liveWorldEnd.y,
          'end',
          'Drag along target node border to move arrow tip'
        );
      }
    }
  };

  const applyOffsets = (
    offsets: Record<string, NodeOffset>,
    layoutMode: LayoutMode,
    edgeAdjustments: Record<string, EdgeAdjustment> = {},
    selectedEdgeKey: string | null = null,
    showInteractiveOverlay = false
  ) => {
    // 1. Move nodes
    const currentNodeBoxes = new Map<string, WorldBox>();

    nodes.forEach((node) => {
      const off = offsets[node.id];
      const dx = off?.dx || 0;
      const dy = off?.dy || 0;
      const localDelta = applyDelta(node.worldToParent, dx, dy);
      setTranslate(
        node.el,
        node.baseLocalPos.x + localDelta.dx,
        node.baseLocalPos.y + localDelta.dy
      );

      currentNodeBoxes.set(node.id, {
        cx: node.worldCx + dx,
        cy: node.worldCy + dy,
        width: node.worldW,
        height: node.worldH,
        dx,
        dy,
      });
    });

    // 2. Dynamically auto-fit subgraphs (innermost -> outermost)
    const currentClusterWorldRects = new Map<
      string,
      { x: number; y: number; width: number; height: number }
    >();
    const currentClusterBoxes = new Map<string, WorldBox>();

    for (const cl of clustersByArea) {
      if (!cl.rectEl) continue;

      const hasMoved =
        cl.memberNodeIds.some((nid) => {
          const o = offsets[nid];
          return Boolean(o && (o.dx !== 0 || o.dy !== 0));
        }) ||
        cl.childClusterKeys.some((ck) => {
          const cr = currentClusterWorldRects.get(ck);
          const child = clusters.get(ck);
          return Boolean(
            cr &&
              child &&
              (Math.abs(cr.x - child.baseWorldRect.x) > 0.1 ||
                Math.abs(cr.y - child.baseWorldRect.y) > 0.1 ||
                Math.abs(cr.width - child.baseWorldRect.width) > 0.1 ||
                Math.abs(cr.height - child.baseWorldRect.height) > 0.1)
          );
        }) ||
        Boolean(offsets[`__cluster__:${cl.key}`]);

      if (!hasMoved) {
        cl.rectEl.setAttribute('x', cl.baseLocalRect.x.toFixed(2));
        cl.rectEl.setAttribute('y', cl.baseLocalRect.y.toFixed(2));
        cl.rectEl.setAttribute('width', cl.baseLocalRect.width.toFixed(2));
        cl.rectEl.setAttribute('height', cl.baseLocalRect.height.toFixed(2));
        if (cl.labelEl && cl.baseLocalLabelPos) {
          setTranslate(cl.labelEl, cl.baseLocalLabelPos.x, cl.baseLocalLabelPos.y);
        }
        currentClusterWorldRects.set(cl.key, { ...cl.baseWorldRect });
        currentClusterBoxes.set(cl.id, {
          cx: cl.baseWorldRect.x + cl.baseWorldRect.width / 2,
          cy: cl.baseWorldRect.y + cl.baseWorldRect.height / 2,
          width: cl.baseWorldRect.width,
          height: cl.baseWorldRect.height,
          dx: 0,
          dy: 0,
        });
        continue;
      }

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const nid of cl.memberNodeIds) {
        const box = currentNodeBoxes.get(nid);
        if (!box) continue;
        minX = Math.min(minX, box.cx - box.width / 2);
        maxX = Math.max(maxX, box.cx + box.width / 2);
        minY = Math.min(minY, box.cy - box.height / 2);
        maxY = Math.max(maxY, box.cy + box.height / 2);
      }

      for (const childKey of cl.childClusterKeys) {
        const cr = currentClusterWorldRects.get(childKey);
        if (!cr) continue;
        minX = Math.min(minX, cr.x);
        maxX = Math.max(maxX, cr.x + cr.width);
        minY = Math.min(minY, cr.y);
        maxY = Math.max(maxY, cr.y + cr.height);
      }

      if (!Number.isFinite(minX)) {
        const cOff = offsets[`__cluster__:${cl.key}`] || { dx: 0, dy: 0 };
        const worldRect = {
          x: cl.baseWorldRect.x + cOff.dx,
          y: cl.baseWorldRect.y + cOff.dy,
          width: cl.baseWorldRect.width,
          height: cl.baseWorldRect.height,
        };
        const localTopLeft = applyPoint(cl.worldToRectParent, worldRect.x, worldRect.y);
        cl.rectEl.setAttribute('x', localTopLeft.x.toFixed(2));
        cl.rectEl.setAttribute('y', localTopLeft.y.toFixed(2));
        cl.rectEl.setAttribute('width', worldRect.width.toFixed(2));
        cl.rectEl.setAttribute('height', worldRect.height.toFixed(2));
        if (cl.labelEl && cl.baseLocalLabelPos) {
          const ld = applyDelta(cl.worldToLabelParent, cOff.dx, cOff.dy);
          setTranslate(cl.labelEl, cl.baseLocalLabelPos.x + ld.dx, cl.baseLocalLabelPos.y + ld.dy);
        }
        currentClusterWorldRects.set(cl.key, worldRect);
        currentClusterBoxes.set(cl.id, {
          cx: worldRect.x + worldRect.width / 2,
          cy: worldRect.y + worldRect.height / 2,
          width: worldRect.width,
          height: worldRect.height,
          dx: cOff.dx,
          dy: cOff.dy,
        });
        continue;
      }

      let newWorldX = minX - cl.padding.left;
      const newWorldY = minY - cl.padding.top;
      let newWorldW = maxX - minX + cl.padding.left + cl.padding.right;
      const newWorldH = maxY - minY + cl.padding.top + cl.padding.bottom;

      const minTitleWidth = cl.labelWorldW + 28;
      if (newWorldW < minTitleWidth) {
        const extra = (minTitleWidth - newWorldW) / 2;
        newWorldX -= extra;
        newWorldW = minTitleWidth;
      }

      const localTopLeft = applyPoint(cl.worldToRectParent, newWorldX, newWorldY);
      const localSize = applyDelta(cl.worldToRectParent, newWorldW, newWorldH);

      cl.rectEl.setAttribute('x', localTopLeft.x.toFixed(2));
      cl.rectEl.setAttribute('y', localTopLeft.y.toFixed(2));
      cl.rectEl.setAttribute('width', Math.abs(localSize.dx).toFixed(2));
      cl.rectEl.setAttribute('height', Math.abs(localSize.dy).toFixed(2));

      if (cl.labelEl) {
        const labelWorldX = newWorldX + newWorldW / 2 + cl.labelCenterOffsetX;
        const labelWorldY = newWorldY + cl.labelTopOffsetY;
        const localLabelPos = applyPoint(cl.worldToLabelParent, labelWorldX, labelWorldY);
        setTranslate(cl.labelEl, localLabelPos.x, localLabelPos.y);
      }

      currentClusterWorldRects.set(cl.key, {
        x: newWorldX,
        y: newWorldY,
        width: newWorldW,
        height: newWorldH,
      });
      currentClusterBoxes.set(cl.id, {
        cx: newWorldX + newWorldW / 2,
        cy: newWorldY + newWorldH / 2,
        width: newWorldW,
        height: newWorldH,
        dx: newWorldX - cl.baseWorldRect.x,
        dy: newWorldY - cl.baseWorldRect.y,
      });
    }

    latestNodeBoxes = currentNodeBoxes;
    latestClusterBoxes = currentClusterBoxes;

    // 3. Route every edge cleanly so arrows NEVER disconnect AND respect manual arrow adjustments!
    edges.forEach((edge) => {
      const adj = edgeAdjustments[edge.key];
      const hasAdj = Boolean(
        adj &&
          (Math.abs(adj.bendDx) > 0.5 ||
            Math.abs(adj.bendDy) > 0.5 ||
            adj.startAnchor ||
            adj.endAnchor ||
            (adj.routeStyle && adj.routeStyle !== 'auto'))
      );

      const srcBox = getEntityWorldBox(edge.sourceId);
      const tgtBox = getEntityWorldBox(edge.targetId);

      const srcDx = srcBox?.dx || 0;
      const srcDy = srcBox?.dy || 0;
      const tgtDx = tgtBox?.dx || 0;
      const tgtDy = tgtBox?.dy || 0;

      const srcMoved = Math.abs(srcDx) > 0.01 || Math.abs(srcDy) > 0.01;
      const tgtMoved = Math.abs(tgtDx) > 0.01 || Math.abs(tgtDy) > 0.01;

      // Case A: Neither endpoint moved and no manual arrow tweak -> keep exact original Mermaid curve
      if (!srcMoved && !tgtMoved && !hasAdj) {
        edge.pathEl.setAttribute('d', edge.origD);
        if (edge.origTransform) {
          edge.pathEl.setAttribute('transform', edge.origTransform);
        } else {
          edge.pathEl.removeAttribute('transform');
        }
        if (edge.labelEl && edge.origLocalLabelPos) {
          setTranslate(edge.labelEl, edge.origLocalLabelPos.x, edge.origLocalLabelPos.y);
        }
        edge.liveWorldStart = { ...edge.origWorldStart };
        edge.liveWorldMid = { ...edge.origWorldMid };
        edge.liveWorldEnd = { ...edge.origWorldEnd };
        edge.liveWorldD = '';
        return;
      }

      // Case B: Whole subgraph dragged rigidly together (same delta) AND no custom arrow bend/anchor
      if (
        srcMoved &&
        tgtMoved &&
        !hasAdj &&
        Math.abs(srcDx - tgtDx) < 0.05 &&
        Math.abs(srcDy - tgtDy) < 0.05
      ) {
        const localShift = applyDelta(edge.worldToPathParent, srcDx, srcDy);
        edge.pathEl.setAttribute('d', edge.origD);
        setTranslate(edge.pathEl, localShift.dx, localShift.dy);
        if (edge.labelEl && edge.origLocalLabelPos && edge.worldToLabelParent) {
          const lblShift = applyDelta(edge.worldToLabelParent, srcDx, srcDy);
          setTranslate(
            edge.labelEl,
            edge.origLocalLabelPos.x + lblShift.dx,
            edge.origLocalLabelPos.y + lblShift.dy
          );
        }
        edge.liveWorldStart = {
          x: edge.origWorldStart.x + srcDx,
          y: edge.origWorldStart.y + srcDy,
        };
        edge.liveWorldMid = {
          x: edge.origWorldMid.x + srcDx,
          y: edge.origWorldMid.y + srcDy,
        };
        edge.liveWorldEnd = {
          x: edge.origWorldEnd.x + tgtDx,
          y: edge.origWorldEnd.y + tgtDy,
        };
        edge.liveWorldD = '';
        return;
      }

      // Case C: One or both endpoints moved differently, OR user manually adjusted the arrow!
      if (edge.origTransform) {
        edge.pathEl.setAttribute('transform', edge.origTransform);
      } else {
        edge.pathEl.removeAttribute('transform');
      }

      const bendDx = adj?.bendDx || 0;
      const bendDy = adj?.bendDy || 0;

      // Determine exact flush world start & end points on node perimeters
      let wsx = edge.origWorldStart.x + srcDx;
      let wsy = edge.origWorldStart.y + srcDy;
      let wex = edge.origWorldEnd.x + tgtDx;
      let wey = edge.origWorldEnd.y + tgtDy;

      if (srcBox && tgtBox) {
        // Compute rough aiming point (toward bend handle if user bent the arrow!)
        const aimMid = {
          x: (srcBox.cx + tgtBox.cx) / 2 + bendDx,
          y: (srcBox.cy + tgtBox.cy) / 2 + bendDy,
        };
        const startPt = adj?.startAnchor
          ? evalBoxAnchorSpec(srcBox, adj.startAnchor)
          : getAutoBoxBorderAnchor(srcBox, Math.hypot(bendDx, bendDy) > 10 ? aimMid : { x: tgtBox.cx, y: tgtBox.cy });
        const endPt = adj?.endAnchor
          ? evalBoxAnchorSpec(tgtBox, adj.endAnchor)
          : getAutoBoxBorderAnchor(tgtBox, Math.hypot(bendDx, bendDy) > 10 ? aimMid : { x: srcBox.cx, y: srcBox.cy });
        wsx = startPt.x;
        wsy = startPt.y;
        wex = endPt.x;
        wey = endPt.y;
      }

      const routeMode: 'curved' | 'orthogonal' | 'straight' =
        adj?.routeStyle && adj.routeStyle !== 'auto'
          ? adj.routeStyle
          : layoutMode === 'orthogonal'
          ? 'orthogonal'
          : layoutMode === 'balanced'
          ? 'straight'
          : 'curved';

      const hasMarkerEnd = Boolean(
        edge.pathEl.getAttribute('marker-end') || edge.pathEl.style.markerEnd
      );
      const built = buildWorldAndLocalEdgePath(
        wsx,
        wsy,
        wex,
        wey,
        bendDx,
        bendDy,
        routeMode,
        edge.worldToPathParent,
        hasMarkerEnd ? 5.5 : 0
      );

      edge.pathEl.setAttribute('d', built.localD);
      edge.liveWorldStart = { x: wsx, y: wsy };
      edge.liveWorldMid = built.worldMid;
      edge.liveWorldEnd = { x: wex, y: wey };
      edge.liveWorldD = built.worldD;

      if (edge.labelEl && edge.worldToLabelParent) {
        const localMid = applyPoint(edge.worldToLabelParent, built.worldMid.x, built.worldMid.y);
        setTranslate(edge.labelEl, localMid.x, localMid.y);
      }
    });

    // 4. Refresh interactive edge overlay (hit paths + selected arrow handles)
    renderInteractiveEdgeOverlay(selectedEdgeKey, showInteractiveOverlay);
  };

  const getClusterMemberNodeIds = (clusterKey: string): string[] => {
    return clusters.get(clusterKey)?.memberNodeIds || [];
  };

  const snapPointToEntityAnchor = (
    entityId: string | null,
    worldX: number,
    worldY: number
  ): EdgeAnchorSpec | null => {
    const box = getEntityWorldBox(entityId);
    if (!box) return null;
    return projectPointToBoxAnchor(box, worldX, worldY);
  };

  const clientToWorld = (clientX: number, clientY: number): { x: number; y: number } | null => {
    try {
      const ctm = svgRoot.getScreenCTM();
      if (!ctm) return null;
      const pt = svgRoot.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      const res = pt.matrixTransform(ctm.inverse());
      return { x: res.x, y: res.y };
    } catch {
      return null;
    }
  };

  const getSerializedSvg = () => {
    const clone = svgRoot.cloneNode(true) as SVGSVGElement;
    // Strip interactive drag handles so exported SVG/PNG/PDF is 100% clean!
    clone.querySelectorAll('.manual-edge-overlay').forEach((n) => n.remove());
    try {
      const box = svgRoot.getBBox();
      if (box.width > 0 && box.height > 0) {
        const pad = 24;
        clone.setAttribute(
          'viewBox',
          `${(box.x - pad).toFixed(1)} ${(box.y - pad).toFixed(1)} ${(box.width + pad * 2).toFixed(1)} ${(box.height + pad * 2).toFixed(1)}`
        );
        clone.setAttribute('width', `${Math.ceil(box.width + pad * 2)}`);
        clone.setAttribute('height', `${Math.ceil(box.height + pad * 2)}`);
      }
    } catch {
      // keep existing viewBox
    }
    return new XMLSerializer().serializeToString(clone);
  };

  return {
    nodes,
    clusters,
    edges,
    applyOffsets,
    getClusterMemberNodeIds,
    getEntityWorldBox,
    snapPointToEntityAnchor,
    clientToWorld,
    getSerializedSvg,
  };
}
