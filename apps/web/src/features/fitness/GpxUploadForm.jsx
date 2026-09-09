import { useState, useRef } from 'react';
import { api } from '../../lib/api';

export default function GpxUploadForm({ onImported }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('idle'); //idle | uploading | done
    const inputRef = useRef(null);

    function handleFileChange(e) {
        const file = e.target.files?.[0] || null;
        setSelectedFile(file);
        setError('');
        setStatus('idle');
    }

    async function handleUpload() {
        if (!selectedFile) return;

        setError('');
        setStatus('uploading');
        try {
            await api.importGPX(selectedFile);
            setStatus('done');
            setSelectedFile(null);
            if (inputRef.current) inputRef.current.value = '';
            onImported?.();
        } catch (err) {
            setError(err.message);
            setStatus('idle');
        }
    }

    return (
        <div className="card space-y-3">
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

            {selectedFile && (
                <p className="form-hint">
                    Selected: <span className="text-gray-700">{selectedFile.name}</span>
                </p>
            )}

            <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || status === 'uploading'}
            className='btn-primary'
            >
                {status === 'uploading' ? 'Processing...' : 'Upload'}
            </button>

             {status === 'done' && <p className="status-success">Import done.</p>}
        </div>
    );
}