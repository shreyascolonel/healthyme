import React, { useState } from 'react';
import { KeyRound, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { changePassword } from '../services/api';

export default function ForceChangePasswordModal({ user, onPasswordChanged }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please retype carefully.');
      return;
    }

    if (newPassword === 'welcome123') {
      setError('You must choose a different password from the default "welcome123".');
      return;
    }

    setLoading(true);
    try {
      const data = await changePassword(newPassword, confirmPassword);
      onPasswordChanged(data.user);
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#181920] rounded-[32px] p-7 border border-[#2d2f3c] max-w-sm w-full shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Set Your New Password</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Welcome, <strong className="text-white">{user?.display_name || user?.username}</strong>! For security, you must replace the default password before proceeding.
          </p>
        </div>

        {error && (
          <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-[#121318] border border-[#2d2f3c] rounded-2xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                required
                minLength={6}
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
              Retype New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retype matching password"
                className="w-full bg-[#121318] border border-[#2d2f3c] rounded-2xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-neutral-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? 'Updating Password...' : 'Save & Continue to App'}
          </button>
        </form>
      </div>
    </div>
  );
}
