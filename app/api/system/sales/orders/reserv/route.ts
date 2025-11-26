// app/api/system/sales/orders/reserv/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// POST: Cambia el estado del pedido a 'paid' (reservado/pagado)
export async function POST(req: Request) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ success: false, error: "No autenticado" }, { status: 401 });
    }

    try {
        const { orderId } = await req.json();

        if (!orderId) {
            return NextResponse.json({ success: false, error: "ID de pedido es obligatorio" }, { status: 400 });
        }

        const numericOrderId = Number(orderId);

        // 1. Verificar que el pedido existe y no está ya completado
        const existingOrder = await prisma.order.findUnique({
            where: { id: numericOrderId }
        });

        if (!existingOrder) {
            return NextResponse.json({ success: false, error: "Pedido no encontrado" }, { status: 404 });
        }

        if (existingOrder.status === 'completed') {
            return NextResponse.json({ success: false, error: "El pedido ya está completado" }, { status: 400 });
        }

        if (existingOrder.status === 'cancelled') {
            return NextResponse.json({ success: false, error: "No se puede reservar un pedido cancelado" }, { status: 400 });
        }

        // 2. Actualizar el estado del Order a 'paid' (reservado)
        const updatedOrder = await prisma.order.update({
            where: { id: numericOrderId },
            data: { 
                status: 'paid',
                paidAt: new Date()
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                name: true,
                                type: true,
                                flavor: true
                            }
                        }
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json({ success: true, order: updatedOrder, message: "Pedido reservado con éxito." });
    } catch (error) {
        console.error("ERROR al reservar pedido:", error);
        return NextResponse.json(
            { success: false, error: "Error al registrar la reserva" },
            { status: 500 }
        );
    }
}