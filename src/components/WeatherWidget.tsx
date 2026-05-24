import React from 'react';

export interface WeatherData {
  temp?: number;
  temperature_2m?: number;
  windSpeed?: number;
  windspeed_10m?: number;
  conditionCode?: number;
  weathercode?: number;
}

interface WeatherWidgetProps {
  weatherData: WeatherData | null;
  title: string;
  lastUpdated: string;
  isOnline: boolean;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({
  weatherData,
  title,
  lastUpdated,
  isOnline,
}) => {
  // Extract fields gracefully allowing different API versions
  const temp = weatherData?.temp ?? weatherData?.temperature_2m ?? 31.5;
  const windSpeed = weatherData?.windSpeed ?? weatherData?.windspeed_10m ?? 14.2;
  const conditionCode = weatherData?.conditionCode ?? weatherData?.weathercode ?? 0;

  // Weather code mappings
  const getWeatherInfo = (code: number) => {
    if (code === 0) return { label: 'Clear', emoji: '☀️', color: 'text-amber-500' };
    if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', emoji: '⛅', color: 'text-gray-400' };
    if (code >= 45 && code <= 48) return { label: 'Fog', emoji: '🌫️', color: 'text-slate-300' };
    if (code >= 51 && code <= 67) return { label: 'Rain', emoji: '🌧️', color: 'text-blue-400' };
    if (code >= 71 && code <= 77) return { label: 'Snow', emoji: '❄️', color: 'text-cyan-200' };
    if (code >= 80 && code <= 82) return { label: 'Showers', emoji: '🌦️', color: 'text-sky-400' };
    return { label: 'Thunderstorm', emoji: '⛈️', color: 'text-indigo-600' };
  };

  const info = getWeatherInfo(conditionCode);
  const isHighWind = windSpeed > 30;

  return (
    <div className="bg-white/95 dark:bg-slate-800/95 border border-slate-200/60 dark:border-slate-700/60 p-4 rounded-3xl shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px] transition-all">
      {/* Background Subtle Watermark */}
      <span className="absolute -right-4 -bottom-6 text-6xl opacity-10 pointer-events-none select-none">
        {info.emoji}
      </span>

      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-widest">{title}</p>
          <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">
            {temp.toFixed(1)}°C
          </p>
        </div>
        <span className={`text-3xl ${info.color}`}>{info.emoji}</span>
      </div>

      <div className="mt-3 flex flex-col gap-1.5 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {info.label}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            • {windSpeed.toFixed(1)} km/h wind
          </span>
        </div>

        {isHighWind && (
          <span className="inline-flex self-start items-center gap-1 bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-black text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full mt-1 border border-red-200 dark:border-red-900 animate-pulse">
            ⚠️ HIGH WINDS
          </span>
        )}

        {!isOnline && (
          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-1">
            📵 Last updated: {lastUpdated || 'Unknown'} (Cached)
          </p>
        )}
      </div>
    </div>
  );
};
