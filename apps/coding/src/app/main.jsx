import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@md/auth-client';
import { authApi } from '../lib/api';
import '../index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename="/coding">
      <AuthProvider authApi={authApi}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
