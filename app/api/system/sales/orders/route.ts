import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET: Obtener lista completa de pedidos
export async function GET() {
    try {
        const orders = await prisma.order.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                // Incluir los items del pedido con el producto
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                type: true,
                                flavor: true,
                                pricePerUnit: true,
                                imageUrl: true,
                            }
                        }
                    }
                },
                // Incluir el usuario (si existe)
                user: {
                    select: {
                        id: true,
                        name: true,
                        userName: true,
                    }
                }
            },
        });

        return NextResponse.json({ orders });

    } catch (error) {
        console.error("ERROR al obtener pedidos:", error);
        return NextResponse.json(
            { error: "Error interno del servidor al obtener pedidos" },
            { status: 500 }
        );
    }
}