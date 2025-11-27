import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/yape/payments - Obtener todos los pagos Yape
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Debe estar autenticado
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // DEBUG: Log del rol actual
  console.log('🔑 [GET /api/yape/payments] Usuario:', session.user.email, '| Rol:', session.user.role);

  // Permitir acceso a ventas/sales, admin, stockroom (almacén) - CASE INSENSITIVE
  const allowedRoles = ['ventas', 'sales', 'admin', 'stockroom'];
  const userRole = session.user.role?.toLowerCase();
  
  if (!allowedRoles.includes(userRole)) {
    console.error('❌ [GET /api/yape/payments] Rol no permitido:', session.user.role, '| Roles permitidos:', allowedRoles);
    return NextResponse.json({ 
      error: 'No tienes permisos para ver los pagos',
      debug: { yourRole: session.user.role, allowedRoles } 
    }, { status: 403 });
  }
  
  console.log('✅ [GET /api/yape/payments] Acceso concedido para rol:', userRole);

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // 'matched', 'unmatched', 'manual', 'rejected'

    const where = status ? { status } : {};

    const payments = await prisma.yapePayment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            totalAmount: true,
            status: true,
            user: {
              select: {
                name: true,
                phone: true
              }
            }
          }
        }
      },
      orderBy: { receivedAt: 'desc' }
    });

    return NextResponse.json({ success: true, payments }, { status: 200 });
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    return NextResponse.json({ error: 'Error al obtener pagos' }, { status: 500 });
  }
}

// POST /api/yape/payments - Asignar manualmente un pago a un pedido
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  
  // Debe estar autenticado
  if (!session?.user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // DEBUG: Log del rol actual
  console.log('🔑 [POST /api/yape/payments] Usuario:', session.user.email, '| Rol:', session.user.role);

  // Permitir acceso a ventas/sales, admin, stockroom (almacén) - CASE INSENSITIVE
  const allowedRoles = ['ventas', 'sales', 'admin', 'stockroom'];
  const userRole = session.user.role?.toLowerCase();
  
  if (!allowedRoles.includes(userRole)) {
    console.error('❌ [POST /api/yape/payments] Rol no permitido:', session.user.role, '| Roles permitidos:', allowedRoles);
    return NextResponse.json({ 
      error: 'No tienes permisos para asignar pagos',
      debug: { yourRole: session.user.role, allowedRoles } 
    }, { status: 403 });
  }
  
  console.log('✅ [POST /api/yape/payments] Acceso concedido para rol:', userRole);

  try {
    const { paymentId, orderId, action } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: 'ID de pago requerido' }, { status: 400 });
    }

    // Verificar que el pago existe
    const payment = await prisma.yapePayment.findUnique({
      where: { id: paymentId }
    });

    if (!payment) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
    }

    // ACCIÓN: Rechazar pago (marcarlo como inválido)
    if (action === 'reject') {
      const updatedPayment = await prisma.yapePayment.update({
        where: { id: paymentId },
        data: {
          status: 'rejected',
          processedAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Pago rechazado',
        payment: updatedPayment 
      }, { status: 200 });
    }

    // ACCIÓN: Asignar pago a un pedido
    if (!orderId) {
      return NextResponse.json({ error: 'ID de pedido requerido para asignar' }, { status: 400 });
    }

    // Verificar que el pedido existe y está pendiente
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 });
    }

    if (order.status !== 'pending') {
      return NextResponse.json({ 
        error: `El pedido ya está en estado: ${order.status}` 
      }, { status: 400 });
    }

    // Verificar que el monto del pago coincida razonablemente con el pedido
    const amountDifference = Math.abs(payment.amount - order.totalAmount);
    if (amountDifference > 5.00) { // Tolerancia de Bs 5.00 para asignación manual
      return NextResponse.json({ 
        error: `El monto del pago (Bs ${payment.amount.toFixed(2)}) difiere mucho del pedido (Bs ${order.totalAmount.toFixed(2)})`,
        warning: true
      }, { status: 400 });
    }

    // Realizar la asignación en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el pago
      const updatedPayment = await tx.yapePayment.update({
        where: { id: paymentId },
        data: {
          status: 'manual',
          orderId: orderId,
          assignedBy: 'manual',
          assignedAt: new Date(),
          matchConfidence: 100, // Confianza total en asignación manual
          processedAt: new Date()
        }
      });

      // Marcar el pedido como pagado
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'paid',
          paymentMethod: 'YAPE',
          paidAt: new Date()
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      });

      return { updatedPayment, updatedOrder };
    });

    console.log(`✅ [YAPE MANUAL] Pago #${paymentId} asignado al pedido #${order.orderNumber}`);
    console.log(`   Asignado por: ${session.user.name || session.user.email}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Pago asignado exitosamente',
      payment: result.updatedPayment,
      order: {
        orderNumber: result.updatedOrder.orderNumber,
        customerName: result.updatedOrder.user?.name,
        amount: result.updatedOrder.totalAmount
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error al asignar pago:', error);
    return NextResponse.json({ 
      error: 'Error al asignar pago',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
