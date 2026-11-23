import type {
  CurveType,
  DiagramDirection,
  DiagramLook,
  LayoutEngine,
  LayoutMode,
  MermaidFrontmatterConfig,
  ThemeVariablesConfig,
} from '../types';

export interface ThemePresetDefinition {
  id: string;
  label: string;
  mermaidTheme: 'base' | 'default' | 'neutral' | 'dark' | 'forest';
  swatches: [string, string, string];
  isDark?: boolean;
  variables?: ThemeVariablesConfig;
}

export const THEME_PRESETS: ThemePresetDefinition[] = [
  {
    id: 'base',
    label: 'Base theme',
    mermaidTheme: 'base',
    swatches: ['#ffffff', '#333333', '#e2e8f0'],
    variables: {
      fontFamily: "''",
      fontSize: '16px',
      primaryColor: '#ffffff',
      primaryTextColor: '#111111',
      primaryBorderColor: '#333333',
      lineColor: '#333333',
    },
  },
  {
    id: 'neo',
    label: 'Mermaid Neo',
    mermaidTheme: 'base',
    swatches: ['#fdf2f8', '#e0095f', '#1e1b2e'],
    variables: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '15px',
      primaryColor: '#ffffff',
      primaryTextColor: '#1e1b2e',
      primaryBorderColor: '#e0095f',
      lineColor: '#64748b',
      secondaryColor: '#fdf2f8',
      tertiaryColor: '#f8fafc',
      clusterBkg: '#faf5ff',
      clusterBorder: '#e2e8f0',
    },
  },
  {
    id: 'default',
    label: 'Classic Indigo',
    mermaidTheme: 'default',
    swatches: ['#ECECFF', '#9370DB', '#333333'],
  },
  {
    id: 'neutral',
    label: 'Neutral Pro',
    mermaidTheme: 'neutral',
    swatches: ['#f4f4f5', '#52525b', '#18181b'],
  },
  {
    id: 'ocean',
    label: 'Oceanic Blue',
    mermaidTheme: 'base',
    swatches: ['#eff6ff', '#2563eb', '#0f172a'],
    variables: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '15px',
      primaryColor: '#eff6ff',
      primaryTextColor: '#0f172a',
      primaryBorderColor: '#2563eb',
      lineColor: '#3b82f6',
      secondaryColor: '#dbeafe',
      tertiaryColor: '#f0f9ff',
      clusterBkg: '#f8fafc',
      clusterBorder: '#93c5fd',
    },
  },
  {
    id: 'forest',
    label: 'Forest Emerald',
    mermaidTheme: 'forest',
    swatches: ['#ecfdf5', '#15803d', '#14532d'],
  },
  {
    id: 'rose',
    label: 'Rose Studio',
    mermaidTheme: 'base',
    swatches: ['#fff1f2', '#e11d48', '#4c0519'],
    variables: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '15px',
      primaryColor: '#fff1f2',
      primaryTextColor: '#4c0519',
      primaryBorderColor: '#e11d48',
      lineColor: '#fb7185',
      secondaryColor: '#ffe4e6',
      tertiaryColor: '#fff5f5',
      clusterBkg: '#fff8f9',
      clusterBorder: '#fda4af',
    },
  },
  {
    id: 'dark',
    label: 'Dark Slate',
    mermaidTheme: 'dark',
    swatches: ['#1e293b', '#38bdf8', '#f8fafc'],
    isDark: true,
  },
  {
    id: 'midnight',
    label: 'Midnight Neon',
    mermaidTheme: 'base',
    swatches: ['#131629', '#a855f7', '#e2e8f0'],
    isDark: true,
    variables: {
      fontFamily: 'Inter, sans-serif',
      fontSize: '15px',
      primaryColor: '#1e1b4b',
      primaryTextColor: '#f8fafc',
      primaryBorderColor: '#818cf8',
      lineColor: '#94a3b8',
      secondaryColor: '#312e81',
      tertiaryColor: '#0f172a',
      clusterBkg: '#111827',
      clusterBorder: '#4f46e5',
    },
  },
];

export const DEFAULT_CONFIG: MermaidFrontmatterConfig = {
  theme: 'base',
  look: 'classic',
  layout: 'dagre',
  layoutMode: 'hierarchical',
  themeVariables: {
    fontFamily: '',
    fontSize: '16px',
    primaryColor: '#ffffff',
    primaryTextColor: '#111111',
    primaryBorderColor: '#333333',
    lineColor: '#333333',
  },
  flowchart: {
    nodeSpacing: 30,
    rankSpacing: 35,
    curve: 'basis',
    padding: 14,
    layout: 'dagre',
  },
};

export interface LayoutModeOption {
  id: LayoutMode;
  label: string;
  description: string;
}

