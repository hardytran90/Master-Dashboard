import { createContext, useContext, useState } from 'react';
import { api } from '../../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('token'));

    async function login(email, password) {
        const { token } = await api.login(email, password);
        localStorage.setItem('token', token);
        setToken(token);
    }

    function logout() {
        localStorage.removeItem('token');
        setToken(null);
    }

    function loginWithToken(newToken) {
        localStorage.setItem('token', newToken);
        setToken(newToken);
    }

    return (
        <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, loginWithToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}