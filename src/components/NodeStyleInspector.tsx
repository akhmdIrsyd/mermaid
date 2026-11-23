import React, { useMemo } from 'react';
import { X, Code2, RotateCcw, Paintbrush } from 'lucide-react';
import type { SelectedNodeInfo } from '../types';
import { readNodeStyleFromCode, upsertNodeStyleInCode } from '../utils/mermaidEngine';

interface NodeStyleInspectorProps {
  selectedNode: SelectedNodeInfo;
  code: string;
  locked: boolean;
  darkMode: boolean;
  onChangeCode: (next: string) => void;
  onJumpToLine: (line: number) => void;
  onClose: () => void;
}

const FILL_SWATCHES = [
  '#ffffff',
  '#fdf2f8',
  '#eff6ff',
  '#ecfdf5',
  '#fffbeb',
  '#f5f3ff',
  '#f1f5f9',
  '#1e293b',
];

const STROKE_SWATCHES = [
  '#333333',
  '#e0095f',
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#64748b',
  '#0f172a',
];

export const NodeStyleInspector: React.FC<NodeStyleInspectorProps> = ({
  selectedNode,
  code,
  locked,
  darkMode,
  onChangeCode,
  onJumpToLine,
  onClose,
}) => {
  const currentStyle = useMemo(
    () => readNodeStyleFromCode(code, selectedNode.nodeId),
    [code, selectedNode.nodeId]
  );

  const applyPatch = (patch: {
    fill?: string;
    stroke?: string;
    color?: string;
    strokeWidth?: string;
    strokeDasharray?: string;
  }) => {
    if (locked) return;
    const merged = {
      fill: patch.fill ?? currentStyle.fill ?? '#ffffff',
      stroke: patch.stroke ?? currentStyle.stroke ?? '#333333',
      color: patch.color ?? currentStyle.color ?? '#111111',
      strokeWidth: patch.strokeWidth ?? currentStyle['stroke-width'] ?? '2px',
      strokeDasharray: patch.strokeDasharray ?? currentStyle['stroke-dasharray'] ?? 'none',
    };
    onChangeCode(upsertNodeStyleInCode(code, selectedNode.nodeId, merged));
  };

  const resetStyle = () => {
    if (locked) return;
    onChangeCode(upsertNodeStyleInCode(code, selectedNode.nodeId, {}));
  };

  return (
    <div
      className={`w-72 rounded-2xl border shadow-2xl p-3.5 animate-pop select-none ${
        darkMode
          ? 'bg-[#1a1e2e]/95 border-slate-700 text-slate-100 backdrop-blur-md'
          : 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-md'
      }`}
    >
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#e0095f]/12 text-[#e0095f] flex items-center justify-center shrink-0">
            <Paintbrush className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold truncate">Node Inspector</div>
            <div className="text-[11px] font-mono text-[#e0095f] truncate">
              {selectedNode.nodeId}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className={`p-1 rounded-lg cursor-pointer ${
            darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {selectedNode.lineNumber && (
        <button
          type="button"
          onClick={() => onJumpToLine(selectedNode.lineNumber!)}
          className={`w-full mb-3 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
            darkMode
              ? 'border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200'
              : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <Code2 className="w-3.5 h-3.5 text-[#e0095f]" />
          Jump to Line {selectedNode.lineNumber} in Code
        </button>
      )}

      <div className="space-y-3">
        {/* Fill Color */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
            <span>Fill Color</span>
            <input
              type="color"
              disabled={locked}
              value={currentStyle.fill || '#ffffff'}
              onChange={(e) => applyPatch({ fill: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {FILL_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                disabled={locked}
                onClick={() =>
                  applyPatch({
                    fill: hex,
                    color: hex === '#1e293b' ? '#f8fafc' : currentStyle.color || '#111111',
                  })
                }
                style={{ backgroundColor: hex }}
                className={`w-6 h-6 rounded-lg border transition-transform hover:scale-110 cursor-pointer ${
                  currentStyle.fill === hex
                    ? 'ring-2 ring-[#e0095f] border-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                title={hex}
              />
            ))}
          </div>
        </div>

        {/* Border Color */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-semibold mb-1.5">
            <span>Border Color</span>
            <input
              type="color"
              disabled={locked}
              value={currentStyle.stroke || '#333333'}
              onChange={(e) => applyPatch({ stroke: e.target.value })}
              className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
            />
          </div>
          <div className="grid grid-cols-8 gap-1.5">
            {STROKE_SWATCHES.map((hex) => (
              <button
                key={hex}
                type="button"
                disabled={locked}
                onClick={() => applyPatch({ stroke: hex })}
                style={{ backgroundColor: hex }}
                className={`w-6 h-6 rounded-lg border transition-transform hover:scale-110 cursor-pointer ${
                  currentStyle.stroke === hex
                    ? 'ring-2 ring-[#e0095f] border-white'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
                title={hex}
              />
            ))}
          </div>
        </div>

        {/* Text Color + Stroke Width + Border Style */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-semibold opacity-70 mb-1">Text</label>
            <input
              type="color"
              disabled={locked}
              value={currentStyle.color || '#111111'}
              onChange={(e) => applyPatch({ color: e.target.value })}
              className="w-full h-7 rounded-lg cursor-pointer border border-slate-300 dark:border-slate-700"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold opacity-70 mb-1">Border</label>
            <select
              disabled={locked}
              value={currentStyle['stroke-width'] || '2px'}
              onChange={(e) => applyPatch({ strokeWidth: e.target.value })}
              className={`w-full h-7 rounded-lg border px-1.5 text-[11px] font-medium outline-none ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="1px">1px</option>
              <option value="2px">2px</option>
              <option value="3px">3px</option>
              <option value="4px">4px</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold opacity-70 mb-1">Line</label>
            <select
              disabled={locked}
              value={currentStyle['stroke-dasharray'] || 'none'}
              onChange={(e) => applyPatch({ strokeDasharray: e.target.value })}
              className={`w-full h-7 rounded-lg border px-1.5 text-[11px] font-medium outline-none ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-slate-200'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <option value="none">Solid</option>
              <option value="5 5">Dashed</option>
              <option value="2 3">Dotted</option>
            </select>
          </div>
        </div>

        <button
          type="button"
          disabled={locked}
          onClick={resetStyle}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
            darkMode
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
        >
          <RotateCcw className="w-3 h-3" />
          Reset Node Style
        </button>
      </div>
    </div>
  );
};
