import React, { useCallback, useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  Users,
  FileCode2,
  Folder,
  UserPlus,
  Search,
  Crown,
  Ban,
  CheckCircle2,
  KeyRound,
  Trash2,
  RefreshCw,
  CopyPlus,
  AlertCircle,
  Check,
  Terminal,
} from 'lucide-react';
import { adminApi } from '../api/client';
import { AdminApiExplorer } from './AdminApiExplorer';
import { PaginationBar } from './PaginationBar';
import type {
  AdminDiagramRecord,
  AdminStats,
  AdminUserRecord,
  AuthUser,
  PaginationMeta,
  UserRole,
} from '../types';

interface SuperAdminModalProps {
  open: boolean;
  onClose: () => void;
  darkMode: boolean;
  currentUser: AuthUser;
  onCloneDiagramToMyWorkspace: (title: string, code: string) => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  open,
  onClose,
  darkMode,
  currentUser,
  onCloneDiagramToMyWorkspace,
}) => {
  const [tab, setTab] = useState<'users' | 'diagrams' | 'api'>('users');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [usersPagination, setUsersPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [diagrams, setDiagrams] = useState<AdminDiagramRecord[]>([]);
  const [diagramsPagination, setDiagramsPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDiagrams, setLoadingDiagrams] = useState(false);
  const [cloningKey, setCloningKey] = useState<string | null>(null);

  const [userSearch, setUserSearch] = useState('');
  const [debouncedUserSearch, setDebouncedUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'super_admin' | 'user'>('all');
  const [usersPage, setUsersPage] = useState(1);
  const [usersLimit, setUsersLimit] = useState(10);

  const [diagramSearch, setDiagramSearch] = useState('');
  const [debouncedDiagramSearch, setDebouncedDiagramSearch] = useState('');
  const [diagramsPage, setDiagramsPage] = useState(1);
  const [diagramsLimit, setDiagramsLimit] = useState(10);

  const loading = loadingStats || loadingUsers || loadingDiagrams;

  // Debounce ONLY text search inputs (instant 0ms response for opening modal & page buttons!)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedUserSearch(userSearch), 240);
    return () => clearTimeout(t);
  }, [userSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDiagramSearch(diagramSearch), 240);
    return () => clearTimeout(t);
  }, [diagramSearch]);

  // Create user form
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');

  // Inline password reset target
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const flashNotice = (msg: string) => {
    setNotice(msg);
    setError(null);
    setTimeout(() => setNotice(null), 3500);
  };

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const statsRes = await adminApi.getStats();
      setStats(statsRes.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat statistik.');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    setError(null);
    try {
      const usersRes = await adminApi.listUsers({
        search: debouncedUserSearch,
        role: roleFilter,
        page: usersPage,
        limit: usersLimit,
      });
      setUsers(usersRes.users);
      setUsersPagination(usersRes.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar user.');
    } finally {
      setLoadingUsers(false);
    }
  }, [debouncedUserSearch, roleFilter, usersPage, usersLimit]);

  const loadDiagrams = useCallback(async () => {
    setLoadingDiagrams(true);
    setError(null);
    try {
      const diagramsRes = await adminApi.listDiagrams({
        search: debouncedDiagramSearch,
        page: diagramsPage,
        limit: diagramsLimit,
      });
      setDiagrams(diagramsRes.diagrams);
      setDiagramsPagination(diagramsRes.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar diagram.');
    } finally {
      setLoadingDiagrams(false);
    }
  }, [debouncedDiagramSearch, diagramsPage, diagramsLimit]);

  const loadData = useCallback(async () => {
    const tasks: Promise<void>[] = [loadStats()];
    if (tab === 'users' || tab === 'api') tasks.push(loadUsers());
    if (tab === 'diagrams' || tab === 'api') tasks.push(loadDiagrams());
    await Promise.all(tasks);
  }, [tab, loadStats, loadUsers, loadDiagrams]);

  // Load stats immediately when opened
  useEffect(() => {
    if (!open) return;
    void loadStats();
  }, [open, loadStats]);

  // Load users immediately when Users or API tab is active
  useEffect(() => {
    if (!open || (tab !== 'users' && tab !== 'api')) return;
    void loadUsers();
  }, [open, tab, loadUsers]);

  // Lazy-load diagrams ONLY when Diagrams or API tab is opened!
  useEffect(() => {
    if (!open || (tab !== 'diagrams' && tab !== 'api')) return;
    void loadDiagrams();
  }, [open, tab, loadDiagrams]);

  const handleCloneDiagram = async (d: AdminDiagramRecord) => {
    const key = `${d.userId}-${d.id}`;
    setCloningKey(key);
    setError(null);
    try {
      const detail = await adminApi.getDiagramDetail(d.userId, d.id);
      onCloneDiagramToMyWorkspace(`${detail.diagram.title} (Copy)`, detail.diagram.code);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka salinan diagram.');
    } finally {
      setCloningKey(null);
    }
  };

  if (!open) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await adminApi.createUser({
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
      });
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setCreating(false);
      flashNotice('Akun baru berhasil dibuat dan workspace awal telah disiapkan.');
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuat akun.');
    }
  };

  const handleToggleRole = async (u: AdminUserRecord) => {
    const nextRole: UserRole = u.role === 'super_admin' ? 'user' : 'super_admin';
    try {
      await adminApi.updateUser(u.id, { role: nextRole });
      flashNotice(`Role ${u.name} diubah menjadi ${nextRole === 'super_admin' ? 'Super Admin' : 'User'}.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah role.');
    }
  };

  const handleToggleActive = async (u: AdminUserRecord) => {
    try {
      await adminApi.updateUser(u.id, { isActive: !u.isActive });
      flashNotice(u.isActive ? `Akun ${u.name} dinonaktifkan (Suspended).` : `Akun ${u.name} diaktifkan kembali.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengubah status akun.');
    }
  };

  const handleResetPassword = async (u: AdminUserRecord) => {
    if (resetPasswordVal.length < 6) {
      setError('Password baru minimal 6 karakter.');
      return;
    }
    try {
      await adminApi.updateUser(u.id, { newPassword: resetPasswordVal });
      setResetTargetId(null);
      setResetPasswordVal('');
      flashNotice(`Password untuk ${u.email} berhasil direset.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mereset password.');
    }
  };

  const handleDeleteUser = async (u: AdminUserRecord) => {
    if (!window.confirm(`Hapus permanen akun "${u.name}" (${u.email}) beserta seluruh diagramnya?`)) {
      return;
    }
    try {
      await adminApi.deleteUser(u.id);
      flashNotice(`Akun ${u.email} berhasil dihapus.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus user.');
    }
  };

  const handleDeleteDiagram = async (d: AdminDiagramRecord) => {
    if (!window.confirm(`Hapus permanen diagram "${d.title}" milik ${d.ownerEmail}?`)) return;
    try {
      await adminApi.deleteDiagram(d.userId, d.id);
      flashNotice(`Diagram "${d.title}" berhasil dihapus.`);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus diagram.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/60" />

      <div
        style={{ contain: 'layout paint' }}
        className={`relative z-10 w-full max-w-5xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
          darkMode
            ? 'bg-[#121520] border-slate-700 text-slate-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b shrink-0 ${
            darkMode ? 'border-slate-800 bg-[#171b2a]' : 'border-slate-100 bg-slate-50/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-rose-600 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold flex items-center gap-2">
                <span>Super Admin Console</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                  Full Access
                </span>
              </h2>
              <p className="text-xs opacity-65">
                Kelola seluruh akun user, role Super Admin, reset password, dan diagram di PostgreSQL
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void loadData()}
              className={`p-2 rounded-xl border cursor-pointer transition-colors ${
                darkMode
                  ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                  : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-600'
              }`}
              title="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl cursor-pointer ${
                darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
              }`}
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {stats && (
          <div
            className={`grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3.5 border-b shrink-0 ${
              darkMode ? 'border-slate-800' : 'border-slate-100'
            }`}
          >
            {[
              {
                label: 'Total Akun',
                value: stats.totalUsers,
                sub: `${stats.superAdmins} Super Admin`,
                icon: <Users className="w-4 h-4 text-[#e0095f]" />,
              },
              {
                label: 'Akun Aktif',
                value: stats.activeUsers,
                sub: `${stats.suspendedUsers} Suspended`,
                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
              },
              {
                label: 'Total Diagram',
                value: stats.totalDiagrams,
                sub: 'Tersimpan di PostgreSQL',
                icon: <FileCode2 className="w-4 h-4 text-sky-500" />,
              },
              {
                label: 'Total Folder',
                value: stats.totalFolders,
                sub: 'Seluruh workspace',
                icon: <Folder className="w-4 h-4 text-amber-500" />,
              },
            ].map((card) => (
              <div
                key={card.label}
                className={`p-3 rounded-xl border ${
                  darkMode
                    ? 'bg-slate-900/60 border-slate-800'
                    : 'bg-slate-50/70 border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-semibold opacity-70">
                  <span>{card.label}</span>
                  {card.icon}
                </div>
                <div className="text-xl font-extrabold mt-1">{card.value}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{card.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Alerts */}
        {(error || notice) && (
          <div className="px-5 pt-3 shrink-0">
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/12 text-rose-600 dark:text-rose-300 text-xs font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {notice && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <Check className="w-4 h-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          className={`flex items-center justify-between gap-3 px-5 pt-3 border-b shrink-0 ${
            darkMode ? 'border-slate-800' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                tab === 'users'
                  ? 'border-[#e0095f] text-[#e0095f]'
                  : 'border-transparent opacity-65 hover:opacity-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Manajemen User ({stats?.totalUsers ?? usersPagination.total})
            </button>
            <button
              type="button"
              onClick={() => setTab('diagrams')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                tab === 'diagrams'
                  ? 'border-[#e0095f] text-[#e0095f]'
                  : 'border-transparent opacity-65 hover:opacity-100'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" />
              Semua Diagram ({stats?.totalDiagrams ?? diagramsPagination.total})
            </button>
            <button
              type="button"
              onClick={() => setTab('api')}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                tab === 'api'
                  ? 'border-[#e0095f] text-[#e0095f]'
                  : 'border-transparent opacity-65 hover:opacity-100'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              API Explorer &amp; Tester
            </button>
          </div>

          {tab === 'users' && (
            <button
              type="button"
              onClick={() => setCreating((v) => !v)}
              className="mb-1.5 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-bold shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {creating ? 'Tutup Form' : 'Tambah Akun'}
            </button>
          )}
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {tab === 'users' && (
            <>
              {/* Create Account Inline Card */}
              {creating && (
                <form
                  onSubmit={handleCreateUser}
                  className={`p-4 rounded-2xl border space-y-3 animate-pop ${
                    darkMode
                      ? 'bg-slate-900/70 border-slate-700'
                      : 'bg-rose-50/40 border-rose-200/80'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-[#e0095f]" />
                    Buat Akun Baru (User / Super Admin)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nama Lengkap"
                      className={`px-3 py-2 rounded-xl border text-xs outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="email@domain.com"
                      className={`px-3 py-2 rounded-xl border text-xs outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Password (min 6 char)"
                      className={`px-3 py-2 rounded-xl border text-xs outline-none ${
                        darkMode
                          ? 'bg-slate-950 border-slate-700 text-white'
                          : 'bg-white border-slate-200 text-slate-900'
                      }`}
                    />
                    <div className="flex gap-2">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value as UserRole)}
                        className={`flex-1 px-2.5 py-2 rounded-xl border text-xs font-semibold outline-none ${
                          darkMode
                            ? 'bg-slate-950 border-slate-700 text-white'
                            : 'bg-white border-slate-200 text-slate-900'
                        }`}
                      >
                        <option value="user">User</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-bold cursor-pointer"
                      >
                        Buat
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* Search & Role Filter */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div
                  className={`flex-1 min-w-[200px] flex items-center gap-2 px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-900 border-slate-800'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 opacity-55" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value);
                      setUsersPage(1);
                    }}
                    placeholder="Cari nama atau email user..."
                    className="w-full bg-transparent text-xs outline-none"
                  />
                </div>

                <div className="flex items-center gap-1">
                  {(['all', 'super_admin', 'user'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRoleFilter(r);
                        setUsersPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer ${
                        roleFilter === r
                          ? 'bg-[#e0095f] text-white'
                          : darkMode
                          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {r === 'all' ? 'Semua' : r === 'super_admin' ? 'Super Admin' : 'User'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {users.map((u) => {
                  const isSelf = u.id === currentUser.id;
                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 rounded-2xl border transition-colors ${
                        darkMode
                          ? 'border-slate-800 bg-slate-900/50'
                          : 'border-slate-200/80 bg-slate-50/40'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                              u.role === 'super_admin'
                                ? 'bg-gradient-to-br from-amber-500 to-rose-600 text-white'
                                : darkMode
                                ? 'bg-slate-800 text-slate-200'
                                : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-xs font-bold truncate">{u.name}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[9.5px] font-bold">
                                  ANDA
                                </span>
                              )}
                              {u.role === 'super_admin' ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[9.5px] font-bold">
                                  <Crown className="w-2.5 h-2.5" />
                                  SUPER ADMIN
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-slate-500/12 text-[9.5px] font-semibold opacity-70">
                                  USER
                                </span>
                              )}
                              {!u.isActive && (
                                <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-500 text-[9.5px] font-bold">
                                  SUSPENDED
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] opacity-65 truncate mt-0.5">
                              {u.email} · {u.diagramCount} diagram · {u.folderCount} folder
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTargetId(resetTargetId === u.id ? null : u.id);
                              setResetPasswordVal('');
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                              darkMode
                                ? 'border-slate-700 hover:bg-slate-800'
                                : 'border-slate-200 bg-white hover:bg-slate-100'
                            }`}
                            title="Reset Password User"
                          >
                            <KeyRound className="w-3 h-3" />
                            Reset PW
                          </button>

                          {!isSelf && (
                            <>
                              <button
                                type="button"
                                onClick={() => void handleToggleRole(u)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                  darkMode
                                    ? 'border-slate-700 hover:bg-slate-800'
                                    : 'border-slate-200 bg-white hover:bg-slate-100'
                                }`}
                                title="Promosikan / Turunkan Role"
                              >
                                <Crown className="w-3 h-3 text-amber-500" />
                                {u.role === 'super_admin' ? 'Jadikan User' : 'Jadikan Admin'}
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleToggleActive(u)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer ${
                                  u.isActive
                                    ? 'border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                                    : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10'
                                }`}
                                title={u.isActive ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                              >
                                {u.isActive ? (
                                  <>
                                    <Ban className="w-3 h-3" />
                                    Suspend
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" />
                                    Aktifkan
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDeleteUser(u)}
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/12 cursor-pointer"
                                title="Hapus Permanen Akun"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Inline Password Reset Form */}
                      {resetTargetId === u.id && (
                        <div className="mt-3 pt-2.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center gap-2">
                          <input
                            type="password"
                            value={resetPasswordVal}
                            onChange={(e) => setResetPasswordVal(e.target.value)}
                            placeholder={`Password baru untuk ${u.email} (min 6 char)...`}
                            className={`flex-1 px-3 py-1.5 rounded-xl border text-xs outline-none ${
                              darkMode
                                ? 'bg-slate-950 border-slate-700 text-white'
                                : 'bg-white border-slate-200 text-slate-900'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => void handleResetPassword(u)}
                            className="px-3 py-1.5 rounded-xl bg-[#e0095f] hover:bg-[#c50753] text-white text-xs font-bold cursor-pointer"
                          >
                            Simpan Password
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <PaginationBar
                page={usersPagination.page}
                totalPages={usersPagination.totalPages}
                totalItems={usersPagination.total}
                pageSize={usersLimit}
                onPageChange={setUsersPage}
                onPageSizeChange={(size) => {
                  setUsersLimit(size);
                  setUsersPage(1);
                }}
                darkMode={darkMode}
                itemLabel="user"
              />
            </>
          )}

          {tab === 'diagrams' && (
            <>
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${
                  darkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <Search className="w-3.5 h-3.5 opacity-55" />
                <input
                  type="text"
                  value={diagramSearch}
                  onChange={(e) => {
                    setDiagramSearch(e.target.value);
                    setDiagramsPage(1);
                  }}
                  placeholder="Cari judul diagram atau email pemilik..."
                  className="w-full bg-transparent text-xs outline-none"
                />
              </div>

              <div className="space-y-2">
                {diagrams.length === 0 ? (
                  <div className="py-10 text-center text-xs opacity-60">
                    Tidak ada diagram yang cocok.
                  </div>
                ) : (
                  diagrams.map((d) => {
                    const rowKey = `${d.userId}-${d.id}`;
                    const isCloning = cloningKey === rowKey;
                    return (
                      <div
                        key={rowKey}
                        className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
                          darkMode
                            ? 'border-slate-800 bg-slate-900/50'
                            : 'border-slate-200/80 bg-slate-50/40'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-2">
                            <span className="truncate">{d.title}</span>
                            {d.codeLength !== undefined && (
                              <span className="text-[10px] font-mono opacity-55 shrink-0">
                                {(d.codeLength / 1024).toFixed(1)} KB
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] opacity-65 mt-0.5">
                            Pemilik: <span className="font-semibold">{d.ownerName}</span> (
                            {d.ownerEmail}) · Updated {new Date(d.updatedAt).toLocaleString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isCloning}
                            onClick={() => void handleCloneDiagram(d)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer disabled:opacity-50 ${
                              darkMode
                                ? 'border-slate-700 hover:bg-slate-800'
                                : 'border-slate-200 bg-white hover:bg-slate-100'
                            }`}
                            title="Ambil isi diagram dari database dan buka salinan di editor saya"
                          >
                            <CopyPlus className="w-3 h-3 text-[#e0095f]" />
                            {isCloning ? 'Memuat...' : 'Buka Salinan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteDiagram(d)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/12 cursor-pointer"
                            title="Hapus diagram"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <PaginationBar
                page={diagramsPagination.page}
                totalPages={diagramsPagination.totalPages}
                totalItems={diagramsPagination.total}
                pageSize={diagramsLimit}
                onPageChange={setDiagramsPage}
                onPageSizeChange={(size) => {
                  setDiagramsLimit(size);
                  setDiagramsPage(1);
                }}
                darkMode={darkMode}
                itemLabel="diagram"
              />
            </>
          )}
          {tab === 'api' && (
            <AdminApiExplorer
              darkMode={darkMode}
              users={users}
              diagrams={diagrams}
              onDataMutated={() => void loadData()}
            />
          )}
        </div>
      </div>
    </div>
  );
};
