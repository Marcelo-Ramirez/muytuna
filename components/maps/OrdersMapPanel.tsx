'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { X, Navigation, Package, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix para el icono de Leaflet en Next.js (misma lógica que AddressMap)
const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const selectedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface OrderForMap {
  id: number;
  orderNumber: string | null;
  shippingAddress: string | null;
  status: string;
  totalAmount: number;
  user: {
    name: string;
  } | null;
}

interface OrdersMapPanelProps {
  orders: OrderForMap[];
  selectedOrderId: number | null;
  onSelectOrder: (orderId: number | null) => void;
  onClose: () => void;
}

interface GeocodedOrder extends OrderForMap {
  lat: number;
  lng: number;
  displayAddress: string;
}

// Componente para centrar el mapa
function MapCenterHandler({ center, zoom }: { center: [number, number] | null; zoom?: number }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 15, { animate: true });
    }
  }, [center, zoom, map]);
  
  return null;
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

export default function OrdersMapPanel({ 
  orders, 
  selectedOrderId, 
  onSelectOrder, 
  onClose 
}: OrdersMapPanelProps) {
  const [geocodedOrders, setGeocodedOrders] = useState<GeocodedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Centro por defecto: La Paz, Bolivia
  const defaultCenter: [number, number] = [-16.5000, -68.1500];

  useEffect(() => {
    setMounted(true);
  }, []);

  // Procesar órdenes - extraer coordenadas
  useEffect(() => {
    if (!mounted) return;
    
    const processOrders = async () => {
      setIsLoading(true);
      const results: GeocodedOrder[] = [];

      for (const order of orders) {
        if (order.shippingAddress) {
          const { displayAddress, lat, lng } = parseAddressWithCoords(order.shippingAddress);
          
          if (lat !== null && lng !== null) {
            // Tiene coordenadas incluidas
            results.push({
              ...order,
              lat,
              lng,
              displayAddress
            });
          } else {
            // Intentar geocoding como fallback
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(order.shippingAddress)}&limit=1`,
                { headers: { 'Accept-Language': 'es' } }
              );
              const data = await response.json();
              
              if (data && data.length > 0) {
                results.push({
                  ...order,
                  lat: parseFloat(data[0].lat),
                  lng: parseFloat(data[0].lon),
                  displayAddress: order.shippingAddress
                });
              }
              // Delay para rate limits
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (error) {
              console.error('Error geocoding:', error);
            }
          }
        }
      }

      setGeocodedOrders(results);
      setIsLoading(false);
    };

    if (orders.length > 0) {
      processOrders();
    } else {
      setGeocodedOrders([]);
      setIsLoading(false);
    }
  }, [orders, mounted]);

  // Centro del mapa basado en el pedido seleccionado
  const mapCenter = useMemo((): [number, number] => {
    if (selectedOrderId) {
      const selected = geocodedOrders.find(o => o.id === selectedOrderId);
      if (selected) {
        return [selected.lat, selected.lng];
      }
    }
    if (geocodedOrders.length > 0) {
      return [geocodedOrders[0].lat, geocodedOrders[0].lng];
    }
    return defaultCenter;
  }, [selectedOrderId, geocodedOrders, defaultCenter]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed': return { color: 'bg-green-500', text: 'Completado' };
      case 'paid': return { color: 'bg-blue-500', text: 'Pagado' };
      case 'pending': return { color: 'bg-yellow-500', text: 'Pendiente' };
      case 'cancelled': return { color: 'bg-red-500', text: 'Cancelado' };
      default: return { color: 'bg-gray-500', text: status };
    }
  };

  // Loading inicial
  if (!mounted) {
    return (
      <div className="w-full lg:w-[420px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[420px] h-full bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 flex flex-col shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
            <Navigation className="h-4 w-4 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 dark:text-white">Mapa de Entregas</h2>
            <span className="text-xs text-neutral-500">
              {geocodedOrders.length} ubicación{geocodedOrders.length !== 1 ? 'es' : ''}
            </span>
          </div>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="hover:bg-neutral-100 dark:hover:bg-neutral-800"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative min-h-[300px] bg-neutral-100 dark:bg-neutral-800">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-neutral-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">Cargando ubicaciones...</p>
            </div>
          </div>
        ) : geocodedOrders.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-neutral-900">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-neutral-600 dark:text-neutral-400 font-medium">No hay pedidos con dirección</p>
              <p className="text-sm text-neutral-400 mt-1">Los pedidos con envío aparecerán aquí</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapCenterHandler center={selectedOrderId ? mapCenter : null} />
            
            {geocodedOrders.map((order) => (
              <Marker
                key={order.id}
                position={[order.lat, order.lng]}
                icon={order.id === selectedOrderId ? selectedIcon : defaultIcon}
                eventHandlers={{
                  click: () => onSelectOrder(order.id)
                }}
              >
                <Popup>
                  <div className="min-w-[180px] p-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusInfo(order.status).color}`} />
                      <span className="font-semibold text-sm">
                        {order.orderNumber || `Pedido #${order.id}`}
                      </span>
                    </div>
                    {order.user && (
                      <p className="text-xs text-gray-600 mb-1">
                        👤 {order.user.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                      📍 {order.displayAddress}
                    </p>
                    <p className="font-semibold text-amber-600">
                      Bs {order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Lista de pedidos */}
      <div className="border-t border-neutral-200 dark:border-neutral-700 max-h-[220px] overflow-y-auto bg-white dark:bg-neutral-900">
        <div className="p-2 space-y-1">
          {geocodedOrders.length === 0 && !isLoading && (
            <p className="text-center text-sm text-neutral-400 py-4">Sin ubicaciones para mostrar</p>
          )}
          {geocodedOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            return (
              <button
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className={`w-full text-left p-3 rounded-xl transition-all ${
                  order.id === selectedOrderId 
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500' 
                    : 'bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 border-2 border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                    {order.orderNumber || `#${order.id}`}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full text-white ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <MapPin className="h-3 w-3 text-neutral-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {order.displayAddress}
                  </p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  {order.user && (
                    <span className="text-xs text-neutral-400">{order.user.name}</span>
                  )}
                  <span className="text-sm font-semibold text-amber-600 ml-auto">
                    Bs {order.totalAmount.toFixed(2)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
