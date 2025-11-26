import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Usuario no autenticado' }, { status: 401 });
    }

    const body = await request.json();
  const { barcode, quantity, consume } = body || {};
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const doConsume = consume === undefined ? true : Boolean(consume);

    if (!barcode || typeof barcode !== 'string') {
      return NextResponse.json({ success: false, error: 'Barcode requerido' }, { status: 400 });
    }

    // Intentar encontrar lote por barcode en productBatch
    let batch = await prisma.productBatch.findUnique({ where: { barcode } as any });

    // Si no se encuentra lote con ese barcode, intentar buscar producto por barcode y elegir lote FIFO
    if (!batch) {
      const product = await prisma.product.findUnique({ where: { barcode } as any });
      if (product) {
        batch = await prisma.productBatch.findFirst({
          where: { productId: product.id, remaining: { gt: 0 } },
          orderBy: { productionDate: 'asc' }, // FIFO
        });
      }
    }

    if (!batch) {
      return NextResponse.json({ success: false, error: 'Lote no encontrado para ese barcode' }, { status: 404 });
    }

    // If consume flag is false, just return identification info without changing DB
    if (!doConsume) {
      return NextResponse.json({
        success: true,
        consumed: false,
        batch: {
          id: batch.id,
          batchNumber: batch.batchNumber,
          remaining: batch.remaining,
          initialQuantity: batch.initialQuantity,
          productionDate: batch.productionDate,
          expiryDate: batch.expiryDate,
          notes: batch.notes,
        },
        product: {
          id: batch.productId,
        },
      });
    }

    if (batch.remaining < qty) {
      return NextResponse.json({ success: false, error: 'Stock insuficiente en lote', available: batch.remaining }, { status: 400 });
    }

    const userId = parseInt(session.user.id as string);
    if (isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'Usuario inválido en sesión' }, { status: 401 });
    }

    // Transacción: crear movimiento y decrementar stock del batch y producto
    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.productMovement.create({
        data: {
          userId,
          productId: batch!.productId,
          batchId: batch!.id,
          movementType: 'salida',
          quantity: qty,
          notes: `Salida por escaneo (barcode: ${barcode})`,
        },
      });

      const updatedBatch = await tx.productBatch.update({
        where: { id: batch!.id },
        data: { remaining: { decrement: qty } },
      });

      const updatedProduct = await tx.product.update({
        where: { id: batch!.productId },
        data: { currentQuantity: { decrement: qty } },
      });

      return { movement, updatedBatch, updatedProduct };
    });

    return NextResponse.json({ success: true, consumed: true, ...result });
  } catch (err) {
    console.error('Error process scan:', err);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
