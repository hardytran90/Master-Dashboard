import { useState, useRef } from 'react';
import { api } from '../../lib/api';

export default function GpxUploadForm({ onImported }) {
    const [error, setError] = useState('');
    const [status, setStatus] = useState('idle'); //idle | uploading | done
    const inputRef = useRef(null);

    async function handleFileChange(e) {
        const file = e.target.file?.[0];
        if (!file) return;

        setError('');
        setStatus('uploading');
        try {
            await api.importGPX(file);
            setStatus('done');
            onImported?.();
        } catch (err) {
            setError(err.message);
            setStatus('idle');
        } finally {
            if (inputRef.current) inputRef.current.value = '';
        }
    }

    return (
        <div className="card space-y-2">
            <h2 className="card-title">Import file GPX</h2>
            <p className="form-hint">Download file .gpx from Strava.</p>
            {error && <p className="form-error">{error}</p>}
            <input 
            ref={inputRef}
            type="file"
            accept=".gpx"
            onChange={handleFileChange}
            disabled={status === 'uploading'}
            className="text-sm"
             />
             {status === 'uploading' && <p className="status-loading">File is loading...</p>}
             {status === 'done' && <p className="status-success">Import done.</p>}
        </div>
    )
}