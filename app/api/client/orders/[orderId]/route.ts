// app/api/client/orders/[orderId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ orderId: string }>;
}

// GET - Obtener una orden específica del usuario
export async function GET(req: Request, context: RouteContext) {
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
    const order = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        userId: userId
      },
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

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error('Error al obtener orden:', error);
    return NextResponse.json({ error: 'Error al obtener orden' }, { status: 500 });
  }
}

// PATCH - Actualizar estado de la orden (pagar/confirmar pago)
export async function PATCH(req: Request, context: RouteContext) {
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
    const { action, paymentMethod, shippingAddress, contactPhone, payerName } = body;

    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        userId: userId
      }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    let updateData: Record<string, unknown> = {};
    const SHIPPING_COST = 3.00; // Costo de envío fijo

    switch (action) {
      case 'confirm_payment':
        if (existingOrder.status !== 'pending') {
          return NextResponse.json({ 
            error: 'Solo se pueden confirmar pagos de órdenes pendientes' 
          }, { status: 400 });
        }
        updateData = {
          status: 'paid',
          paymentMethod: paymentMethod || 'QR',
          paidAt: new Date()
        };
        break;

      case 'update_shipping':
        updateData = {
          shippingAddress: shippingAddress || existingOrder.shippingAddress,
          contactPhone: contactPhone || existingOrder.contactPhone
        };
        break;

      case 'update_phone':
        if (!contactPhone) {
          return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 });
        }
        updateData = {
          contactPhone: contactPhone
        };
        break;

      case 'update_payer_name': {
        const { payerName } = body;
        if (!payerName || typeof payerName !== 'string' || !payerName.trim()) {
          return NextResponse.json({ error: 'Nombre del pagador requerido' }, { status: 400 });
        }
        updateData = {
          payerName: payerName.trim()
        };
        break;
      }

      case 'toggle_delivery': {
        const enableDelivery = body.enableDelivery as boolean;
        const newShippingCost = enableDelivery ? SHIPPING_COST : 0;
        const newTotalAmount = existingOrder.subtotal + newShippingCost; // Sin impuestos
        
        updateData = {
          shippingCost: newShippingCost,
          totalAmount: newTotalAmount,
          // Si desactiva delivery, limpiar la dirección
          shippingAddress: enableDelivery ? existingOrder.shippingAddress : null
        };
        break;
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderIdNum },
      data: updateData,
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, imageUrl: true }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: action === 'confirm_payment' 
        ? 'Pago confirmado exitosamente' 
        : 'Orden actualizada'
    });

  } catch (error) {
    console.error('Error al actualizar orden:', error);
    return NextResponse.json({ error: 'Error al actualizar orden' }, { status: 500 });
  }
}

// DELETE - Cancelar/eliminar orden (solo si está pendiente)
export async function DELETE(req: Request, context: RouteContext) {
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
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderIdNum,
        userId: userId
      }
    });

    if (!existingOrder) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (existingOrder.status === 'completed') {
      return NextResponse.json({ 
        error: 'No se pueden eliminar órdenes completadas' 
      }, { status: 400 });
    }

    await prisma.order.update({
      where: { id: orderIdNum },
      data: { status: 'cancelled' }
    });

    return NextResponse.json({
      success: true,
      message: 'Orden cancelada exitosamente'
    });

  } catch (error) {
    console.error('Error al cancelar orden:', error);
    return NextResponse.json({ error: 'Error al cancelar orden' }, { status: 500 });
  }
}