import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { LoadingProvider } from './context/LoadingContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';
import './index.css';

import { validateEnvironment } from './lib/env';
import { Workbox } from 'workbox-window';

validateEnvironment();

if ('serviceWorker' in navigator) {
  const wb = new Workbox('/sw.js');
  wb.addEventListener('activated', () => console.log('✅ E-Konek Service Worker activated'));
  wb.register().catch(err => console.error('SW registration failed:', err));
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <AppProvider>
        <LoadingProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </LoadingProvider>
      </AppProvider>
    </React.StrictMode>
  );
}
