import React from 'react';
import { useApp } from '@/context/AppContext';

interface PanelHeaderProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({ title, children, className = '' }) => {
  const { isDarkMode, setIsDarkMode } = useApp();

  return (
    <header className={`dashboard-header bg-white/80 border-b border-slate-200/70 py-4 px-6 flex justify-between items-center shadow-xs ${className}`}>
      <span className="font-extrabold text-[#003580] tracking-tight text-sm">
        {title}
      </span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/75 text-slate-700 dark:border-slate-700/50 dark:bg-slate-800/80 dark:text-slate-200 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-sm backdrop-blur-md"
          title="Toggle visual theme"
        >
          {isDarkMode ? <i className="fa-solid fa-sun text-sm text-amber-500" /> : <i className="fa-solid fa-moon text-sm text-[#003580]" />}
        </button>
        {children}
      </div>
    </header>
  );
};
