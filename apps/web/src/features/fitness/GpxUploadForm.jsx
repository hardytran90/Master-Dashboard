import { useState, useRef } from 'react';
import { api } from '../../lib/api';

export default function GpxUploadForm({ onImported }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('idle'); //idle | uploading | done
    const inputRef = useRef(null);

    const isUploading = status === 'uploading';

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
            await api.importGpx(selectedFile);
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
            {error && <p className="form-error">{error}</p>}

            {/* Native input stays hidden; the button below opens it */}
            <input 
                ref={inputRef}
                type="file"
                accept=".gpx"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
            />

            <div className='file-picker'>
                <div className={selectedFile ? 'file-picker-name-selected' : 'file-picker-name'}>
                    {selectedFile ? selectedFile.name : 'No file chosen'}
                </div>
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isUploading}
                    className='file-picker-btn'
                >
                    Choose File
                </button>
                <p className='form-hint'>
                    Works for .gpx files 10MB or smaller.
                </p>
            </div>

            <div className='card-footer'>
                {status === 'done' && <p className="status-success">Import done.</p>}
                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className='btn-upload'
                >
                    {isUploading ? 'Processing...' : 'Upload'}
                </button>
            </div>
        </div>
    );
}