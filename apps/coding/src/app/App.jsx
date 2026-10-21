import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@md/auth-client';
import { goToHubLogin } from '../lib/hub';
import CodingPage from '../features/coding/CodingPage';

// Not logged in → the hub's login page, which sends the user back here afterwards.
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  useEffect(() => {
    if (!isAuthenticated) goToHubLogin();
  }, [isAuthenticated]);
  return isAuthenticated ? children : null;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute><CodingPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
