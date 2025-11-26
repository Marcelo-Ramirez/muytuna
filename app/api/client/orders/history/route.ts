// app/api/orders/history/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; 

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const clientId = parseInt(session.user.id, 10);
    if (isNaN(clientId)) {
        return NextResponse.json({ error: 'ID de usuario inválido' }, { status: 400 });
    }

    try {
        // Consultamos las órdenes completadas o pagadas del usuario
        const orders = await prisma.order.findMany({
            where: {
                userId: clientId,
                status: { in: ['completed', 'paid'] }
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: { name: true, flavor: true, type: true }
                        }
                    }
                },
                _count: {
                    select: { items: true }
                }
            },
            orderBy: {
                createdAt: 'desc',
            }
        });

        // Mapeamos a un formato más simple para el frontend
        const formattedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            date: order.createdAt.toLocaleDateString('es-BO'),
            total: order.totalAmount,
            status: order.status,
            itemCount: order._count.items,
            channel: order.channel,
            paidAt: order.paidAt?.toLocaleDateString('es-BO') || null
        }));

        return NextResponse.json({ orders: formattedOrders }, { status: 200 });

    } catch (error) {
        console.error("Error al obtener historial de pedidos:", error);
        return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
    }
}