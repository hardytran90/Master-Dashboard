import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { getToken, saveToken, clearToken } from './tokenStorage.js';

const AuthContext = createContext(null);

// `authApi` must provide login(email, password) and register(email, password),
// both resolving to { token }. Each app passes its own api client.
export function AuthProvider({ authApi, children }) {
  const [token, setToken] = useState(() => getToken());

  // Stable function identities so apps can safely list them in effect deps.
  const loginWithToken = useCallback((newToken, remember = true) => {
    saveToken(newToken, remember);
    setToken(newToken);
  }, []);

  const login = useCallback(async (email, password, remember = false) => {
    const { token: newToken } = await authApi.login(email, password, remember);
    loginWithToken(newToken, remember);
  }, [authApi, loginWithToken]);

  const register = useCallback(async (email, password) => {
    const { token: newToken } = await authApi.register(email, password);
    loginWithToken(newToken, false);
  }, [authApi, loginWithToken]);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({ token, isAuthenticated: !!token, login, loginWithToken, register, logout }),
    [token, login, loginWithToken, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
