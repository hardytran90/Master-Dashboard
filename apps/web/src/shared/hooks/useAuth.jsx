import { createContext, useContext, useState } from 'react';
import { api } from '../../lib/api';
import { getToken, saveToken, clearToken } from '../../lib/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());

  // Used by email login, register, and the Strava/Google callback pages.
  // remember defaults to true so StravaCallbackPage (loginWithToken(token)) keeps working as before.
  function loginWithToken(newToken, remember = true) {
    saveToken(newToken, remember);
    setToken(newToken);
  }

  async function login(email, password, remember = false) {
    const { token: newToken } = await api.login(email, password, remember);
    loginWithToken(newToken, remember);
  }

  async function register(email, password) {
    const { token: newToken } = await api.register(email, password);
    loginWithToken(newToken, false);
  }

  function logout() {
    clearToken();
    setToken(null);
  }

  return (
    <AuthContext.Provider
      value={{ token, isAuthenticated: !!token, login, loginWithToken, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
