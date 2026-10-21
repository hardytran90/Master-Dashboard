import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/api';
import { breakdownRange, toKey } from '../../../lib/dates';
import DonutChart from './DonutChart';
import RankedBars from './RankedBars';

const RANGES = [
  { id: '7d', label: '7 days' },
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: '30d', label: '30 days' },
  { id: '90d', label: '90 days' },
  { id: 'year', label: '1 year' },
];

// Projects (ring) + languages (ranked bars), driven by one period filter.
export default function BreakdownSection({ reloadKey, hasBreakdown, onImport, importing }) {
  const [rangeId, setRangeId] = useState('7d');
  const [data, setData] = useState({ project: null, language: null });
  const [error, setError] = useState(null);
  const range = useMemo(() => breakdownRange(rangeId, toKey(new Date())), [rangeId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getBreakdown('project', range.from, range.to),
      api.getBreakdown('language', range.from, range.to),
    ])
      .then(([project, language]) => { if (!cancelled) { setData({ project, language }); setError(null); } })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [range, reloadKey]);

  return (
    <section className="space-y-4" aria-labelledby="breakdown-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="breakdown-title" className="text-lg font-bold text-white">Where the time went</h2>
        <div className="ct-tabs" role="group" aria-label="Period">
          {RANGES.map((r) => (
            <button key={r.id} type="button" className="ct-tab" aria-pressed={rangeId === r.id}
              onClick={() => setRangeId(r.id)}>{r.label}</button>
          ))}
        </div>
      </div>

      {!hasBreakdown && (
        <div className="ct-panel flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <span>Project and language details aren’t imported yet for your older history.</span>
          <button type="button" className="ct-btn" onClick={onImport} disabled={importing}>
            {importing ? 'Importing…' : 'Import from WakaTime'}
          </button>
        </div>
      )}
      {error && <div className="ct-panel text-sm text-amber-300">{error}</div>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ct-panel">
          <h3 className="ct-label mb-4">Projects</h3>
          {!data.project ? <p className="ct-muted">Loading…</p>
            : data.project.items.length === 0 ? <p className="ct-muted">No project data for this period.</p>
            : <DonutChart items={data.project.items} total={data.project.total} label="Coding time by project" />}
        </div>
        <div className="ct-panel">
          <h3 className="ct-label mb-4">Languages &amp; tech</h3>
          {!data.language ? <p className="ct-muted">Loading…</p>
            : data.language.items.length === 0 ? <p className="ct-muted">No language data for this period.</p>
            : <RankedBars items={data.language.items} total={data.language.total} />}
        </div>
      </div>
    </section>
  );
}