export const LAYOUT_MODE_OPTIONS: LayoutModeOption[] = [
  {
    id: 'hierarchical',
    label: 'Hierarchical',
    description: 'Arranges nodes in ordered levels following their hierarchy.',
  },
  {
    id: 'adaptive',
    label: 'Adaptive',
    description: 'Rearranges nodes based on their context to keep the diagram organized.',
  },
  {
    id: 'orthogonal',
    label: 'Orthogonal',
    description: 'Right angles that untangle loops. Best for cycles and hub-and-spoke diagrams.',
  },
  {
    id: 'balanced',
    label: 'Balanced',
    description: 'Spaces nodes evenly on a grid. Best for dense, connected diagrams.',
  },
];

export function applyLayoutModeToConfig(
  cfg: MermaidFrontmatterConfig,
  mode: LayoutMode
): MermaidFrontmatterConfig {
  if (mode === 'hierarchical') {
    return {
      ...cfg,
      layout: 'dagre',
      layoutMode: 'hierarchical',
      elk: undefined,
      flowchart: {
        ...cfg.flowchart,
        layout: 'dagre',
        curve: cfg.flowchart.curve === 'stepAfter' || cfg.flowchart.curve === 'stepBefore' ? 'basis' : cfg.flowchart.curve || 'basis',
        nodeSpacing: 30,
        rankSpacing: 35,
      },
    };
  }
  if (mode === 'adaptive') {
    return {
      ...cfg,
      layout: 'elk',
      layoutMode: 'adaptive',
      elk: {
        mergeEdges: true,
        nodePlacementStrategy: 'NETWORK_SIMPLEX',
      },
      flowchart: {
        ...cfg.flowchart,
        layout: 'elk',
        curve: 'basis',
        nodeSpacing: 36,
        rankSpacing: 42,
      },
    };
  }
  if (mode === 'orthogonal') {
    return {
      ...cfg,
      layout: 'elk',
      layoutMode: 'orthogonal',
      elk: {
        mergeEdges: false,
        nodePlacementStrategy: 'BRANDES_KOEPF',
      },
      flowchart: {
        ...cfg.flowchart,
        layout: 'elk',
        curve: 'stepAfter',
        nodeSpacing: 38,
        rankSpacing: 46,
      },
    };
  }
  // balanced
  return {
    ...cfg,
    layout: 'elk',
    layoutMode: 'balanced',
    elk: {
      mergeEdges: false,
      nodePlacementStrategy: 'LINEAR_SEGMENTS',
    },
    flowchart: {
      ...cfg.flowchart,
      layout: 'elk',
      curve: 'linear',
      nodeSpacing: 54,
      rankSpacing: 54,
    },
  };
}

function stripQuotes(v: string): string {
  const trimmed = v.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function extractFrontmatter(code: string): {
  rawFrontmatter: string | null;
  body: string;
} {
  const match = code.match(/^\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/);
  if (!match) {
    return { rawFrontmatter: null, body: code };
  }
  return {
    rawFrontmatter: match[1],
    body: code.slice(match[0].length),
  };
}

export function parseFrontmatterConfig(code: string): MermaidFrontmatterConfig {
  const { rawFrontmatter } = extractFrontmatter(code);
  const cfg: MermaidFrontmatterConfig = {
    theme: DEFAULT_CONFIG.theme,
    look: DEFAULT_CONFIG.look,
    layout: DEFAULT_CONFIG.layout,
    layoutMode: 'hierarchical',
    themeVariables: { ...DEFAULT_CONFIG.themeVariables },
    flowchart: { ...DEFAULT_CONFIG.flowchart },
  };

  if (!rawFrontmatter) return cfg;

  const lines = rawFrontmatter.split(/\r?\n/);
  let currentSection: 'root' | 'config' | 'themeVariables' | 'flowchart' | 'elk' = 'root';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const indent = rawLine.search(/\S/);
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();

    if (key === 'config' && !val) {
      currentSection = 'config';
      continue;
    }
    if (key === 'themeVariables' && !val) {
      currentSection = 'themeVariables';
      continue;
    }
    if (key === 'flowchart' && !val) {
      currentSection = 'flowchart';
      continue;
    }
    if (key === 'elk' && !val) {
      currentSection = 'elk';
      cfg.elk = cfg.elk || {};
      continue;
    }

    if (
      indent <= 2 &&
      currentSection !== 'root' &&
      key !== 'themeVariables' &&
      key !== 'flowchart' &&
      key !== 'elk'
    ) {
      currentSection = 'config';
    }

    const cleanVal = stripQuotes(val);

    if (currentSection === 'themeVariables') {
      (cfg.themeVariables as Record<string, string>)[key] = cleanVal;
    } else if (currentSection === 'elk') {
      cfg.elk = cfg.elk || {};
      if (key === 'mergeEdges') cfg.elk.mergeEdges = cleanVal === 'true';
      else if (key === 'nodePlacementStrategy') cfg.elk.nodePlacementStrategy = cleanVal;
      else if (key === 'cycleBreakingStrategy') cfg.elk.cycleBreakingStrategy = cleanVal;
    } else if (currentSection === 'flowchart') {
      if (key === 'nodeSpacing' || key === 'rankSpacing' || key === 'padding') {
        const num = Number(cleanVal);
        if (!Number.isNaN(num)) cfg.flowchart[key] = num;
      } else if (key === 'curve') {
        cfg.flowchart.curve = cleanVal as CurveType;
      } else if (key === 'layout') {
        cfg.flowchart.layout = cleanVal === 'elk' ? 'elk' : 'dagre';
        cfg.layout = cfg.flowchart.layout;
      }
    } else {
      if (key === 'theme') {
        cfg.theme = cleanVal;
      } else if (key === 'look') {
        cfg.look = cleanVal === 'handDrawn' ? 'handDrawn' : 'classic';
      } else if (key === 'layout') {
        cfg.layout = cleanVal === 'elk' ? 'elk' : 'dagre';
        cfg.flowchart.layout = cfg.layout;
      }
    }
  }

  // Infer exact 4-mode layoutMode cleanly
  if (cfg.layout === 'elk') {
    if (
      cfg.flowchart.curve === 'stepAfter' ||
      cfg.flowchart.curve === 'stepBefore' ||
      cfg.elk?.nodePlacementStrategy === 'BRANDES_KOEPF'
    ) {
      cfg.layoutMode = 'orthogonal';
    } else if (cfg.elk?.nodePlacementStrategy === 'LINEAR_SEGMENTS') {
      cfg.layoutMode = 'balanced';
    } else {
      cfg.layoutMode = 'adaptive';
    }
  } else {
    cfg.layoutMode = 'hierarchical';
  }

  return cfg;
}

