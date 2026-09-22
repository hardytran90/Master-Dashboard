import { use, useEffect, useMemo, useState } from "react";
import Heatmap from '../../../shared/components/Heatmap';
import { getActiveDays } from "../../../lib/api";

const THIS_YEAR = new Date().getFullYear();
const YEAR_OPTION = [THIS_YEAR, THIS_YEAR - 1, THIS_YEAR - 2];
const LAST_12_MONTHS = 'last12';

// ONE ACTIVITY IS AT LEAST LEVEL 1. MORE ACTIVITY’S MINS -> HIGHER LEVEL (MAX LEVEL 4)
// USE DURATION (MINUTES) INSTEAD OF DISTANCE (RUNNING # CYCLING)

const MINUTES_PER_LEVEL = [15, 45, 60];
const levelOf = (durationSec) => 1 + MINUTES_PER_LEVEL.filter((m) => durationSec/60 >= m).length;

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDate = (key) => key.split('-').reverse().join('/'); // 2026-08-15 -> 15/08/2026
const fmtKm = (km) => km.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

function fmtDuration(sec) {
    const totalMin = Math.round(sec / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    if (h === 0) return `${m}m`;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function describe(day) {
    const parts = [];
    if (day.run) parts.push(`${day.run} running`);
    if (day.ride) parts.push(`${day.ride} riding`);
    return `${fmtDate(day.date)}: ${parts.join(', ')} - ${fmtKm(day.distanceKm)} km, ${fmtDuration(day.durationSec)}`;
}

function getRange(option) {
    const today = new Date();
    if (option === LAST_12_MONTHS) {
        const from = new Date(today);
        from.setDate(from.getDate() - 364);
        return { from: toKey(from), to: toKey(today) };
    }
    const year = Number(option);
    return {
        from: `${year}-01-01`,
        to: year === today.getFullYear() ? toKey(today) : `${year}-12-31`,
    };
}

export default function ActiveDayHeatmap( { refreshKey = 0 }) {
    const [option, setOption] = useState(LAST_12_MONTHS);
    const [days, setDays] = useState([]);
    const [status, setStatus] = useState('loading'); // loading | ready | error
    const [error, setError] = useState('');

    const { from, to } = useMemo(() => getRange(option), [option]);

    useEffect(() => {
        let cancelled = false; // AVOID CALLING SETSTATE AFTER THE YEAR HAS BEEN CHANGED OR THE PAGE HAS BEEN UNMOUNTED.
        setStatus('loading');
        getActiveDays(from,to)
            .then((res) => {
                if (cancelled) return;
                setDays(res.data);
                setStatus('ready');
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err.message || "Unknown Error!");
                setStatus('error');
            });
        return () => {
            cancelled = true;
        };
    }, [from, to, refreshKey]);

    const data = useMemo(
        () => Object.fromEntries(days.map((d) => [d.date, { level: levelOf(d.durationSec), tooltip: describe(d) }])),
        [days],
    );

    const periodText = option === LAST_12_MONTHS ? 'in last 12 months' : `in year ${option}`;
    const totalKm = days.reduce((sum, d) => sum + d.distanceKm, 0);

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {status === 'ready'
                    ? `${days.length} active days ${periodText} (${fmtKm(totalKm)} km)`
                : 'Active Day'}
                </h3>
                <select
                value={option}
                onChange={(e) => setOption(e.target.value)}
                aria-label="Select time range"
                className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                    <option value={LAST_12_MONTHS}>last 12 months</option>
                    {YEAR_OPTION.map((y) => (
                        <option key={y} value={y}>
                            {y}
                        </option>
                    ))}
                </select>
            </div>

            {status === 'error' ? (
                <p className="text-sm text-red-600">Can't load data: {error}</p>
            ) : (
                <div className={status === 'loading' ? 'opacity-50 transition-opacity' : ''}>
                    <Heatmap
                    from={from}
                    to={to}
                    data={data}
                    colorScale="green"
                    emptyTooltip={(key) => `${fmtDate(key)} : No activity`}
                    />
                </div>
            )}

            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Each color square is a day with at least 1 activity. Darker color means longer activities spent. 
            </p>
        </div>
    );
}