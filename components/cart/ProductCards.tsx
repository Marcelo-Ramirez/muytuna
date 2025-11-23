'use client';

import React from 'react';
import Image from 'next/image';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Heart } from 'lucide-react';

// --- Tipos de Datos (Exportados para uso en CatalogPage) ---
export interface Product {
    id: number;
    name: string;
    type: string;
    flavor: string;
    pricePerUnit: number;
    currentQuantity: number;
    imageUrl?: string | null;
    description?: string | null;
}

export interface ProductCardProps extends Product {
    onOpenAddModal: (product: Product) => void; 
}

// --- Componente Tarjeta de Producto (Alineación Corregida) ---
export const ProductCard = (props: ProductCardProps) => {
    
    const { onOpenAddModal, ...productProps } = props; 
    const { name, description, flavor, pricePerUnit, currentQuantity, imageUrl } = productProps;
    const isOutOfStock = currentQuantity === 0;

    const cardDescription = description || `Delicioso sabor ${flavor}`;

    return (
        // Usamos h-full y flex flex-col para forzar el estiramiento vertical en el grid
        <Card className="flex flex-col gap-2 relative bg-card dark:bg-zinc-800/50 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden border-none h-[16rem]">
            
            {/* Imagen */}
            <div className="w-full bg-center bg-no-repeat aspect-square bg-cover rounded-lg relative overflow-hidden">
                {imageUrl ? (
                    <Image 
                        src={imageUrl} 
                        alt={name} 
                        fill={true} 
                        style={{ objectFit: 'contain' }}
                        sizes="(max-width: 768px) 50vw, 320px"
                    />
                ) : (
                    <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 text-xs">
                        Sin imagen
                    </div>
                )}
            </div>

            {/* Botón Heart */}
            <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-white/80 hover:text-zinc-900"
            >
                <Heart className="h-4 w-4" /> 
            </Button>

            {/* Info del producto - CLAVE: flex-grow empuja el footer hacia abajo */}
            <div className="flex-grow">
                <p className="text-black-800 dark:text-zinc-100 text-base font-bold leading-tight line-clamp-2">{name}</p>
                {/* min-h-[2.5rem] asegura que haya espacio incluso sin descripción */}
                <p className="text-zinc-500 dark:text-zinc-400 text-sm font-normal leading-normal line-clamp-2 min-h-[2.5rem]">{cardDescription}</p> 
            </div>

            {/* Footer (Precio y Botón Plus) */}
            <div className="flex items-center justify-between mt-1">
                <p className="text-black dark:text-zinc-100 text-base font-bold">Bs {pricePerUnit.toFixed(2)}</p>
                
                <Button 
                    onClick={() => onOpenAddModal(productProps)}
                    disabled={isOutOfStock}
                    className="w-10 h-10 rounded-full bg-yellow-500 dark:bg-primary flex items-center justify-center text-zinc-900 dark:text-zinc-900 transition-colors hover:bg-yellow-400 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={isOutOfStock ? "Agotado" : "Seleccionar Cantidad"}
                    size="icon" 
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>
            
            {/* Lógica de "Agotado" */}
            {isOutOfStock && (
                <div className="absolute top-0 left-0 w-full h-full bg-white/30 dark:bg-black/30 rounded-lg flex items-center justify-center pointer-events-none">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 bg-zinc-200/80 dark:bg-zinc-800/80 px-3 py-1 rounded-full">Agotado</span>
                </div>
            )}
        </Card>
    );
};