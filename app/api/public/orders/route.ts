import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession, Session } from 'next-auth';

type ExtendedSession = Session & { 
    user?: { id: string; role: string } & Session['user'];
};

interface CartItem {
  productId: number;
  quantity: number;
}

// POST - Crear nuevo pedido
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession() as ExtendedSession;
    
    if (!session?.user || session.user.role !== 'cliente') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { items } = data as { items: CartItem[] }; 

    const clientId = Number(session.user.id);

    // Obtener productos para calcular precios
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    // Crear los items de la orden
    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) throw new Error(`Producto ${item.productId} no encontrado`);
      
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.pricePerUnit,
        subtotal: product.pricePerUnit * item.quantity
      };
    });

    const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await prisma.order.create({
      data: {
        userId: clientId,
        channel: 'ONLINE',
        status: 'pending',
        subtotal,
        totalAmount: subtotal,
        orderNumber: `ORD-${Date.now()}`,
        items: {
          create: orderItems
        }
      },
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
        }
      }
    });

    return NextResponse.json({ 
      message: 'Pedido creado exitosamente',
      order 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener pedidos del cliente
export async function GET() {
  try {
    const session = await getServerSession() as ExtendedSession;
    
    if (!session?.user || session.user.role !== 'cliente') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const clientId = Number(session.user.id);
    const orders = await prisma.order.findMany({
      where: { userId: clientId },
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}