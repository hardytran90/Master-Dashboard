import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../shared/hooks/useAuth';
import ActivityList from './ActivityList';
import GpxUploadForm from './GpxUploadForm';
import ActiveDayHeatmap from './components/ActiveDayHeatmap';
import FitnessDashboard from './components/FitnessDashboard';
import { PanelHead } from './components/fitnessUi';
import StravaSyncButton from './StravaSyncButton';

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
            <StravaSyncButton onSynced={() => setRefreshKey((k) => k + 1)} />
            <div className="max-w-5xl mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-xl text-transform: uppercase text-gray-900 drop-shadow-sm">My Fitness</h1>
                    <button type="button" onClick={handleLogout} className="fx-btn-tab">Log out</button>
                </div>
                    
                {/* Inside the max-w-5xl container so it lines up with the other panels */}
                <StravaSyncButton onSynced={refresh} />
                
                <FitnessDashboard refreshKey={refreshKey} />

                <GpxUploadForm onImported={refresh} />
                
                <section className="fx-panel">
                    <PanelHead title="Heat map" />
                    <ActiveDayHeatmap refreshKey={refreshKey} />
                </section>

                <div className="fx-panel">
                    <ActivityList refreshKey={refreshKey} onChanged={refresh} />
                </div>
            </div>
        </div>
    );
}
