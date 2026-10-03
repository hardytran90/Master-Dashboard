import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import FitnessPage from '../features/fitness/FitnessPage';
import LoginPage from '../features/auth/LoginPage';
import StravaCallbackPage from '../features/auth/StravaCallbackPage';
import GoogleCallbackPage from '../features/auth/GoogleCallbackPage';
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage';
import RegisterPage from '../features/auth/RegisterPage';


function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Login / register / forgot password: already logged in → go straight to the app
function GuestRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      {/* Backend redirects here after "Login with Strava" (token is in the URL hash) */}
      <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
      <Route path="/auth/strava/callback" element={<StravaCallbackPage />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><FitnessPage /></ProtectedRoute>} />
      {/* Backend redirects to /fitness?strava=... after "Connect Strava" */}
      <Route path="/fitness" element={<ProtectedRoute><FitnessPage /></ProtectedRoute>} />

      {/* Any unknown URL goes back to the home page */}
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}
