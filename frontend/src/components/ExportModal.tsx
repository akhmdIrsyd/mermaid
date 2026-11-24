import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
  FileCode2,
  FileText,
  FileType2,
  Sparkles,
} from 'lucide-react';
import {
  copyPngToClipboard,
  executeExport,
  prepareStandaloneSvg,
  resolveBackgroundHex,
  type ExportConfig,
} from '../utils/export';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  svg: string;
  code: string;
  title: string;
}

const FORMATS: {
  id: ExportConfig['format'];
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  { id: 'png', label: 'PNG Ultra-HD', sub: 'Up to 8x Retina', icon: <ImageIcon className="w-4 h-4" /> },
  { id: 'svg', label: 'Vector SVG', sub: 'Lossless Scalable', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'pdf', label: 'Print PDF', sub: 'Paper & Slides', icon: <FileType2 className="w-4 h-4" /> },
  { id: 'mmd', label: 'Mermaid .mmd', sub: 'Raw Source', icon: <FileCode2 className="w-4 h-4" /> },
  { id: 'md', label: 'Markdown .md', sub: 'Fenced Block', icon: <FileText className="w-4 h-4" /> },
];

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  onClose,
  darkMode,
  svg,
  code,
  title,
}) => {
  const [format, setFormat] = useState<ExportConfig['format']>('png');
  const [scale, setScale] = useState<ExportConfig['scale']>(4);
  const [background, setBackground] = useState<ExportConfig['background']>('white');
  const [customBackground, setCustomBackground] = useState('#f8fafc');
  const [padding, setPadding] = useState(24);
  const [filename, setFilename] = useState(title);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  if (!open) return null;

  const isVisualFormat = format === 'png' || format === 'svg' || format === 'pdf';

  const handleDownload = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await executeExport(svg, code, {
        format,
        scale,
        background,
        customBackground,
        padding,
        filename: filename || title,
      });
      setStatus(`Exported ${format.toUpperCase()} successfully!`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyPng = async () => {
    setBusy(true);
    setStatus(null);
    try {
      await copyPngToClipboard(svg, {
        scale: Math.min(scale, 4),
        background: resolveBackgroundHex({ background, customBackground }),
        padding,
      });
      setStatus('High-res PNG copied to clipboard!');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not copy PNG.');
    } finally {
      setBusy(false);
    }
  };

  const handleCopySvg = async () => {
    try {
      const { svgString } = prepareStandaloneSvg(svg, {
        background: resolveBackgroundHex({ background, customBackground }),
        padding,
      });
      await navigator.clipboard.writeText(svgString);
      setStatus('Standalone SVG markup copied to clipboard!');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Could not copy SVG.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs" />

      <div
        className={`relative z-10 w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden animate-pop ${
          darkMode
            ? 'bg-[#151824] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              Export Studio
              <span className="px-2 py-0.5 rounded-full bg-[#e0095f]/12 text-[#e0095f] text-[10px] font-bold">
                PRO UNLOCKED
              </span>
            </h2>
            <p className="text-xs opacity-65 mt-0.5">
              Zero watermarks · Ultra-HD 8x PNG, lossless SVG &amp; print-ready PDF
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* Format Grid */}
          <div>
            <label className="block text-xs font-bold mb-2">Export Format</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFormat(f.id)}
                  className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                    format === f.id
                      ? 'border-[#e0095f] bg-[#e0095f]/10 text-[#e0095f]'
                      : darkMode
                      ? 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  {f.icon}
                  <span className="text-[11px] font-bold mt-1.5">{f.label}</span>
                  <span className="text-[9.5px] opacity-65">{f.sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Filename */}
          <div>
            <label className="block text-xs font-bold mb-1.5">File Name</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-[#e0095f] ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-slate-50 border-slate-200 text-slate-900'
              }`}
            />
          </div>

          {/* Visual Export Options */}
          {isVisualFormat && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Scale / Resolution */}
              {(format === 'png' || format === 'pdf') && (
                <div>
                  <label className="block text-xs font-bold mb-1.5">Resolution Scale</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {([1, 2, 4, 8] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScale(s)}
                        className={`py-1.5 rounded-lg border text-xs font-bold cursor-pointer ${
                          scale === s
                            ? 'border-[#e0095f] bg-[#e0095f] text-white'
                            : darkMode
                            ? 'border-slate-700 hover:bg-slate-800'
                            : 'border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Background */}
              <div>
                <label className="block text-xs font-bold mb-1.5">Background</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['transparent', 'white', 'dark', 'custom'] as const).map((bg) => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => setBackground(bg)}
                      className={`py-1.5 rounded-lg border text-[11px] font-semibold capitalize cursor-pointer ${
                        background === bg
                          ? 'border-[#e0095f] bg-[#e0095f]/12 text-[#e0095f]'
                          : darkMode
                          ? 'border-slate-700 hover:bg-slate-800'
                          : 'border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {bg === 'transparent' ? 'None' : bg}
                    </button>
                  ))}
                </div>
                {background === 'custom' && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={customBackground}
                      onChange={(e) => setCustomBackground(e.target.value)}
                      className="w-8 h-7 rounded cursor-pointer border-0"
                    />
                    <span className="text-xs font-mono opacity-75">{customBackground}</span>
                  </div>
                )}
              </div>

              {/* Padding Slider */}
              <div className="sm:col-span-2">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>Canvas Margin / Padding</span>
                  <span className="font-mono text-[#e0095f]">{padding}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={padding}
                  onChange={(e) => setPadding(Number(e.target.value))}
                  className="w-full accent-[#e0095f]"
                />
              </div>
            </div>
          )}

          {status && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <Check className="w-4 h-4 shrink-0" />
              <span>{status}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 border-t ${
            darkMode ? 'border-slate-800 bg-[#121520]' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!svg || busy}
              onClick={handleCopyPng}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-40 ${
                darkMode
                  ? 'border-slate-700 hover:bg-slate-800'
                  : 'border-slate-200 bg-white hover:bg-slate-100'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              Copy PNG
            </button>
            <button
              type="button"
              disabled={!svg || busy}
              onClick={handleCopySvg}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer disabled:opacity-40 ${
                darkMode
                  ? 'border-slate-700 hover:bg-slate-800'
                  : 'border-slate-200 bg-white hover:bg-slate-100'
              }`}
            >
              <Copy className="w-3.5 h-3.5" />
              Copy SVG
            </button>
          </div>

          <button
            type="button"
            disabled={(isVisualFormat && !svg) || busy}
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-bold shadow-md shadow-[#e0095f]/25 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-4 h-4" />
            {busy ? 'Rendering...' : `Download ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};
