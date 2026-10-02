import { useState } from "react";
import { addDays, startOfWeek, toKey } from '../stats';
import { PanelHead, Tabs } from './fitnessUi';

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
        return Array.from({ length: day }, (_, i) => {
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

  // Points for the trend line: one point at the center top of each bar.
  // Future periods (e.g. Oct–Dec, or days after today) are skipped so the line
  // doesn't drop to 0 for periods that haven't happened yet.
  const todayKey = toKey(new Date());
  const linePoints = buckets
    .map((b, i) => ({ i, pct: (b.km / top) * 100, past: b.from <= todayKey }))
    .filter((p) => p.past)
    .map((p) => ({ x: ((p.i + 0.5) / buckets.length) * 100, y: 100 - p.pct }));

  return (
    <section className={`fx-panel sport-${sport}`}>
      <PanelHead title={`${MODES.find((m) => m.id === mode).label} performance`}>
        <Tabs options={MODES} value={mode} onChange={setMode} label="Chart grouping" />
        <Tabs options={SPORT_TABS} value={sport} onChange={setSport} label="Sport" />
      </PanelHead>

      <div className="fx-chart">
        <div className="fx-chart-y text-gray-600 dark:text-gray-300" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>{t} km</span>
          ))}
        </div>
        <div>
          <div className="fx-chart-plot" style={{ '--rows': tickCount }} role="list" aria-label={`${sport} distance`}>
            {buckets.map((b, i) => {
              const pct = (b.km / top) * 100;
              // Keep the tooltip inside the panel at the left / right edges
              let align = '';
              if (i < 2) align = 'align-start';
              else if (i > buckets.length - 3) align = 'align-end';
              return (
                <div
                  key={b.from}
                  className="fx-chart-col"
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${b.title}: ${b.km.toFixed(2)} km`}
                >
                  {b.km > 0 && <span className="fx-chart-bar" style={{ height: `${pct}%` }} />}
                  <span className={`fx-chart-tip ${align}`} style={{ bottom: `calc(${pct}% + 8px)` }} aria-hidden="true">
                    <span className="fx-chart-tip-title">{b.title}</span>
                    <span className="fx-chart-tip-value">{b.km.toFixed(2)} km</span>
                  </span>
                </div>
              );
            })}
            {/* Trend line drawn over the bars. viewBox 0–100 maps directly to % of the plot */}
            {linePoints.length > 1 && (
              <svg className="fx-chart-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <polyline points={linePoints.map((p) => `${p.x},${p.y}`).join(' ')} />
              </svg>
            )}
            {/* Dots are HTML, not SVG circles, so they stay round when the SVG is stretched */}
            {linePoints.map((p) => (
              <span
                key={p.x}
                className="fx-chart-dot"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                aria-hidden="true"
              />
            ))}
          </div>
          <div className={`fx-chart-x text-gray-600 dark:text-gray-300 ${buckets.length > 16 ? 'dense' : ''}`} aria-hidden="true">
            {buckets.map((b) => (
              <span key={b.from}>{b.label}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}