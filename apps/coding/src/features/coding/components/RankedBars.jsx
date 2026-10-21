import { formatDuration } from '../../../lib/dates';
import { ACCENT } from './charts';

// Ranked horizontal bars with % of total — reads better than a pie once there are many languages.
export default function RankedBars({ items, total, max = 8 }) {
  const rows = items.slice(0, max);
  const rest = items.slice(max);
  const top = rows[0]?.seconds || 1;
  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const pct = total > 0 ? (r.seconds / total) * 100 : 0;
          return (
            <li key={r.name}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="min-w-0 truncate text-slate-200" title={r.name}>{r.name}</span>
                <span className="shrink-0 tabular-nums text-slate-400">
                  <span className="font-semibold text-slate-200">{pct < 1 ? '<1' : Math.round(pct)}%</span> · {formatDuration(r.seconds)}
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-slate-800">
                <span className="block h-full rounded-full" style={{ width: `${(r.seconds / top) * 100}%`, background: ACCENT }} />
              </div>
            </li>
          );
        })}
      </ul>
      {rest.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          + {rest.length} more · {formatDuration(rest.reduce((s, r) => s + r.seconds, 0))}
        </p>
      )}
    </div>
  );
}
