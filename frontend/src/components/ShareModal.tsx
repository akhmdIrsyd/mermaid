import React, { useMemo, useState } from 'react';
import { X, Link2, Code2, FileText, Check, Copy, Presentation } from 'lucide-react';
import { buildShareUrl } from '../utils/share';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  title: string;
  code: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  open,
  onClose,
  darkMode,
  title,
  code,
}) => {
  const [tab, setTab] = useState<'link' | 'embed' | 'markdown'>('link');
  const [presentationMode, setPresentationMode] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const shareUrl = useMemo(
    () => buildShareUrl({ title, code, presentation: presentationMode }),
    [title, code, presentationMode]
  );

  const iframeCode = useMemo(
    () =>
      `<iframe\n  src="${shareUrl}"\n  title="${title.replace(/"/g, '&quot;')}"\n  width="100%"\n  height="540"\n  style="border: 1px solid #e2e8f0; border-radius: 12px;"\n  allowfullscreen\n></iframe>`,
    [shareUrl, title]
  );

  const markdownCode = useMemo(() => `\`\`\`mermaid\n${code.trim()}\n\`\`\``, [code]);

  if (!open) return null;

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs" />

      <div
        className={`relative z-10 w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden animate-pop ${
          darkMode
            ? 'bg-[#151824] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div>
            <h2 className="text-base font-bold">Share &amp; Embed Diagram</h2>
            <p className="text-xs opacity-65 mt-0.5">
              Zero-server compressed live links — works instantly for anyone you share with
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

        {/* Tabs */}
        <div
          className={`flex gap-1 px-5 pt-3 border-b ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          {[
            { id: 'link' as const, label: 'Share Link', icon: <Link2 className="w-3.5 h-3.5" /> },
            { id: 'embed' as const, label: 'HTML Embed', icon: <Code2 className="w-3.5 h-3.5" /> },
            { id: 'markdown' as const, label: 'Markdown', icon: <FileText className="w-3.5 h-3.5" /> },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                tab === t.id
                  ? 'border-[#e0095f] text-[#e0095f]'
                  : 'border-transparent opacity-65 hover:opacity-100'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === 'link' && (
            <>
              <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Presentation className="w-4 h-4 text-[#e0095f]" />
                  <div>
                    <div className="text-xs font-semibold">Open in Presentation Mode</div>
                    <div className="text-[11px] opacity-65">
                      Launch link directly into clean fullscreen view
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={presentationMode}
                  onChange={(e) => setPresentationMode(e.target.checked)}
                  className="accent-[#e0095f] w-4 h-4"
                />
              </label>

              <div>
                <label className="block text-xs font-bold mb-1.5">Compressed Live URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono outline-none ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => copyText('link', shareUrl)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1e1b2e] hover:bg-[#2c2842] text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'link' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {tab === 'embed' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold">Responsive Iframe Snippet</label>
                <button
                  type="button"
                  onClick={() => copyText('embed', iframeCode)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#e0095f] cursor-pointer"
                >
                  {copiedKey === 'embed' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'embed' ? 'Copied' : 'Copy HTML'}
                </button>
              </div>
              <pre
                className={`p-3 rounded-xl border text-[11px] font-mono overflow-x-auto max-h-48 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {iframeCode}
              </pre>
            </div>
          )}

          {tab === 'markdown' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold">GitHub / Notion / Obsidian Markdown</label>
                <button
                  type="button"
                  onClick={() => copyText('md', markdownCode)}
                  className="flex items-center gap-1 text-xs font-semibold text-[#e0095f] cursor-pointer"
                >
                  {copiedKey === 'md' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'md' ? 'Copied' : 'Copy Markdown'}
                </button>
              </div>
              <pre
                className={`p-3 rounded-xl border text-[11px] font-mono overflow-auto max-h-56 ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-slate-300'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                {markdownCode}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
