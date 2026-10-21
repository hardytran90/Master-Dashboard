import { formatDuration, pctChange, shortDate } from '../../../lib/dates';
import Delta from './Delta';

const CARDS = [
  { id: 'last7', title: 'Last 7 days', vs: 'vs the 7 days before' },
  { id: 'week', title: 'This week', vs: 'vs same days last week', full: 'Full last week' },
  { id: 'month', title: 'This month', vs: 'vs same days last month', full: 'Full last month' },
];

export default function ComparisonCards({ comparisons }) {
  return (
    <section className="grid gap-4 md:grid-cols-3" aria-label="Comparisons">
      {CARDS.map((c) => {
        const cmp = comparisons[c.id];
        const change = pctChange(cmp.current.sec, cmp.previous.sec);
        return (
          <div key={c.id} className="ct-panel">
            <p className="ct-label">{c.title}</p>
            <p className="ct-value">{formatDuration(cmp.current.sec)}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-slate-400">
              <Delta value={change} /> <span>{c.vs}</span>
            </p>
            <dl className="mt-3 space-y-1 border-t border-slate-800 pt-3 text-xs text-slate-400">
              <div className="flex justify-between gap-2">
                <dt>{shortDate(cmp.previous.from)} – {shortDate(cmp.previous.to)}</dt>
                <dd className="font-semibold text-slate-200">{formatDuration(cmp.previous.sec)}</dd>
              </div>
              {cmp.previousFull && (
                <div className="flex justify-between gap-2">
                  <dt>{c.full}</dt>
                  <dd className="font-semibold text-slate-200">{formatDuration(cmp.previousFull.sec)}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt>Active days</dt>
                <dd className="font-semibold text-slate-200">{cmp.current.activeDays} vs {cmp.previous.activeDays}</dd>
              </div>
            </dl>
          </div>
        );
      })}
    </section>
  );
}
