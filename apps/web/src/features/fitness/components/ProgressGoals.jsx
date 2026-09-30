import { useState } from 'react';
import { SPORTS, addDays, periodRange, summarize, toKey, formatDuration, formatElev } from '../stats';
import { PanelHead, SportLabel, Tabs } from './fitnessUi';

const PERIODS = [
  { id: 'week', label: 'Weekly', name: 'This week' },
  { id: 'month', label: 'Monthly', name: 'This month' },
  { id: 'year', label: 'Yearly', name: 'This year' },
];

// Save data in localStorage of browsers
const GOALS_KEY = 'fitness.goals.v1';
const DEFAULT_GOALS = {
  week: { run: 25, ride: 10 },
  month: { run: 100, ride: 40 },
  year: { run: 1000, ride: 500 },
};

function loadGoals() {
  try {
    const saved = JSON.parse(localStorage.getItem(GOALS_KEY));
    return { ...DEFAULT_GOALS, ...(saved || {}) };
  } catch {
    return DEFAULT_GOALS;
  }
}

export default function ProgressGoals({ rows }) {
  const [period, setPeriod] = useState('week');
  const [goals, setGoals] = useState(loadGoals);
  const [draft, setDraft] = useState(null);
  const [draftError, setDraftError] = useState('');

  const meta = PERIODS.find((p) => p.id === period);
  const range = periodRange(period);
  const goal = goals[period];

  function openDraft() {
    setDraft({ run: String(goal.run), ride: String(goal.ride) });
    setDraftError('');
  }

  function saveDraft() {
    const run = Number(draft.run);
    const ride = Number(draft.ride);
    if (!(run > 0) || !(ride > 0)) {
      setDraftError('Enter a distance greater than 0 km for both goals.');
      return;
    }
    const next = { ...goals, [period]: { run, ride } };
    setGoals(next);
    try {
      localStorage.setItem(GOALS_KEY, JSON.stringify(next));
    } catch {
    }
    setDraft(null);
  }

  // 7 dots for each day of week (only for weekly format)
  const weekKeys = period === 'week' ? Array.from({ length: 7 }, (_, i) => toKey(addDays(range.start, i))) : [];

  const summaries = Object.fromEntries(SPORTS.map((t) => [t, summarize(rows, t, range.from, range.to)]));
  const combinedKm = summaries.run.km + summaries.ride.km;
  const combinedGoal = goal.run + goal.ride;

  return (
    <section className="fx-panel">
      <PanelHead
        title="Progress goals"
        sub={
          <span className='text-gray-300'>
            Set distance goals and track progress.
            <br />
            {meta.name}: {range.from} → {range.to}
          </span>
        }
      >
        <Tabs options={PERIODS} value={period} onChange={(p) => { setPeriod(p); setDraft(null); }} label="Goal period" />
        {!draft && (
          <button type="button" className="fx-btn fx-btn-accent" onClick={openDraft}>
            Set goal
          </button>
        )}
      </PanelHead>

      {draft && (
        <div className="fx-card" style={{ marginBottom: 12 }}>
          <div className="fx-grid-2">
            {SPORTS.map((t) => (
              <label key={t} className={`sport-${t} fx-stack`}>
                <span className="fx-sport-name">{t} goal (km, {meta.name.toLowerCase()})</span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className="fx-input"
                  value={draft[t]}
                  onChange={(e) => setDraft((d) => ({ ...d, [t]: e.target.value }))}
                />
              </label>
            ))}
          </div>
          {draftError && <p className="form-error" style={{ marginTop: 8 }}>{draftError}</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="button" className="fx-btn fx-btn-accent" onClick={saveDraft}>Save goal</button>
            <button type="button" className="fx-btn fx-btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="fx-grid-2">
        {SPORTS.map((type) => {
          const s = summaries[type];
          const target = goal[type];
          const pct = target > 0 ? (s.km / target) * 100 : 0;
          return (
            <div key={type} className={`sport-${type} fx-card`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <SportLabel type={type} />
                <span style={{ fontSize: 13, color: '#fff' }}>
                  {Number(s.km.toFixed(1))} / {target} km
                </span>
              </div>

              <div
                className="fx-bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(pct))}
                aria-label={`${type} goal progress`}
              >
                <span style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <div className="fx-kv" style={{ marginBottom: 8 }}>{pct.toFixed(1)}% of goal</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 12 }}>
                <div className="fx-kv">
                  <div>Total time: <span className="fx-accent">{formatDuration(s.sec)}</span></div>
                  <div>Total elevation gained: <span className="fx-accent">{formatElev(s.elev)}</span></div>
                  <div>Total activities: <span className="fx-accent">{s.count}</span></div>
                </div>
                {weekKeys.length > 0 && (
                  <div className="fx-dots" aria-hidden="true">
                    {weekKeys.map((k) => (
                      <span key={k} className={`fx-dot ${s.days.has(k) ? 'on' : ''}`} title={k} />
                    ))}
                  </div>
                )}
              </div>

              <div className="fx-muted" style={{ marginTop: 10 }}>
                {s.days.size} / {range.days} days
              </div>
            </div>
          );
        })}
      </div>

      <details className="fx-details">
        <summary>Combined run + ride</summary>
        <p className="fx-muted" style={{ marginTop: 6 }}>
          {Number(combinedKm.toFixed(1))} / {combinedGoal} km ·{' '}
          {combinedGoal > 0 ? ((combinedKm / combinedGoal) * 100).toFixed(1) : '0.0'}% of combined goal
        </p>
      </details>
    </section>
  );
}
