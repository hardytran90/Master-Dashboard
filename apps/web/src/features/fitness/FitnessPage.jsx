import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import GpxUploadForm from './GpxUploadForm';
import ActiveDayHeatmap from './components/ActiveDayHeatmap';
import FitnessDashboard from './components/FitnessDashboard';


export default function FitnessPage() {
    const [refreshKey, setRefreshKey] = useState(0);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const refresh = () => setRefreshKey((k) => k + 1);

    function handleLogout() {
        logout();
        navigate('/login');
    }

    return (
        <div className='min-h-screen fitness-page-bg'>
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl font-semibold text-gray-900 drop-shadow-sm">My Fitness</h1>
                    <button type="button" onClick={handleLogout} className="btn-secondary">Logout</button>
                </div>
                    
                <FitnessDashboard refreshKey={refreshKey} />

                <div className='grid grid-cols-2 gap-4'>
                    <GpxUploadForm onImported={refresh} />
                    <ActivityForm onCreated={refresh}/>
                </div>

                <section className="card">
                    <ActiveDayHeatmap refreshKey={refreshKey}/>
                </section>

                <div className="card">
                    <ActivityList refreshKey={refreshKey} onChanged={refresh} />
                </div>
            </div>
        </div>
);
}