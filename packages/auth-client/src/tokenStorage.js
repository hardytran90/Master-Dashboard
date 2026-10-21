// "Remember me" ticked   → token in localStorage   (survives closing the browser)
// "Remember me" unticked → token in sessionStorage (gone when the browser closes)
// Only the email is remembered for the form. The password is NEVER stored in the browser.
const TOKEN_KEY = 'token';
const EMAIL_KEY = 'rememberedEmail';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token, remember) {
  clearToken();
  (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getRememberedEmail() {
  return localStorage.getItem(EMAIL_KEY) || '';
}

export function setRememberedEmail(email) {
  if (email) localStorage.setItem(EMAIL_KEY, email);
  else localStorage.removeItem(EMAIL_KEY);
}
