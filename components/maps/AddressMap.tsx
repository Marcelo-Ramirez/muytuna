'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Loader2, X, Check } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para el icono de Leaflet en Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface AddressMapProps {
  initialAddress?: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}

// Componente para manejar clicks en el mapa
function MapClickHandler({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Componente para centrar el mapa
function MapCenterHandler({ center }: { center: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);
  
  return null;
}

export default function AddressMap({ initialAddress, onAddressSelect, onClose }: AddressMapProps) {
  // Coordenadas por defecto: La Paz, Bolivia
  const defaultCenter: [number, number] = [-16.5000, -68.1500];
  
  const [position, setPosition] = useState<[number, number]>(defaultCenter);
  const [address, setAddress] = useState(initialAddress || '');
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [locationRequested, setLocationRequested] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pedir ubicación automáticamente al montar el componente
  useEffect(() => {
    if (mounted && !locationRequested && !initialAddress) {
      setLocationRequested(true);
      requestCurrentLocation();
    }
  }, [mounted, locationRequested, initialAddress]);

  // Función para solicitar ubicación
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocalización no soportada');
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        setMapCenter(newPos);
        await getAddressFromCoords(newPos[0], newPos[1]);
        setIsLoadingLocation(false);
      },
      (error) => {
        console.log('Error o permiso denegado:', error.message);
        setIsLoadingLocation(false);
        // No mostrar alerta si es la primera vez, solo usar ubicación por defecto
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Obtener dirección desde coordenadas (reverse geocoding)
  const getAddressFromCoords = async (lat: number, lng: number) => {
    setIsLoadingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'es',
          },
        }
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      console.error('Error al obtener dirección:', error);
    } finally {
      setIsLoadingAddress(false);
    }
  };

  // Buscar coordenadas desde dirección (geocoding)
  const searchAddress = async (query: string) => {
    if (!query || query.length < 3) return;
    
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'Accept-Language': 'es',
          },
        }
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPos: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setPosition(newPos);
        setMapCenter(newPos);
        setAddress(display_name);
      }
    } catch (error) {
      console.error('Error al buscar dirección:', error);
    }
  };

  // Manejar cambio en input de dirección con debounce
  const handleAddressChange = (value: string) => {
    setAddress(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchAddress(value);
    }, 1000);
  };

  // Obtener ubicación actual del usuario (botón manual)
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización');
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newPos: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        setMapCenter(newPos);
        await getAddressFromCoords(newPos[0], newPos[1]);
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Error de geolocalización:', error);
        alert('No se pudo obtener tu ubicación. Verifica los permisos de ubicación en tu navegador.');
        setIsLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Manejar click en el mapa
  const handleMapClick = async (lat: number, lng: number) => {
    const newPos: [number, number] = [lat, lng];
    setPosition(newPos);
    await getAddressFromCoords(lat, lng);
  };

  // Confirmar selección
  const handleConfirm = () => {
    if (address) {
      onAddressSelect(address, position[0], position[1]);
    }
  };

  if (!mounted) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm">
        <button onClick={onClose} className="p-2 hover:bg-neutral-100 rounded-full">
          <X className="h-5 w-5 text-neutral-700" />
        </button>
        <h2 className="font-semibold text-neutral-900">Seleccionar Dirección</h2>
        <div className="w-10" />
      </div>

      {/* Input de búsqueda */}
      <div className="bg-white px-4 py-3 border-b">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="Escribe tu dirección..."
            className="pl-10 pr-4"
          />
          {isLoadingAddress && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-amber-500" />
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        <MapContainer
          center={position}
          zoom={15}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} icon={customIcon} />
          <MapClickHandler onLocationSelect={handleMapClick} />
          <MapCenterHandler center={mapCenter} />
        </MapContainer>

        {/* Botón de mi ubicación */}
        <button
          onClick={getCurrentLocation}
          disabled={isLoadingLocation}
          className="absolute bottom-4 right-4 bg-white p-3 rounded-full shadow-lg hover:bg-neutral-50 disabled:opacity-50 z-[1000]"
        >
          {isLoadingLocation ? (
            <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
          ) : (
            <Navigation className="h-5 w-5 text-amber-500" />
          )}
        </button>
      </div>

      {/* Footer con dirección seleccionada */}
      <div className="bg-white p-4 space-y-3 pb-6 border-t">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900">Dirección seleccionada</p>
            <p className="text-sm text-neutral-500 truncate">{address || 'Toca en el mapa o busca una dirección'}</p>
          </div>
        </div>

        <Button
          onClick={handleConfirm}
          disabled={!address}
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-full disabled:opacity-50"
        >
          <Check className="mr-2 h-5 w-5" />
          Confirmar Dirección
        </Button>
      </div>
    </div>
  );
}
