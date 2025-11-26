'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { X, MapPin, Navigation, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icono del marcador
const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface SingleLocationMapProps {
  address: string;
  orderNumber: string;
  customerName?: string;
  onClose: () => void;
}

// Helper para extraer coordenadas del formato "direccion||lat,lng"
function parseAddressWithCoords(address: string): { displayAddress: string; lat: number | null; lng: number | null } {
  if (!address) return { displayAddress: '', lat: null, lng: null };
  
  const parts = address.split('||');
  if (parts.length === 2) {
    const coords = parts[1].split(',');
    if (coords.length === 2) {
      const lat = parseFloat(coords[0]);
      const lng = parseFloat(coords[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { displayAddress: parts[0], lat, lng };
      }
    }
  }
  return { displayAddress: address, lat: null, lng: null };
}

export default function SingleLocationMap({ 
  address, 
  orderNumber, 
  customerName,
  onClose 
}: SingleLocationMapProps) {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [displayAddress, setDisplayAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !address) return;

    const loadPosition = async () => {
      setIsLoading(true);
      setError(null);

      // Intentar extraer coordenadas del string
      const { displayAddress: addr, lat, lng } = parseAddressWithCoords(address);
      setDisplayAddress(addr);

      if (lat !== null && lng !== null) {
        setPosition([lat, lng]);
        setIsLoading(false);
        return;
      }

      // Geocoding como fallback
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
          { headers: { 'Accept-Language': 'es' } }
        );
        const data = await response.json();
        
        if (data && data.length > 0) {
          setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        } else {
          setError('No se pudo encontrar la ubicación');
        }
      } catch (err) {
        console.error('Error geocoding:', err);
        setError('Error al cargar la ubicación');
      } finally {
        setIsLoading(false);
      }
    };

    loadPosition();
  }, [address, mounted]);

  // Abrir en Google Maps
  const openInGoogleMaps = () => {
    if (position) {
      window.open(`https://www.google.com/maps?q=${position[0]},${position[1]}`, '_blank');
    }
  };

  if (!mounted) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <MapPin className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 dark:text-white">
                {orderNumber}
              </h3>
              {customerName && (
                <p className="text-sm text-neutral-500">{customerName}</p>
              )}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-neutral-500" />
          </button>
        </div>

        {/* Dirección */}
        <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-600 dark:text-neutral-300 line-clamp-2">
            📍 {displayAddress || address}
          </p>
        </div>

        {/* Mapa */}
        <div className="h-[250px] relative bg-neutral-100 dark:bg-neutral-800">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">Cargando mapa...</p>
              </div>
            </div>
          ) : error ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-4">
                <MapPin className="h-10 w-10 text-neutral-300 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">{error}</p>
              </div>
            </div>
          ) : position ? (
            <MapContainer
              center={position}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              zoomControl={true}
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker position={position} icon={markerIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">{orderNumber}</p>
                    <p className="text-xs text-gray-500">{displayAddress}</p>
                  </div>
                </Popup>
              </Marker>
            </MapContainer>
          ) : null}
        </div>

        {/* Footer con botones */}
        <div className="p-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            Cerrar
          </Button>
          {position && (
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
              onClick={openInGoogleMaps}
            >
              <Navigation className="h-4 w-4" />
              Abrir en Maps
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
