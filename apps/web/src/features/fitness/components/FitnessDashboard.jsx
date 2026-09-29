import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { normalize } from '../stats';
import FitnessOverview from './FitnessOverview';
import PerformanceCompare from './PerformanceCompare';
import ProgressGoals from './ProgressGoals';
import DailyPerformance from './DailyPerformance';

export default function FitnessDashboard({ refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const y = new Date().getFullYear();
    setLoading(true);
    setError('');
    // Last year and this year, plus 1 day for beginning and ending of year cause of time zone difference
    api
      .getActivityStats(`${y - 2}-12-31`, `${y + 1}-01-01`)
      .then((res) => {
        if (!cancelled) setRows(res.data.map(normalize));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (error) {
    return (
      <section className="fx-panel">
        <p className="form-error">Could not load stats: {error}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4" aria-busy={loading}>
      <FitnessOverview rows={rows} />
      <PerformanceCompare rows={rows} />
      <ProgressGoals rows={rows} />
      <DailyPerformance rows={rows} />
    </div>
  );
}
