// Lets the sub-apps mounted on the same domain (e.g. /coding/) send people here to log in
// and get them back afterwards: /login?next=/coding/
// Stored in sessionStorage so it also survives the Google / Strava OAuth round-trip.
const KEY = 'postLoginNext';
const ALLOWED = ['/coding']; // only our own sub-apps → no open redirect

const isAllowed = (path) => typeof path === 'string' && ALLOWED.some((p) => path.startsWith(p));

export function rememberNextFromUrl() {
  try {
    const next = new URLSearchParams(window.location.search).get('next');
    if (isAllowed(next)) sessionStorage.setItem(KEY, next);
  } catch { /* storage blocked → just land on the dashboard */ }
}

// Returns true if a full-page navigation to a sub-app was started.
export function followNextIfAny() {
  try {
    const next = sessionStorage.getItem(KEY);
    if (!next) return false;
    sessionStorage.removeItem(KEY);
    if (!isAllowed(next)) return false;
    window.location.assign(next);
    return true;
  } catch {
    return false;
  }
}