export function serializeFrontmatter(config: MermaidFrontmatterConfig): string {
  const lines: string[] = ['---', 'config:'];
  lines.push(`  theme: ${config.theme || 'base'}`);

  if (config.look && config.look !== 'classic') {
    lines.push(`  look: ${config.look}`);
  }
  if (config.layout === 'elk') {
    lines.push(`  layout: elk`);
  }

  if (config.layout === 'elk' && config.elk) {
    lines.push('  elk:');
    if (config.elk.mergeEdges !== undefined) {
      lines.push(`    mergeEdges: ${config.elk.mergeEdges}`);
    }
    if (config.elk.nodePlacementStrategy) {
      lines.push(`    nodePlacementStrategy: ${config.elk.nodePlacementStrategy}`);
    }
    if (config.elk.cycleBreakingStrategy) {
      lines.push(`    cycleBreakingStrategy: ${config.elk.cycleBreakingStrategy}`);
    }
  }

  const tv = config.themeVariables || {};
  const tvEntries = Object.entries(tv).filter(([, v]) => v !== undefined);
  if (config.theme === 'base' && tvEntries.length > 0) {
    lines.push('  themeVariables:');
    for (const [k, v] of tvEntries) {
      const clean = stripQuotes(String(v));
      lines.push(`    ${k}: '${clean}'`);
    }
  }

  const fc = config.flowchart || {};
  const hasFc =
    fc.nodeSpacing !== undefined ||
    fc.rankSpacing !== undefined ||
    fc.curve !== undefined ||
    fc.padding !== undefined ||
    fc.layout !== undefined;

  if (hasFc) {
    lines.push('  flowchart:');
    if (fc.nodeSpacing !== undefined) lines.push(`    nodeSpacing: ${fc.nodeSpacing}`);
    if (fc.rankSpacing !== undefined) lines.push(`    rankSpacing: ${fc.rankSpacing}`);
    if (fc.curve) lines.push(`    curve: ${fc.curve}`);
    if (fc.padding !== undefined) lines.push(`    padding: ${fc.padding}`);
    if (fc.layout) lines.push(`    layout: ${fc.layout}`);
  }

  lines.push('---');
  return lines.join('\n');
}

export function updateFrontmatterInCode(
  code: string,
  updater: (current: MermaidFrontmatterConfig) => MermaidFrontmatterConfig
): string {
  const current = parseFrontmatterConfig(code);
  const next = updater({
    ...current,
    themeVariables: { ...current.themeVariables },
    flowchart: { ...current.flowchart },
  });
  const { body } = extractFrontmatter(code);
  const serialized = serializeFrontmatter(next);
  const trimmedBody = body.replace(/^\r?\n+/, '');
  return `${serialized}\n${trimmedBody}`;
}

