// © 2026 Dastero Tech LLC — All rights reserved. See LICENSE.
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function ChangePassword({ onClose }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);
    if (pw.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (pw !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password: pw });
      if (e) { setError(e.message); return; }
      setDone(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(8,12,24,.6)' }} onClick={onClose}>
      <div className="panel rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold text-white">Change password</h2>
          <button onClick={onClose} className="dim text-sm font-semibold">Close</button>
        </div>
        {done ? (
          <p className="soft text-sm">Password updated.</p>
        ) : (
          <>
            <input type="password" autoComplete="new-password" placeholder="New password"
              value={pw} onChange={(e) => { setPw(e.target.value); setError(null); }} className="input mb-3" />
            <input type="password" autoComplete="new-password" placeholder="Confirm new password"
              value={confirm} onChange={(e) => { setConfirm(e.target.value); setError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && submit()} className="input mb-3" />
            <button onClick={submit} disabled={busy}
              className="w-full brandbtn rounded-xl py-2.5 text-sm font-semibold disabled:opacity-60">
              {busy ? 'Saving…' : 'Update password'}
            </button>
            {error && <p className="text-xs mt-2" style={{ color: '#F0584E' }}>{error}</p>}
          </>
        )}
      </div>
    </div>
  );
}
