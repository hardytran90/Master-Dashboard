const API_BASE = 'http://localhost:4000/api';

function getToken() {
    return localStorage.getItem('token');
}

async function request(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
        throw new Error(data?.error || `Error ${res.status}`); 
    }
    return data;
}

export const api = {
    login: (email, password) =>
        request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

    register: (email, password) =>
        request('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) }),

    getActivities: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/activities${query ? `?${query}` : ''}`);
    },

    createActivity: (payload) =>
        request('/activities', { method: 'POST', body: JSON.stringify(payload) }),

    importGPX: (file) => {
        const formData = new FormData();
        formData.append('file', file);
        return request('/activities/import-gpx', { method: 'POST', body: formData });
    },
};