import React, { useMemo, useState } from 'react';
import {
  Play,
  Copy,
  Check,
  Terminal,
  Activity,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { getAuthToken } from '../api/client';
import type { AdminDiagramRecord, AdminUserRecord } from '../types';

interface ApiEndpointDef {
  id: string;
  group: 'System' | 'Super Admin' | 'Auth & Workspace';
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  requiresSuperAdmin?: boolean;
  defaultQuery?: string;
  defaultBody?: string;
  dangerous?: boolean;
}

const API_ENDPOINTS: ApiEndpointDef[] = [
  {
    id: 'health',
    group: 'System',
    method: 'GET',
    path: '/api/health',
    description: 'Cek status server Backend Express & koneksi database PostgreSQL.',
  },
  {
    id: 'admin-stats',
    group: 'Super Admin',
    method: 'GET',
    path: '/api/admin/stats',
    description: 'Statistik platform real-time (total akun, aktif/suspended, diagram, folder).',
    requiresSuperAdmin: true,
  },
  {
    id: 'admin-users-list',
    group: 'Super Admin',
    method: 'GET',
    path: '/api/admin/users',
    description: 'Daftar semua akun user (server-side paging) + jumlah diagram & folder.',
    requiresSuperAdmin: true,
    defaultQuery: 'role=all&page=1&limit=10',
  },
  {
    id: 'admin-users-create',
    group: 'Super Admin',
    method: 'POST',
    path: '/api/admin/users',
    description: 'Buat akun User atau Super Admin baru + seed workspace otomatis.',
    requiresSuperAdmin: true,
    defaultBody: JSON.stringify(
      {
        name: 'Demo User Baru',
        email: 'demo.user@example.com',
        password: 'Password123!',
        role: 'user',
      },
      null,
      2
    ),
  },
  {
    id: 'admin-users-update',
    group: 'Super Admin',
    method: 'PATCH',
    path: '/api/admin/users/:id',
    description: 'Ubah nama, role (user/super_admin), status isActive, atau reset password.',
    requiresSuperAdmin: true,
    defaultBody: JSON.stringify(
      {
        role: 'user',
        isActive: true,
      },
      null,
      2
    ),
  },
  {
    id: 'admin-users-delete',
    group: 'Super Admin',
    method: 'DELETE',
    path: '/api/admin/users/:id',
    description: 'Hapus permanen akun user beserta seluruh folder & diagramnya.',
    requiresSuperAdmin: true,
    dangerous: true,
  },
  {
    id: 'admin-diagrams-list',
    group: 'Super Admin',
    method: 'GET',
    path: '/api/admin/diagrams',
    description: 'Daftar seluruh diagram di PostgreSQL (ringan + server-side paging).',
    requiresSuperAdmin: true,
    defaultQuery: 'page=1&limit=10',
  },
  {
    id: 'admin-diagrams-detail',
    group: 'Super Admin',
    method: 'GET',
    path: '/api/admin/diagrams/:userId/:diagramId',
    description: 'Ambil full source code diagram secara lazy on-demand.',
    requiresSuperAdmin: true,
  },
  {
    id: 'admin-diagrams-delete',
    group: 'Super Admin',
    method: 'DELETE',
    path: '/api/admin/diagrams/:userId/:diagramId',
    description: 'Hapus diagram tertentu berdasarkan userId dan diagramId.',
    requiresSuperAdmin: true,
    dangerous: true,
  },
  {
    id: 'auth-me',
    group: 'Auth & Workspace',
    method: 'GET',
    path: '/api/auth/me',
    description: 'Cek profil, role, dan validitas token JWT sesi yang sedang aktif.',
  },
  {
    id: 'workspace-get',
    group: 'Auth & Workspace',
    method: 'GET',
    path: '/api/workspace',
    description: 'Ambil seluruh folder, diagram, dan preferensi milik akun yang login.',
  },
];

interface ApiRunResult {
  status: number;
  ok: boolean;
  durationMs: number;
  bodyText: string;
  url: string;
  method: string;
  timestamp: string;
}

interface QuickCheckResult {
  endpointId: string;
  path: string;
  status: number;
  ok: boolean;
  durationMs: number;
}

interface AdminApiExplorerProps {
  darkMode: boolean;
  users: AdminUserRecord[];
  diagrams: AdminDiagramRecord[];
  onDataMutated: () => void;
}

const METHOD_BADGE: Record<ApiEndpointDef['method'], string> = {
  GET: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  POST: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/25',
  PATCH: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25',
  DELETE: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25',
};

export const AdminApiExplorer: React.FC<AdminApiExplorerProps> = ({
  darkMode,
  users,
  diagrams,
  onDataMutated,
}) => {
  const [selectedId, setSelectedId] = useState<string>('admin-stats');
  const [queryStr, setQueryStr] = useState<string>('');
  const [paramUserId, setParamUserId] = useState<string>('');
  const [paramDiagramId, setParamDiagramId] = useState<string>('');
  const [bodyDraft, setBodyDraft] = useState<string>('');
  const [useAuthHeader, setUseAuthHeader] = useState<boolean>(true);
  const [showToken, setShowToken] = useState<boolean>(false);

  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ApiRunResult | null>(null);
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [suiteResults, setSuiteResults] = useState<QuickCheckResult[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const token = getAuthToken() || '';

  const selected = useMemo(
    () => API_ENDPOINTS.find((e) => e.id === selectedId) || API_ENDPOINTS[0],
    [selectedId]
  );

  const handleSelectEndpoint = (ep: ApiEndpointDef) => {
    setSelectedId(ep.id);
    setQueryStr(ep.defaultQuery || '');
    setBodyDraft(ep.defaultBody || '');
    setResult(null);

    // Pre-fill helpful parameter IDs from live DB records
    if (ep.path.includes(':id') && users.length > 0 && !paramUserId) {
      const nonAdmin = users.find((u) => u.role !== 'super_admin') || users[0];
      setParamUserId(nonAdmin.id);
    }
    if (ep.path.includes(':userId') && diagrams.length > 0) {
      setParamUserId(diagrams[0].userId);
      setParamDiagramId(diagrams[0].id);
    }
  };

  const resolvedUrl = useMemo(() => {
    let url = selected.path;
    if (url.includes(':id')) {
      url = url.replace(':id', encodeURIComponent(paramUserId || '<user_id>'));
    }
    if (url.includes(':userId')) {
      url = url.replace(':userId', encodeURIComponent(paramUserId || '<user_id>'));
    }
    if (url.includes(':diagramId')) {
      url = url.replace(':diagramId', encodeURIComponent(paramDiagramId || '<diagram_id>'));
    }
    const cleanQ = queryStr.trim().replace(/^\?/, '');
    if (cleanQ && selected.method === 'GET') {
      url = `${url}?${cleanQ}`;
    }
    return url;
  }, [selected, paramUserId, paramDiagramId, queryStr]);

  const curlSnippet = useMemo(() => {
    const origin = window.location.origin;
    const parts = [`curl -X ${selected.method} "${origin}${resolvedUrl}"`];
    if (useAuthHeader && token) {
      parts.push(`  -H "Authorization: Bearer ${showToken ? token : '<YOUR_JWT_TOKEN>'}"`);
    }
    if ((selected.method === 'POST' || selected.method === 'PATCH') && bodyDraft.trim()) {
      parts.push(`  -H "Content-Type: application/json"`);
      parts.push(`  -d '${bodyDraft.replace(/'/g, "'\\''")}'`);
    }
    return parts.join(' \\\n');
  }, [selected.method, resolvedUrl, useAuthHeader, token, showToken, bodyDraft]);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // ignore
    }
  };

  const executeRequest = async () => {
    if (selected.dangerous) {
      const ok = window.confirm(
        `Jalankan ${selected.method} ${resolvedUrl}?\nAksi ini akan menghapus data secara permanen di PostgreSQL.`
      );
      if (!ok) return;
    }

    setRunning(true);
    const start = performance.now();
    try {
      const headers: Record<string, string> = {};
      if (useAuthHeader && token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const init: RequestInit = { method: selected.method, headers };
      if (selected.method === 'POST' || selected.method === 'PATCH') {
        headers['Content-Type'] = 'application/json';
        init.body = bodyDraft;
      }

      const res = await fetch(resolvedUrl, init);
      const durationMs = Math.round(performance.now() - start);
      const rawText = await res.text();
      let formatted = rawText;
      try {
        formatted = JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        // keep plain text
      }

      setResult({
        status: res.status,
        ok: res.ok,
        durationMs,
        bodyText: formatted,
        url: resolvedUrl,
        method: selected.method,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (res.ok && selected.method !== 'GET') {
        onDataMutated();
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - start);
      setResult({
        status: 0,
        ok: false,
        durationMs,
        bodyText: err instanceof Error ? err.message : 'Network error',
        url: resolvedUrl,
        method: selected.method,
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setRunning(false);
    }
  };

  const runLiveDiagnosticsSuite = async () => {
    setSuiteRunning(true);
    const targets = [
      { id: 'health', path: '/api/health' },
      { id: 'admin-stats', path: '/api/admin/stats' },
      { id: 'admin-users-list', path: '/api/admin/users' },
      { id: 'admin-diagrams-list', path: '/api/admin/diagrams' },
    ];

    const results: QuickCheckResult[] = [];
    for (const t of targets) {
      const start = performance.now();
      try {
        const res = await fetch(t.path, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        results.push({
          endpointId: t.id,
          path: t.path,
          status: res.status,
          ok: res.ok,
          durationMs: Math.round(performance.now() - start),
        });
      } catch {
        results.push({
          endpointId: t.id,
          path: t.path,
          status: 0,
          ok: false,
          durationMs: Math.round(performance.now() - start),
        });
      }
    }
    setSuiteResults(results);
    setSuiteRunning(false);
  };

  const groups: ApiEndpointDef['group'][] = ['System', 'Super Admin', 'Auth & Workspace'];

  return (
    <div className="space-y-4">
      {/* Top Diagnostics & JWT Strip */}
      <div
        className={`p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 ${
          darkMode
            ? 'bg-slate-900/70 border-slate-800'
            : 'bg-slate-50/80 border-slate-200/90'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Super Admin JWT:</span>
          </div>
          <code
            className={`px-2 py-1 rounded-lg text-[11px] font-mono max-w-[240px] truncate border ${
              darkMode
                ? 'bg-slate-950 border-slate-800 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            {showToken ? token : `${token.slice(0, 18)}••••••••••••••••••`}
          </code>
          <button
            type="button"
            onClick={() => setShowToken((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-slate-500/15 cursor-pointer"
            title={showToken ? 'Sembunyikan token' : 'Tampilkan token'}
          >
            {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => void copyText('jwt', token)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-300/60 dark:border-slate-700 text-[11px] font-semibold hover:bg-slate-500/10 cursor-pointer"
          >
            {copiedKey === 'jwt' ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                Copy JWT
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          disabled={suiteRunning}
          onClick={() => void runLiveDiagnosticsSuite()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-105 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60"
        >
          <Activity className={`w-3.5 h-3.5 ${suiteRunning ? 'animate-spin' : ''}`} />
          <span>{suiteRunning ? 'Menguji 4 Endpoint...' : 'Tes Semua API Admin'}</span>
        </button>
      </div>

      {/* Live Quick Check Suite Results */}
      {suiteResults.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 animate-pop">
          {suiteResults.map((r) => (
            <div
              key={r.endpointId}
              className={`p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 ${
                r.ok
                  ? darkMode
                    ? 'bg-emerald-950/35 border-emerald-800/60 text-emerald-300'
                    : 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                  : darkMode
                  ? 'bg-rose-950/35 border-rose-800/60 text-rose-300'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="min-w-0">
                <div className="font-mono text-[10.5px] font-bold truncate">{r.path}</div>
                <div className="text-[10px] opacity-75 mt-0.5 flex items-center gap-1.5">
                  <span>HTTP {r.status}</span>
                  <span>·</span>
                  <span>{r.durationMs} ms</span>
                </div>
              </div>
              {r.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Main Split: Left Endpoints Catalog | Right Interactive Live Tester */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Catalog */}
        <div
          className={`lg:col-span-5 rounded-2xl border p-3 space-y-3 max-h-[430px] overflow-y-auto ${
            darkMode
              ? 'bg-slate-900/50 border-slate-800'
              : 'bg-slate-50/50 border-slate-200/80'
          }`}
        >
          {groups.map((grp) => (
            <div key={grp} className="space-y-1.5">
              <div className="px-1.5 text-[10px] font-extrabold uppercase tracking-wider opacity-55">
                {grp}
              </div>
              {API_ENDPOINTS.filter((e) => e.group === grp).map((ep) => {
                const isSelected = ep.id === selected.id;
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => handleSelectEndpoint(ep)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#e0095f] bg-[#e0095f]/8 shadow-xs'
                        : darkMode
                        ? 'border-slate-800/90 hover:border-slate-700 bg-slate-950/40'
                        : 'border-slate-200/70 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded-md border text-[9.5px] font-extrabold font-mono shrink-0 ${METHOD_BADGE[ep.method]}`}
                      >
                        {ep.method}
                      </span>
                      <span className="font-mono text-[11px] font-bold truncate">{ep.path}</span>
                    </div>
                    <p className="text-[10.5px] opacity-65 mt-1 line-clamp-2 leading-snug">
                      {ep.description}
                    </p>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Right Interactive Tester */}
        <div
          className={`lg:col-span-7 rounded-2xl border p-4 flex flex-col gap-3.5 ${
            darkMode
              ? 'bg-slate-900/60 border-slate-800'
              : 'bg-white border-slate-200/90'
          }`}
        >
          {/* Endpoint Header & Send Button */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={`px-2 py-1 rounded-lg border text-[11px] font-extrabold font-mono ${METHOD_BADGE[selected.method]}`}
              >
                {selected.method}
              </span>
              <code className="text-xs font-mono font-bold truncate">{resolvedUrl}</code>
            </div>

            <button
              type="button"
              disabled={running}
              onClick={() => void executeRequest()}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50 ${
                selected.dangerous
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-[#e0095f] hover:bg-[#c50753]'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{running ? 'Sending...' : 'Send Request'}</span>
            </button>
          </div>

          <p className="text-xs opacity-70">{selected.description}</p>

          {/* Auth Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <label className="flex items-center gap-2 cursor-pointer font-semibold">
              <input
                type="checkbox"
                checked={useAuthHeader}
                onChange={(e) => setUseAuthHeader(e.target.checked)}
                className="accent-[#e0095f] w-3.5 h-3.5"
              />
              <span>Sertakan Header Authorization (Bearer JWT Super Admin)</span>
            </label>
            {!useAuthHeader && selected.requiresSuperAdmin && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                <ShieldAlert className="w-3.5 h-3.5" />
                Akan menguji penolakan 401
              </span>
            )}
          </div>

          {/* Dynamic Path Parameters */}
          {(selected.path.includes(':id') || selected.path.includes(':userId')) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10.5px] font-bold opacity-75 mb-1">
                  Target User (`{selected.path.includes(':id') ? ':id' : ':userId'}`)
                </label>
                <select
                  value={paramUserId}
                  onChange={(e) => setParamUserId(e.target.value)}
                  className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none ${
                    darkMode
                      ? 'bg-slate-950 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="">-- Pilih User --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) [{u.role}]
                    </option>
                  ))}
                </select>
              </div>

              {selected.path.includes(':diagramId') && (
                <div>
                  <label className="block text-[10.5px] font-bold opacity-75 mb-1">
                    Target Diagram (`:diagramId`)
                  </label>
                  <select
                    value={paramDiagramId}
                    onChange={(e) => {
                      setParamDiagramId(e.target.value);
                      const found = diagrams.find((d) => d.id === e.target.value);
                      if (found) setParamUserId(found.userId);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-xl border text-xs outline-none ${
                      darkMode
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <option value="">-- Pilih Diagram --</option>
                    {diagrams.map((d) => (
                      <option key={`${d.userId}-${d.id}`} value={d.id}>
                        {d.title} ({d.ownerEmail})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Optional Query String for GET */}
          {selected.method === 'GET' && selected.id !== 'health' && selected.id !== 'auth-me' && (
            <div>
              <label className="block text-[10.5px] font-bold opacity-75 mb-1">
                Query Parameters (opsional, contoh: <code>search=admin&amp;role=all</code>)
              </label>
              <input
                type="text"
                value={queryStr}
                onChange={(e) => setQueryStr(e.target.value)}
                placeholder="search=...&role=all"
                className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono outline-none ${
                  darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          )}

          {/* JSON Request Body for POST / PATCH */}
          {(selected.method === 'POST' || selected.method === 'PATCH') && (
            <div>
              <label className="block text-[10.5px] font-bold opacity-75 mb-1">
                Request JSON Body
              </label>
              <textarea
                rows={5}
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
                className={`w-full p-2.5 rounded-xl border text-xs font-mono outline-none resize-y ${
                  darkMode
                    ? 'bg-slate-950 border-slate-700 text-slate-200'
                    : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}
              />
            </div>
          )}

          {/* cURL Preview */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10.5px] font-bold opacity-75 flex items-center gap-1">
                <Terminal className="w-3 h-3" />
                cURL Command
              </span>
              <button
                type="button"
                onClick={() => void copyText('curl', curlSnippet)}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#e0095f] cursor-pointer"
              >
                {copiedKey === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedKey === 'curl' ? 'Copied' : 'Copy cURL'}
              </button>
            </div>
            <pre
              className={`p-2.5 rounded-xl border text-[10.5px] font-mono overflow-x-auto leading-relaxed ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-300'
                  : 'bg-slate-900 border-slate-800 text-slate-100'
              }`}
            >
              {curlSnippet}
            </pre>
          </div>

          {/* Live Response Viewer */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold opacity-75 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-[#e0095f]" />
                Live Response
              </span>
              {result && (
                <div className="flex items-center gap-2 text-[11px] font-mono">
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold ${
                      result.ok
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    HTTP {result.status}
                  </span>
                  <span className="opacity-65 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {result.durationMs}ms
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyText('resp', result.bodyText)}
                    className="text-[#e0095f] font-sans font-semibold hover:underline cursor-pointer"
                  >
                    {copiedKey === 'resp' ? 'Copied!' : 'Copy JSON'}
                  </button>
                </div>
              )}
            </div>

            <pre
              className={`p-3 rounded-xl border text-[11px] font-mono overflow-auto max-h-52 leading-relaxed ${
                darkMode
                  ? 'bg-slate-950 border-slate-800 text-emerald-300'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              {result
                ? result.bodyText
                : '// Klik "Send Request" atau "Tes Semua API Admin" untuk melihat respons JSON langsung dari Backend PostgreSQL.'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
