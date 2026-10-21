import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import { api } from '../../lib/api';
import { HUB_APPS } from './apps';
import { Skeleton } from './HubWidgets';
import { todayKey, timeAgo } from './format';

const ICONS = {
  run: <path d="M13 4a2 2 0 1 0 0-.01M7 21l3-6 2.5 2V21M10 15l1-5 3 2 3 1M8 9l3-1" />,
  code: <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />,
  pen: <path d="M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4" />,
  book: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h13" />,
};
const STATUS_LABEL = { live: null, beta: 'Beta', soon: 'Coming soon' };

function AppIcon({ name, src, color }) {
  if (src) {
    // Same Run glyph as My Fitness, painted in the card color via CSS mask
    return (
      <span className="hub-icon" style={{ background: `${color}22`, color }}>
        <span className="fx-glyph h-7 w-7" style={{ '--glyph': `url(${src})` }} aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="hub-icon" style={{ background: `${color}22`, color }}>
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[name]}
      </svg>
    </span>
  );
}

function AppCard({ app, summary, loading }) {
  const { Body } = app;
  const label = STATUS_LABEL[app.status];
  const section = summary?.[app.summary];
  const synced = timeAgo(section?.lastSyncedAt);
  const clickable = app.status !== 'soon';

  const content = (
    <>
      <header className="flex items-center gap-3">
        <AppIcon name={app.icon} src={app.iconSrc} color={app.accent} />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight tracking-tight text-white sm:text-xl">{app.title}</h2>
          <p className="truncate text-xs text-slate-400">
            {app.meta?.(section) ?? (app.status === 'soon' ? 'Preview from your data' : '')}
            {synced && ` · synced ${synced}`}
          </p>
        </div>
        {label && <span className={`hub-badge ${app.status === 'soon' ? 'hub-badge-muted' : ''}`}>{label}</span>}
      </header>

      <div className="mt-5 flex-1">
        {loading ? <Skeleton /> : section ? <Body data={section} accent={app.accent} /> : null}
      </div>

      {clickable && (
        <footer className="mt-6 flex items-center justify-end border-t border-white/10 pt-4 text-sm font-semibold text-slate-200">
          Open {app.title} <span aria-hidden="true" className="hub-arrow ml-1">→</span>
        </footer>
      )}
      <span className="hub-card-bar" style={{ background: app.accent }} aria-hidden="true" />
    </>
  );

  if (!clickable) return <article className="hub-card hub-card-disabled" aria-disabled="true">{content}</article>;
  return app.external
    ? <a href={app.href} className="hub-card">{content}</a>
    : <Link to={app.href} className="hub-card">{content}</Link>;
}

export default function HubPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    let cancelled = false;
    api.getHubSummary(todayKey())
      .then((s) => { if (!cancelled) setSummary(s); })
      .catch((err) => {
        if (cancelled) return;
        if (/token/i.test(err.message)) { logout(); navigate('/login'); return; }
        setError(err.message);
      });
    return () => { cancelled = true; };
  }, [logout, navigate]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="hub-page">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">{today}</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Master Dashboard</h1>
          </div>
          <button type="button" onClick={handleLogout} className="hub-logout">Log out</button>
        </header>

        {error && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">Couldn’t load your summary: {error}</p>}

        <main className="grid gap-5 lg:grid-cols-2">
          {HUB_APPS.map((app) => (
            <AppCard key={app.key} app={app} summary={summary} loading={!summary && !error} />
          ))}
        </main>
      </div>
    </div>
  );
}
