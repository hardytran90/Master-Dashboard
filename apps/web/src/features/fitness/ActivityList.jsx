import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { SportIcon } from './components/fitnessUi';
import { formatPace, formatSpeed } from './stats';

const TYPE_OPTIONS = ['run', 'ride'];

// URL to link to detail activities in Strava
const stravaUrl = (id) => `https://www.strava.com/activities/${id}`;

// Receive link with format https://www.strava.com/activities/1234567890 (might includes /overview, ?query...)
function formatMinutes(sec) {
    const total = Math.round((Number(sec) || 0) / 60);
    if (total < 60) return `${total} minutes`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h ${m} minutes` : `${h}h`;
}

// Run → pace (min/km), Ride → speed (km/h)
function formatAvg(a) {
    const km = Number(a.distanceKm) || 0;
    const sec = Number(a.durationSec) || 0;
    if (!km || !sec) return { value: '—', label: a.type === 'ride' ? 'Avg speed' : 'Avg pace' };
    return a.type === 'ride'
        ? { value: formatSpeed(km / (sec / 3600)), label: 'Avg speed' }
        : { value: formatPace(sec / km), label: 'Avg pace' };
}

function Cell({ value, label }) {
    return (
        <div className="fx-row-cell">
            <span className="fx-row-value">{value}</span>
            <span className="fx-row-label">{label}</span>
        </div>
    );
}

function StarIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="fx-row-star">
            <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" />
        </svg>
    );
}

function parseStravaId(input) {
    const result = input.trim();
    if (!result) return '';
    if (/^d{1,20}$/.test(result)) return result;
    const match = result.match(/strava\.com\/activities\/(\d{1,20})/);
    return match ? match[1] : null;
}

export default function ActivityList({ refreshKey }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState(null);
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        api
            .getActivities()
            .then((res) => setActivities(res.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [refreshKey]);

    function startEdit(a) {
        setEditingId(a.id);
        setEditForm({
            type: a.type,
            activityDate: new Date(a.activityDate).toISOString().slice(0,10),
            distanceKm: String(a.distanceKm),
            durationSec: String(a.durationSec),
            elevationGainM: a.elevationGainM != null ? String(a.elevationGainM) : '',
        });
        setEditError('');
    }

    function cancelEdit() {
        setEditingId(null);
        setEditForm(null);
        setEditError('');
    }

    function updateEditField(field, value) {
        setEditForm((prev) => ({ ...prev, [field]: value }));
    }

    async function saveEdit(id) {
        const stravaId = parseStravaId(editForm.stravaLink);
        if (stravaId === null) {
            setEditError('Strava link must look like https://www.strava.com/activities/123456789');
            return;
        }

        setSaving(true);
        setEditError('');
        try {
            const res = await api.updateActivity(id, {
                type: editForm.type,
                activityDate: editForm.activityDate,
                distanceKm: Number(editForm.distanceKm),
                durationSec: Number(editForm.durationSec),
                elevationGainM: editForm.elevationGainM === '' ? null : Number(editForm.elevationGainM),
                stravaActivityId: stravaId === '' ? null : stravaId,
            });
            setActivities((prev) => prev.map((a) => (a.id === id ? res.data : a)));
            setEditingId(null);
            setEditForm(null);
            onChange?.();
        } catch (err) {
            setEditError(err.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id) {
        if (!window.confirm('Delete this activity?')) return;
        try {
            await api.deleteActivity(id);
            setActivities((prev) => prev.filter((a) => a.id !== id));
            onChange?.();
        } catch (err) {
            setError(err.message);
        }
    } 

    return (
        <div>
            <h2 className="card-title mb-2">Recent Activities</h2>

            {loading && <p className="status-loading">Loading...</p>}
            {!loading && error && <p className="form-error">{error}</p>}
            {!loading && !error && activities.length === 0 && (
            <p className="empty-state">No activity at this moment.</p>)}

            {!loading && !error && activities.length > 0 && (
                <ul className="fx-rows">
                    {activities.map((a) =>
                        editingId === a.id ? (
                            <li key={a.id} className="py-3 space-y-2">
                                {editError && <p className="form-error">{editError}</p>}
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={editForm.type}
                                        onChange={(e) => updateEditField('type', e.target.value)}
                                        className="fx-input"
                                    >
                                        {TYPE_OPTIONS.map((t) => (
                                            <option key={t} value={t}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="date"
                                        value={editForm.activityDate}
                                        onChange={(e) => updateEditField('activityDate', e.target.value)}
                                        className="fx-input"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.distanceKm}
                                        onChange={(e) => updateEditField('distanceKm', e.target.value)}
                                        placeholder="Distance (km)"
                                        className="fx-input"
                                    />
                                    <input
                                        type="number"
                                        value={editForm.durationSec}
                                        onChange={(e) => updateEditField('durationSec', e.target.value)}
                                        placeholder="Duration (sec)"
                                        className="fx-input"
                                    />
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editForm.elevationGainM}
                                        onChange={(e) => updateEditField('elevationGainM', e.target.value)}
                                        placeholder="Elevation (m, optional)"
                                        className="fx-input"
                                    />
                                    <input
                                        type="text"
                                        inputMode="url"
                                        value={editForm.stravaLink}
                                        onChange={(e) => updateEditField('stravaLink', e.target.value)}
                                        placeholder="Strava link (optional)"
                                        className="fx-input"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => saveEdit(a.id)}
                                        disabled={saving}
                                        className="fx-btn fx-btn-accent"
                                    >
                                        {saving ? 'Saving...' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={cancelEdit}
                                        disabled={saving}
                                        className="fx-btn fx-btn-ghost"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </li>
                        ) : (
                            <li key={a.id} className={`fx-row sport-${a.type}`}>
                                <span className="fx-row-icon" title={a.type}>
                                    <SportIcon type={a.type} />
                                </span>

                                <div className="fx-row-title">
                                    <span className="font-semibold text-white capitalize">{a.type}</span>
                                    <StarIcon />
                                    <span className="text-slate-400">
                                        {new Date(a.activityDate).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>

                                <Cell value={`${a.distanceKm} km`} label="Distance" />
                                <Cell value={formatMinutes(a.durationSec)} label="Duration" />
                                <Cell value={<span className="badge">{a.source}</span>} label="Source" />
                                <Cell {...formatAvg(a)} />
                                <Cell
                                    value={a.avgHeartRate ? `${a.avgHeartRate} bpm` : '—'}
                                    label="Avg HR"
                                />

                                <div className="fx-row-actions">
                                    {a.stravaActivityId ? (
                                        <a
                                            href={stravaUrl(a.stravaActivityId)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-orange-400 hover:text-orange-300 underline"
                                            title="Open this activity on Strava"
                                        >
                                            Detail
                                        </a>
                                    ) : (
                                        <span
                                            className="text-xs text-slate-400 hover:text-white underline"
                                            title="Not linked to Strava yet. Click Edit and paste the Strava link."
                                        >
                                            Detail
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => startEdit(a)}
                                        className="text-xs text-slate-400 hover:text-white underline"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(a.id)}
                                        className="text-xs text-red-400 hover:text-red-300 underline"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </li>
                        ),
                    )}
                </ul>
            )}
        </div>
    );
}
            