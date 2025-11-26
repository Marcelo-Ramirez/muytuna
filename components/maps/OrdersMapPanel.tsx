'use client';

import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { X, Navigation, Package } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Icono personalizado para marcadores
const createIcon = (isSelected: boolean) => new L.Icon({
  iconUrl: isSelected 
    ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png'
    : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
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
}

// Componente para centrar el mapa en un marcador seleccionado
function MapController({ center }: { center: [number, number] | null }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15, { animate: true });
    }
  }, [center, map]);
  
  return null;
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

  // Extraer coordenadas de las direcciones o hacer geocoding si es necesario
  useEffect(() => {
    const processOrders = async () => {
      setIsLoading(true);
      const results: GeocodedOrder[] = [];

      for (const order of orders) {
        if (order.shippingAddress) {
          // Intentar extraer coordenadas del formato "direccion||lat,lng"
          const parts = order.shippingAddress.split('||');
          
          if (parts.length === 2) {
            // Tiene coordenadas incluidas
            const coords = parts[1].split(',');
            if (coords.length === 2) {
              const lat = parseFloat(coords[0]);
              const lng = parseFloat(coords[1]);
              if (!isNaN(lat) && !isNaN(lng)) {
                results.push({
                  ...order,
                  lat,
                  lng,
                  // Mostrar solo la dirección sin las coordenadas
                  shippingAddress: parts[0]
                });
                continue;
              }
            }
          }
          
          // Si no tiene coordenadas, intentar geocoding
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
                lng: parseFloat(data[0].lon)
              });
            }
          } catch (error) {
            console.error('Error geocoding:', error);
          }
          
          // Pequeño delay para respetar rate limits de Nominatim
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      setGeocodedOrders(results);
      setIsLoading(false);
    };

    if (orders.length > 0) {
      processOrders();
    } else {
      setIsLoading(false);
    }
  }, [orders]);

  // Centro del mapa basado en el pedido seleccionado
  const mapCenter = useMemo(() => {
    if (selectedOrderId) {
      const selected = geocodedOrders.find(o => o.id === selectedOrderId);
      if (selected) {
        return [selected.lat, selected.lng] as [number, number];
      }
    }
    if (geocodedOrders.length > 0) {
      return [geocodedOrders[0].lat, geocodedOrders[0].lng] as [number, number];
    }
    return defaultCenter;
  }, [selectedOrderId, geocodedOrders]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'paid': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      case 'cancelled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="fixed right-0 top-0 h-full w-full lg:w-[400px] bg-background border-l shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Mapa de Entregas</h2>
          <span className="text-sm text-muted-foreground">
            ({geocodedOrders.length} ubicaciones)
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Cargando ubicaciones...</p>
            </div>
          </div>
        ) : geocodedOrders.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center p-4">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No hay pedidos con dirección</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={selectedOrderId ? mapCenter : null} />
            
            {geocodedOrders.map((order) => (
              <Marker
                key={order.id}
                position={[order.lat, order.lng]}
                icon={createIcon(order.id === selectedOrderId)}
                eventHandlers={{
                  click: () => onSelectOrder(order.id)
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`} />
                      <span className="font-semibold">
                        {order.orderNumber || `Pedido #${order.id}`}
                      </span>
                    </div>
                    {order.user && (
                      <p className="text-sm text-muted-foreground mb-1">
                        Cliente: {order.user.name}
                      </p>
                    )}
                    <p className="text-sm mb-2 line-clamp-2">{order.shippingAddress}</p>
                    <p className="font-medium text-primary">
                      Total: Bs {order.totalAmount.toFixed(2)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Lista de pedidos */}
      <div className="border-t max-h-[200px] overflow-y-auto">
        <div className="p-2 space-y-1">
          {geocodedOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => onSelectOrder(order.id)}
              className={`w-full text-left p-2 rounded-lg transition-colors ${
                order.id === selectedOrderId 
                  ? 'bg-primary/10 border border-primary' 
                  : 'hover:bg-muted'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">
                  {order.orderNumber || `#${order.id}`}
                </span>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(order.status)}`} />
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {order.shippingAddress}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
