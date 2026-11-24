import { jsPDF } from 'jspdf';

export interface ExportConfig {
  format: 'svg' | 'png' | 'pdf' | 'mmd' | 'md';
  scale: 1 | 2 | 4 | 8;
  background: 'transparent' | 'white' | 'dark' | 'custom';
  customBackground: string;
  padding: number;
  filename: string;
}

function getSvgDimensions(svgEl: SVGSVGElement): { width: number; height: number; minX: number; minY: number } {
  const viewBoxAttr = svgEl.getAttribute('viewBox');
  if (viewBoxAttr) {
    const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
    if (parts.length === 4 && !parts.some(Number.isNaN) && parts[2] > 0 && parts[3] > 0) {
      return { minX: parts[0], minY: parts[1], width: parts[2], height: parts[3] };
    }
  }
  const rect = svgEl.getBoundingClientRect();
  const w = parseFloat(svgEl.getAttribute('width') || '') || rect.width || 1200;
  const h = parseFloat(svgEl.getAttribute('height') || '') || rect.height || 800;
  return { minX: 0, minY: 0, width: w, height: h };
}

export function resolveBackgroundHex(config: Pick<ExportConfig, 'background' | 'customBackground'>): string | null {
  if (config.background === 'transparent') return null;
  if (config.background === 'white') return '#ffffff';
  if (config.background === 'dark') return '#0f172a';
  return config.customBackground || '#ffffff';
}

export function prepareStandaloneSvg(
  rawSvg: string,
  options: { background: string | null; padding: number }
): { svgString: string; width: number; height: number } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawSvg, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) {
    throw new Error('No rendered SVG found to export.');
  }

  const { minX, minY, width, height } = getSvgDimensions(svgEl);
  const pad = Math.max(0, options.padding);
  const totalW = Math.ceil(width + pad * 2);
  const totalH = Math.ceil(height + pad * 2);

  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgEl.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  svgEl.setAttribute('viewBox', `${minX - pad} ${minY - pad} ${totalW} ${totalH}`);
  svgEl.setAttribute('width', `${totalW}`);
  svgEl.setAttribute('height', `${totalH}`);
  svgEl.style.maxWidth = 'none';
  svgEl.style.backgroundColor = options.background || 'transparent';

  if (options.background) {
    const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', `${minX - pad}`);
    bgRect.setAttribute('y', `${minY - pad}`);
    bgRect.setAttribute('width', `${totalW}`);
    bgRect.setAttribute('height', `${totalH}`);
    bgRect.setAttribute('fill', options.background);
    svgEl.insertBefore(bgRect, svgEl.firstChild);
  }

  const serializer = new XMLSerializer();
  const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(svgEl)}`;
  return { svgString, width: totalW, height: totalH };
}

export async function renderSvgToCanvas(
  rawSvg: string,
  options: { scale: number; background: string | null; padding: number }
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const { svgString, width, height } = prepareStandaloneSvg(rawSvg, {
    background: options.background,
    padding: options.padding,
  });

  // Cap max canvas dimensions safely to avoid browser canvas limits
  const maxDim = 14000;
  let effectiveScale = options.scale;
  if (width * effectiveScale > maxDim || height * effectiveScale > maxDim) {
    effectiveScale = Math.min(maxDim / width, maxDim / height);
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * effectiveScale));
  canvas.height = Math.max(1, Math.round(height * effectiveScale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  if (options.background) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Use base64 data URI (avoids tainted canvas security issues in Safari/Chrome with foreignObject)
  const base64 = btoa(unescape(encodeURIComponent(svgString)));
  const dataUrl = `data:image/svg+xml;base64,${base64}`;

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve();
    };
    img.onerror = () => reject(new Error('Failed to rasterize SVG image.'));
    img.src = dataUrl;
  });

  return { canvas, width, height };
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function executeExport(rawSvg: string, code: string, config: ExportConfig): Promise<void> {
  const safeName = (config.filename || 'diagram').replace(/[^a-z0-9\-_\s]/gi, '_').trim() || 'diagram';
  const bg = resolveBackgroundHex(config);

  if (config.format === 'mmd') {
    triggerDownload(new Blob([code], { type: 'text/plain;charset=utf-8' }), `${safeName}.mmd`);
    return;
  }

  if (config.format === 'md') {
    const md = `# ${config.filename}\n\n\`\`\`mermaid\n${code}\n\`\`\`\n`;
    triggerDownload(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${safeName}.md`);
    return;
  }

  if (config.format === 'svg') {
    const { svgString } = prepareStandaloneSvg(rawSvg, { background: bg, padding: config.padding });
    triggerDownload(new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' }), `${safeName}.svg`);
    return;
  }

  if (config.format === 'png') {
    const { canvas } = await renderSvgToCanvas(rawSvg, {
      scale: config.scale,
      background: bg,
      padding: config.padding,
    });
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
    if (!blob) throw new Error('Could not encode PNG.');
    triggerDownload(blob, `${safeName}-${config.scale}x.png`);
    return;
  }

  if (config.format === 'pdf') {
    const { canvas, width, height } = await renderSvgToCanvas(rawSvg, {
      scale: Math.max(2, Math.min(config.scale, 4)),
      background: bg || '#ffffff',
      padding: config.padding,
    });
    const orientation = width >= height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [width, height],
      hotfixes: ['px_scaling'],
    });
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    pdf.save(`${safeName}.pdf`);
  }
}

export async function copyPngToClipboard(
  rawSvg: string,
  options: { scale: number; background: string | null; padding: number }
): Promise<void> {
  const { canvas } = await renderSvgToCanvas(rawSvg, options);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png', 1.0));
  if (!blob) throw new Error('Failed to generate PNG for clipboard.');
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('Image clipboard is not supported in this browser context.');
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}
