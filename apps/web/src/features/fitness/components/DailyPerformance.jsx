import { useState } from "react";
import { addDays, startOfWeek, toKey } from '../stats';
import { PaneHead, Tabs } from './fitnessUi';

const MODES = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];
const SPORT_TABS = [
  { id: 'run', label: 'Run' },
  { id: 'ride', label: 'Ride' },
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const NICE_STEPS = [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];

// Daily = everyday of current month
// Weekly = 12 latest weeks
// Monthly = 12 months of current year
function buildBuckets(mode, today = new Date()) {
    if (mode === 'daily') {
        const year = today.getFullYear();
        const month = today.getMonth();
        const day = new Date(year, month + 1, 0).getDate();
        return Array.from({ length: n }, (_, i) => {
            const key = toKey(new Date(year, month, i + 1, 12));
            return { from: key, to: key, label: String(i + 1), title: key };
        });
    }
    if (mode === 'weekly') {
        const thisWeek = startOfWeek(today);
        return Array.from({ length: 12 }, (_, i) => {
            const start = addDays(thisWeek, -7 * (11 - i));
            const from = toKey(start);
            const to = toKey(addDays(start, 6));
            return { from, to, label: `${start.getDate()}/${start.getMonth() + 1}`, title: `${from} → ${to}` };
        });
  }
    const y = today.getFullYear();
    return MONTHS.map((label, m) => ({
      from: toKey(new Date(y, m, 1, 12)),
      to: toKey(new Date(y, m + 1, 0, 12)),
      label,
      title: `${label} ${y}`,
    }));
}

function niceScale(max) {
  if (max <= 0) return { top: 1, step: 0.1 };
  const step = NICE_STEPS.find((s) => max / s <= 10) ?? Math.ceil(max / 10);
  return { top: Math.ceil(max / step) * step, step };
}

export default function DailyPerformance({ rows }) {
  const [mode, setMode] = useState('daily');
  const [sport, setSport] = useState('run');

  const buckets = buildBuckets(mode).map((b) => ({
    ...b,
    km: rows.reduce((sum, r) => (r.type === sport && r.key >= b.from && r.key <= b.to ? sum + r.km : sum), 0),
  }));

  const { top, step } = niceScale(Math.max(...buckets.map((b) => b.km)));
  const tickCount = Math.round(top / step);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => Number((i * step).toFixed(2))).reverse();

  return (
    <section className={`fx-panel sport-${sport}`}>
      <PanelHead title={`${MODES.find((m) => m.id === mode).label} performance`}>
        <Tabs options={MODES} value={mode} onChange={setMode} label="Chart grouping" />
        <Tabs options={SPORT_TABS} value={sport} onChange={setSport} label="Sport" />
      </PanelHead>

      <div className="fx-chart">
        <div className="fx-chart-y" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>{t} km</span>
          ))}
        </div>
        <div>
          <div className="fx-chart-plot" style={{ '--rows': tickCount }} role="list" aria-label={`${sport} distance`}>
            {buckets.map((b) => (
              <div
                key={b.from}
                className="fx-chart-col"
                role="listitem"
                title={`${b.title}: ${b.km.toFixed(2)} km`}
                aria-label={`${b.title}: ${b.km.toFixed(2)} km`}
              >
                {b.km > 0 && <span className="fx-chart-bar" style={{ height: `${(b.km / top) * 100}%` }} />}
              </div>
            ))}
          </div>
          <div className={`fx-chart-x ${buckets.length > 16 ? 'dense' : ''}`} aria-hidden="true">
            {buckets.map((b) => (
              <span key={b.from}>{b.label}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}