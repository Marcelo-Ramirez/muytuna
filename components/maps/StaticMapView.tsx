'use client';

import { useEffect, useState, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat: number;
  lng: number;
}

export default function StaticMapView({ lat, lng }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !mapRef.current || mapInstanceRef.current) return;

    console.log("Initializing Leaflet map with:", lat, lng);

    // Crear el mapa
    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom: 16,
      scrollWheelZoom: false,
      dragging: false,
      zoomControl: false,
    });

    // Agregar tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    // Agregar marcador
    const icon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    L.marker([lat, lng], { icon }).addTo(map);

    mapInstanceRef.current = map;

    // Forzar recalculo del tamaño
    setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mounted, lat, lng]);

  if (!mounted) {
    return <div className="h-[200px] bg-gray-200 rounded-lg animate-pulse" />;
  }

  return (
    <div 
      ref={mapRef} 
      style={{ height: '200px', width: '100%', borderRadius: '8px' }}
    />
  );
}
