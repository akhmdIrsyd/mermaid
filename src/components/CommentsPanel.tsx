import React, { useState } from 'react';
import { X, MessageSquare, CheckCircle2, Circle, Trash2, MapPin, Send } from 'lucide-react';
import type { DiagramComment } from '../types';

interface CommentsPanelProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  comments: DiagramComment[];
  onAddComment: (text: string) => void;
  onReplyComment: (commentId: string, text: string) => void;
  onToggleResolve: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
}

export const CommentsPanel: React.FC<CommentsPanelProps> = ({
  open,
  onClose,
  darkMode,
  comments,
  onAddComment,
  onReplyComment,
  onToggleResolve,
  onDeleteComment,
}) => {
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [draft, setDraft] = useState('');
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  if (!open) return null;

  const filtered = comments.filter((c) => {
    if (filter === 'open') return !c.resolved;
    if (filter === 'resolved') return c.resolved;
    return true;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    onAddComment(draft.trim());
    setDraft('');
  };

  return (
    <aside
      className={`w-80 sm:w-96 h-full border-l flex flex-col shrink-0 z-20 animate-pop ${
        darkMode
          ? 'bg-[#151824] border-slate-800 text-slate-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          darkMode ? 'border-slate-800' : 'border-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 font-bold text-sm">
          <MessageSquare className="w-4 h-4 text-[#e0095f]" />
          <span>Comments</span>
          <span className="px-1.5 py-0.5 rounded-full bg-slate-500/12 text-[10px]">
            {comments.length}
          </span>
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

      {/* Filter Pills */}
      <div
        className={`flex items-center gap-1 px-3 py-2 border-b ${
          darkMode ? 'border-slate-800' : 'border-slate-100'
        }`}
      >
        {(['open', 'resolved', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize cursor-pointer ${
              filter === f
                ? 'bg-[#e0095f]/12 text-[#e0095f]'
                : darkMode
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Comments Thread List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-xs opacity-60">
            No {filter === 'all' ? '' : filter} comments yet. Add one below or pin directly on the
            canvas!
          </div>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className={`p-3 rounded-xl border space-y-2 ${
                c.resolved ? 'opacity-65' : ''
              } ${
                darkMode
                  ? 'border-slate-800 bg-slate-900/50'
                  : 'border-slate-200/80 bg-slate-50/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span className="w-5 h-5 rounded-full bg-[#e0095f]/15 text-[#e0095f] flex items-center justify-center text-[10px]">
                    {c.author[0]?.toUpperCase() || 'Y'}
                  </span>
                  <span>{c.author}</span>
                  {c.pinned && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-rose-500/12 text-[#e0095f] font-semibold">
                      <MapPin className="w-2.5 h-2.5" />
                      Pinned
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onToggleResolve(c.id)}
                    className={`p-1 rounded hover:bg-slate-500/15 cursor-pointer ${
                      c.resolved ? 'text-emerald-500' : 'text-slate-400'
                    }`}
                    title={c.resolved ? 'Reopen thread' : 'Mark resolved'}
                  >
                    {c.resolved ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Circle className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteComment(c.id)}
                    className="p-1 rounded hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 cursor-pointer"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs leading-relaxed whitespace-pre-wrap">{c.text}</p>
              <div className="text-[10px] opacity-50">
                {new Date(c.createdAt).toLocaleString()}
              </div>

              {/* Replies */}
              {c.replies.length > 0 && (
                <div
                  className={`pl-2.5 border-l-2 space-y-1.5 pt-1 ${
                    darkMode ? 'border-slate-700' : 'border-slate-200'
                  }`}
                >
                  {c.replies.map((r) => (
                    <div key={r.id} className="text-[11px]">
                      <span className="font-bold mr-1.5">{r.author}:</span>
                      <span className="opacity-90">{r.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Reply Input */}
              <div className="flex gap-1.5 pt-1">
                <input
                  type="text"
                  value={replyDrafts[c.id] || ''}
                  onChange={(e) =>
                    setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (replyDrafts[c.id] || '').trim()) {
                      onReplyComment(c.id, replyDrafts[c.id].trim());
                      setReplyDrafts((prev) => ({ ...prev, [c.id]: '' }));
                    }
                  }}
                  placeholder="Write a reply..."
                  className={`flex-1 px-2 py-1 rounded-lg border text-[11px] outline-none ${
                    darkMode
                      ? 'bg-slate-900 border-slate-700 text-slate-200'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => {
                    if ((replyDrafts[c.id] || '').trim()) {
                      onReplyComment(c.id, replyDrafts[c.id].trim());
                      setReplyDrafts((prev) => ({ ...prev, [c.id]: '' }));
                    }
                  }}
                  className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Comment Composer */}
      <form
        onSubmit={handleSubmit}
        className={`p-3 border-t flex gap-2 ${
          darkMode ? 'border-slate-800 bg-[#121520]' : 'border-slate-100 bg-slate-50/70'
        }`}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment to this diagram..."
          className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none ${
            darkMode
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        />
        <button
          type="submit"
          className="px-3.5 py-2 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-semibold cursor-pointer"
        >
          Post
        </button>
      </form>
    </aside>
  );
};
