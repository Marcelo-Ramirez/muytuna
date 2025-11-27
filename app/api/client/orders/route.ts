import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface CartItemPayload {
  productId: number;
  quantity: number;
  pricePerUnit: number;
}

function generateOrderNumber(): string {
  const prefix = 'GG';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `#${prefix}${timestamp}${random}`;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: { include: { product: { select: { id: true, name: true, imageUrl: true, flavor: true } } } },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    const formattedOrders = orders.map(order => ({
      id: order.id, orderNumber: order.orderNumber,
      date: order.createdAt.toLocaleDateString('es-BO'),
      total: order.totalAmount, status: order.status, channel: order.channel,
      itemCount: order._count.items,
      paidAt: order.paidAt?.toLocaleDateString('es-BO') || null,
      items: order.items
    }));
    return NextResponse.json({ success: true, orders: formattedOrders });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Error al obtener ordenes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Debe estar logueado.' }, { status: 401 });
  }
  const userId = parseInt(session.user.id, 10);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'ID invalido.' }, { status: 400 });
  }
  try {
    const body = await req.json();
    const { items: cartItems, contactPhone, shippingAddress } = body as { items: CartItemPayload[]; contactPhone?: string; shippingAddress?: string; };
    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'Carrito vacio.' }, { status: 400 });
    }
    
    // ✅ VERIFICAR SI YA TIENE UN PEDIDO PENDIENTE
    const existingPendingOrder = await prisma.order.findFirst({
      where: {
        userId,
        status: 'pending'
      },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        createdAt: true
      }
    });
    
    if (existingPendingOrder) {
      return NextResponse.json({ 
        error: 'Ya tienes un pedido pendiente',
        code: 'PENDING_ORDER_EXISTS',
        pendingOrder: {
          id: existingPendingOrder.id,
          orderNumber: existingPendingOrder.orderNumber,
          totalAmount: existingPendingOrder.totalAmount,
          createdAt: existingPendingOrder.createdAt
        }
      }, { status: 409 }); // 409 Conflict
    }
    
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    const productIds = cartItems.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, currentQuantity: true, pricePerUnit: true }
    });
    const productsMap = new Map(products.map(p => [p.id, p]));
    let subtotal = 0;
    const orderItemsData: { productId: number; quantity: number; unitPrice: number; subtotal: number }[] = [];
    for (const item of cartItems) {
      const product = productsMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Producto ${item.productId} no encontrado.` }, { status: 400 });
      }
      if (product.currentQuantity < item.quantity) {
        return NextResponse.json({ error: `Stock insuficiente para ${product.name}.` }, { status: 400 });
      }
      const itemSubtotal = product.pricePerUnit * item.quantity;
      subtotal += itemSubtotal;
      orderItemsData.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.pricePerUnit, subtotal: itemSubtotal });
    }
    const shippingCost = 0.00; // Gratis por defecto (Recoger en tienda)
    const taxAmount = 0; // Sin impuestos
    const totalAmount = subtotal + shippingCost;
    const order = await prisma.$transaction(async (tx) => {
      return await tx.order.create({
        data: {
          userId, channel: 'ONLINE', status: 'pending',
          orderNumber: generateOrderNumber(),
          contactPhone: contactPhone || user?.phone || null,
          shippingAddress: shippingAddress || null,
          subtotal, shippingCost, taxAmount, totalAmount,
          items: { create: orderItemsData }
        },
        include: { items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } } }
      });
    });
    return NextResponse.json({ success: true, order, message: 'Pedido creado.' }, { status: 201 });
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Error interno.';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}