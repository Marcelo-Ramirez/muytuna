'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Minus, Plus, Loader2, AlertTriangle, ShoppingBag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Image from 'next/image';
import { getProductImage } from '@/components/imageMap/productImages';

// Tipos
interface CartItem {
  productId: number;
  name: string;
  pricePerUnit: number;
  quantity: number;
  imageUrl?: string;
}

type Cart = Record<number, CartItem>;

interface PendingOrder {
  id: number;
  orderNumber: string;
  totalAmount: number;
  createdAt: string;
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Cart;
  setCart: React.Dispatch<React.SetStateAction<Cart>>;
}

export function CartModal({ isOpen, onClose, cart, setCart }: CartModalProps) {
  const router = useRouter();
  const { status } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPendingOrderModal, setShowPendingOrderModal] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);

  // Calcular items y total
  const cartItems = useMemo(() => Object.values(cart), [cart]);
  const totalPrice = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.pricePerUnit * item.quantity, 0);
  }, [cartItems]);

  // Funciones del carrito
  const updateQuantity = (productId: number, change: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart[productId];
      if (!existingItem) return prevCart;

      const newQuantity = existingItem.quantity + change;
      const updatedCart: Cart = { ...prevCart };

      if (newQuantity <= 0) {
        delete updatedCart[productId];
      } else {
        updatedCart[productId] = { ...existingItem, quantity: newQuantity };
      }

      return updatedCart;
    });
  };

  const clearCart = () => {
    setCart({});
    localStorage.removeItem('userCart');
    globalThis.dispatchEvent(new Event('cartUpdate'));
  };

  // Realizar pedido
  const handleCheckout = async () => {
    if (status !== 'authenticated') {
      alert('Debes iniciar sesión para realizar un pedido');
      onClose();
      return;
    }

    if (cartItems.length === 0) {
      alert('Tu carrito está vacío');
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar los items asegurando tipos correctos
      const orderItems = cartItems.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        pricePerUnit: Number(item.pricePerUnit),
      }));

      console.log('Enviando pedido:', orderItems);

      const res = await fetch('/api/client/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: orderItems }),
      });

      // Verificar si hay contenido en la respuesta
      const text = await res.text();
      if (!text) {
        throw new Error('El servidor no devolvió una respuesta válida');
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        console.error('Respuesta del servidor:', text);
        throw new Error('Error al procesar la respuesta del servidor');
      }

      if (!res.ok) {
        // Verificar si es el error de pedido pendiente
        if (data.code === 'PENDING_ORDER_EXISTS' && data.pendingOrder) {
          setPendingOrder(data.pendingOrder);
          setShowPendingOrderModal(true);
          setIsSubmitting(false);
          return;
        }
        throw new Error(data.error || 'Error al crear el pedido');
      }

      if (!data.order?.id) {
        throw new Error('No se recibió el ID del pedido');
      }

      clearCart();
      onClose();
      router.push(`/orders/${data.order.id}`);
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error al procesar el pedido');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ir al pedido pendiente
  const goToPendingOrder = () => {
    if (pendingOrder) {
      onClose();
      router.push(`/orders/${pendingOrder.id}`);
    }
  };

  const handleContinueShopping = () => {
    onClose();
    router.push('/catalog');
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col p-0 lg:mx-8">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 lg:px-12 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-semibold text-neutral-900">Mi Carrito</DialogTitle>
              <button
                onClick={onClose}
                className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
              >
                <X className="h-5 w-5 text-neutral-700" />
              </button>
            </div>
          </DialogHeader>

          {/* Contenido */}
          <div className="flex-1 overflow-y-auto px-6 py-4 lg:px-12">
            {cartItems.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🛒</div>
                <h2 className="text-xl font-medium text-neutral-900 mb-2">Tu carrito está vacío</h2>
                <p className="text-neutral-500 mb-6">Agrega algunos productos deliciosos</p>
                <Button
                  onClick={handleContinueShopping}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-full px-6"
                >
                  Ver Catálogo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {cartItems.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-white rounded-2xl p-3 flex items-center gap-3 border border-neutral-100 shadow-sm"
                  >
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-50 flex-shrink-0">
                      <Image
                        src={getProductImage(item.name)}
                        alt={item.name}
                        width={56}
                        height={56}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-neutral-900 text-sm truncate">{item.name}</h3>
                      <p className="text-neutral-500 text-sm">Bs {item.pricePerUnit.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateQuantity(item.productId, -1)}
                        className="w-7 h-7 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-100 flex items-center justify-center transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-medium text-neutral-900 text-sm">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, 1)}
                        className="w-7 h-7 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && (
            <DialogFooter className="p-6 lg:px-12 pt-4 border-t bg-white sticky bottom-0">
              <div className="w-full space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="text-base text-neutral-600">Total</span>
                  <span className="text-2xl font-bold text-neutral-900">Bs {totalPrice.toFixed(2)}</span>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-base rounded-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Realizar pedido'
                  )}
                </Button>
                <Button
                  onClick={handleContinueShopping}
                  variant="outline"
                  className="w-full h-12 border-neutral-300 text-neutral-700 hover:bg-neutral-50 font-medium rounded-full"
                >
                  Continuar Comprando
                </Button>
                <button
                  onClick={clearCart}
                  className="w-full text-center text-red-500 hover:text-red-600 text-sm py-2 transition-colors font-medium"
                >
                  Vaciar Carrito
                </button>
              </div>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Pedido Pendiente */}
      <Dialog open={showPendingOrderModal} onOpenChange={setShowPendingOrderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <DialogTitle className="text-xl">Ya tienes un pedido pendiente</DialogTitle>
            </div>
            <DialogDescription className="text-base text-neutral-600 pt-2">
              Solo puedes tener un pedido pendiente a la vez. Para crear un nuevo pedido, primero debes completar o cancelar tu pedido actual.
            </DialogDescription>
          </DialogHeader>

          {pendingOrder && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-800">
                <ShoppingBag className="w-4 h-4" />
                <span className="font-semibold">Pedido {pendingOrder.orderNumber}</span>
              </div>
              <div className="text-sm text-amber-700">
                <p>Total: <span className="font-bold">Bs {pendingOrder.totalAmount.toFixed(2)}</span></p>
                <p className="text-xs text-amber-600 mt-1">
                  Creado: {new Date(pendingOrder.createdAt).toLocaleDateString('es-BO', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
            <Button
              onClick={goToPendingOrder}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
            >
              Ver mi pedido pendiente
            </Button>
            <Button
              onClick={() => setShowPendingOrderModal(false)}
              variant="outline"
              className="w-full"
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
