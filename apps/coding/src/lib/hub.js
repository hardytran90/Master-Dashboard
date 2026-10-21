// The Master Dashboard hub owns login. Coding Tracker is mounted on the same domain at /coding/,
// so it shares the hub's token in localStorage / sessionStorage.
export const HUB_HOME = '/';

export function goToHubLogin() {
  const here = window.location.pathname + window.location.search;
  window.location.replace(`/login?next=${encodeURIComponent(here)}`);
}
