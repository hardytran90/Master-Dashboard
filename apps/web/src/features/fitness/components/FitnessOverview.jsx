// apps/web/src/features/fitness/components/FitnessOverview.jsx
import { useState } from 'react';
import { SPORTS, periodRange, summarize, formatKm, formatDuration, formatElev, formatPace, formatSpeed } from '../stats';
import { PanelHead, SportLabel, Stat, Tabs } from './fitnessUi';

const PERIODS = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'year', label: 'This year' },
];

export default function FitnessOverview({ rows }) {
  const [period, setPeriod] = useState('week');
  const range = periodRange(period);

  return (
    <section className="fx-panel">
      <PanelHead title="Overview" sub={
        <span className='text-gray-300'>
          {range.from} → {range.to}
        </span>}>
        <Tabs options={PERIODS} value={period} onChange={setPeriod} label="Overview period" />
      </PanelHead>

      <div className="fx-grid-2">
        {SPORTS.map((type) => {
          const s = summarize(rows, type, range.from, range.to);
          return (
            <div key={type} className={`sport-${type} fx-stack`}>
              <SportLabel type={type} bar />
              <Stat label="Total activities" value={s.count} />
              <div className="fx-pair">
                <Stat label="Distance" value={formatKm(s.km)} />
                <Stat label="Elevation gain" value={formatElev(s.elev)} />
                <Stat label="Total time" value={formatDuration(s.sec)} />
                {/* Ride uses speed (km/h) instead of pace — mins/km */}
                {type === 'run' ? (
                  <Stat label="Best pace" value={formatPace(s.bestPace)} />
                ) : (
                  <Stat label="Best speed" value={formatSpeed(s.bestSpeed)} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
