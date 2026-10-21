import { useState } from 'react';
import { formatDuration } from '../../../lib/dates';
import { SERIES, OTHER, topN } from './charts';

const SIZE = 200;
const R = 80;          // ring radius
const STROKE = 28;     // ring thickness
const GAP_DEG = 1.2;   // surface gap between slices
const C = 2 * Math.PI * R;

// Part-to-whole ring: top 5 + "Other", legend carries name, hours and %.
export default function DonutChart({ items, total, label }) {
  const [active, setActive] = useState(null);
  const slices = topN(items).map((s, i) => ({ ...s, color: s.other ? OTHER : SERIES[i] }));
  const shown = active != null ? slices[active] : null;

  const gap = slices.length > 1 ? (GAP_DEG / 360) * C : 0;
  const arcs = slices.reduce((acc, s) => {
    const start = acc.length ? acc.at(-1).end : 0;
    const frac = total > 0 ? s.seconds / total : 0;
    const len = Math.max(0, frac * C - gap);
    return [...acc, { ...s, frac, dash: `${len} ${C - len}`, offset: -start, end: start + frac * C }];
  }, []);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE} role="img" aria-label={label} className="shrink-0">
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#1e293b" strokeWidth={STROKE} />
          {arcs.map((a, i) => (
            <circle key={a.name} cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
              stroke={a.color} strokeWidth={active === i ? STROKE + 6 : STROKE}
              strokeDasharray={a.dash} strokeDashoffset={a.offset}
              className="cursor-pointer transition-[stroke-width]"
              onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />
          ))}
        </g>
        <text x="50%" y="46%" textAnchor="middle" className="fill-white text-[22px] font-bold">
          {formatDuration(shown ? shown.seconds : total)}
        </text>
        <text x="50%" y="58%" textAnchor="middle" className="fill-slate-400 text-[11px]">
          {shown ? `${Math.round((shown.seconds / total) * 100)}% · ${truncate(shown.name, 16)}` : 'total'}
        </text>
      </svg>

      <ul className="w-full min-w-0 space-y-2 text-sm">
        {arcs.map((a, i) => (
          <li key={a.name}
            className={`flex items-center gap-2 rounded-md px-2 py-1 ${active === i ? 'bg-slate-800/70' : ''}`}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: a.color }} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate text-slate-200" title={a.name}>{a.name}</span>
            <span className="tabular-nums text-slate-300">{formatDuration(a.seconds)}</span>
            <span className="w-10 text-right tabular-nums text-slate-500">{Math.round(a.frac * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const truncate = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
