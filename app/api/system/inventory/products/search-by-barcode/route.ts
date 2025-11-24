// app/api/system/inventory/products/search-by-barcode/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código de barras requerido' },
        { status: 400 }
      );
    }

    // Buscar por barcode o SKU
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { barcode: code },
          { sku: code },
        ],
      },
      include: {
        batches: {
          where: {
            remaining: {
              gt: 0,
            },
          },
          orderBy: [
            { expiryDate: 'asc' },
            { productionDate: 'asc' },
          ],
        },
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Verificar stock disponible
    const totalStock = product.batches.reduce(
      (sum, batch) => sum + batch.remaining,
      0
    );

    return NextResponse.json({
      success: true,
      product,
      totalStock,
      oldestBatch: product.batches[0] || null,
    });
  } catch (error) {
    console.error('Error buscando producto por código:', error);
    return NextResponse.json(
      { success: false, error: 'Error al buscar producto' },
      { status: 500 }
    );
  }
}
