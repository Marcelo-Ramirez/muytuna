// app/orders/[orderId]/page.tsx
'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Trash2, Phone, MapPin, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { getProductImage } from '@/components/imageMap/productImages';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

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

  // Actualizar dirección de envío
  const handleAddressSelect = async (address: string, lat: number, lng: number) => {
    if (!order) return;
    setIsUpdatingAddress(true);

    try {
      const res = await fetch(`/api/client/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_shipping',
          shippingAddress: address,
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
            <span className="text-sm text-amber-600 cursor-pointer">Editar</span>
          </div>

          <div className="space-y-3">
            {order.items.map((item) => (
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
                <span className="text-neutral-500 text-sm">x{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dirección de Facturación */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-neutral-800">Dirección de Facturación</h2>
            <span className="text-sm text-amber-600 cursor-pointer">Editar</span>
          </div>

          <div className="flex items-center gap-3 text-neutral-600">
            <Phone className="h-4 w-4" />
            <div>
              <p className="text-sm font-medium">Número de teléfono</p>
              <p className="text-sm text-neutral-500">{order.contactPhone || order.user?.phone || 'No especificado'}</p>
            </div>
          </div>
        </div>

        {/* Dirección de Envío */}
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
              {order.shippingAddress || 'Toca para agregar tu dirección'}
            </p>
          </div>
        </div>

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
          <div className="flex justify-between text-neutral-600">
            <span>Envío</span>
            <span>Bs {order.shippingCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Impuestos</span>
            <span>Bs {order.taxAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t">
            <span>Total</span>
            <span>Bs {order.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer fijo con botones */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 space-y-3 pb-6">
        <Button
          onClick={handleDownloadQR}
          disabled={isDownloadingQR}
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base rounded-full"
        >
          {isDownloadingQR ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Download className="mr-2 h-5 w-5" />
          )}
          Descargar QR de pago
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
