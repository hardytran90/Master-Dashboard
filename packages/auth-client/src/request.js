import { getToken } from './tokenStorage.js';

// Shared fetch wrapper: adds the JWT (localStorage OR sessionStorage) and
// turns non-2xx responses into Errors with the API's message.
export function createRequest(baseUrl) {
  return async function request(path, options = {}) {
    const token = getToken();
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const err = new Error(data?.error || `Error ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return data;
  };
}
