'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { useRouter } from 'next/navigation'; 
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; 
import { Separator } from "@/components/ui/separator";
import { Loader2, History, AlertCircle, Clock, CheckCircle } from 'lucide-react'; 

// --- Tipos de Datos ---
interface Order {
    id: number;
    orderNumber: string | null;
    date: string;
    total: number;
    itemCount: number;
    status: string;
    channel: string;
    paidAt: string | null;
}

// =====================================
//      PESTAÑA: PEDIDOS PENDIENTES
// =====================================
const PendingOrdersTab = () => {
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchPendingOrders = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/client/orders'); 
                if (!res.ok) {
                    if (res.status === 401) { console.error("No autorizado"); return; }
                    throw new Error('No se pudo cargar los pedidos');
                }
                const data = await res.json();
                // Filtrar solo los pendientes
                const pending = (data.orders || []).filter((o: Order) => o.status === 'pending');
                setPendingOrders(pending);
            } catch (error) { console.error("Error fetching pending orders:", error); setPendingOrders([]); } 
            finally { setLoading(false); }
        };
        fetchPendingOrders();
    }, []);

    const getStatusClass = (status: string = '') => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === 'pending') return 'text-yellow-600 font-semibold';
        if (lowerStatus === 'paid') return 'text-blue-600 font-semibold';
        if (lowerStatus === 'completed') return 'text-green-600 font-semibold';
        if (lowerStatus === 'cancelled') return 'text-red-600 font-semibold';
        return 'text-gray-500';
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'PENDIENTE DE PAGO';
            case 'paid': return 'PAGADO';
            case 'completed': return 'COMPLETADO';
            case 'cancelled': return 'CANCELADO';
            default: return status.toUpperCase();
        }
    };

    if (loading) { return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>; }

    return (
        <Card className="p-6">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pedidos Pendientes de Pago
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Separator className="mb-4" />
                <div className="space-y-4">
                    {pendingOrders.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                            <p>No tienes pedidos pendientes de pago.</p>
                            <Button variant="link" onClick={() => router.push('/catalog')}>Ir al catálogo</Button>
                        </div>
                    ) : (
                        pendingOrders.map(order => (
                            <div key={order.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                                <div>
                                    <p className="font-semibold text-lg">{order.orderNumber || `Pedido #${order.id}`}</p> 
                                    <p className="text-sm text-muted-foreground">Fecha: {order.date}</p>
                                    <p className={`text-sm ${getStatusClass(order.status)}`}>
                                        Estado: {getStatusText(order.status)}
                                    </p>
                                </div>
                                <div className="text-right mt-2 sm:mt-0">
                                    <p className="font-bold text-lg">Bs {order.total.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">({order.itemCount} productos)</p>
                                    <Button
                                        variant="link"
                                        size="sm"
                                        onClick={() => router.push(`/orders/${order.id}`)} 
                                        className="h-auto p-0 mt-1 text-primary"
                                    >
                                        Ver Detalle / Pagar
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


// =====================================
//      PESTAÑA: HISTORIAL DE PEDIDOS
// =====================================
const HistoryTab = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchHistory = async () => {
            setLoadingHistory(true);
            try {
                const res = await fetch('/api/client/orders/history'); 
                if (!res.ok) {
                     if (res.status === 401) { 
                         console.error("No autorizado para ver historial."); 
                         setOrders([]);
                         return; 
                     }
                    throw new Error('No se pudo cargar el historial');
                }
                const data = await res.json();
                setOrders(data.orders || []);
            } catch (error) { 
                console.error("Error fetching history:", error); 
                setOrders([]);
            } 
            finally { setLoadingHistory(false); }
        };
        fetchHistory();
    }, []);

    const getStatusClass = (status: string = '') => {
        const lowerStatus = status.toLowerCase();
        if (lowerStatus === 'completed') return 'text-green-600 font-semibold';
        if (lowerStatus === 'paid') return 'text-blue-600 font-semibold';
        if (lowerStatus === 'cancelled') return 'text-red-600 font-semibold';
        return 'text-gray-500';
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'PENDIENTE';
            case 'paid': return 'PAGADO';
            case 'completed': return 'COMPLETADO';
            case 'cancelled': return 'CANCELADO';
            default: return status.toUpperCase();
        }
    };

    if (loadingHistory) { return <div className="p-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>; }

    return (
        <Card className="p-6">
            <CardHeader className="p-0 pb-4">
                <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Historial de Compras
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Separator className="mb-4" />
                <div className="space-y-4">
                    {orders.length === 0 ? (
                        <div className="text-center p-8 text-muted-foreground">
                            <History className="h-8 w-8 mx-auto mb-2" />
                            <p>No tienes pedidos anteriores.</p>
                        </div>
                    ) : (
                        orders.map(order => (
                            <div key={order.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-4 border rounded-lg bg-card hover:shadow-md transition-shadow">
                                <div>
                                    <p className="font-semibold text-lg">{order.orderNumber || `Pedido #${order.id}`}</p> 
                                    <p className="text-sm text-muted-foreground">Fecha: {order.date}</p>
                                    <p className={`text-sm ${getStatusClass(order.status)}`}>
                                        Estado: {getStatusText(order.status)}
                                    </p>
                                    {order.paidAt && (
                                        <p className="text-xs text-muted-foreground">Pagado: {order.paidAt}</p>
                                    )}
                                </div>
                                <div className="text-right mt-2 sm:mt-0">
                                    <p className="font-bold text-lg">Bs {order.total.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">({order.itemCount} productos)</p>
                                    <Button 
                                        variant="link" 
                                        size="sm" 
                                        onClick={() => router.push(`/orders/${order.id}`)} 
                                        className="h-auto p-0 mt-1 text-primary"
                                    >
                                        Ver Detalle
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};


// =====================================
//      COMPONENTE PRINCIPAL (PAGE)
// =====================================
export default function OrdersDashboardPage() {
    const [defaultTab, setDefaultTab] = useState('pending');

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            setDefaultTab(params.get('tab') || 'pending');
        } catch (e) {
            setDefaultTab('pending');
        }
    }, []);

    return (
        <Fragment>
            <PublicHeader />
            <div className="container mx-auto px-4 py-6">
                {/* Vista móvil: Tabs */}
                <div className="lg:hidden">
                    <Tabs defaultValue={defaultTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="pending" className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Pendientes
                            </TabsTrigger>
                            <TabsTrigger value="history" className="flex items-center gap-2">
                                <History className="h-4 w-4" />
                                Historial
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="pending">
                            <PendingOrdersTab />
                        </TabsContent>
                        
                        <TabsContent value="history">
                            <HistoryTab />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Vista desktop: 2 columnas lado a lado */}
                <div className="hidden lg:grid lg:grid-cols-2 lg:gap-6">
                    <PendingOrdersTab />
                    <HistoryTab />
                </div>
            </div>
        </Fragment>
    );
}