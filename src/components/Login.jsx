// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const send = async () => {
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (e) setError(e.message); else setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-7 w-full max-w-sm shadow-sm">
        <div className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">Dastero Tech · Sales</div>
        <h1 className="text-2xl font-bold text-slate-800 mt-1 mb-5">Pipeline</h1>

        {sent ? (
          <p className="text-sm text-slate-600">Check your email for a sign-in link.</p>
        ) : (
          <>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              type="email"
              placeholder="you@dasterotech.com"
              className="w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            />
            <button onClick={send} className="w-full text-sm font-semibold bg-slate-800 text-white rounded-lg py-2.5">
              Email me a sign-in link
            </button>
            {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
