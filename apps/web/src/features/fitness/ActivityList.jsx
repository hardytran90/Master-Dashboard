import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function ActivityList({ refreshKey }) {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoading(true);
        api
            .getActivities()
            .then((res) => setActivities(res.data))
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [refreshKey]);

    if (loading) return <p className="text-sm text-gray-500">Loading...</p>;
    if (error) return <p className="text-sm text-red-600">{error}</p>;
    if (activities.length === 0) return <p className="text-sm text-gray-500">No activity at this moment.</p>;

    return (
        <ul className="divide-y divide-gray-100">
            {activities.map((a) => (
                <li key={a.id} className="py-3 flex justify-between text-sm">
                    <div>
                        <span className="font-medium text-gray-800 capitalize">{a.type}</span>
                        <span className="text-gray-500 ml-2">
                            {new Date(a.activityDate).toLocaleDateString('vi-VN')}
                        </span>
                    </div>
                    <div className="text-gray-600">
                        {a.distanceKm} km · {Math.round(a.durationSec / 60)} minutes
                        {a.source !== 'manual' && <span className="badge ml-2">{a.source}</span>}
                    </div>
                </li>
            ))}
        </ul>
    );
}