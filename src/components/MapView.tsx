import React, { useEffect, useRef, useState, useContext } from 'react';
import L from 'leaflet';
import { AppContext } from '../context/AppContext';

interface MarkerData {
    id: string;
    pos: [number, number];
    popupText: string;
    baseRoute?: string;
}

interface MapViewProps {
    center: [number, number];
    zoom?: number;
    markers?: MarkerData[];
    liveUpdate?: boolean;
}

export const MapView = ({ center, zoom = 11, markers = [], liveUpdate = false }: MapViewProps) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<{ [id: string]: L.Marker }>({});
    const context = useContext(AppContext);

    useEffect(() => {
        if (!mapInstance.current && mapRef.current) {
            mapInstance.current = L.map(mapRef.current).setView(center, zoom);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap'
            }).addTo(mapInstance.current);
        } else if (mapInstance.current) {
            mapInstance.current.setView(center, zoom);
        }
        // No cleanup here to avoid destroying map instance on re-renders
    }, [center, zoom, markers]);

    // Effect to handle marker updates (and simulate live tracking gracefully)
    useEffect(() => {
        if (!mapInstance.current) return;
        const map = mapInstance.current;

        const currentIds = new Set(markers.map(m => m.id));
        
        // Remove old markers
        for (const id in markersLayerRef.current) {
            if (!currentIds.has(id)) {
                map.removeLayer(markersLayerRef.current[id]);
                delete markersLayerRef.current[id];
            }
        }

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: "<div style='background-color:#FF6B00; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);'></div>",
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });

        // Initialize markers
        markers.forEach(m => {
            if (!markersLayerRef.current[m.id]) {
                const marker = L.marker(m.pos, { icon }).bindPopup(m.popupText);
                marker.addTo(map);
                markersLayerRef.current[m.id] = marker;
            }
        });

        // If liveUpdate is true, animate positions every 3 seconds
        let interval: ReturnType<typeof setInterval>;
        if (liveUpdate && context?.getTripLocation) {
            interval = setInterval(() => {
                markers.forEach(m => {
                    const marker = markersLayerRef.current[m.id];
                    if (marker && m.baseRoute) {
                        const newPos = context.getTripLocation(m.baseRoute);
                        marker.setLatLng(newPos);
                    }
                });
            }, 3000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [center, zoom, markers, liveUpdate, context]);

    return <div ref={mapRef} className="w-full h-64 rounded-lg shadow-md z-0 relative"></div>;
};
