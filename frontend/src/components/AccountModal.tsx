import React, { useState } from 'react';
import { X, User, KeyRound, LogOut, Check, AlertCircle, Database } from 'lucide-react';
import { authApi } from '../api/client';
import type { AuthUser } from '../types';

interface AccountModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  user: AuthUser;
  diagramsCount: number;
  foldersCount: number;
  onUserUpdated: (user: AuthUser) => void;
  onLogout: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  open,
  onClose,
  darkMode,
  user,
  diagramsCount,
  foldersCount,
  onUserUpdated,
  onLogout,
}) => {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSaving(true);

    try {
      const payload: { name?: string; currentPassword?: string; newPassword?: string } = {
        name: name.trim(),
      };
      if (newPassword.trim()) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }
      const res = await authApi.updateProfile(payload);
      onUserUpdated(res.user);
      setCurrentPassword('');
      setNewPassword('');
      setMessage('Profil akun berhasil diperbarui.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui akun.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs" />

      <div
        className={`relative z-10 w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden animate-pop ${
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f41b72] to-[#c40753] text-white font-bold text-sm flex items-center justify-center shadow-sm">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="text-sm font-bold">{user.name}</h2>
              <p className="text-[11px] opacity-65">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg cursor-pointer ${
              darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* DB Stats */}
          <div
            className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
              darkMode
                ? 'bg-slate-900/60 border-slate-800'
                : 'bg-slate-50 border-slate-200/80'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold">
              <Database className="w-4 h-4 text-emerald-500" />
              <span>PostgreSQL Cloud Sync Aktif</span>
            </div>
            <span className="font-mono text-[11px] opacity-75">
              {diagramsCount} diagram · {foldersCount} folder
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <Check className="w-4 h-4 shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5">
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold mb-1">
                <User className="w-3.5 h-3.5 opacity-60" />
                Nama Tampilan
              </label>
              <input
                type="text"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#e0095f] ${
                  darkMode
                    ? 'bg-slate-900 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div className={`pt-2 border-t ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-1.5 text-xs font-bold mb-2 opacity-80">
                <KeyRound className="w-3.5 h-3.5" />
                Ganti Password (Opsional)
              </div>
              <div className="space-y-2">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Password saat ini"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#e0095f] ${
                    darkMode
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password baru (minimal 6 karakter)"
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-[#e0095f] ${
                    darkMode
                      ? 'bg-slate-900 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
