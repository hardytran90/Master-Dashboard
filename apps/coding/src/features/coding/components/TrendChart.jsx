import { useState } from 'react';
import { formatDuration, shortDate } from '../../../lib/dates';
import { ACCENT } from './charts';

// Last 30 days, one column per day, goal drawn as a reference line.
export default function TrendChart({ days, goalSec }) {
  const [hover, setHover] = useState(null);
  const maxSec = Math.max(goalSec * 1.15, ...days.map((d) => d.sec), 3600);
  const ticks = niceTicks(maxSec);
  const top = ticks.at(-1);
  const avg = days.reduce((s, d) => s + d.sec, 0) / days.length;
  const hit = days.filter((d) => d.sec >= goalSec).length;

  return (
    <section className="ct-panel">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="ct-label">Daily coding · last 30 days</h2>
        <p className="text-xs text-slate-400">
          avg <span className="font-semibold text-slate-200">{formatDuration(avg)}</span>/day ·
          goal hit <span className="font-semibold text-slate-200">{hit}/30</span> days
        </p>
      </div>

      <div className="flex gap-2">
        {/* y axis */}
        <div className="relative w-9 shrink-0 text-right text-[10px] text-slate-500" style={{ height: 180 }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / top) * 100}%` }}>
              {t / 3600}h
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height: 180 }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-slate-800" style={{ top: `${100 - (t / top) * 100}%` }} />
          ))}
          {/* goal reference line */}
          <div className="absolute inset-x-0 z-10 border-t-2 border-slate-300/70" style={{ top: `${100 - (goalSec / top) * 100}%` }}>
            <span className="absolute -top-2.5 left-1 rounded bg-slate-900 px-1 text-[10px] font-semibold leading-4 text-slate-200 ring-1 ring-slate-600">goal {formatDuration(goalSec)}</span>
          </div>

          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d) => (
              <div key={d.date} className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)}>
                <span className="block w-full max-w-6 rounded-t"
                  style={{ height: `${(d.sec / top) * 100}%`, background: ACCENT, opacity: d.sec >= goalSec ? 1 : 0.55 }} />
                <span className="sr-only">{d.date}: {formatDuration(d.sec)}</span>
              </div>
            ))}
          </div>

          {hover && (
            <div className="pointer-events-none absolute -top-2 z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-slate-950 px-2 py-1 text-xs text-white shadow ring-1 ring-slate-700"
              style={{ left: `${((days.indexOf(hover) + 0.5) / days.length) * 100}%` }}>
              <span className="text-slate-400">{shortDate(hover.date)}</span> · <b>{formatDuration(hover.sec)}</b>
              {hover.sec >= goalSec && ' ✓ goal'}
            </div>
          )}
        </div>
      </div>

      <div className="ml-11 mt-1.5 flex justify-between text-[10px] text-slate-500">
        <span>{shortDate(days[0].date)}</span>
        <span>{shortDate(days[14].date)}</span>
        <span>Today</span>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">Brighter bars = goal reached.</p>
    </section>
  );
}

// 0, 1h, 2h… (or 2h steps when the range is large)
function niceTicks(maxSec) {
  const maxH = Math.ceil(maxSec / 3600);
  const step = maxH > 8 ? 2 : 1;
  const ticks = [];
  for (let h = 0; h <= Math.ceil(maxH / step) * step; h += step) ticks.push(h * 3600);
  return ticks;
}
