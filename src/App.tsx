import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Panel1 } from './components/Panel1';
import { Panel2 } from './components/Panel2';
import { Panel3 } from './components/Panel3';

export default function App() {
  const [currentPanel, setCurrentPanel] = useState<0 | 1 | 2>(2); // Default to Passenger View

  return (
      <AppProvider>
          <div className="min-h-screen bg-[var(--color-bglight)] font-sans relative">
              
              {/* Render Active Panel */}
              {currentPanel === 0 && <Panel1 />}
              {currentPanel === 1 && <Panel2 />}
              {currentPanel === 2 && <Panel3 />}

              {/* Bottom Navigation */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center pb-[env(safe-area-inset-bottom)] z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] no-print">
                  <button 
                      onClick={() => setCurrentPanel(0)} 
                      className={`flex-1 flex flex-col items-center justify-center py-2 tap-target transition-colors ${currentPanel === 0 ? 'text-[var(--color-orange)]' : 'text-gray-500 hover:text-[var(--color-navy)]'}`}
                  >
                      <span className="text-xl mb-1">🚢</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Port Admin</span>
                  </button>
                  <button 
                      onClick={() => setCurrentPanel(1)} 
                      className={`flex-1 flex flex-col items-center justify-center py-2 tap-target transition-colors ${currentPanel === 1 ? 'text-[var(--color-orange)]' : 'text-gray-500 hover:text-[var(--color-navy)]'}`}
                  >
                      <span className="text-xl mb-1">🚐</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Terminal</span>
                  </button>
                  <button 
                      onClick={() => setCurrentPanel(2)} 
                      className={`flex-1 flex flex-col items-center justify-center py-2 tap-target transition-colors ${currentPanel === 2 ? 'text-[var(--color-orange)]' : 'text-gray-500 hover:text-[var(--color-navy)]'}`}
                  >
                      <span className="text-xl mb-1">👤</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider">Passenger</span>
                  </button>
              </div>
          </div>
      </AppProvider>
  );
}
