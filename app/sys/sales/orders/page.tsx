"use client";

import { useState, useEffect } from "react";
import { Loader2, Package, MapPin, Phone, CreditCard, Truck, User, Clock, X, Navigation } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// COMPONENTE DE MAPA INLINE - Solución drástica para evitar problemas de dynamic import
const MapComponent = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: { id: number; name: string; };
}

interface Order {
  id: number;
  orderNumber: string | null;
  channel: string;
  status: string;
  contactPhone: string | null;
  shippingAddress: string | null;
  paymentMethod: string | null;
  payerName: string | null;
  subtotal: number;
  shippingCost: number;
  totalAmount: number;
  createdAt: string;
  user: { name: string; phone: string | null } | null;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
  paid: { label: "Pagado", color: "bg-blue-100 text-blue-800" },
  completed: { label: "Completado", color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800" },
};

function getDisplayAddress(address: string | null): string {
  if (!address) return "Sin dirección";
  return address.split("||")[0] || address;
}

// Parser de coordenadas
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

// Modal de mapa INLINE
function LocationMapModal({ 
  address, 
  orderNumber, 
  customerName,
  onClose 
}: {
  address: string;
  orderNumber: string;
  customerName?: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [displayAddress, setDisplayAddress] = useState('');
  const [markerIcon, setMarkerIcon] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    
    // Configurar icono de Leaflet solo en cliente
    if (typeof window !== 'undefined') {
      import('leaflet').then((L) => {
        const icon = new L.Icon({
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
        setMarkerIcon(icon);
      });
    }
    
    if (address) {
      const { displayAddress: addr, lat, lng } = parseAddressWithCoords(address);
      setDisplayAddress(addr);
      if (lat !== null && lng !== null) {
        setPosition([lat, lng]);
      }
    }
  }, [address]);

  const openInGoogleMaps = () => {
    if (position) {
      window.open(`https://www.google.com/maps?q=${position[0]},${position[1]}`, '_blank');
    }
  };

  if (!mounted || !position || !markerIcon) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-8">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      </div>
    );
  }

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
              <h3 className="font-semibold text-neutral-900 dark:text-white">{orderNumber}</h3>
              {customerName && <p className="text-sm text-neutral-500">{customerName}</p>}
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
            📍 {displayAddress}
          </p>
        </div>

        {/* Mapa */}
        <div className="h-[250px] relative">
          <MapComponent
            center={position}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
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
          </MapComponent>
        </div>

