// components/sales/SalesOrdersPage.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Calendar, Package } from 'lucide-react'; 
import { toast } from 'sonner';

// Importa componentes Shadcn UI
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

// --- Tipos e Interfaces ---
interface ProductDetails {
    id: number;
    name: string;
    type: string;
    flavor: string;
    pricePerUnit: number;
    imageUrl?: string;
}

interface OrderItemType {
    id: number;
    productId: number;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product: ProductDetails;
}

interface Order {
    id: number;
    userId: number | null;
    channel: string;
    status: string;
    orderNumber: string | null;
    subtotal: number;
    shippingCost: number;
    taxAmount: number;
    totalAmount: number;
    contactPhone: string | null;
    shippingAddress: string | null;
    paymentMethod: string | null;
    createdAt: string;
    paidAt: string | null;
    items: OrderItemType[];
    user: {
        id: number;
        name: string;
        userName: string;
    } | null;
}

// --- HELPERS ---
const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
        case 'completed': return 'default';
        case 'paid': return 'secondary';
        case 'pending': return 'outline';
        case 'cancelled': return 'destructive';
        default: return 'outline';
    }
};

const getStatusText = (status: string): string => {
    switch (status) {
        case 'completed': return 'COMPLETADO';
        case 'paid': return 'PAGADO';
        case 'pending': return 'PENDIENTE';
        case 'cancelled': return 'CANCELADO';
        default: return status.toUpperCase();
    }
};

const formatPrice = (price: number) => {
    return price.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};


// --- COMPONENTE PRINCIPAL ---
export default function SalesOrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // --- Lógica de Fetch ---
    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/system/sales/orders");
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al cargar pedidos");
            setOrders(data.orders || []);
        } catch (err) {
            console.error("Fetch Error:", err);
            toast.error("Error al cargar pedidos.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // --- Lógica de Manejo de Acciones ---
    const handleAction = async (orderId: number, actionType: 'reserv' | 'sale') => {
        setIsProcessing(true);
        
        const endpoint = actionType === 'reserv' 
            ? '/api/system/sales/orders/reserv' 
            : '/api/system/sales/orders/sale';
        
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId })
            });

            const data = await res.json();

            if (!res.ok) {
                const defaultError = `Error al procesar la ${actionType === 'reserv' ? 'reserva' : 'venta'}`;
                const specificError = data.error || defaultError;
                throw new Error(specificError);
            }

            toast.success(`Pedido ${actionType === 'reserv' ? 'pagado/reservado' : 'completado'} con éxito.`);
            await fetchOrders();
            
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Error de red o desconocido.");
        } finally {
            setIsProcessing(false);
        }
    };


    // --- Lógica de Filtrado ---
    const filteredOrders = useMemo(() => {
        return orders.filter(order => filter === 'all' || !filter || order.status === filter);
    }, [orders, filter]);


    // --- JSX PRINCIPAL ---
    return (
        <div className="p-4 md:p-6 space-y-6">
            
            {/* Header y Filtro */}
            <div className="flex justify-between items-center flex-wrap gap-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Pedidos de Venta</h1>
                
                {/* Filtro de Estado */}
                <div className="w-full sm:w-auto min-w-[150px]">
                    <Select value={filter} onValueChange={setFilter}>
                        <SelectTrigger className="w-full">
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
            
            <Separator />

            {/* Renderizado Condicional */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                    
                    {filteredOrders.length > 0 ? (
                        filteredOrders.map((order) => {
                            const isCompleted = order.status === 'completed';
                            const isPaid = order.status === 'paid';
                            const isCancelled = order.status === 'cancelled';
                            const statusText = getStatusText(order.status);
                            const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);

                            return (
                                <Card 
                                    key={order.id} 
                                    className="shadow-md hover:shadow-lg transition-shadow duration-300"
                                >
                                    <CardContent className="p-4 sm:p-6">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            
                                            {/* Info del Pedido */}
                                            <div className="flex flex-col gap-1">
                                                <p className="font-bold text-xl text-foreground">
                                                    {order.orderNumber || `Pedido #${order.id}`}
                                                </p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Package className="h-4 w-4" />
                                                    <span>{totalItems} productos</span>
                                                    <span className="text-xs">•</span>
                                                    <span className="capitalize">{order.channel === 'ONLINE' ? '🌐 Online' : '🏪 En persona'}</span>
                                                </div>
                                                {order.user && (
                                                    <p className="text-sm text-muted-foreground">
                                                        Cliente: {order.user.name}
                                                    </p>
                                                )}
                                            </div>
                                            
                                            {/* Estado y Acciones */}
                                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                                {/* Estado */}
                                                <Badge variant={getStatusVariant(order.status)} className="uppercase min-w-[100px] justify-center">
                                                    {statusText}
                                                </Badge>

                                                {/* Botón Confirmar Venta (completar - si está pagado) */}
                                                {isPaid && !isCompleted && (
                                                    <Button 
                                                        onClick={() => handleAction(order.id, 'sale')}
                                                        disabled={isProcessing}
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700"
                                                    >
                                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Completar Venta'}
                                                    </Button>
                                                )}
                                                
                                                {/* Botón Marcar como Pagado (si está pendiente) */}
                                                {order.status === 'pending' && (
                                                    <>
                                                        <Button 
                                                            onClick={() => handleAction(order.id, 'reserv')}
                                                            disabled={isProcessing}
                                                            variant="secondary"
                                                            size="sm"
                                                        >
                                                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Marcar Pagado'}
                                                        </Button>
                                                        <Button 
                                                            onClick={() => handleAction(order.id, 'sale')}
                                                            disabled={isProcessing}
                                                            size="sm"
                                                            className="bg-green-600 hover:bg-green-700"
                                                        >
                                                            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Completar Venta'}
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Items del pedido */}
                                        <div className="mt-4 space-y-2">
                                            {order.items.slice(0, 3).map((item) => (
                                                <div key={item.id} className="flex justify-between items-center text-sm">
                                                    <span className="text-muted-foreground">
                                                        {item.product.name} ({item.product.type} - {item.product.flavor})
                                                    </span>
                                                    <span>
                                                        {item.quantity} x Bs {formatPrice(item.unitPrice)}
                                                    </span>
                                                </div>
                                            ))}
                                            {order.items.length > 3 && (
                                                <p className="text-xs text-muted-foreground">
                                                    + {order.items.length - 3} productos más...
                                                </p>
                                            )}
                                        </div>
                                        
                                        <Separator className="my-4" />

                                        {/* Footer - Costo y Fecha */}
                                        <div className="flex justify-between items-center text-sm">
                                            <p className="font-bold text-lg text-primary">
                                                Total: Bs {formatPrice(order.totalAmount)}
                                            </p>
                                            
                                            {order.paidAt && (
                                                <div className="text-xs text-muted-foreground">
                                                    Pagado: {new Date(order.paidAt).toLocaleDateString()}
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="h-4 w-4" />
                                                <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    ) : (
                        /* Mensaje de Sin Pedidos */
                        <Card className="p-8 text-center border-dashed">
                            <p className="text-muted-foreground">
                                No hay pedidos {filter ? `(${getStatusText(filter).toLowerCase()})` : 'registrados'}.
                            </p>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}