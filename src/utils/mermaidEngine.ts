import mermaid from 'mermaid';
import elkLayouts from '@mermaid-js/layout-elk';

let initialized = false;
let renderCounter = 0;

export function ensureMermaidInitialized() {
  if (initialized) return;
  try {
    mermaid.registerLayoutLoaders(elkLayouts);
  } catch {
    // Already registered or unsupported version fallback
  }
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    suppressErrorRendering: true,
    maxTextSize: 250000,
    flowchart: {
      htmlLabels: true,
      useMaxWidth: false,
    },
    sequence: {
      useMaxWidth: false,
    },
    gantt: {
      useMaxWidth: false,
    },
    er: {
      useMaxWidth: false,
    },
    class: {
      useMaxWidth: false,
    },
  });
  initialized = true;
}

export interface RenderResult {
  svg: string;
  bindFunctions?: (element: Element) => void;
  error?: string;
  errorLine?: number | null;
}

export async function renderMermaidDiagram(code: string): Promise<RenderResult> {
  ensureMermaidInitialized();

  const trimmed = code.trim();
  if (!trimmed) {
    return { svg: '', error: undefined, errorLine: null };
  }

  const id = `mermaid-svg-${++renderCounter}-${Date.now()}`;

  try {
    // Validate first so Mermaid doesn't inject error SVGs into the DOM
    await mermaid.parse(trimmed, { suppressErrors: false });
    const result = await mermaid.render(id, trimmed);
    return {
      svg: result.svg,
      bindFunctions: result.bindFunctions,
      error: undefined,
      errorLine: null,
    };
  } catch (err: unknown) {
    // Clean up any leftover temp element mermaid might leave on failure
    const stale = document.getElementById(`d${id}`) || document.getElementById(id);
    if (stale && stale.parentNode) {
      stale.parentNode.removeChild(stale);
    }

    const message =
      err instanceof Error
        ? err.message
        : typeof err === 'string'
        ? err
        : 'Syntax error while rendering Mermaid diagram.';

    const lineMatch = message.match(/line\s+(\d+)/i);
    const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : null;

    return {
      svg: '',
      error: message.replace(/^Error:\s*/i, '').trim(),
      errorLine,
    };
  }
}

export function autoFixMermaidCode(code: string): { fixed: string; changes: string[] } {
  let fixed = code;
  const changes: string[] = [];

  // 1. Replace raw & inside quoted labels with &amp; (if not already an entity)
  const ampFixed = fixed.replace(/("[^"\n]*?")/g, (match) => {
    const replaced = match.replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, '&amp;');
    return replaced;
  });
  if (ampFixed !== fixed) {
    fixed = ampFixed;
    changes.push('Escaped raw "&" symbols inside quoted labels');
  }

  // 2. Normalize smart quotes to standard quotes
  const quoteFixed = fixed.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (quoteFixed !== fixed) {
    fixed = quoteFixed;
    changes.push('Converted smart quotes to standard ASCII quotes');
  }

  // 3. Fix common arrow typos (e.g., -> in flowchart instead of -->)
  if (/^\s*(?:flowchart|graph)\b/m.test(fixed)) {
    const arrowFixed = fixed.replace(/(\S)\s+->\s+(\S)/g, '$1 --> $2');
    if (arrowFixed !== fixed) {
      fixed = arrowFixed;
      changes.push('Replaced single-dash "->" arrows with "-->" in flowchart');
    }
  }

  // 4. Trim trailing spaces
  const trimmedLines = fixed
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n');
  if (trimmedLines !== fixed) {
    fixed = trimmedLines;
    changes.push('Removed trailing whitespace');
  }

  return { fixed, changes };
}

export function formatMermaidCode(code: string): string {
  const lines = code.split(/\r?\n/);
  const result: string[] = [];
  let inFrontmatter = false;
  let indentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (i === 0 && trimmed === '---') {
      inFrontmatter = true;
      result.push('---');
      continue;
    }

    if (inFrontmatter) {
      if (trimmed === '---') {
        inFrontmatter = false;
        result.push('---');
      } else {
        result.push(raw.replace(/\s+$/, ''));
      }
      continue;
    }

    if (!trimmed) {
      result.push('');
      continue;
    }

    if (/^(end|\})$/.test(trimmed)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    const prefix = '  '.repeat(indentLevel);
    result.push(`${prefix}${trimmed}`);

    if (
      /^(subgraph\b|loop\b|alt\b|opt\b|par\b|critical\b|break\b|rect\b|state\b.*\{|class\b.*\{|namespace\b.*\{)/i.test(
        trimmed
      )
    ) {
      indentLevel += 1;
    }
  }

  return result.join('\n');
}

export function findNodeLineInCode(code: string, nodeId: string): number | null {
  if (!nodeId) return null;
  const lines = code.split(/\r?\n/);
  const escaped = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const defRegex = new RegExp(`^\\s*${escaped}(?:\\s*[\\[(\\{\\>]|\\s*:::|\\s*-->|\\s*---)`);
  for (let i = 0; i < lines.length; i++) {
    if (defRegex.test(lines[i])) return i + 1;
  }
  const looseRegex = new RegExp(`\\b${escaped}\\b`);
  for (let i = 0; i < lines.length; i++) {
    if (looseRegex.test(lines[i])) return i + 1;
  }
  return null;
}

export function extractNodeIdFromElement(el: Element): string | null {
  const rawId = el.getAttribute('id') || el.getAttribute('data-id') || '';
  if (!rawId) return null;
  // Mermaid v11 flowchart node IDs look like: "flowchart-A1-14" or "flowchart-B_IN-22"
  const fcMatch = rawId.match(/^flowchart-(.+?)-\d+$/);
  if (fcMatch) return fcMatch[1];
  const stateMatch = rawId.match(/^state-(.+?)-\d+$/);
  if (stateMatch) return stateMatch[1];
  return rawId;
}

export function upsertNodeStyleInCode(
  code: string,
  nodeId: string,
  styles: {
    fill?: string;
    stroke?: string;
    color?: string;
    strokeWidth?: string;
    strokeDasharray?: string;
  }
): string {
  const parts: string[] = [];
  if (styles.fill) parts.push(`fill:${styles.fill}`);
  if (styles.stroke) parts.push(`stroke:${styles.stroke}`);
  if (styles.color) parts.push(`color:${styles.color}`);
  if (styles.strokeWidth) parts.push(`stroke-width:${styles.strokeWidth}`);
  if (styles.strokeDasharray && styles.strokeDasharray !== 'none') {
    parts.push(`stroke-dasharray:${styles.strokeDasharray}`);
  }

  const styleLine = `  style ${nodeId} ${parts.join(',')}`;
  const escaped = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingRegex = new RegExp(`^\\s*style\\s+${escaped}\\s+.*$`, 'm');

  if (parts.length === 0) {
    return code.replace(existingRegex, '').replace(/\n{3,}/g, '\n\n');
  }

  if (existingRegex.test(code)) {
    return code.replace(existingRegex, styleLine);
  }
  return `${code.trimEnd()}\n\n${styleLine}\n`;
}

export function readNodeStyleFromCode(code: string, nodeId: string): Record<string, string> {
  const escaped = nodeId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = code.match(new RegExp(`^\\s*style\\s+${escaped}\\s+(.+)$`, 'm'));
  const result: Record<string, string> = {};
  if (!match) return result;
  const declarations = match[1].split(',');
  for (const decl of declarations) {
    const [k, v] = decl.split(':').map((s) => s.trim());
    if (k && v) result[k] = v;
  }
  return result;
}
