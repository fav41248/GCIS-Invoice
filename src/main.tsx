import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import App from './App.tsx';
import {AuthProvider} from './AuthContext.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

// Safely purge legacy oversized product caches from localStorage to reclaim browser storage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem('gcis_cached_products');
  }
} catch {}

// Safely clear any stuck development service workers
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.DEV) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch(() => {});
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
