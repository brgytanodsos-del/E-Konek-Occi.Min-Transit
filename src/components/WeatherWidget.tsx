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

    if (!weatherData) return <div className="p-4 bg-white rounded-lg shadow animate-pulse h-24"></div>;

    const details = getWeatherDetails(weatherData.weathercode);
    const isHighWind = weatherData.windspeed_10m > 30;

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border-l-4 border-navy flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase">{title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-3xl">{details.icon}</span>
                        <div>
                            <p className="text-xl font-bold text-navy">{Math.round(weatherData.temperature_2m)}°C</p>
                            <p className="text-xs text-gray-600">{details.label}</p>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-xs text-gray-500">Wind</p>
                    <p className={`text-sm font-bold ${isHighWind ? 'text-red-600' : 'text-gray-800'}`}>{weatherData.windspeed_10m} km/h</p>
                </div>
            </div>
        </div>
    );
};
