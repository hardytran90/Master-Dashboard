import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

const TYPE_OPTIONS = ['run', 'ride'];

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
        setSaving(true);
        setEditError('');
        try {
            const res = await api.updateActivity(id, {
                type: editForm.type,
                activityDate: editForm.activityDate,
                distanceKm: Number(editForm.distanceKm),
                durationSec: Number(editForm.durationSec),
                elevationGainM: editForm.elevationGainM === '' ? null : Number(editForm.elevationGainM),
            });
            setActivities((prev) => prev.map((a) => (a.id === id ? res.data : a)));
            setEditingId(null);
            setEditForm(null);
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
        } catch (err) {
            setError(err.message);
        }
    } 

    return (
        <div>
            <h2 className="card-title mb-2">Recent Activities</h2>

            {loading && <p className="text-sm text-gray-500">Loading...</p>}
            {!loading && error && <p className="text-sm text-red-600">{error}</p>}
            {!loading && !error && activities.length === 0 && (
            <p className="empty-state">No activity at this moment.</p>)}

            {!loading && !error && activities.length > 0 && (
            <ul className="divide-y divide-slate-100">
                {activities.map((a) => 
                    editingId === a.id ? (
                    <li key={a.id} className="py-3 space-y-2">
                        {editError && <p className='form-error'>{editError}</p>}
                        <div className='grid grid-cols-2 gap-2'>
                            <select
                                value={editForm.type}
                                onChange={(e) => updateEditField('type', e.target.value)}
                                className="form-select"
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
                                className="form-input"
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={editForm.distanceKm}
                                onChange={(e) => updateEditField('distanceKm', e.target.value)}
                                placeholder="Distance (km)"
                                className="form-input"
                            />
                            <input
                                type="number"
                                value={editForm.durationSec}
                                onChange={(e) => updateEditField('durationSec', e.target.value)}
                                placeholder="Duration (sec)"
                                className="form-input"
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={editForm.elevationGainM}
                                onChange={(e) => updateEditField('elevationGainM', e.target.value)}
                                placeholder="Elevation (m, optional)"
                                className="form-input"
                            />
                        </div>
                        <div>
                            <button
                                type="button"
                                onClick={() => saveEdit(a.id)}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={saving}
                                className="btn-secondary"
                            >
                                Cancel
                            </button>
                        </div>
                        </li>
                ) : (
                    <li key={a.id} className="py-3 flex justify-between items-center text-sm">
                        <div>
                            <span className="font-medium text-slate-800 capitalize">{a.type}</span>
                            <span className="text-slate-500 ml-2">
                                {new Date(a.activityDate).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-slate-600">
                                {a.distanceKm} km · {Math.round(a.durationSec / 60)} minutes
                                {a.source !== 'manual' && <span className="badge ml-2">{a.source}</span>}
                            </span>
                            <button
                                type="button"
                                onClick={() => startEdit(a)}
                                className="text-xs text-slate-500 hover:text-slate-800 underline"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(a.id)}
                                className="text-xs text-red-600 hover:text-red-800 underline"
                            >
                                Delete
                            </button>
                        </div>
                    </li>
                ))}
            </ul> 
            )}
        </div>
    );
}