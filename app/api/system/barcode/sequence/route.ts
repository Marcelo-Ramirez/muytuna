import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Usuario no autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, count } = body;

    if (!productId || !count || count < 1) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Usamos una transacción para asegurar la atomicidad
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener el producto actual para ver su último número
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { lastSequenceNumber: true, sku: true, barcode: true }
      });

      if (!product) {
        throw new Error('Producto no encontrado');
      }

      const start = (product.lastSequenceNumber || 0) + 1;
      const end = start + count - 1;

      // 2. Actualizar el último número
      await tx.product.update({
        where: { id: productId },
        data: { lastSequenceNumber: end }
      });

      return {
        start,
        end,
        sku: product.sku,
        baseBarcode: product.barcode
      };
    });

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Error reservando secuencia:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error al reservar secuencia' },
      { status: 500 }
    );
  }
}
