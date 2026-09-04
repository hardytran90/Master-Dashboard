import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../shared/hooks/useAuth';
import LoginPage from '../features/auth/LoginPage';
import FitnessPage from '../features/fitness/FitnessPage';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to = "/login" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route 
      path="/"
      element={
        <ProtectedRoute>
          <FitnessPage />
        </ProtectedRoute>
      }
      />
    </Routes>
  );
}