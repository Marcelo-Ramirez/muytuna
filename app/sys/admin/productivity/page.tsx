import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ProductivityPanel from '@/components/ProductivityPanel'
import { prisma } from '@/lib/db'

type ProductSummary = { productId: number; name: string; quantity: number; pricePerUnit: number; revenue: number };

async function computeMonthData(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);

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
  console.log('server computeMonthData: movs', movs.length, 'for', year, month);

  let rawMaterialCost = 0;
    for (const m of movs) {
      if (m.ingredient && m.ingredient.pricePerUnit) {
        // Use absolute quantity so production 'salida' movements contribute positive cost
        const qty = Math.abs(m.quantity || 0);
        rawMaterialCost += qty * m.ingredient.pricePerUnit;
      }
  }
    console.log('computeMonthData: normalized rawMaterialCost using absolute quantities for salida movements');

  // Use OrderItem from completed/paid orders instead of saleProduct
  const orderItems = await prisma.orderItem.findMany({ 
    where: { 
      createdAt: { gte: start, lte: end },
      order: {
        status: { in: ['completed', 'paid'] }
      }
    }, 
    include: { product: true } 
  });
  console.log('server computeMonthData: orderItems', orderItems.length, 'for', year, month);
  
  let salesRevenue = 0;
  const byProduct: Record<string, ProductSummary> = {};
  for (const item of orderItems) {
    const price = item.product?.pricePerUnit ?? item.unitPrice;
    const rev = item.subtotal;
    salesRevenue += rev;
    const key = String(item.productId);
    if (!byProduct[key]) byProduct[key] = { productId: item.productId, name: item.product?.name ?? 'N/A', quantity: 0, pricePerUnit: price, revenue: 0 };
    byProduct[key].quantity += item.quantity || 0;
    byProduct[key].revenue += rev;
  }

  return { rawMaterialCost, salesRevenue, products: Object.values(byProduct) as ProductSummary[], start, end };
}

export default async function ProductivityPage({ searchParams }: { searchParams?: any }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    // Not authenticated -> send to login
    redirect('/sys/login');
  }

  const role = (session as { role?: string } | null)?.role as string | undefined;
  if (role && role !== 'admin') {
    const pathRole = role === 'ventas' ? 'sales' : role === 'almacen' ? 'stockroom' : role;
    redirect(`/sys/${pathRole}/dashboard`);
  }

  // Await the possibly async searchParams provided by Next.js routing
  const sp = await searchParams;
  const now = new Date();
  const selYear = sp?.year ? Number(sp.year) : now.getFullYear();
  const selMonth = sp?.month ? Number(sp.month) : (now.getMonth() + 1);
  const initialData = await computeMonthData(selYear, selMonth);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold">Productividad</h1>
        </div>
      </div>

      <ProductivityPanel initialData={initialData} />
    </div>
  );
}
