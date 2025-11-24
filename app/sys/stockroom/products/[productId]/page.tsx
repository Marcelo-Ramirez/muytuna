"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import { ArrowLeft, Package, Loader2 } from "lucide-react"; // Iconos

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ProductDetails {
    id: number;
    name: string;
    type: string;
    flavor: string;
    currentQuantity: number;
    pricePerUnit?: number;
}

interface Movement {
    id: number;
    movementType: string;
    reason: string;
    quantity: number;
    createdAt: string;
    user: {
        name: string;
    };
}

// --- Componente Lógico Interno ---
function ProductHistoryInner() {
    const router = useRouter();
    const params = useParams();
    const productId = params.productId as string; // Asumo que es productId basado en el fetch

    const [movements, setMovements] = useState<Movement[]>([]);
    const [product, setProduct] = useState<ProductDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Determina el rol basado en la URL (Mantenido)
    const isStockroomRole = typeof window !== 'undefined' &&
        globalThis.location.pathname.includes('/stockroom/');
    const role = isStockroomRole ? 'stockroom' : 'sales';

    // --- Lógica de Fetch (Mantenida) ---
    const fetchHistory = useCallback(async () => {
        if (!productId) return;

        setIsLoading(true);
        try {
            // Usamos la API corregida
            const res = await fetch(`/api/system/inventory/products/${productId}/history`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Error al obtener historial");

            setMovements(data.movements || []);
            setProduct(data.product || null);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Error desconocido");
        } finally {
            setIsLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleGoToBatches = () => {
        router.push(`/sys/stockroom/products/${productId}/batches`);
    };

    // --- Función de Renderizado (Mantenida) ---
    const renderMovementList = () => {
        if (isLoading) {
            return (
                <div className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Cargando historial...</p>
                </div>
            );
        }

        if (error) {
            return (
                <Card className="p-4 border-destructive bg-destructive/10 text-destructive border-2">
                    <p className="font-medium">Error: {error}</p>
                </Card>
            );
        }

        if (movements.length === 0) {
            return (
                <Card className="p-8 text-center border-dashed border-2">
                    <p className="text-muted-foreground text-lg">No hay movimientos registrados</p>
                    <p className="text-muted-foreground text-sm mt-2">
                        Los movimientos aparecerán aquí cuando se registren
                    </p>
                </Card>
            );
        }

        return (
            <div className="space-y-3">
                {movements.map((movement) => {
                    const isEntry = movement.movementType === 'entrada';
                    // Nota: Movimiento de cantidad es positivo en la DB, solo agregamos el signo "+" si es entrada
                    const quantityDisplay = `${isEntry ? "+" : "-"}${movement.quantity}`; 

                    return (
                        <Card key={movement.id} className="p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start flex-wrap gap-2">

                                {/* Detalles */}
                                <div className="flex flex-col gap-1">
                                    <Badge
                                        variant={isEntry ? "default" : "destructive"}
                                        className={cn("w-fit uppercase text-xs font-bold", isEntry && "bg-green-600")}
                                    >
                                        {movement.movementType}
                                    </Badge>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">Motivo:</span> {movement.reason}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">Usuario:</span> {movement.user?.name || "Sistema"}
                                    </p>
                                </div>

                                {/* Cantidad y Fecha */}
                                <div className="text-right">
                                    <p className={cn("font-extrabold text-xl", isEntry ? "text-green-600" : "text-red-600")}>
                                        {quantityDisplay}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {new Date(movement.createdAt).toLocaleString('es-ES', {
                                            year: 'numeric', month: 'short', day: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        );
    };

    // --- JSX Principal (Modificado en el Dialog) ---
    return (
        <div className="p-4 md:p-6 space-y-6">

            {/* Botón Volver */}
            <Button variant="ghost" onClick={() => router.back()} className="text-sm text-primary hover:bg-accent w-fit">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
            </Button>

            <div className="space-y-6">

                {/* Información del Producto */}
                <Card className="p-5">
                    <CardHeader className="p-0 mb-4">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            {role === 'stockroom' ? 'Producto - Stockroom' : 'Producto - Venta'}
                        </CardTitle>
                    </CardHeader>

                    {product ? (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <p className="font-bold text-lg text-foreground">
                                    {product.name}
                                </p>
                                <Badge
                                    variant={product.currentQuantity > 0 ? "default" : "destructive"}
                                    className={cn("text-base px-3 py-1", product.currentQuantity > 0 && "bg-green-600")}
                                >
                                    Stock: {product.currentQuantity}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                <p><span className="font-medium">Tipo:</span> {product.type}</p>
                                <p><span className="font-medium">Sabor:</span> {product.flavor}</p>
                                {role === 'sales' && (
                                    <p><span className="font-medium">Precio:</span> ${product.pricePerUnit?.toFixed(2) || "0.00"}</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="font-bold text-lg text-foreground">Cargando...</p>
                            <p className="text-sm text-muted-foreground">Cargando información del producto...</p>
                        </div>
                    )}
                </Card>

                <Separator />

                {/* Header del Historial */}
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <h2 className="text-xl font-semibold text-foreground">Historial de Movimientos</h2>
                    <Button onClick={handleGoToBatches} size="sm" variant="outline">
                        <Package className="mr-2 h-4 w-4" />
                        Gestionar lotes
                    </Button>
                </div>

                {/* Lista de Movimientos */}
                {renderMovementList()}
            </div>

        </div>
    );
}

// Componente Wrapper para Suspense
export default function ProductHistoryPage() {
    return (
        <Suspense fallback={
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        }>
            <ProductHistoryInner />
        </Suspense>
    );
}