        {/* Footer */}
        <div className="p-4 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-2"
            onClick={openInGoogleMaps}
          >
            <Navigation className="h-4 w-4" />
            Abrir en Maps
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [processingId, setProcessingId] = useState<number | null>(null);
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    orderNumber: string;
    customerName: string;
  } | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/system/sales/orders");
      if (!res.ok) throw new Error("Error al cargar pedidos");
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      toast.error("No se pudieron cargar los pedidos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(orderId: number, action: "reserv" | "sale") {
    setProcessingId(orderId);
    try {
      const endpoint = action === "reserv" 
        ? "/api/system/sales/orders/reserv" 
        : "/api/system/sales/orders/sale";
      
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      
      if (!res.ok) throw new Error("Error al actualizar");
      toast.success(action === "reserv" ? "Pedido marcado como pagado" : "Venta completada");
      fetchOrders();
    } catch (error) {
      toast.error("No se pudo actualizar el estado");
      console.error(error);
    } finally {
      setProcessingId(null);
    }
  }

  function openLocationModal(order: Order) {
    if (!order.shippingAddress) return;
    
    setSelectedLocation({
      address: order.shippingAddress,
      orderNumber: order.orderNumber || `#${order.id}`,
      customerName: order.user?.name || "Cliente"
    });
    setShowLocationModal(true);
  }

  function closeLocationModal() {
    setShowLocationModal(false);
    setSelectedLocation(null);
  }

  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const onlineOrders = filteredOrders.filter(o => o.channel === "ONLINE");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Pedidos Online</h1>
          <p className="text-gray-500">{onlineOrders.length} pedido(s)</p>
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="paid">Pagados</SelectItem>
            <SelectItem value="completed">Completados</SelectItem>
            <SelectItem value="cancelled">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {onlineOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay pedidos online</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {onlineOrders.map(order => {
            const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const hasLocation = order.shippingAddress?.includes("||");
            const isProcessing = processingId === order.id;
            
            return (
              <Card key={order.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 p-4 bg-gray-50 dark:bg-neutral-800/50 border-b">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg">#{order.orderNumber || order.id}</span>
                      <Badge className={statusConf.color}>{statusConf.label}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      {new Date(order.createdAt).toLocaleString("es-BO")}
                    </div>
                  </div>

                  <div className="p-4 grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-gray-500 uppercase">Cliente</h4>
                      
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-0.5 text-gray-400" />
                        <span>{order.user?.name || "Cliente"}</span>
                      </div>
                      
                      {(order.contactPhone || order.user?.phone) && (
                        <div className="flex items-start gap-2">
                          <Phone className="h-4 w-4 mt-0.5 text-gray-400" />
                          <span>{order.contactPhone || order.user?.phone}</span>
                        </div>
                      )}
                      
                      {order.shippingAddress && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div className="flex-1">
                            <p className="text-sm">{getDisplayAddress(order.shippingAddress)}</p>
                            {hasLocation && (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto text-amber-600 hover:text-amber-700"
                                onClick={() => openLocationModal(order)}
                              >
                                Ver ubicación en mapa
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {order.paymentMethod && (
                        <div className="flex items-start gap-2">
                          <CreditCard className="h-4 w-4 mt-0.5 text-gray-400" />
                          <span>Pago: {order.paymentMethod}</span>
                        </div>
                      )}
                      
                      {order.payerName && (
                        <div className="flex items-start gap-2">
                          <User className="h-4 w-4 mt-0.5 text-gray-400" />
                          <div>
                            <p className="text-xs text-gray-500">Pagador</p>
                            <p className="font-medium">{order.payerName}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm text-gray-500 uppercase">Productos</h4>
                      <div className="space-y-2">
                        {order.items.map(item => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.product.name}</span>
                            <span className="font-medium">Bs {item.subtotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-2 border-t space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Subtotal</span>
                          <span>Bs {order.subtotal.toFixed(2)}</span>
                        </div>
                        {order.shippingCost > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="flex items-center gap-1">
                              <Truck className="h-3 w-3" /> Envío
                            </span>
                            <span>Bs {order.shippingCost.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-lg pt-1">
                          <span>Total</span>
                          <span className="text-amber-600">Bs {order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gray-50 dark:bg-neutral-800/50 border-t">
                    <div className="flex gap-2">
                      {order.status === "pending" && (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={isProcessing}
                            onClick={() => handleAction(order.id, "reserv")}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CreditCard className="h-4 w-4 mr-2" />
                            )}
                            Marcar Pagado
                          </Button>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={isProcessing}
                            onClick={() => handleAction(order.id, "sale")}
                          >
                            {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                            Completar Venta
                          </Button>
                        </>
                      )}
                      {order.status === "paid" && (
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={isProcessing}
                          onClick={() => handleAction(order.id, "sale")}
                        >
                          {isProcessing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                          Completar Venta
                        </Button>
                      )}
                    </div>

                    {hasLocation && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openLocationModal(order)}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Ver ubicación
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Mapa INLINE - sin lazy loading */}
      {showLocationModal && selectedLocation && (
        <LocationMapModal
          address={selectedLocation.address}
          orderNumber={selectedLocation.orderNumber}
          customerName={selectedLocation.customerName}
          onClose={closeLocationModal}
        />
      )}
    </div>
  );
}
