import { useState } from 'react';
import { api } from '../../lib/api';

export default function ActivityForm({ onCreated }) {
    const [form, setForm] = useState({
        type: 'run',
        activityDate: '',
        distanceKm: '',
        durationSec: '',
        elevationGainM: '',
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function update(field, value) {
        setForm((prev) => ({ ...prev, [field]: value }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            await api.createActivity({
                ...form,
                distanceKm: Number(form.distanceKm),
                durationSec: Number(form.durationSec),
                elevationGainM: form.elevationGainM ? Number(form.elevationGainM) : undefined,
            });
            setForm({ type: 'run', activityDate: '', distanceKm: '', durationSec: '', elevationGainM: ''});
            onCreated?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    }
    return (
        <form onSubmit={handleSubmit} className="card space-y-3">
            <h2 className="card-title">Add Activity Manually</h2>
            {error && <p className="form-error">{error}</p>}

            <div className="grid grid-cols-2 gap-3">
                <select value={form.type} onChange={(e) => update('type', e.target.value)} className="form-select">
                    <option value="run">Run</option>
                    <option value="ride">Ride</option>
                </select>
                <input
                type="date"
                value={form.activityDate}
                onChange={(e) => update('activityDate', e.target.value)}
                className="form-input"
                required
                />

                <input 
                type="number"
                step="0.01"
                placeholder="Distance (km)"
                value={form.distanceKm}
                onChange={(e) => update('distanceKm', e.target.value)}
                className="form-input"
                required
                />

                <input
                type="number"
                placeholder="Time (seconds)"
                value={form.durationSec}
                onChange={(e) => update('durationSec', e.target.value)}
                className="form-input"
                required
                />

                <input
                type="number"
                placeholder="Elevation Gain (m)"
                value={form.elevationGainM}
                onChange={(e) => update('elevationGainM', e.target.value)}
                className="form-input col-span-2"
                />
            </div>

            <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Saving...' : 'Save activity'}
            </button>
        </form>
    );
}