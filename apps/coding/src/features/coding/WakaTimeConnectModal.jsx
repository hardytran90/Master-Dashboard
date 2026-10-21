import { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';
import { HUB_HOME } from '../../lib/hub';

const CALLBACK_ERRORS = {
  denied: 'You cancelled the WakaTime authorization.',
  error: 'Connecting to WakaTime failed. Please try again.',
  already_linked: 'This WakaTime account is already linked to another Master Dashboard user.',
  expired: 'Your WakaTime connection expired. Please reconnect.',
};

// step = 'connect'  → ask the user to connect (they need a WakaTime account first)
// step = 'importing'→ just came back from WakaTime, history import in progress
export default function WakaTimeConnectModal({ step, callbackError, importInfo }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(CALLBACK_ERRORS[callbackError] || null);
  const primaryRef = useRef(null);

  useEffect(() => { primaryRef.current?.focus(); }, [step]);

  async function handleConnect() {
    setBusy(true);
    setError(null);
    try {
      const { url } = await api.getWakaTimeConnectUrl();
      window.location.assign(url); // full-page OAuth round-trip → back to /coding/?wakatime=...
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="ct-modal-backdrop">
      <div role="dialog" aria-modal="true" aria-labelledby="wk-title" className="ct-modal">
        {step === 'importing' ? (
          <>
            <p className="ct-eyebrow">WakaTime connected</p>
            <h2 id="wk-title" className="mt-1 text-xl font-bold text-white">Importing your coding history…</h2>
            <p className="mt-3 text-sm text-slate-400">
              WakaTime is preparing an export of every day since you created your account.
              This usually takes under a minute.
            </p>
            <div className="ct-progress mt-5" aria-hidden="true">
              <span style={{ width: `${importInfo?.percent ?? 10}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500" aria-live="polite">
              {importInfo?.label ?? 'Starting…'}
            </p>
          </>
        ) : (
          <>
            <p className="ct-eyebrow">Coding Tracker</p>
            <h2 id="wk-title" className="mt-1 text-xl font-bold text-white">Connect your WakaTime account</h2>
            <p className="mt-3 text-sm text-slate-400">
              Coding Tracker reads your daily coding time from WakaTime. Connect once and your full
              history is imported into Master Dashboard.
            </p>

            <ol className="mt-4 space-y-2 text-sm text-slate-300">
              <li>
                <span className="ct-step">1</span>
                No account yet?{' '}
                <a className="ct-link" href="https://wakatime.com/signup" target="_blank" rel="noreferrer">
                  Create a free WakaTime account
                </a>{' '}
                and install the plugin for your editor.
              </li>
              <li><span className="ct-step">2</span>Click Connect and approve access on WakaTime.</li>
            </ol>

            {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <a href={HUB_HOME} className="ct-btn-ghost text-center">Back to dashboard</a>
              <button ref={primaryRef} type="button" className="ct-btn" onClick={handleConnect} disabled={busy}>
                {busy ? 'Opening WakaTime…' : 'Connect WakaTime'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
