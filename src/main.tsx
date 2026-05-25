import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context/AppContext';
import { LoadingProvider } from './context/LoadingContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { App } from './App';
import './index.css';

import { validateEnvironment } from './lib/env';

validateEnvironment();

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
