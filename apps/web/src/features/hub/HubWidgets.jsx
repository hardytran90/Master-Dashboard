import { weekdayShort } from './format';

// Small building blocks shared by the hub cards.

export function Stat({ label, value, sub }) {
  return (
    <div className="hub-stat">
      <p className="hub-stat-label">{label}</p>
      <p className="hub-stat-value">{value}</p>
      {sub && <p className="hub-stat-sub">{sub}</p>}
    </div>
  );
}

// ▲ 12% vs last week — arrow + words, so it never relies on color alone
export function Delta({ value, label = 'vs last week' }) {
  if (value == null) return <span className="hub-delta">No data last week</span>;
  const dir = value > 0 ? 'up' : value < 0 ? 'down' : 'flat';
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '■';
  return (
    <span className={`hub-delta hub-delta-${dir}`}>
      <span aria-hidden="true">{arrow}</span> {Math.abs(value)}% {label}
    </span>
  );
}

export function Progress({ label, value, goal, format, color }) {
  const pct = goal > 0 ? (value / goal) * 100 : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-slate-300">{label}</span>
        <span className="text-slate-400">
          <span className="font-semibold text-white">{format(value)}</span> / {format(goal)} · {Math.round(pct)}%
        </span>
      </div>
      <div className="hub-progress" role="progressbar" aria-label={label}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.round(pct))}>
        <span style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}

// Last-7-days column chart, one series. Hover / focus shows the exact value.
export function MiniBars({ days, value, format, color, title }) {
  const max = Math.max(...days.map(value), 0);
  const lastIndex = days.length - 1;
  return (
    <figure className="hub-bars" aria-label={title}>
      <figcaption className="hub-stat-label mb-2">{title}</figcaption>
      <div className="hub-bars-plot">
        {days.map((d) => {
          const v = value(d);
          const h = max > 0 ? Math.max(v > 0 ? 6 : 0, (v / max) * 100) : 0;
          return (
            <div key={d.date} className="hub-bar-col">
              <span className="hub-bar-tip">{format(v)}</span>
              <span className="hub-bar" style={{ height: `${h}%`, background: color }} />
              <span className="sr-only">{d.date}: {format(v)}</span>
            </div>
          );
        })}
      </div>
      <div className="hub-bars-x" aria-hidden="true">
        {days.map((d, i) => (
          <span key={d.date} className={i === lastIndex ? 'font-bold text-slate-200' : ''}>
            {i === lastIndex ? 'Today' : weekdayShort(d.date)}
          </span>
        ))}
      </div>
    </figure>
  );
}

export function Skeleton() {
  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="hub-skel h-8 w-1/2" />
      <div className="hub-skel h-24" />
      <div className="grid grid-cols-3 gap-2">
        <div className="hub-skel h-14" /><div className="hub-skel h-14" /><div className="hub-skel h-14" />
      </div>
    </div>
  );
}
