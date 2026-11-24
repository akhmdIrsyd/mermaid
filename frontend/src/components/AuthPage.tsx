import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  Download,
  GitBranch,
  AlertCircle,
} from 'lucide-react';
import { authApi, setAuthToken } from '../api/client';
import type { AuthUser } from '../types';

interface AuthPageProps {
  onAuthenticated: (user: AuthUser) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (name.trim().length < 2) {
        setError('Nama lengkap minimal 2 karakter.');
        return;
      }
      if (password.length < 6) {
        setError('Password minimal 6 karakter.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Konfirmasi password tidak cocok.');
        return;
      }
    }

    setLoading(true);
    try {
      const res =
        mode === 'register'
          ? await authApi.register({
              name: name.trim(),
              email: email.trim(),
              password,
            })
          : await authApi.login({
              email: email.trim(),
              password,
            });

      setAuthToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Autentikasi gagal. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-y-auto canvas-grid-light flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden border border-slate-200/90 bg-white shadow-2xl shadow-slate-900/10">
        {/* Left Showcase Panel */}
        <div className="lg:col-span-6 bg-gradient-to-br from-[#161324] via-[#1f1833] to-[#2a122c] text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#e0095f]/25 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#f41b72] to-[#c90652] flex items-center justify-center shadow-lg shadow-[#e0095f]/30">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                  <path d="M4.2 5.2C6.8 5.4 9.5 6.8 11.4 9.1c.35.42.85.42 1.2 0C14.5 6.8 17.2 5.4 19.8 5.2c.65-.05 1.2.46 1.2 1.12v2.1c0 3.72-2.06 6.76-5.22 8.2-.42.19-.78.57-.78 1.04v.84c0 .55-.45 1-1 1h-4c-.55 0-1-.45-1-1v-.84c0-.47-.36-.85-.78-1.04C5.06 15.18 3 12.14 3 8.42v-2.1c0-.66.55-1.17 1.2-1.12z" />
                </svg>
              </div>
              <div>
                <div className="text-lg font-extrabold tracking-tight leading-none">
                  Mermaid Studio Pro
                </div>
                <div className="text-[11px] font-semibold text-rose-300 mt-1 tracking-wider uppercase">
                  All Premium Features Unlocked
                </div>
              </div>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight">
              Visual diagramming &amp; architecture workspace tersimpan aman di database.
            </h1>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              Buat, atur posisi node/subgraph/arrow secara bebas, simpan riwayat versi tanpa batas,
              dan akses diagram Anda dari mana saja dengan akun pribadi.
            </p>

            <div className="mt-8 space-y-3.5">
              {[
                {
                  icon: <Database className="w-4 h-4 text-rose-400" />,
                  title: 'Sinkronisasi PostgreSQL Otomatis',
                  desc: 'Semua folder, diagram, posisi manual, catatan & komentar tersimpan di database.',
                },
                {
                  icon: <Layers className="w-4 h-4 text-sky-400" />,
                  title: '4 Mode Layout + Manual Drag & Drop',
                  desc: 'Hierarchical, Adaptive (ELK), Orthogonal 90°, Balanced, plus drag subgraph & panah.',
                },
                {
                  icon: <Download className="w-4 h-4 text-emerald-400" />,
                  title: 'Export Studio Ultra-HD Tanpa Watermark',
                  desc: 'Export PNG hingga 8x, Vector SVG, Print PDF, Markdown, dan Share Link instan.',
                },
                {
                  icon: <GitBranch className="w-4 h-4 text-amber-400" />,
                  title: 'Unlimited Version History & Diff Viewer',
                  desc: 'Bandingkan perubahan antar versi dan kembalikan checkpoint dengan 1 klik.',
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{item.title}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
              Self-Hosted Full-Stack Docker
            </span>
            <span>PostgreSQL + Express + React</span>
          </div>
        </div>

        {/* Right Auth Form Panel */}
        <div className="lg:col-span-6 p-8 sm:p-10 flex flex-col justify-center bg-white text-slate-800">
          {/* Mode Switcher */}
          <div className="flex p-1 rounded-2xl bg-slate-100 mb-7">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Masuk (Login)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Buat Akun Baru
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {mode === 'login' ? 'Selamat datang kembali' : 'Buat akun Mermaid Studio'}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'login'
                ? 'Masuk untuk membuka seluruh diagram dan folder yang tersimpan di akun Anda.'
                : 'Daftar gratis untuk menyimpan diagram Anda ke database PostgreSQL secara otomatis.'}
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium animate-pop">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#e0095f] focus:ring-2 focus:ring-[#e0095f]/15 text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#e0095f] focus:ring-2 focus:ring-[#e0095f]/15 text-sm outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#e0095f] focus:ring-2 focus:ring-[#e0095f]/15 text-sm outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Konfirmasi Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-[#e0095f] focus:ring-2 focus:ring-[#e0095f]/15 text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#e0095f] to-[#c40753] hover:brightness-105 text-white text-sm font-bold shadow-lg shadow-[#e0095f]/25 transition cursor-pointer disabled:opacity-60"
            >
              <span>
                {loading
                  ? 'Memproses...'
                  : mode === 'login'
                  ? 'Masuk ke Workspace'
                  : 'Buat Akun & Mulai'}
              </span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            {mode === 'login' ? (
              <>
                Belum punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-bold text-[#e0095f] hover:underline cursor-pointer"
                >
                  Daftar sekarang
                </button>
              </>
            ) : (
              <>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="font-bold text-[#e0095f] hover:underline cursor-pointer"
                >
                  Masuk di sini
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
