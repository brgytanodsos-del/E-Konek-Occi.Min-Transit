import React from 'react';
import { WeatherData } from '../types';

interface WeatherWidgetProps {
    weatherData: WeatherData | null;
    title: string;
}

export const WeatherWidget = ({ weatherData, title }: WeatherWidgetProps) => {
    const getWeatherDetails = (code: number) => {
        if (code === 0) return { label: 'Clear', icon: '☀️' };
        if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', icon: '⛅' };
        if (code >= 51 && code <= 67) return { label: 'Rain', icon: '🌧️' };
        if (code >= 80 && code <= 82) return { label: 'Showers', icon: '🌦️' };
        if (code >= 95) return { label: 'Thunderstorm', icon: '⛈️' };
        return { label: 'Cloudy', icon: '☁️' };
    };

    if (!weatherData) return <div className="p-5 bg-gradient-to-br from-blue-500 to-navy rounded-2xl shadow-lg animate-pulse h-full min-h-[100px]"></div>;

    const details = getWeatherDetails(weatherData.weathercode);
    const isHighWind = weatherData.windspeed_10m > 30;

    return (
        <div className="bg-gradient-to-br from-blue-500 to-navy rounded-2xl shadow-lg p-5 text-white flex flex-col md:flex-row items-center gap-4 h-full">
            <div className="text-4xl">{details.icon}</div>
            <div className="flex-1 w-full text-center md:text-left">
                <div className="text-sm font-medium opacity-80 uppercase tracking-tighter">{title}</div>
                <div className="text-2xl font-black">{Math.round(weatherData.temperature_2m)}°C <span className="text-base font-medium opacity-90 mx-1">—</span> {details.label}</div>
                <div className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isHighWind ? 'text-red-300' : 'opacity-70'}`}>
                    Wind: {weatherData.windspeed_10m} km/h
                </div>
            </div>
        </div>
    );
};
