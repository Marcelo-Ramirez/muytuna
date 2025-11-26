import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

type ProductSummary = { productId: number; name: string; quantity: number; pricePerUnit: number; revenue: number };

function startOfMonth(year: number, month: number) {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

function endOfMonth(year: number, month: number) {
  // month is 1-indexed; compute end by taking the first day of next month minus 1ms
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  return new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session as { role?: string } | null)?.role;
    if (!session || role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const year = Number(url.searchParams.get('year')) || new Date().getFullYear();
    const month = Number(url.searchParams.get('month')) || (new Date().getMonth() + 1);

  const start = startOfMonth(year, month);
  const end = endOfMonth(year, month);
  console.log('API month-data: requested', { year, month, start: start.toISOString(), end: end.toISOString() });

    // 1) Raw material cost: sum of inventory movements of type 'salida' and reason containing 'produccion' in that month
    const movs = await prisma.inventoryMovement.findMany({
      where: {
        movementType: 'salida',
        createdAt: { gte: start, lte: end },
        OR: [
          { reason: { contains: 'produccion' } },
          { reason: { contains: 'Producción' } },
          { reason: { contains: 'producción' } }
        ]
      },
      include: { ingredient: true }
    });
  console.log('API month-data: movs found', movs.length);

        let rawMaterialCost = 0;
        for (const m of movs) {
          if (m.ingredient && m.ingredient.pricePerUnit) {
            // Ensure cost uses absolute quantity for 'salida' movements so cost is positive
            const qty = Math.abs(m.quantity || 0);
            rawMaterialCost += qty * m.ingredient.pricePerUnit;
          }
        }
        console.log('API month-data: normalized rawMaterialCost by taking absolute quantity for salida movements');

    // 2) Sales revenue and per-product breakdown for the month using Order/OrderItem
    const orderItems = await prisma.orderItem.findMany({
      where: { 
        createdAt: { gte: start, lte: end },
        order: {
          status: { in: ['completed', 'paid'] }
        }
      },
      include: { product: true }
    });
  console.log('API month-data: orderItems found', orderItems.length);

  let salesRevenue = 0;
  const byProduct: Record<string, ProductSummary> = {};

    for (const item of orderItems) {
      const price = item.product?.pricePerUnit ?? item.unitPrice;
      const rev = item.subtotal;
      salesRevenue += rev;
      const key = String(item.productId);
      if (!byProduct[key]) {
        byProduct[key] = { productId: item.productId, name: item.product?.name ?? 'N/A', quantity: 0, pricePerUnit: price, revenue: 0 };
      }
      byProduct[key].quantity += item.quantity || 0;
      byProduct[key].revenue += rev;
    }

    const products = Object.values(byProduct);

    return NextResponse.json({ rawMaterialCost, salesRevenue, products, start, end });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
