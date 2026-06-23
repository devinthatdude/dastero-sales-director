// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const signIn = async () => {
    if (busy) return;
    setError(null);
    setBusy(true);
    const { error: e } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    // Generic message on purpose — don't reveal whether the email exists.
    if (e) setError('Invalid email or password.');
    // On success, useAuth's onAuthStateChange listener renders the app.
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-7 w-full max-w-sm shadow-sm">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Dastero Tech · Sales</div>
        <h1 className="text-2xl font-bold text-slate-800 mt-1 mb-5">Pipeline</h1>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          placeholder="you@dasterotech.com"
          className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && signIn()}
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        />
        <button
          onClick={signIn}
          disabled={busy}
          className="w-full text-sm font-semibold bg-slate-800 text-white rounded-lg py-2.5 disabled:opacity-60"
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
      </div>
    </div>
  );
}
