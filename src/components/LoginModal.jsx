import React, { useState } from 'react';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { login } from '../services/api';

export default function LoginModal({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;

    setLoading(true);
    setError('');
    try {
      const data = await login(username.trim(), password);
      onLoginSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0d0e12] flex items-center justify-center p-4">
      <div className="bg-[#181920] rounded-[32px] p-7 border border-[#2d2f3c] max-w-sm w-full shadow-2xl space-y-6">
        {/* Header with App Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/10">
            🥗
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">HealthyMe</h2>
          <p className="text-xs text-neutral-400">Sign in to access your nutrition tracker</p>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full bg-[#121318] border border-[#2d2f3c] rounded-2xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition text-sm"
                required
                autoCapitalize="none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#121318] border border-[#2d2f3c] rounded-2xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition text-sm"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-neutral-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin"></span>
                Signing In...
              </span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
