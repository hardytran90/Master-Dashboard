import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import LoginPage from '../features/auth/LoginPage';
import StravaCallbackPage from '../features/auth/StravaCallbackPage';
import FitnessPage from '../features/fitness/FitnessPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      {/* Backend redirects here after "Login with Strava" (token is in the URL hash) */}
      <Route path="/auth/strava/callback" element={<StravaCallbackPage />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <FitnessPage />
          </ProtectedRoute>
        }
      />
      {/* Backend redirects to /fitness?strava=... after "Connect Strava" */}
      <Route
        path="/fitness"
        element={
          <ProtectedRoute>
            <FitnessPage />
          </ProtectedRoute>
        }
      />

      {/* Any unknown URL goes back to the home page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
