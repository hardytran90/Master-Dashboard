import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';

// Messages matching the ?strava=... flag the backend appends when redirecting to /fitness
const CALLBACK_MESSAGES = {
  connected: { type: 'success', text: 'Connected with Strava. Click Sync Data to fetch activities.' },
  already_linked: { type: 'error', text: 'This Strava account is linked with other user.' },
  scope: { type: 'error', text: 'Need allowance to see activities on Strava to continue syncing.' },
  error: { type: 'error', text: 'Connection to Strava is failed or canceled.' },
};

function formatTime(iso) {
  return iso ? new Date(iso).toLocaleString('vi-VN') : 'not yet';
}

export default function StravaSyncButton({ onSynced }) {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState(null); // null = still loading
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState(() => CALLBACK_MESSAGES[searchParams.get('strava')] || null);

  // Load the connection status once on mount (no automatic syncing)
  useEffect(() => {
    api.getStravaStatus()
      .then(setStatus)
      .catch(() => setStatus({ connected: false }));
  }, []);

  async function handleConnect() {
    try {
      const { url } = await api.getStravaConnectUrl();
      window.location.href = url; // go to Strava's authorization page
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const r = await api.syncStrava();
      setStatus((s) => ({ ...s, lastSyncedAt: r.lastSyncedAt }));
      setMessage({
        type: 'success',
        text: `Synced ${r.total} activities: ${r.created} new, ${r.updated} updated.`,
      });
      onSynced?.(); // let the parent reload the activity list
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSyncing(false);
    }
  }

  if (!status) return null;

  return (
    <div className="card sync-bar">
      <div>
        <p className="sync-title">Strava</p>
        <p className="sync-meta">
          {status.connected
            ? `Last sync: ${formatTime(status.lastSyncedAt)}`
            : 'Not connected with Strava account'}
        </p>
        {message && (
          <p className={message.type === 'error' ? 'sync-message-error' : 'sync-message'}>
            {message.text}
          </p>
        )}
      </div>

      {status.connected ? (
        <button type="button" className="btn-strava" onClick={handleSync} disabled={syncing}>
          {syncing ? 'Syncing…' : 'Sync Data'}
        </button>
      ) : (
        <button type="button" className="btn-strava" onClick={handleConnect}>
          Connect Strava
        </button>
      )}
    </div>
  );
}