export function detectDirection(code: string): DiagramDirection | null {
  const { body } = extractFrontmatter(code);
  const flowMatch = body.match(
    /^\s*(?:flowchart(?:-v2|-elk)?|graph)\s+(LR|RL|TB|TD|BT)\b/im
  );
  if (flowMatch) {
    const dir = flowMatch[1].toUpperCase();
    return (dir === 'TD' ? 'TB' : dir) as DiagramDirection;
  }
  if (/^\s*(?:flowchart(?:-v2|-elk)?|graph)\b/im.test(body)) {
    return 'TB';
  }
  const dirMatch = body.match(/^\s*direction\s+(LR|RL|TB|TD|BT)\b/im);
  if (dirMatch) {
    const dir = dirMatch[1].toUpperCase();
    return (dir === 'TD' ? 'TB' : dir) as DiagramDirection;
  }
  if (/^\s*(?:stateDiagram(?:-v2)?|classDiagram(?:-v2)?|erDiagram)\b/im.test(body)) {
    return 'TB';
  }
  return null;
}

export function updateDirectionInCode(code: string, direction: DiagramDirection): string {
  const { rawFrontmatter, body } = extractFrontmatter(code);
  let nextBody = body;

  // 1. Update flowchart / graph declaration line
  if (/^\s*(?:flowchart(?:-v2|-elk)?|graph)\s+(?:LR|RL|TB|TD|BT)\b/im.test(nextBody)) {
    nextBody = nextBody.replace(
      /^(\s*(?:flowchart(?:-v2|-elk)?|graph)\s+)(?:LR|RL|TB|TD|BT)\b/im,
      `$1${direction}`
    );
    // Also sync inner subgraph `direction ...` lines so the entire diagram truly rotates!
    nextBody = nextBody.replace(
      /^([ \t]*direction[ \t]+)(?:LR|RL|TB|TD|BT)\b/gim,
      `$1${direction}`
    );
  } else if (/^\s*(?:flowchart(?:-v2|-elk)?|graph)[ \t]*;?[ \t]*$/im.test(nextBody)) {
    nextBody = nextBody.replace(
      /^(\s*(?:flowchart(?:-v2|-elk)?|graph))([ \t]*;?)[ \t]*$/im,
      `$1 ${direction}$2`
    );
    nextBody = nextBody.replace(
      /^([ \t]*direction[ \t]+)(?:LR|RL|TB|TD|BT)\b/gim,
      `$1${direction}`
    );
  } else if (/^\s*direction\s+(?:LR|RL|TB|TD|BT)\b/im.test(nextBody)) {
    nextBody = nextBody.replace(
      /^([ \t]*direction[ \t]+)(?:LR|RL|TB|TD|BT)\b/gim,
      `$1${direction}`
    );
  } else if (/^\s*(?:stateDiagram(?:-v2)?|classDiagram(?:-v2)?|erDiagram)\b/im.test(nextBody)) {
    // Insert `direction <DIR>` right beneath the diagram header
    nextBody = nextBody.replace(
      /^(\s*(?:stateDiagram(?:-v2)?|classDiagram(?:-v2)?|erDiagram)[^\r\n]*\r?\n)/im,
      `$1  direction ${direction}\n`
    );
  }

  if (rawFrontmatter !== null) {
    return `---\n${rawFrontmatter}\n---\n${nextBody}`;
  }
  return nextBody;
}

export function detectDiagramType(code: string): string {
  const { body } = extractFrontmatter(code);
  const firstLine = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l && !l.startsWith('%%'));

  if (!firstLine) return 'Diagram';
  const token = firstLine.split(/[\s(]/)[0].toLowerCase();
  const map: Record<string, string> = {
    flowchart: 'Flowchart',
    graph: 'Flowchart',
    sequencediagram: 'Sequence',
    classdiagram: 'Class Diagram',
    statediagram: 'State Diagram',
    'statediagram-v2': 'State Diagram',
    erdiagram: 'ER Diagram',
    gantt: 'Gantt Chart',
    pie: 'Pie Chart',
    mindmap: 'Mindmap',
    timeline: 'Timeline',
    gitgraph: 'Git Graph',
    journey: 'User Journey',
    quadrantchart: 'Quadrant Chart',
    'architecture-beta': 'Architecture',
    'xychart-beta': 'XY Chart',
    'sankey-beta': 'Sankey',
    'block-beta': 'Block Diagram',
    kanban: 'Kanban Board',
    c4context: 'C4 Diagram',
    c4container: 'C4 Diagram',
    c4component: 'C4 Diagram',
    'packet-beta': 'Packet Diagram',
    requirementdiagram: 'Requirement',
  };
  return map[token] || 'Mermaid Diagram';
}
