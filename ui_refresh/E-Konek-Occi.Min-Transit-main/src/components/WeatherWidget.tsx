import React from 'react';
import { CloudFog, CloudRain, CloudSnow, CloudSun, Sun, Wind } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusChip, cn } from './ui';

interface WeatherWidgetProps {
  weatherData: {
    temperature_2m: number;
    weathercode: number;
    windspeed_10m: number;
    lastUpdated?: string;
  } | null;
  title: string;
  lastUpdated: string;
  isOnline: boolean;
}

const getWeatherDetails = (code: number): { label: string; icon: LucideIcon } => {
  if (code === 0) return { label: 'Clear skies', icon: Sun };
  if (code >= 1 && code <= 3) return { label: 'Partly cloudy', icon: CloudSun };
  if (code >= 45 && code <= 48) return { label: 'Fog', icon: CloudFog };
  if (code >= 51 && code <= 67) return { label: 'Rain', icon: CloudRain };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: CloudSnow };
  if (code >= 80 && code <= 82) return { label: 'Showers', icon: CloudRain };
  if (code >= 95) return { label: 'Thunderstorm', icon: CloudRain };
  return { label: 'Cloud cover', icon: CloudSun };
};

export const WeatherWidget = ({ weatherData, title, lastUpdated, isOnline }: WeatherWidgetProps) => {
  if (!weatherData) {
    return (
      <div className="surface-card flex min-h-[9rem] w-full items-center gap-4 p-5 animate-pulse">
        <div className="h-14 w-14 rounded-2xl bg-slate-200" />
        <div className="flex-1 space-y-3">
          <div className="h-3 w-28 rounded-full bg-slate-200" />
          <div className="h-7 w-48 rounded-full bg-slate-200" />
          <div className="h-3 w-36 rounded-full bg-slate-200" />
        </div>
      </div>
    );
  }

  const details = getWeatherDetails(weatherData.weathercode);
  const Icon = details.icon;
  const isHighWind = weatherData.windspeed_10m > 30;

  return (
    <div className="surface-card flex w-full items-center gap-4 p-5">
      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[rgba(12,45,87,0.08)] text-[#0c2d57] shadow-inner">
        <Icon size={28} />
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
          <StatusChip tone={isOnline ? 'success' : 'neutral'} className="!px-2.5 !py-1 !text-[10px]">
            {isOnline ? 'Live feed' : 'Cached'}
          </StatusChip>
          {isHighWind && (
            <StatusChip tone="danger" className="!px-2.5 !py-1 !text-[10px]">
              Wind advisory
            </StatusChip>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <p className="text-2xl font-extrabold tracking-tight text-slate-950">{Math.round(weatherData.temperature_2m)}°C</p>
          <p className="pb-1 text-sm font-semibold text-slate-600">{details.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Wind size={15} className={cn(isHighWind ? 'text-rose-500' : 'text-slate-400')} />
            {weatherData.windspeed_10m} km/h
          </span>
          {lastUpdated && (
            <span className="text-xs font-medium text-slate-400">
              {isOnline ? `Updated ${lastUpdated}` : `Last sync ${lastUpdated}`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
