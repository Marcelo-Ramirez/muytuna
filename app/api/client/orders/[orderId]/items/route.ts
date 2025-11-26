// app/api/client/orders/[orderId]/items/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

// PUT - Actualizar items del pedido
export async function PUT(req: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const userId = parseInt(session.user.id, 10);
  const { orderId } = await context.params;
  const orderIdNum = parseInt(orderId, 10);

  if (isNaN(orderIdNum)) {
    return NextResponse.json({ error: 'ID de orden inválido' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Se requiere al menos un producto en el pedido' 
      }, { status: 400 });
    }

    // Verificar que la orden pertenece al usuario
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        userId: userId
      },
      include: {
        items: true
      }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Solo se pueden editar órdenes pendientes
    if (existingOrder.status !== 'pending') {
      return NextResponse.json({ 
        error: 'Solo se pueden editar pedidos pendientes' 
      }, { status: 400 });
    }

    // Actualizar items en una transacción
    await prisma.$transaction(async (tx) => {
      // Actualizar cantidades de cada item
      for (const item of items) {
        const existingItem = existingOrder.items.find(i => i.id === item.id);
        
        if (!existingItem) {
          throw new Error(`Item ${item.id} no encontrado en el pedido`);
        }

        await tx.orderItem.update({
          where: { id: item.id },
          data: {
            quantity: item.quantity,
            subtotal: item.quantity * existingItem.unitPrice
          }
        });
      }

      // Recalcular totales del pedido
      const updatedItems = await tx.orderItem.findMany({
        where: { orderId: orderIdNum }
      });

      const newSubtotal = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const newTotalAmount = newSubtotal + existingOrder.shippingCost; // Sin impuestos

      await tx.order.update({
        where: { id: orderIdNum },
        data: {
          subtotal: newSubtotal,
          totalAmount: newTotalAmount
        }
      });
    });

    // Obtener orden actualizada
    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderIdNum },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true, flavor: true }
            }
          }
        },
        user: {
          select: { name: true, phone: true, email: true }
        }
      }
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Productos actualizados exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar items:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error al actualizar productos' 
    }, { status: 500 });
  }
}
