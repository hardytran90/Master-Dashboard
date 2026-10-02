import { useState, useRef } from 'react';
import { api } from '../../lib/api';
import { PanelHead } from './components/fitnessUi';
import appleIcon from '../../assets/icons/apple.png';
import { ImportIcon } from './components/fitnessUi';

// Just labels to show where .gpx files usually come from — not links
const SOURCES = ['Garmin', 'Apple Watch', 'Coros', 'Galaxy', 'Huawei'];

export default function GpxUploadForm({ onImported }) {
    const [selectedFile, setSelectedFile] = useState(null);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('idle'); //idle | uploading | done
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);

    const isUploading = status === 'uploading';

    function pickFile(file) {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith('.gpx')) {
            setSelectedFile(null);
            setError('Only .gpx files are supported.');
            setStatus('idle');
            return;
        }
        setSelectedFile(file);
        setError('');
        setStatus('idle');
    }

    function handleFileChange(e) {
        pickFile(e.target.files?.[0] || null);
    }

    function handleDrop(e) {
        e.preventDefault();
        setDragging(false);
        if (isUploading) return;
        pickFile(e.dataTransfer.files?.[0] || null);
    }

    function handleDragOver(e) {
        e.preventDefault(); // required, otherwise the browser opens the file instead of dropping it
        if (!isUploading) setDragging(true);
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

    let fileLine = <span className="fx-drop-empty text-sm">No file chosen</span>;
    if (selectedFile) fileLine = <span className="fx-accent">{selectedFile.name}</span>;
    else if (status === 'done') fileLine = <span className="fx-drop-done">Activity imported. Choose another file to continue.</span>;

    return (
        <section className="fx-panel sport-run">
            <PanelHead title="Upload activity" >
                <button
                    type="button"
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    className="fx-btn-action fx-btn-sm"
                >
                    <ImportIcon />
                    {isUploading ? 'Importing...' : 'Import'}
                </button>
            </PanelHead>

            {/* <label> wraps the input: clicking anywhere in the box opens the file picker */}
            <label
                className={`fx-drop ${dragging ? 'is-dragging' : ''} ${isUploading ? 'is-busy' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".gpx"
                    onChange={handleFileChange}
                    disabled={isUploading}
                    className="sr-only"
                />
                <svg width="20" height="18" viewBox="0 0 20 18" aria-hidden="true" className="fx-drop-icon">
                    <path d="M10 0 20 18H0z" fill="currentColor" />
                </svg>
                <span className="fx-drop-title">Drop your .gpx file here</span>
                <span className="fx-drop-sub">or click to browse files</span>
                <span className="fx-drop-file" aria-live="polite">{fileLine}</span>

                <span className="fx-drop-sources">
                    {SOURCES.map((s) => 
                    s === 'Apple Watch' ? (
                        <span key={s} className="fx-chip">
                            <span className="fx-glyph fx-chip-logo" style={{ '--glyph': `url(${appleIcon})` }} aria-hidden="true" />
                            <span className="sr-only">Apple </span>
                            Watch
                        </span>
                    ) : (
                        <span key={s} className="fx-chip">{s}</span>
                    ),
                )}
            </span>
        </label>

            {error && <p className="fx-drop-error" role="alert">{error}</p>}
        </section>
    );
}