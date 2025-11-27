// app/orders/[orderId]/page.tsx
'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trash2, Phone, MapPin, CheckCircle, Clock, XCircle, CreditCard, Truck, Store, Minus, Plus, Edit2, X, User, Download } from 'lucide-react';
import { getProductImage } from '@/components/imageMap/productImages';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

// Lazy load del mapa para evitar SSR issues
const AddressMap = lazy(() => import('@/components/maps/AddressMap'));

// Tipos
interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  product: {
    id: number;
    name: string;
    imageUrl: string;
    flavor?: string;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  channel: string;
  contactPhone: string | null;
  shippingAddress: string | null;
  paymentMethod: string | null;
  payerName: string | null;
  subtotal: number;
  shippingCost: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  paidAt: string | null;
  items: OrderItem[];
  user?: {
    name: string;
    phone: string | null;
    email: string | null;
  };
}

// Helper: Extraer solo la dirección sin las coordenadas (formato: "dirección||lat,lng")
const getDisplayAddress = (address: string | null): string | null => {
  if (!address) return null;
  const parts = address.split('||');
  return parts[0];
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDownloadingQR, setIsDownloadingQR] = useState(false);
  const [showAddressMap, setShowAddressMap] = useState(false);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [isUpdatingDelivery, setIsUpdatingDelivery] = useState(false);
  
  // Estados para editar teléfono
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editedPhone, setEditedPhone] = useState('');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  
  // Estados para editar items del pedido
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [isUpdatingItems, setIsUpdatingItems] = useState(false);
  const [showEmptyCartModal, setShowEmptyCartModal] = useState(false);
  
  // Estados para el modal de pago
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showQRDownloadedModal, setShowQRDownloadedModal] = useState(false);
  const [payerName, setPayerName] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  
  // Estado para detectar cambios sin guardar
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/client/orders/${orderId}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'No se pudo cargar el pedido');
        }
        const data = await res.json();
        setOrder(data.order);
        // Inicializar wantsDelivery: false por defecto (Recoger en tienda)
        setWantsDelivery(false);
        // Inicializar teléfono editado
        setEditedPhone(data.order.contactPhone || data.order.user?.phone || '');
        // Inicializar items editados
        setEditedItems(data.order.items);
        // Inicializar nombre del pagador
        setPayerName(data.order.payerName || data.order.user?.name || '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el pedido');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Cancelar/eliminar orden
  const handleDelete = async () => {
    if (!order) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/client/orders/${order.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al cancelar');
      }

      router.push('/orders');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // Descargar QR de pago
  const handleDownloadQR = async () => {
    setIsDownloadingQR(true);
    try {
      const response = await fetch('/qr.jpg');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Pago_${order?.orderNumber || 'pedido'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar QR:', err);
      alert('Error al descargar el QR');
    } finally {
      setIsDownloadingQR(false);
    }
  };

  // Cambiar tipo de entrega (envío a domicilio o recojo en tienda)
  const handleDeliveryToggle = async (enableDelivery: boolean) => {
    if (!order) return;
    setIsUpdatingDelivery(true);
    setWantsDelivery(enableDelivery);

    try {
      const res = await fetch(`/api/client/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle_delivery',
          enableDelivery,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar tipo de entrega');
      }

      const data = await res.json();
      setOrder(data.order);

      // Si activa envío, abrir mapa para seleccionar dirección
      if (enableDelivery && !order.shippingAddress) {
        setShowAddressMap(true);
      }
    } catch (err) {
      setWantsDelivery(!enableDelivery); // Revertir
      alert(err instanceof Error ? err.message : 'Error al actualizar');
    } finally {
      setIsUpdatingDelivery(false);
    }
  };

  // Actualizar dirección de envío
  const handleAddressSelect = async (address: string, lat: number, lng: number) => {
    if (!order) return;
    setIsUpdatingAddress(true);

    try {
      // Guardar coordenadas junto con la dirección para el mapa de ventas
      const addressWithCoords = `${address}||${lat},${lng}`;
      
      const res = await fetch(`/api/client/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_shipping',
          shippingAddress: addressWithCoords,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar dirección');
      }

      const data = await res.json();
      setOrder(data.order);
      setShowAddressMap(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar dirección');
    } finally {
      setIsUpdatingAddress(false);
    }
  };

  // Actualizar teléfono
  const handlePhoneSave = async () => {
    if (!order || !editedPhone.trim()) {
      alert('Por favor ingresa un número de teléfono válido');
      return;
    }
    
    setIsUpdatingPhone(true);
    try {
      const res = await fetch(`/api/client/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_phone',
          contactPhone: editedPhone 
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar teléfono');
      }

      const data = await res.json();
      setOrder(data.order);
      setIsEditingPhone(false);
      setHasUnsavedChanges(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar teléfono');
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  // Actualizar cantidad de un item
  const handleItemQuantityChange = (itemId: number, change: number) => {
    setEditedItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(0, item.quantity + change);
          return { ...item, quantity: newQuantity, subtotal: newQuantity * item.unitPrice };
        }
        return item;
      });
      
      // Filtrar items con cantidad > 0
      const filtered = updated.filter(item => item.quantity > 0);
      
      // Si no quedan items, mostrar modal de confirmación
      if (filtered.length === 0) {
        setShowEmptyCartModal(true);
        return prev; // No aplicar el cambio todavía
      }
      
      return filtered;
    });
  };

  // Guardar cambios en items
  const handleItemsSave = async () => {
    if (!order) return;
    
    setIsUpdatingItems(true);
    try {
      const res = await fetch(`/api/client/orders/${order.id}/items`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: editedItems.map(item => ({
            id: item.id,
            quantity: item.quantity
          }))
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al actualizar productos');
      }

      const data = await res.json();
      setOrder(data.order);
      setEditedItems(data.order.items);
      setIsEditingItems(false);
      setHasUnsavedChanges(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al actualizar productos');
    } finally {
      setIsUpdatingItems(false);
    }
  };

  // Confirmar eliminación del pedido por carrito vacío
  const handleConfirmDeleteOrder = async () => {
    await handleDelete();
    setShowEmptyCartModal(false);
  };

  // Abrir modal de pago (validar cambios guardados)
  const handleOpenPaymentModal = () => {
    if (isEditingPhone || isEditingItems) {
      toast.error('Por favor guarda los cambios antes de proceder al pago');
      return;
    }
    setShowPaymentModal(true);
  };

  // Proceder al pago
  const handleProceedToPayment = async () => {
    if (!order || !payerName.trim()) {
      toast.error('Por favor ingresa el nombre del pagador');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // 1. Guardar el nombre del pagador
      const res = await fetch(`/api/client/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'update_payer_name',
          payerName: payerName.trim()
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al guardar nombre del pagador');
      }

      const data = await res.json();
      setOrder(data.order);

      // 2. Descargar el QR
      const response = await fetch('/qr.jpg');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_Pago_${order.orderNumber || 'pedido'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // 3. Cerrar modal de confirmación y abrir modal de instrucciones
      setShowPaymentModal(false);
      setShowQRDownloadedModal(true);

    } catch (err) {
      console.error('Error al procesar pago:', err);
      toast.error(err instanceof Error ? err.message : 'Error al procesar el pago');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Obtener info de estado
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10', text: 'Pendiente de pago' };
      case 'paid':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', text: 'Pagado - Confirmado' };
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-600/10', text: 'Completado' };
      case 'cancelled':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', text: 'Cancelado' };
      default:
        return { icon: Clock, color: 'text-gray-500', bg: 'bg-gray-500/10', text: status };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4">
        <p className="text-red-500 mb-4">{error || 'Pedido no encontrado'}</p>
        <Button variant="outline" onClick={() => router.back()}>
          Volver
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-neutral-100">
      {/* Header */}
      <div className="bg-white px-4 py-4 flex items-center justify-between shadow-sm">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-neutral-700" />
        </button>
        <h1 className="text-lg font-semibold text-neutral-800">Pedido Realizado</h1>
        <button
          onClick={() => setShowDeleteModal(true)}
          disabled={order.status === 'completed' || order.status === 'cancelled'}
          className="p-2 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="h-5 w-5 text-red-500" />
        </button>
      </div>

      {/* Contenido */}
      <div className="p-4 pb-48 space-y-4">
        {/* Resumen del Carrito */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-neutral-800">Resumen del Carrito</h2>
            {!isEditingItems ? (
              <button 
                onClick={() => {
                  setIsEditingItems(true);
                  setHasUnsavedChanges(true);
                }}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditedItems(order.items);
                    setIsEditingItems(false);
                    setHasUnsavedChanges(false);
                  }}
                  className="text-sm text-neutral-500 hover:text-neutral-700"
                  disabled={isUpdatingItems}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleItemsSave}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                  disabled={isUpdatingItems}
                >
                  {isUpdatingItems ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {(isEditingItems ? editedItems : order.items).map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0">
                  <Image
                    src={getProductImage(item.product.name)}
                    alt={item.product.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="flex-1 text-neutral-700">{item.product.name}</span>
                {isEditingItems ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleItemQuantityChange(item.id, -1)}
                      className="w-6 h-6 rounded-full border border-neutral-300 flex items-center justify-center hover:bg-neutral-100"
                      disabled={isUpdatingItems}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-neutral-700 font-medium">{item.quantity}</span>
                    <button
                      onClick={() => handleItemQuantityChange(item.id, 1)}
                      className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600"
                      disabled={isUpdatingItems}
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <span className="text-neutral-500 text-sm">x{item.quantity}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Dirección de Facturación */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-neutral-800">Datos de Contacto</h2>
            {!isEditingPhone ? (
              <button 
                onClick={() => {
                  setIsEditingPhone(true);
                  setHasUnsavedChanges(true);
                }}
                className="text-sm text-amber-600 hover:text-amber-700 font-medium"
              >
                Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setEditedPhone(order.contactPhone || order.user?.phone || '');
                    setIsEditingPhone(false);
                    setHasUnsavedChanges(false);
                  }}
                  className="text-sm text-neutral-500 hover:text-neutral-700"
                  disabled={isUpdatingPhone}
                >
                  Cancelar
                </button>
                <button 
                  onClick={handlePhoneSave}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
                  disabled={isUpdatingPhone}
                >
                  {isUpdatingPhone ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 text-neutral-600">
            <Phone className="h-4 w-4" />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1">Número de teléfono</p>
              {isEditingPhone ? (
                <input
                  type="tel"
                  value={editedPhone}
                  onChange={(e) => setEditedPhone(e.target.value)}
                  placeholder="Ej: +591 70123456"
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={isUpdatingPhone}
                />
              ) : (
                <p className="text-sm text-neutral-500">{order.contactPhone || order.user?.phone || 'No especificado'}</p>
              )}
            </div>
          </div>

          {/* Nombre del Pagador (solo si ya fue establecido) */}
          {order.payerName && (
            <div className="flex items-center gap-3 text-neutral-600 pt-3 border-t">
              <User className="h-4 w-4" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">Nombre del Pagador</p>
                <p className="text-sm text-neutral-500">{order.payerName}</p>
              </div>
            </div>
          )}
        </div>

        {/* Tipo de Entrega */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-neutral-800 mb-3">Tipo de Entrega</h2>
          
          <div className="grid grid-cols-2 gap-3">
            {/* Opción: Recoger en tienda */}
            <button
              onClick={() => handleDeliveryToggle(false)}
              disabled={isUpdatingDelivery}
              className={`p-3 rounded-xl border-2 transition-all ${
                !wantsDelivery 
                  ? 'border-amber-500 bg-amber-50' 
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <Store className={`h-6 w-6 mx-auto mb-2 ${!wantsDelivery ? 'text-amber-600' : 'text-neutral-400'}`} />
              <p className={`text-sm font-medium ${!wantsDelivery ? 'text-amber-700' : 'text-neutral-600'}`}>
                Recoger en tienda
              </p>
              <p className="text-xs text-neutral-500 mt-1">Gratis</p>
            </button>

            {/* Opción: Envío a domicilio */}
            <button
              onClick={() => handleDeliveryToggle(true)}
              disabled={isUpdatingDelivery}
              className={`p-3 rounded-xl border-2 transition-all ${
                wantsDelivery 
                  ? 'border-amber-500 bg-amber-50' 
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <Truck className={`h-6 w-6 mx-auto mb-2 ${wantsDelivery ? 'text-amber-600' : 'text-neutral-400'}`} />
              <p className={`text-sm font-medium ${wantsDelivery ? 'text-amber-700' : 'text-neutral-600'}`}>
                Envío a domicilio
              </p>
              <p className="text-xs text-neutral-500 mt-1">Bs 3.00</p>
            </button>
          </div>

          {isUpdatingDelivery && (
            <div className="flex items-center justify-center mt-3">
              <Loader2 className="h-4 w-4 animate-spin text-amber-500 mr-2" />
              <span className="text-sm text-neutral-500">Actualizando...</span>
            </div>
          )}
        </div>

        {/* Dirección de Envío (solo si quiere delivery) */}
        {wantsDelivery && (
          <div 
            className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:bg-neutral-50 transition-colors"
            onClick={() => setShowAddressMap(true)}
          >
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-neutral-800">Dirección de Envío</h2>
              <span className="text-sm text-amber-600">Editar</span>
            </div>

            <div className="flex items-center gap-3 text-neutral-600">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-sm flex-1">
                {getDisplayAddress(order.shippingAddress) || 'Toca para agregar tu dirección'}
              </p>
            </div>
          </div>
        )}

        {/* Estado del Pedido */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-neutral-800 mb-3">Estado del pedido</h2>

          <div className={`flex items-center gap-3 p-3 rounded-lg ${statusInfo.bg}`}>
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            <div>
              <p className={`font-medium ${statusInfo.color}`}>
                {order.status === 'paid' ? 'Confirmado' : statusInfo.text}
              </p>
              {order.status === 'paid' && (
                <p className="text-sm text-neutral-500">Tu pedido ha sido confirmado.</p>
              )}
              {order.status === 'pending' && (
                <p className="text-sm text-neutral-500">Esperando confirmación de pago.</p>
              )}
            </div>
          </div>
        </div>

        {/* Resumen de Costos */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          <div className="flex justify-between text-neutral-600">
            <span>Subtotal</span>
            <span>Bs {order.subtotal.toFixed(2)}</span>
          </div>
          {order.shippingCost > 0 && (
            <div className="flex justify-between text-neutral-600">
              <span>Envío</span>
              <span>Bs {order.shippingCost.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>Bs {order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer fijo con botones */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 pb-6">
        <Button
          onClick={handleOpenPaymentModal}
          disabled={order.status !== 'pending' || isEditingPhone || isEditingItems}
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <CreditCard className="mr-2 h-5 w-5" />
          Pagar
        </Button>

        <Button
          onClick={() => router.push('/')}
          variant="outline"
          className="w-full h-12 border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium rounded-full"
        >
          Regresar al inicio
        </Button>
      </div>

      {/* Modal de confirmación de eliminación */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center">
              <Trash2 className="h-6 w-6 text-neutral-500" />
            </div>
            <DialogTitle className="text-xl">Confirmar Eliminación de Pedido</DialogTitle>
            <DialogDescription className="text-center">
              Si el pedido aún no se ha completado, se cancelará. ¿Está seguro de que desea eliminar este pedido?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col space-y-2 sm:space-y-2">
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sí, Eliminar
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="w-full"
            >
              No, Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de pago */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Confirmar Pago</DialogTitle>
            <DialogDescription className="text-left space-y-3 pt-2">
              <div>
                <label className="text-sm font-medium text-neutral-700">
                  Nombre completo del pagador
                </label>
                <input
                  type="text"
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  placeholder="Ej: Juan Pérez García"
                  className="w-full mt-1 px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                  disabled={isProcessingPayment}
                />
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-medium mb-1">⚠️ Importante:</p>
                <p className="text-xs text-amber-700">
                  Por favor, coloque el nombre completo <strong>exactamente igual</strong> al que usa en su plataforma de pago (Yape, Banco, etc). 
                  Si el nombre difiere con el de la transferencia, el pago no se procesará correctamente.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col space-y-2 sm:space-y-2">
            <Button
              onClick={handleProceedToPayment}
              disabled={isProcessingPayment || !payerName.trim()}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Procesando...
                </>
              ) : (
                'Proceder al pago'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPaymentModal(false)}
              disabled={isProcessingPayment}
              className="w-full"
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de QR Descargado - Instrucciones */}
      <Dialog open={showQRDownloadedModal} onOpenChange={setShowQRDownloadedModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center">
              <Download className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-xl">QR de Pago Descargado</DialogTitle>
            <DialogDescription className="text-center pt-2">
              <p className="text-base text-neutral-700">
                Por favor, escanea el código QR descargado para realizar tu pago.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col space-y-2 sm:space-y-2">
            <Button
              onClick={() => setShowQRDownloadedModal(false)}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmación de carrito vacío */}
      <Dialog open={showEmptyCartModal} onOpenChange={setShowEmptyCartModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-xl">Carrito Vacío</DialogTitle>
            <DialogDescription className="text-center">
              No tienes productos seleccionados en el resumen del carrito. ¿Deseas eliminar el pedido?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col space-y-2 sm:space-y-2">
            <Button
              onClick={handleConfirmDeleteOrder}
              disabled={isDeleting}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sí, Eliminar Pedido
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowEmptyCartModal(false);
                setEditedItems(order.items); // Restaurar items originales
              }}
              className="w-full"
            >
              No, Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Mapa para Dirección */}
      {showAddressMap && (
        <Suspense fallback={
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-8">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          </div>
        }>
          <AddressMap
            initialAddress={order.shippingAddress || ''}
            onAddressSelect={handleAddressSelect}
            onClose={() => setShowAddressMap(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
