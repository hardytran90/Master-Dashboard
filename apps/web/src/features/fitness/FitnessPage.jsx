import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import GpxUploadForm from './GpxUploadForm';

export default function FitnessPage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const { logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <div className="max-w-2xl mx-auto p-6 space-y-6">
            <h1 className="text-xl font-semibold text-gray-800">My Fitness</h1>
            <button type="button" onClick={handleLogout} className="btn-secondary">Logout</button>
            <div className="grid grid-cols-2 gap-4">
                <ActivityForm onCreated={() => setRefreshKey((k) => k + 1)} />
                <GpxUploadForm onImported={() => setRefreshKey((k) => k + 1)} />
            </div>
            <div className="card">
                <ActivityList refreshKey={refreshKey} />
            </div>
        </div>
    );
}