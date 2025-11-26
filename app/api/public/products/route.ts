import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obtener todos los productos públicos
export async function GET() {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        flavor: true,
        type: true,
        imageUrl: true,
        pricePerUnit: true,
        currentQuantity: true,
      },
      where: {
        currentQuantity: { gt: 0 } // Solo productos con stock
      }
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

interface CartItem {
  productId: number;
  quantity: number;
}

// POST - Crear nuevo pedido (desde catálogo público)
export async function POST(request: NextRequest) {
  try {
    const data: { clientId: number, items: CartItem[] } = await request.json(); 
    const { clientId, items } = data; 

    // Validar que el cliente existe
    const client = await prisma.user.findUnique({
      where: { id: clientId, role: 'cliente' }
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Cliente no encontrado' },
        { status: 404 }
      );
    }

    // Obtener productos para calcular precios
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    // Crear la orden con sus items
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