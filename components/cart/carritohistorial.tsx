'use client';

import React, { useMemo, useState, useEffect, Dispatch, SetStateAction, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Trash2, Minus, Plus, ShoppingCart, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"; 
// ✅ Asegúrate que la ruta sea correcta (ej: './QrPaymentModal' o './QRpago')
import { QrPaymentModal } from './QRpago'; 


// --- Tipos de Datos (Mantenidos) ---
interface CartItem {
    productId: number;
    name: string;
    pricePerUnit: number;
    quantity: number;
}
type Cart = Record<number, CartItem>;
// ---

interface CartSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    cart: Cart;
    setCart: Dispatch<SetStateAction<Cart>>;
    // ✅ Opcional pero recomendado: Pasar la función para abrir el modal de login
    // onOpenLogin?: () => void; 
}

export function CartSummaryModal({ isOpen, onClose, cart, setCart /*, onOpenLogin */ }: CartSummaryModalProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true); 
    const [isQrModalOpen, setIsQrModalOpen] = useState(false); 
    const [isInitiating, setIsInitiating] = useState(false); 
    const [orderId, setOrderId] = useState<number | null>(null);


    useEffect(() => {
        // Carga inicial y resetear loading
        if (isOpen) {
            setIsLoading(false); 
        } else {
            setIsLoading(true); // Resetear al cerrar para la próxima apertura
        }
    }, [isOpen, cart]); 


    // Función para modificar la cantidad o eliminar (Mantenida)
    const updateQuantity = (productId: number, change: number) => {
        setCart(prevCart => {
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

    // 3. FUNCIÓN DE INICIO DE PAGO (Llama a la API para crear OrderClient/SaleOrder pendiente)
    const handleInitiatePayment = async () => {
        if (Object.keys(cart).length === 0) return;
        
        setIsInitiating(true);
        const cartItemsArray = Object.values(cart);

        try {
            // LLAMADA A LA API QUE CREA OrderClient/SaleOrder EN ESTADO 'pendiente_verificacion'
            // ⚡️ RUTA CORRECTA: /api/sales/initiate-order
            const res = await fetch('/api/client/orders/', { 
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: cartItemsArray }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                 // Si el error es 401 (No Autorizado)
                 if (res.status === 401) {
                    alert("Debes iniciar sesión para realizar un pedido.");
                    onClose(); 
                    // ❗ Aquí llamarías a la función para abrir el modal de login si la tienes
                    // if (onOpenLogin) onOpenLogin(); 
                    return; 
                 }
                throw new Error(errorData.error || "Fallo al iniciar el pedido. Verifique el stock.");
            }

            const data = await res.json();
            setOrderId(typeof data.orderId === 'number' ? data.orderId : parseInt(String(data.orderId || ''), 10));
            onClose(); 
            setIsQrModalOpen(true); 

        } catch (error) {
           let errorMessage = "Un error desconocido ha ocurrido al iniciar el pago.";

            // 💡 Paso clave: Estrechar el tipo a 'Error' para poder acceder a '.message'
            if (error instanceof Error) {
                // Ahora TS sabe que es un objeto Error y tiene la propiedad 'message'
                errorMessage = error.message; 
            } else if (typeof error === 'object' && error !== null && 'message' in error) {
                 // Manejo para objetos de error que NO son instancias de Error (común en JS moderno)
                errorMessage = (error as { message: string }).message;
            }
            
            alert(`Error al iniciar el pago: ${errorMessage}`);
        } finally {
            setIsInitiating(false);
        }
    };

    // 4. ✅ FUNCIÓN FINAL Y CORREGIDA: Se ejecuta cuando el cliente presiona "Ya pagué" en el modal QR
    const handlePaymentSubmitted = async () => {
        setIsQrModalOpen(false);
        try {
            if (orderId !== null && !Number.isNaN(orderId)) {
                const res = await fetch('/api/public/factura', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                    alert(data?.error ? String(data.error) : 'No fue posible enviar el recibo.');
                }
            }
        } catch (e) {
            alert('Hubo un problema al notificar el pago.');
        }
        try {
            localStorage.removeItem('userCart');
            setCart({});
        } catch {}
        alert('Gracias por tu notificación. Nuestro equipo verificará tu pago pronto.');
        router.push('/orders'); 
    };


    // Cálculos para la interfaz (Mantenidos)
    const cartItems = Object.values(cart);
    const totalPrice = useMemo(() => {
        return cartItems.reduce((total, item) => total + (item.pricePerUnit * item.quantity), 0);
    }, [cartItems]);
    const cartTitle = `Tu Carrito (${cartItems.length} ${cartItems.length === 1 ? 'ítem' : 'ítems'})`;

    // --- Renderizado Condicional del Contenido (Mantenido) ---
    const content = isLoading ? (
        <div className="flex-grow flex flex-col justify-center items-center p-10 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-lg text-muted-foreground">Cargando carrito...</p>
        </div>
    ) : cartItems.length === 0 ? (
        <div className="flex-grow flex flex-col justify-center items-center p-10 text-center">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">Tu carrito está vacío.</p>
            <Button onClick={() => { onClose(); router.push('/catalog'); }} className="mt-4">Seguir Comprando</Button>
        </div>
    ) : (
        <div className="flex flex-col flex-grow overflow-hidden">
            
            {/* Lista de Productos (Scrollable) */}
            <div className="flex-grow overflow-y-auto p-6 space-y-4">
                {cartItems.map(item => (
                    <div 
                        key={item.productId} 
                        className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm"
                    >
                        {/* ... (Contenido del ítem del carrito: nombre, precio, controles) ... */}
                         <div className="flex-grow pr-4">
                            <p className="font-semibold text-sm">{item.name || 'Producto sin nombre'}</p>
                            <p className="text-xs text-muted-foreground">Bs {(item.pricePerUnit || 0).toFixed(2)} c/u</p>
                        </div>
                        <div className="flex items-center space-x-1 mr-3">
                            <Button variant="outline" size="icon" onClick={() => updateQuantity(item.productId, -1)} disabled={item.quantity <= 1}> <Minus className="h-4 w-4" /> </Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button variant="outline" size="icon" onClick={() => updateQuantity(item.productId, 1)}> <Plus className="h-4 w-4" /> </Button>
                        </div>
                        <div className="text-right flex items-center">
                            <p className="font-bold text-base mr-3">Bs {((item.pricePerUnit || 0) * item.quantity).toFixed(2)}</p>
                            <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.productId, -item.quantity)}> <Trash2 className="h-4 w-4 text-red-500" /> </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pie de Página (Resumen y Botón de Checkout) */}
            <DialogFooter className="p-6 pt-4 border-t bg-background sticky bottom-0">
                <div className="w-full space-y-3">
                    <div className="flex justify-between">
                        <p className="text-base font-bold">Subtotal:</p>
                        <p className="text-xl font-extrabold text-primary">Bs {totalPrice.toFixed(2)}</p>
                    </div>
                    <Button 
                        className="w-full h-12" 
                        onClick={handleInitiatePayment} 
                        disabled={cartItems.length === 0 || isInitiating}
                    >
                        {isInitiating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isInitiating ? 'Iniciando Pago...' : `Pagar Ahora (Bs ${totalPrice.toFixed(2)})`}
                    </Button>
                </div>
            </DialogFooter>
        </div>
    );

    return (
        <Fragment>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0"> 
                    <DialogHeader className="p-6 pb-0">
                        <DialogTitle className="text-2xl">{cartTitle}</DialogTitle>
                    </DialogHeader>
                    {content}
                </DialogContent>
            </Dialog>
            
            {/* ✅ Renderizar el Modal de Pago QR con la prop onPaymentSubmitted */}
            <QrPaymentModal
                isOpen={isQrModalOpen}
                onClose={() => setIsQrModalOpen(false)}
                totalCost={totalPrice}
                onPaymentSubmitted={handlePaymentSubmitted} // Llama a la función de notificación Y LIMPIEZA
            />
        </Fragment>
    );
}
