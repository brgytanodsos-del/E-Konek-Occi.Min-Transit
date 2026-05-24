import React from 'react';

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

export const WeatherWidget = ({ weatherData, title, lastUpdated, isOnline }: WeatherWidgetProps) => {
  const getWeatherDetails = (code: number) => {
    if (code === 0) return { label: 'Clear', icon: '☀️' };
    if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: '⛅' };
    if (code >= 45 && code <= 48) return { label: 'Fog', icon: '🌫️' };
    if (code >= 51 && code <= 67) return { label: 'Rain', icon: '🌧️' };
    if (code >= 71 && code <= 77) return { label: 'Snow', icon: '❄️' };
    if (code >= 80 && code <= 82) return { label: 'Showers', icon: '🌦️' };
    if (code >= 95) return { label: 'Thunderstorm', icon: '⛈️' };
    return { label: 'Cloudy', icon: '☁️' };
  };

  if (!weatherData) {
    return (
      <div className="p-4 bg-white border border-gray-100 rounded-3xl animate-pulse flex flex-col justify-center h-24">
        <div className="h-3 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-5 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  const details = getWeatherDetails(weatherData.weathercode);
  const isHighWind = weatherData.windspeed_10m > 30;

  return (
    <div className="relative bg-white p-4.5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 text-[#2D3748] w-full">
      <div className="text-3xl bg-blue-50/50 p-3 rounded-2xl shrink-0">{details.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{title}</p>
        <p className="text-lg font-extrabold text-[#003580] leading-snug">
          {Math.round(weatherData.temperature_2m)}°C <span className="text-gray-300 font-light mx-1">|</span> {details.label}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-400 font-medium">Wind: {weatherData.windspeed_10m} km/h</span>
          {isHighWind && (
            <span className="bg-red-100 text-red-700 font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full animate-pulse border border-red-200">
              ⚠️ HIGH WINDS
            </span>
          )}
        </div>

        {!isOnline && lastUpdated && (
          <p className="text-[9px] text-gray-400 mt-1 font-mono">
            📵 Cached Mode (Last fetched: {lastUpdated})
          </p>
        )}
      </div>
    </div>
  );
};
