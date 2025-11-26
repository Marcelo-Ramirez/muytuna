import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const productId = url.searchParams.get('productId');
    const type = url.searchParams.get('type');

    const start = startOfDay();
    const end = endOfDay();

    if (productId) {
      const id = Number(productId);
      // Sum quantity from OrderItem for completed/paid orders
      const items = await prisma.orderItem.findMany({
        where: { 
          productId: id, 
          createdAt: { gte: start, lte: end },
          order: {
            status: { in: ['completed', 'paid'] }
          }
        },
        select: { quantity: true }
      });
      const total = items.reduce((sum, item) => sum + item.quantity, 0);
      return NextResponse.json({ total });
    }

    if (type) {
      // get product ids by type
      const prods = await prisma.product.findMany({ where: { type }, select: { id: true } });
      const ids = prods.map(p => p.id);
      if (ids.length === 0) return NextResponse.json({ total: 0 });
      
      const items = await prisma.orderItem.findMany({
        where: { 
          productId: { in: ids }, 
          createdAt: { gte: start, lte: end },
          order: {
            status: { in: ['completed', 'paid'] }
          }
        },
        select: { quantity: true }
      });
      const total = items.reduce((sum, item) => sum + item.quantity, 0);
      return NextResponse.json({ total });
    }

    // If no filters provided, return total across all OrderItem records for today
    const items = await prisma.orderItem.findMany({
      where: { 
        createdAt: { gte: start, lte: end },
        order: {
          status: { in: ['completed', 'paid'] }
        }
      },
      select: { quantity: true }
    });
    const totalAll = items.reduce((sum, item) => sum + item.quantity, 0);
    return NextResponse.json({ total: totalAll });
  } catch {
    return NextResponse.json({ error: 'Error calculating sales today' }, { status: 500 });
  }
}
