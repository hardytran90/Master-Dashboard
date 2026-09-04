import { useState } from 'react';
import ActivityList from './ActivityList';
import ActivityForm from './ActivityForm';
import GpxUploadForm from './GpxUploadForm';

export default function FitnessPage() {
    const [refreshKey, setRefreshKey] = useState(0);

    return (
        <div className="max-w-2x1 mx-auto p-6 space-y-6">
            <h1 className="text-x1 font-semibold text-gray-800">Fitness</h1>
            <div className="grid grid-cols-2 gap-4">
                <ActivityForm onCreated={() => setRefreshKey((k) => k + 1)} />
                <GpxUploadForm onImported={() => setRefreshKey((k) => k + 1)} />
            </div>
            <div className="bg-white rounded-lg border p-4">
                <ActivityList refreshKey={refreshKey} />
            </div>
        </div>
    );
}