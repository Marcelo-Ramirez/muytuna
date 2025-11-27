// app/orders/[orderId]/success/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle } from 'lucide-react';

interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  product: {
    name: string;
  };
}

interface Order {
  id: number;
  orderNumber: string;
  paymentMethod: string | null;
  totalAmount: number;
  createdAt: string;
  paidAt: string | null;
  items: OrderItem[];
}

export default function PaymentSuccessPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/client/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
        <p className="text-red-500 mb-4">Orden no encontrada</p>
        <Button onClick={() => router.push('/catalog')}>Volver al catálogo</Button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-4">
      {/* Ícono de éxito */}
      <div className="mb-6">
        <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>
      </div>

      {/* Título */}
      <h1 className="text-3xl font-bold text-white mb-2">¡Pago Realizado!</h1>
      <p className="text-neutral-400 mb-8">Tu compra ha sido procesada correctamente.</p>

      {/* Recibo */}
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold text-neutral-800 mb-4">Resumen de la Compra</h2>

        <div className="space-y-3 text-sm">
          <div className="flex justify-between text-neutral-600">
            <span>No. de Pedido</span>
            <span className="font-medium text-neutral-800">{order.orderNumber}</span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Fecha</span>
            <span className="font-medium text-neutral-800">
              {formatDate(order.paidAt || order.createdAt)}
            </span>
          </div>
          <div className="flex justify-between text-neutral-600">
            <span>Método de Pago</span>
            <span className="font-medium text-neutral-800">
              {order.paymentMethod === 'QR' ? 'Código QR' : order.paymentMethod || 'N/A'}
            </span>
          </div>
        </div>

        <hr className="my-4" />

        {/* Items del pedido */}
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-neutral-700">
                {item.product.name} (x{item.quantity})
              </span>
              <span className="font-medium text-neutral-800">
                Bs {(item.unitPrice * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <hr className="my-4" />

        {/* Total */}
        <div className="flex justify-between text-lg font-bold">
          <span>Total</span>
          <span>Bs {order.totalAmount.toFixed(2)}</span>
        </div>
      </div>

      {/* Botones */}
      <div className="w-full max-w-sm mt-8 space-y-3">
        <Button
          onClick={() => router.push('/catalog')}
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl"
        >
          Volver al Inicio
        </Button>

        <Button
          onClick={() => router.push(`/orders/${order.id}`)}
          variant="outline"
          className="w-full h-12 border-neutral-600 text-white hover:bg-neutral-800 font-medium rounded-xl"
        >
          Ver Detalles del Pedido
        </Button>
      </div>
    </div>
  );
}
