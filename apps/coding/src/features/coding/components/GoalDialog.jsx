import { useEffect, useRef, useState } from 'react';
import { formatDuration } from '../../../lib/dates';

const STEP = 30;          // minutes
const MIN = 30;
const MAX = 16 * 60;

export default function GoalDialog({ initialMinutes, onSave, onClose }) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const saveRef = useRef(null);

  useEffect(() => {
    saveRef.current?.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const change = (delta) => setMinutes((m) => Math.min(MAX, Math.max(MIN, m + delta)));

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(minutes);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="ct-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="goal-title" className="ct-modal">
        <h2 id="goal-title" className="text-xl font-bold text-white">Daily coding goal</h2>
        <p className="mt-1 text-sm text-slate-400">Adjust in 30-minute steps. Weekly target = daily goal × 7.</p>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button type="button" className="ct-step-btn" onClick={() => change(-STEP)} disabled={minutes <= MIN}
            aria-label="Decrease by 30 minutes">−</button>
          <output className="min-w-36 text-center text-4xl font-extrabold tabular-nums text-white" aria-live="polite">
            {formatDuration(minutes * 60)}
          </output>
          <button type="button" className="ct-step-btn" onClick={() => change(STEP)} disabled={minutes >= MAX}
            aria-label="Increase by 30 minutes">+</button>
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">≈ {formatDuration(minutes * 60 * 7)} per week</p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[60, 90, 120, 180, 240].map((m) => (
            <button key={m} type="button" onClick={() => setMinutes(m)}
              className={`rounded-full border px-3 py-1 text-xs ${minutes === m ? 'border-teal-400 text-teal-300' : 'border-slate-700 text-slate-400 hover:text-slate-200'}`}>
              {formatDuration(m * 60)}
            </button>
          ))}
        </div>

        {error && <p role="alert" className="mt-4 text-sm text-red-400">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="ct-btn-ghost" onClick={onClose}>Cancel</button>
          <button ref={saveRef} type="button" className="ct-btn" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save goal'}
          </button>
        </div>
      </div>
    </div>
  );
}
