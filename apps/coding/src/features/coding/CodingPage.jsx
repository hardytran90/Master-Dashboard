import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Heatmap } from '@md/ui';
import { useAuth } from '@md/auth-client';
import { api } from '../../lib/api';
import { HUB_HOME, goToHubLogin } from '../../lib/hub';
import { lastNDays, toKey, formatDuration } from '../../lib/dates';
import WakaTimeConnectModal from './WakaTimeConnectModal';
import GoalDialog from './components/GoalDialog';
import ComparisonCards from './components/ComparisonCards';
import TrendChart from './components/TrendChart';
import BreakdownSection from './components/BreakdownSection';

const POLL_MS = 4000;
const MAX_POLLS = 45; // ~3 minutes

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function levelFor(secs, goalSec) {
  const pct = (secs / goalSec) * 100;
  if (secs <= 0) return 0;
  if (pct >= 85) return 4;
  if (pct >= 50) return 3;
  if (pct >= 30) return 2;
  return 1;
}

export default function CodingPage() {
  const { logout } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const range = useMemo(() => lastNDays(365), []);

  const [connection, setConnection] = useState({ state: 'loading' }); // loading | connected | disconnected
  const [modal, setModal] = useState(null);       // null | { step: 'connect', error } | { step: 'importing' }
  const [importInfo, setImportInfo] = useState(null);
  const [importing, setImporting] = useState(false);
  const [banner, setBanner] = useState(null);
  const [logs, setLogs] = useState([]);
  const [overview, setOverview] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);
  const started = useRef(false);

  const handleAuthError = useCallback((err) => {
    if (err?.status === 401 && err.code !== 'WAKATIME_RECONNECT' && !/WakaTime/.test(err.message)) {
      logout();
      goToHubLogin();
      return true;
    }
    return false;
  }, [logout]);

  // Polls the WakaTime data dump until the full history (incl. projects & languages) is saved.
  const importHistory = useCallback(async (onProgress) => {
    for (let i = 0; i < MAX_POLLS; i++) {
      const res = await api.importWakaTimeHistory();
      if (res.status === 'done') return res;
      onProgress?.(res.percent ?? 0);
      await sleep(POLL_MS);
    }
    return { status: 'timeout' };
  }, []);

  const reportImport = useCallback((res) => {
    if (res.status === 'done') {
      setBanner({ tone: 'ok', text: `Imported ${res.imported} days of coding history${res.from ? ` (since ${res.from})` : ''}.` });
    } else {
      setBanner({ tone: 'warn', text: 'WakaTime is still preparing your history. Reload this page in a few minutes.' });
    }
  }, []);

  // Right after the OAuth round-trip: recent days first, then the full history.
  const runFirstImport = useCallback(async () => {
    setModal({ step: 'importing' });
    setImportInfo({ percent: 5, label: 'Syncing the last 14 days…' });
    await api.syncWakaTime().catch(() => {});
    setReloadKey((k) => k + 1);
    try {
      const res = await importHistory((pct) =>
        setImportInfo({ percent: Math.max(10, pct), label: `WakaTime is preparing your export… ${Math.round(pct)}%` }));
      reportImport(res);
    } catch (err) {
      if (handleAuthError(err)) return;
      setBanner({ tone: 'warn', text: `History import failed: ${err.message}` });
    }
    setModal(null);
    setReloadKey((k) => k + 1);
  }, [handleAuthError, importHistory, reportImport]);

  // "Import from WakaTime" button (older history without project/language details)
  async function handleReimport() {
    setImporting(true);
    setBanner({ tone: 'ok', text: 'Importing projects & languages from WakaTime… this can take a minute.' });
    try {
      reportImport(await importHistory());
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (!handleAuthError(err)) setBanner({ tone: 'warn', text: `Import failed: ${err.message}` });
    } finally {
      setImporting(false);
    }
  }

  // 1. Check the WakaTime connection once
  useEffect(() => {
    if (started.current) return; // StrictMode runs effects twice in dev
    started.current = true;

    const callback = searchParams.get('wakatime'); // set by the API after OAuth
    if (callback) setSearchParams({}, { replace: true });

    (async () => {
      try {
        const status = await api.getWakaTimeStatus();
        if (!status.connected) {
          setConnection({ state: 'disconnected' });
          setModal({ step: 'connect', error: status.expired ? 'expired' : callback });
          return;
        }
        setConnection({ state: 'connected', username: status.username, lastSyncedAt: status.lastSyncedAt });
        if (callback === 'connected') {
          await runFirstImport();
        } else {
          api.syncWakaTime()
            .then((r) => {
              if (r?.lastSyncedAt) setConnection((c) => ({ ...c, lastSyncedAt: r.lastSyncedAt }));
              setReloadKey((k) => k + 1);
            })
            .catch(() => {});
        }
      } catch (err) {
        if (handleAuthError(err)) return;
        setConnection({ state: 'disconnected' });
        setBanner({ tone: 'warn', text: err.message });
      }
    })();
  }, [searchParams, setSearchParams, runFirstImport, handleAuthError]);

  // 2. Load data whenever something changed
  useEffect(() => {
    if (connection.state !== 'connected') return;
    let cancelled = false;
    Promise.all([api.getCodingLogs(range.from, range.to), api.getOverview(toKey(new Date()))])
      .then(([rows, ov]) => { if (!cancelled) { setLogs(rows ?? []); setOverview(ov); } })
      .catch((err) => {
        if (cancelled || handleAuthError(err)) return;
        setBanner({ tone: 'warn', text: err.message });
      });
    return () => { cancelled = true; };
  }, [connection.state, range, reloadKey, handleAuthError]);

  async function handleSync() {
    setSyncing(true);
    try {
      const r = await api.syncWakaTime();
      if (r?.lastSyncedAt) setConnection((c) => ({ ...c, lastSyncedAt: r.lastSyncedAt }));
      setReloadKey((k) => k + 1);
    } catch (err) {
      if (!handleAuthError(err)) setBanner({ tone: 'warn', text: err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSaveGoal(minutes) {
    const g = await api.setGoal(minutes);
    setOverview((o) => (o ? { ...o, goal: g } : o));
    setReloadKey((k) => k + 1);
  }

  const goalSec = (overview?.goal.dailyMinutes ?? 60) * 60;

  const heatmapData = useMemo(() => {
    const map = {};
    for (const r of logs) map[r.date] = (map[r.date] ?? 0) + r.seconds;
    return Object.fromEntries(Object.entries(map).map(([date, secs]) => [
      date, { level: levelFor(secs, goalSec), tooltip: `${date} — ${formatDuration(secs)}` },
    ]));
  }, [logs, goalSec]);

  const todaySec = overview?.todaySec ?? 0;
  const todayPct = Math.round((todaySec / goalSec) * 100);
  const weekSec = overview?.comparisons.week.current.sec ?? 0;
  const weekGoal = goalSec * 7;

  return (
    <main className="ct-page">
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <a href={HUB_HOME} className="ct-eyebrow hover:underline">← Master Dashboard</a>
            <h1 className="ct-title">Coding Tracker</h1>
            {connection.state === 'connected' && (
              <p className="ct-muted mt-1">
                WakaTime{connection.username ? ` · @${connection.username}` : ''}
                {connection.lastSyncedAt && ` · synced ${new Date(connection.lastSyncedAt).toLocaleString()}`}
              </p>
            )}
          </div>
          {connection.state === 'connected' && (
            <div className="flex gap-2">
              <button className="ct-btn-ghost" onClick={() => setGoalOpen(true)} disabled={!overview}>Set goal</button>
              <button className="ct-btn-ghost" onClick={handleSync} disabled={syncing}>
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
            </div>
          )}
        </header>

        {banner && (
          <div role="status" className={`ct-panel flex items-start justify-between gap-4 text-sm ${banner.tone === 'ok' ? 'text-teal-300' : 'text-amber-300'}`}>
            <span>{banner.text}</span>
            <button className="text-slate-500 hover:text-slate-300" onClick={() => setBanner(null)} aria-label="Dismiss">✕</button>
          </div>
        )}

        {overview && (
          <>
            {/* Today + goal */}
            <section className="ct-panel grid gap-6 md:grid-cols-[1.2fr_1fr]">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <p className="ct-label">Today</p>
                  <button className="text-xs font-semibold text-teal-300 hover:underline" onClick={() => setGoalOpen(true)}>
                    Goal {formatDuration(goalSec)}{overview.goal.isDefault ? ' (default)' : ''} · edit
                  </button>
                </div>
                <p className="ct-value text-5xl">{formatDuration(todaySec)}</p>
                <div className="ct-progress mt-4" role="progressbar" aria-label="Daily goal"
                  aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, todayPct)}>
                  <span style={{ width: `${Math.min(100, todayPct)}%` }} />
                </div>
                <p className="mt-2 text-sm text-slate-400">
                  {todaySec >= goalSec
                    ? <>Goal reached ✓ — {todayPct}% of {formatDuration(goalSec)}</>
                    : <>{todayPct}% · <span className="text-slate-200">{formatDuration(goalSec - todaySec)}</span> left to reach today’s goal</>}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 self-center">
                <MiniStat label="Week vs goal" value={`${Math.round((weekSec / weekGoal) * 100)}%`}
                  sub={`${formatDuration(weekSec)} / ${formatDuration(weekGoal)}`} />
                <MiniStat label="Goal hit this month" value={`${overview.goalHit.days}/${overview.goalHit.of}`} sub="days" />
              </div>
            </section>

            <ComparisonCards comparisons={overview.comparisons} />
            <TrendChart days={overview.last30} goalSec={goalSec} />
            <BreakdownSection reloadKey={reloadKey} hasBreakdown={overview.hasBreakdown}
              onImport={handleReimport} importing={importing} />
          </>
        )}

        {connection.state === 'connected' && (
          <section className="ct-panel">
            <h2 className="ct-label mb-4">12-month activity</h2>
            <Heatmap from={range.from} to={range.to} data={heatmapData} colorScale="teal"
              weekStartsOn={1} emptyTooltip={(d) => `${d} — no coding`} />
            <p className="mt-2 text-[11px] text-slate-500">Colour = share of your daily goal.</p>
          </section>
        )}
      </div>

      {modal && <WakaTimeConnectModal step={modal.step} callbackError={modal.error} importInfo={importInfo} />}
      {goalOpen && overview && (
        <GoalDialog initialMinutes={overview.goal.dailyMinutes} onSave={handleSaveGoal} onClose={() => setGoalOpen(false)} />
      )}
    </main>
  );
}

function MiniStat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <p className="ct-label">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
      <p className="text-xs text-slate-500">{sub}</p>
    </div>
  );
}
