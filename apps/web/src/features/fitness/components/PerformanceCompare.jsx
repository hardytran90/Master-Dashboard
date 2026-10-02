import { useState } from 'react';
import { SPORTS, periodRange, summarize, formatKmFixed, formatDuration, formatPace, formatSpeed } from '../stats';
import { PanelHead, SportLabel, Tabs } from './fitnessUi';

const PERIODS = [
  { id: 'week', label: 'Weekly', cur: 'This week', prev: 'Last week' },
  { id: 'month', label: 'Monthly', cur: 'This month', prev: 'Last month' },
  { id: 'year', label: 'Yearly', cur: 'This year', prev: 'Last year' },
];

// Average pace (seconds per km) for run, average speed (km/h) for ride.
// null when there is no data, so we never divide by 0.
function avgPace(s) {
  return s.km > 0 ? s.sec / s.km : null;
}
function avgSpeed(s) {
  return s.sec > 0 ? s.km / (s.sec / 3600) : null;
}

// % change of cur vs prev.
// - arrow follows the number itself (▲ value went up, ▼ value went down)
// - tone says whether that change is good ('up' = green) or bad ('down' = red/orange)
// lowerIsBetter is used for pace: a smaller min/km means you got faster → good.
function computeDelta(cur, prev, lowerIsBetter = false) {
  if (cur == null || prev == null) return null; // e.g. no runs last period → no pace to compare
  if (prev > 0) {
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return { arrow: '', text: '0%', tone: '' };
    const wentUp = pct > 0;
    const good = lowerIsBetter ? !wentUp : wentUp;
    return { arrow: wentUp ? '▲' : '▼', text: `${pct}%`, tone: good ? 'up' : 'down' };
  }
  if (cur > 0) return { arrow: '▲', text: 'New', tone: 'up' }; // nothing last period → % would be infinite
  return { arrow: '', text: '0%', tone: '' };
}

// Big badge next to the Run / Ride title (distance change)
function DeltaBadge({ delta, vsLabel }) {
  if (!delta) return null;
  return (
    <div className="fx-delta" title={`Distance ${vsLabel}`}>
      <div className={`fx-delta-value ${delta.tone}`}>
        {delta.arrow && <span className="fx-delta-arrow" aria-hidden="true">{delta.arrow}</span>}
        {delta.text}
      </div>
      <div className="fx-delta-vs">{vsLabel}</div>
    </div>
  );
}

// Small inline change shown next to each "This week / month / year" value
function InlineDelta({ delta }) {
  if (!delta) return null;
  return (
    <span className={`fx-delta-inline ${delta.tone}`}>
      {delta.arrow && <span className="fx-delta-arrow" aria-hidden="true">{delta.arrow}</span>}
      {delta.text}
    </span>
  );
}

export default function PerformanceCompare({ rows }) {
  const [period, setPeriod] = useState('week');
  const meta = PERIODS.find((p) => p.id === period);
  const cur = periodRange(period, 0);
  const prev = periodRange(period, -1);
  const vsLabel = `vs. ${meta.prev.toLowerCase()}`;

  return (
    <section className="fx-panel">
      <PanelHead
        title="Performance compare"
        sub={`${meta.prev}: ${prev.from} → ${prev.to}`}
      >
        <Tabs options={PERIODS} value={period} onChange={setPeriod} label="Compare period" />
      </PanelHead>

      <div className="fx-grid-2">
        {SPORTS.map((type) => {
          const a = summarize(rows, type, cur.from, cur.to);
          const b = summarize(rows, type, prev.from, prev.to);

          const isRun = type === 'run';
          const avgA = isRun ? avgPace(a) : avgSpeed(a);
          const avgB = isRun ? avgPace(b) : avgSpeed(b);
          const formatAvg = (v) => (v == null ? '—' : isRun ? formatPace(v) : formatSpeed(v));

          const metrics = [
            { label: 'Activities', a: a.count, b: b.count, format: (v) => v },
            { label: 'Distance', a: a.km, b: b.km, format: formatKmFixed },
            { label: 'Time', a: a.sec, b: b.sec, format: formatDuration },
            // Pace: lower = faster = better. Speed: higher = better.
            { label: isRun ? 'Avg pace' : 'Avg speed', a: avgA, b: avgB, format: formatAvg, lowerIsBetter: isRun },
          ];

          return (
            <div key={type} className={`sport-${type} fx-compare`}>
              <div className="fx-compare-head">
                <SportLabel type={type} />
                <DeltaBadge delta={computeDelta(a.km, b.km)} vsLabel={vsLabel} />
              </div>
              <table className="fx-compare-table">
                <thead>
                  <tr>
                    <td aria-hidden="true" />
                    <th scope="col">{meta.cur}</th>
                    <th scope="col">{meta.prev}</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((m) => (
                    <tr key={m.label}>
                      <th scope="row">{m.label}</th>
                      <td className="fx-accent">
                        {m.format(m.a)}
                        <InlineDelta delta={computeDelta(m.a, m.b, m.lowerIsBetter)} />
                      </td>
                      <td>{m.format(m.b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </section>
  );
}
