import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Obtener métricas de ventas
export async function GET() {
  try {
    // Ventas totales del mes actual
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const salesData = await prisma.order.findMany({
      where: {
        createdAt: { gte: currentMonth },
        status: { in: ['completed', 'paid'] }
      },
      include: {
        user: {
          select: { name: true, userName: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    // Calcular métricas
    const totalSales = salesData.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const salesCount = salesData.length;
    const averageSale = salesCount > 0 ? totalSales / salesCount : 0;

    // Top productos vendidos (agregando items de todas las órdenes)
    const productSales: Record<number, { productId: number; name: string; quantity: number }> = {};
    
    salesData.forEach(order => {
      order.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            productId: item.productId,
            name: item.product.name,
            quantity: 0
          };
        }
        productSales[item.productId].quantity += item.quantity;
      });
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    const metrics = {
      totalSales,
      salesCount,
      averageSale,
      topProducts,
      salesByDay: [] // Implementar agrupación por día
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
