import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obtener pedido específico
export async function GET(
  request: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  try {
    // Soporta params como promesa o valor directo
    const paramsObj = 'then' in context.params
      ? await context.params
      : context.params;
    const orderId = parseInt(paramsObj.id);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                name: true,
                flavor: true,
                pricePerUnit: true,
                imageUrl: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            userName: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
