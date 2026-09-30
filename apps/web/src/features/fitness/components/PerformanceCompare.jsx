// apps/web/src/features/fitness/components/PerformanceCompare.jsx
import { useState } from 'react';
import { SPORTS, periodRange, summarize, formatKmFixed, formatDuration } from '../stats';
import { PanelHead, SportLabel, Tabs } from './fitnessUi';

const PERIODS = [
  { id: 'week', label: 'Weekly', cur: 'This week', prev: 'Last week' },
  { id: 'month', label: 'Monthly', cur: 'This month', prev: 'Last month' },
  { id: 'year', label: 'Yearly', cur: 'This year', prev: 'Last year' },
];

export default function PerformanceCompare({ rows }) {
  const [period, setPeriod] = useState('week');
  const meta = PERIODS.find((p) => p.id === period);
  const cur = periodRange(period, 0);
  const prev = periodRange(period, -1);

  return (
    <section className="fx-panel">
      <PanelHead
        title="Performance compare"
        sub={
          <span className='text-gray-300'>
            {meta.prev}: {prev.from} → {prev.to}
          </span>}
      >
        <Tabs options={PERIODS} value={period} onChange={setPeriod} label="Compare period"/>
      </PanelHead>

      <div className="fx-grid-2">
        {SPORTS.map((type) => {
          const a = summarize(rows, type, cur.from, cur.to);
          const b = summarize(rows, type, prev.from, prev.to);
          return (
            <div key={type} className={`sport-${type} fx-compare`}>
              <div className="fx-compare-head">
                <SportLabel type={type} />
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
                  <tr>
                    <th scope="row">Activities</th>
                    <td className="fx-accent">{a.count}</td>
                    <td>{b.count}</td>
                  </tr>
                  <tr>
                    <th scope="row">Distance</th>
                    <td className="fx-accent">{formatKmFixed(a.km)}</td>
                    <td>{formatKmFixed(b.km)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Time</th>
                    <td className="fx-accent">{formatDuration(a.sec)}</td>
                    <td>{formatDuration(b.sec)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    </section>
  );
}
