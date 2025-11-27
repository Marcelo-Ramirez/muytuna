"use client";

import { useState, useEffect } from "react";
import { Loader2, Package, MapPin, Phone, CreditCard, Truck, User, Clock, X, Navigation, Columns3, Receipt, ShoppingBag, Link2, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable, DragStartEvent } from '@dnd-kit/core';
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

interface YapePayment {
  id: number;
  payerName: string;
  amount: number;
  rawText: string;
  status: 'unmatched' | 'matched' | 'manual' | 'rejected';
  matchConfidence: number | null;
  orderId: number | null;
  assignedBy: string | null;
  assignedAt: string | null;
  receivedAt: string;
  processedAt: string | null;
  order: {
    id: number;
    orderNumber: string;
    totalAmount: number;
    status: string;
    user: {
      name: string;
      phone: string | null;
    } | null;
  } | null;
}

type ViewMode = 'orders' | 'payments' | 'both';

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
  const [payments, setPayments] = useState<YapePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('orders');
  
  // Estados para drag & drop
  const [activePayment, setActivePayment] = useState<YapePayment | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<YapePayment | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{
    address: string;
    orderNumber: string;
    customerName: string;
  } | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchPayments();
    
    // Auto-refresh cada 10 segundos solo para pagos
    const interval = setInterval(() => {
      if (viewMode === 'payments' || viewMode === 'both') {
        fetchPayments();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [viewMode]);

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

  async function fetchPayments() {
    setLoadingPayments(true);
    try {
      const res = await fetch("/api/yape/payments");
      if (!res.ok) throw new Error("Error al cargar pagos");
      const data = await res.json();
      setPayments(data.payments || []);
    } catch (error) {
      console.error("Error al cargar pagos:", error);
    } finally {
      setLoadingPayments(false);
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

  // Drag & Drop handlers
  function handleDragStart(event: DragStartEvent) {
    const paymentId = event.active.id as number;
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setActivePayment(payment);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActivePayment(null);
    
    if (!over) return;
    
    const paymentId = active.id as number;
    const orderId = over.id as number;
    
    const payment = payments.find(p => p.id === paymentId);
    const order = pendingOrders.find(o => o.id === orderId);
    
    if (payment && order && payment.status === 'unmatched') {
      setSelectedPayment(payment);
      setSelectedOrder(order);
      setShowConfirmModal(true);
    }
  }

  async function handleAssignPayment() {
    if (!selectedPayment || !selectedOrder) return;
    
    try {
      const res = await fetch('/api/yape/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          orderId: selectedOrder.id
        })
      });
      
      if (!res.ok) {
        const data = await res.json();
        if (data.warning) {
          toast.error(data.error, { duration: 5000 });
        } else {
          throw new Error(data.error || 'Error al asignar pago');
        }
        return;
      }
      
      toast.success('Pago asignado exitosamente');
      setShowConfirmModal(false);
      setSelectedPayment(null);
      setSelectedOrder(null);
      fetchPayments();
      fetchOrders();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al asignar pago');
    }
  }

  async function handleRejectPayment(paymentId: number) {
    if (!confirm('¿Estás seguro de rechazar este pago?')) return;
    
    try {
      const res = await fetch('/api/yape/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          action: 'reject'
        })
      });
      
      if (!res.ok) throw new Error('Error al rechazar pago');
      
      toast.success('Pago rechazado');
      fetchPayments();
    } catch (error) {
      toast.error('Error al rechazar pago');
    }
  }

  const filteredOrders = statusFilter === "all" 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  const onlineOrders = filteredOrders.filter(o => o.channel === "ONLINE");
  const pendingOrders = onlineOrders.filter(o => o.status === "pending");
  const unmatchedPayments = payments.filter(p => p.status === 'unmatched');
  const matchedPayments = payments.filter(p => p.status === 'matched' || p.status === 'manual');

  // Componente: Vista solo de pedidos
  const OrdersView = () => (
    <div className="space-y-4">
      {onlineOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay pedidos online</p>
          </CardContent>
        </Card>
      ) : (
        onlineOrders.map(order => <OrderCard key={order.id} order={order} />)
      )}
    </div>
  );

  // Componente: Vista solo de pagos
  const PaymentsView = () => (
    <div className="space-y-4">
      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay pagos Yape registrados</p>
          </CardContent>
        </Card>
      ) : (
        payments.map(payment => <PaymentCard key={payment.id} payment={payment} />)
      )}
    </div>
  );

  // Componente: Vista de ambas columnas
  const BothColumnsView = () => (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Columna de Pedidos */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Pedidos Pendientes ({pendingOrders.length})
        </h2>
        {pendingOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Package className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No hay pedidos pendientes</p>
            </CardContent>
          </Card>
        ) : (
          pendingOrders.map(order => <DroppableOrderCard key={order.id} order={order} />)
        )}
      </div>

      {/* Columna de Pagos */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Pagos Yape
          {unmatchedPayments.length > 0 && (
            <Badge className="bg-yellow-500 text-white">
              {unmatchedPayments.length} sin emparejar
            </Badge>
          )}
        </h2>
        {loadingPayments && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        )}
        {payments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Receipt className="h-10 w-10 mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No hay pagos registrados</p>
            </CardContent>
          </Card>
        ) : (
          payments.map(payment => <DraggablePaymentCard key={payment.id} payment={payment} />)
        )}
      </div>
    </div>
  );

  // Componente auxiliar: Card de pedido normal con TODOS los detalles
  const OrderCard = ({ order }: { order: Order }) => {
    const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const hasLocation = order.shippingAddress?.includes("||");
    const isProcessing = processingId === order.id;
    
    return (
      <Card className="overflow-hidden">
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
                  <span>
                    {order.paymentMethod === 'yape' ? '📱 Yape' : 
                     order.paymentMethod === 'cash' ? '💵 Efectivo' : 
                     order.paymentMethod}
                  </span>
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
  };

  // Componente auxiliar: Card de pedido con drop zone
  const DroppableOrderCard = ({ order }: { order: Order }) => {
    const { setNodeRef, isOver } = useDroppable({ id: order.id });
    const statusConf = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
    const hasLocation = order.shippingAddress?.includes("||");
    const isProcessing = processingId === order.id;
    
    return (
      <div
        ref={setNodeRef}
        className={`relative ${isOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
      >
        <Card className={`overflow-hidden transition-all ${isOver ? 'scale-105 shadow-lg' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="font-bold text-lg">#{order.orderNumber || order.id}</span>
                <Badge className={`ml-2 ${statusConf.color}`}>{statusConf.label}</Badge>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(order.createdAt).toLocaleDateString('es-BO')}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <p><User className="inline h-4 w-4 mr-1" />{order.user?.name || 'Cliente'}</p>
              {(order.contactPhone || order.user?.phone) && (
                <p><Phone className="inline h-4 w-4 mr-1" />{order.contactPhone || order.user?.phone}</p>
              )}
              
              {/* MÉTODO DE PAGO */}
              {order.paymentMethod && (
                <p className="text-xs">
                  <CreditCard className="inline h-3 w-3 mr-1" />
                  {order.paymentMethod === 'yape' ? '📱 Yape' : 
                   order.paymentMethod === 'cash' ? '💵 Efectivo' : 
                   order.paymentMethod}
                </p>
              )}
              
              {/* DIRECCIÓN */}
              {order.shippingAddress && (
                <p className="text-xs text-gray-600">
                  <MapPin className="inline h-3 w-3 mr-1" />
                  {getDisplayAddress(order.shippingAddress)}
                </p>
              )}
              
              {/* PRODUCTOS (resumido) */}
              {order.items && order.items.length > 0 && (
                <div className="text-xs text-gray-500 border-t pt-2">
                  <p className="font-medium">📦 {order.items.length} producto(s):</p>
                  {order.items.slice(0, 2).map(item => (
                    <p key={item.id}>• {item.quantity}x {item.product.name}</p>
                  ))}
                  {order.items.length > 2 && <p>• ... y {order.items.length - 2} más</p>}
                </div>
              )}
              
              {/* TOTALES */}
              <div className="border-t pt-2">
                <p className="text-xs">Subtotal: Bs {order.subtotal.toFixed(2)}</p>
                {order.shippingCost > 0 && (
                  <p className="text-xs">Envío: Bs {order.shippingCost.toFixed(2)}</p>
                )}
                <p className="font-bold text-amber-600">Total: Bs {order.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {isOver && (
          <div className="absolute inset-0 bg-blue-500/10 rounded-lg pointer-events-none flex items-center justify-center">
            <div className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium">
              Soltar para asignar pago
            </div>
          </div>
        )}
      </div>
    );
  };

  // Componente auxiliar: Card de pago draggable
  const DraggablePaymentCard = ({ payment }: { payment: YapePayment }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
      id: payment.id,
      disabled: payment.status !== 'unmatched'
    });

    const style = transform ? {
      transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      opacity: isDragging ? 0.5 : 1
    } : undefined;

    const statusColors = {
      unmatched: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      matched: 'bg-green-100 text-green-800 border-green-300',
      manual: 'bg-blue-100 text-blue-800 border-blue-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
        <Card className={`overflow-hidden ${payment.status === 'unmatched' ? 'cursor-grab active:cursor-grabbing' : ''}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <Badge className={statusColors[payment.status]}>
                {payment.status === 'unmatched' && '🟡 Sin emparejar'}
                {payment.status === 'matched' && '🟢 Auto'}
                {payment.status === 'manual' && '🔵 Manual'}
                {payment.status === 'rejected' && '🔴 Rechazado'}
              </Badge>
              {payment.status === 'unmatched' && (
                <button
                  onClick={() => handleRejectPayment(payment.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <p className="font-semibold text-sm mb-1">{payment.payerName}</p>
            <p className="text-xl font-bold text-amber-600 mb-2">Bs {payment.amount.toFixed(2)}</p>
            <p className="text-xs text-gray-500">
              {new Date(payment.receivedAt).toLocaleString('es-BO')}
            </p>
            
            {payment.order && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />
                  Pedido: {payment.order.orderNumber}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  // Componente auxiliar: Card de pago normal (no draggable)
  const PaymentCard = ({ payment }: { payment: YapePayment }) => {
    const statusColors = {
      unmatched: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      matched: 'bg-green-100 text-green-800 border-green-300',
      manual: 'bg-blue-100 text-blue-800 border-blue-300',
      rejected: 'bg-red-100 text-red-800 border-red-300'
    };

    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-2">
            <Badge className={statusColors[payment.status]}>
              {payment.status === 'unmatched' && '🟡 Sin emparejar'}
              {payment.status === 'matched' && '🟢 Auto'}
              {payment.status === 'manual' && '🔵 Manual'}
              {payment.status === 'rejected' && '🔴 Rechazado'}
            </Badge>
            {payment.matchConfidence && (
              <span className="text-xs text-gray-500">{payment.matchConfidence}% confianza</span>
            )}
          </div>
          
          <p className="font-semibold text-sm mb-1">{payment.payerName}</p>
          <p className="text-xl font-bold text-amber-600 mb-2">Bs {payment.amount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mb-2">
            {new Date(payment.receivedAt).toLocaleString('es-BO')}
          </p>
          
          {payment.order && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <p className="text-sm font-medium flex items-center gap-1">
                <Link2 className="h-4 w-4" />
                Pedido: {payment.order.orderNumber}
              </p>
              <p className="text-xs text-gray-600">
                Cliente: {payment.order.user?.name || 'N/A'}
              </p>
              <p className="text-xs text-gray-600">
                Total pedido: Bs {payment.order.totalAmount.toFixed(2)}
              </p>
            </div>
          )}
          
          {payment.status === 'unmatched' && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => handleRejectPayment(payment.id)}
              >
                <XCircle className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Header con selector de vista */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gestión de Pedidos y Pagos</h1>
            <p className="text-gray-500">
              {onlineOrders.length} pedido(s) • {unmatchedPayments.length} pago(s) sin emparejar
            </p>
          </div>
          
          <div className="flex gap-3">
            {/* Selector de Modo de Vista */}
            <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('orders')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'orders' 
                    ? 'bg-white dark:bg-neutral-700 shadow-sm' 
                    : 'hover:bg-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="text-sm font-medium">Pedidos</span>
              </button>
              <button
                onClick={() => setViewMode('payments')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'payments' 
                    ? 'bg-white dark:bg-neutral-700 shadow-sm' 
                    : 'hover:bg-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                <Receipt className="h-4 w-4" />
                <span className="text-sm font-medium">Pagos</span>
                {unmatchedPayments.length > 0 && (
                  <Badge className="bg-yellow-500 text-white px-1.5 py-0.5 text-xs">
                    {unmatchedPayments.length}
                  </Badge>
                )}
              </button>
              <button
                onClick={() => setViewMode('both')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  viewMode === 'both' 
                    ? 'bg-white dark:bg-neutral-700 shadow-sm' 
                    : 'hover:bg-gray-200 dark:hover:bg-neutral-700'
                }`}
              >
                <Columns3 className="h-4 w-4" />
                <span className="text-sm font-medium">Ambos</span>
              </button>
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
        </div>

        {/* Contenido según el modo de vista */}
        {viewMode === 'orders' && <OrdersView />}
        {viewMode === 'payments' && <PaymentsView />}
        {viewMode === 'both' && <BothColumnsView />}

      {/* Funciones auxiliares para renderizar componentes */}
      {false && onlineOrders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No hay pedidos online</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {false && onlineOrders.map(order => {
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

        {/* Modal de confirmación de asignación de pago */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <Link2 className="w-6 h-6 text-blue-600" />
                </div>
                <DialogTitle>Confirmar Asignación de Pago</DialogTitle>
              </div>
              <DialogDescription>
                ¿Deseas asignar este pago al pedido seleccionado?
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && selectedOrder && (
              <div className="space-y-4 py-4">
                {/* Info del Pago */}
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-amber-900 dark:text-amber-100 mb-2">
                    💳 Pago Yape
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Pagador:</strong> {selectedPayment.payerName}</p>
                    <p><strong>Monto:</strong> Bs {selectedPayment.amount.toFixed(2)}</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Recibido: {new Date(selectedPayment.receivedAt).toLocaleString('es-BO')}
                    </p>
                  </div>
                </div>

                {/* Info del Pedido */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-2">
                    📦 Pedido
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p><strong>Número:</strong> {selectedOrder.orderNumber}</p>
                    <p><strong>Cliente:</strong> {selectedOrder.user?.name || 'Cliente'}</p>
                    <p><strong>Total:</strong> Bs {selectedOrder.totalAmount.toFixed(2)}</p>
                  </div>
                </div>

                {/* Advertencia de diferencia de monto */}
                {Math.abs(selectedPayment.amount - selectedOrder.totalAmount) > 0.01 && (
                  <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">
                        Diferencia de monto
                      </p>
                      <p className="text-yellow-700 dark:text-yellow-300">
                        Bs {Math.abs(selectedPayment.amount - selectedOrder.totalAmount).toFixed(2)} 
                        {selectedPayment.amount > selectedOrder.totalAmount ? ' de más' : ' de menos'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-col gap-2">
              <Button
                onClick={handleAssignPayment}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Confirmar Asignación
              </Button>
              <Button
                onClick={() => setShowConfirmModal(false)}
                variant="outline"
                className="w-full"
              >
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Drag Overlay */}
        <DragOverlay>
          {activePayment && (
            <div className="bg-amber-100 dark:bg-amber-900 border-2 border-amber-500 rounded-lg p-4 shadow-xl opacity-90">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
                <Receipt className="w-5 h-5" />
                <div>
                  <p className="font-semibold text-sm">{activePayment.payerName}</p>
                  <p className="text-xs">Bs {activePayment.amount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
