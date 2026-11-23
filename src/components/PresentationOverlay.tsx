import React, { useEffect, useState } from 'react';
import { X, ZoomIn, ZoomOut, Maximize2, Sun, Moon, Sparkles } from 'lucide-react';

interface PresentationOverlayProps {
  open: boolean;
  onClose: () => void;
  title: string;
  svg: string;
  initialDarkMode: boolean;
}

export const PresentationOverlay: React.FC<PresentationOverlayProps> = ({
  open,
  onClose,
  title,
  svg,
  initialDarkMode,
}) => {
  const [dark, setDark] = useState(initialDarkMode);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragOrigin, setDragOrigin] = useState({ x: 0, y: 0, tx: 0, ty: 0 });
  const [laser, setLaser] = useState(false);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setDark(initialDarkMode);
  }, [initialDarkMode, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') setScale((s) => Math.min(4, s * 1.15));
      if (e.key === '-') setScale((s) => Math.max(0.2, s / 1.15));
      if (e.key === '0') {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onMouseMove={(e) => {
        if (laser) setLaserPos({ x: e.clientX, y: e.clientY });
        if (dragging) {
          setTranslate({
            x: dragOrigin.tx + (e.clientX - dragOrigin.x),
            y: dragOrigin.ty + (e.clientY - dragOrigin.y),
          });
        }
      }}
      onMouseUp={() => setDragging(false)}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-pres-ui]')) return;
        setDragging(true);
        setDragOrigin({ x: e.clientX, y: e.clientY, tx: translate.x, ty: translate.y });
      }}
      onWheel={(e) => {
        e.preventDefault();
        setScale((s) => Math.min(4, Math.max(0.2, s * (e.deltaY < 0 ? 1.09 : 0.92))));
      }}
      className={`fixed inset-0 z-50 overflow-hidden select-none ${
        dark ? 'bg-[#0b0e17] text-slate-100' : 'bg-white text-slate-900'
      } ${laser ? 'cursor-none' : dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
    >
      {/* Floating Presentation Header */}
      <div
        data-pres-ui
        className={`fixed top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-2xl border shadow-xl backdrop-blur-md ${
          dark
            ? 'bg-[#151824]/90 border-slate-700 text-slate-100'
            : 'bg-white/90 border-slate-200 text-slate-800'
        }`}
      >
        <span className="text-xs font-bold max-w-[200px] truncate">{title}</span>
        <span className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(4, s * 1.15))}
          className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.2, s / 1.15))}
          className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setScale(1);
            setTranslate({ x: 0, y: 0 });
          }}
          className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-pointer"
          title="Reset View (0)"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setLaser((l) => !l)}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
            laser ? 'bg-[#e0095f] text-white' : 'hover:bg-slate-500/15'
          }`}
          title="Toggle Laser Pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Laser
        </button>
        <button
          type="button"
          onClick={() => setDark((d) => !d)}
          className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-pointer"
          title="Toggle Light / Dark Backdrop"
        >
          {dark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
        </button>
        <span className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900 dark:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          Exit
        </button>
      </div>

      {/* Rendered SVG Centerpiece */}
      <div className="w-full h-full flex items-center justify-center p-10">
        <div
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: 'center center',
          }}
          className="mermaid-canvas-svg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Laser Pointer Dot */}
      {laser && laserPos && (
        <div
          style={{ left: laserPos.x, top: laserPos.y }}
          className="fixed -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
        >
          <div className="w-4 h-4 rounded-full bg-[#e0095f] shadow-[0_0_18px_6px_rgba(224,9,95,0.75)] ring-2 ring-white/80" />
        </div>
      )}
    </div>
  );
};
