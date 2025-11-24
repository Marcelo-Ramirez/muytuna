import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  context: { params: { batchId: string } } | { params: Promise<{ batchId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: 'Usuario no autenticado' },
      { status: 401 }
    );
  }

  const paramsObj = 'then' in context.params ? await context.params : context.params;
  const batchId = Number(paramsObj.batchId);

  if (!Number.isFinite(batchId)) {
    return NextResponse.json(
      { success: false, error: 'ID de lote inválido' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const quantity = Number(body.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Cantidad inválida' },
        { status: 400 }
      );
    }

    const batch = await prisma.productBatch.findUnique({
      where: { id: batchId },
      include: { product: true },
    });

    if (!batch || !batch.product) {
      return NextResponse.json(
        { success: false, error: 'Lote no encontrado' },
        { status: 404 }
      );
    }

    if (batch.remaining < quantity) {
      return NextResponse.json(
        { success: false, error: 'Stock insuficiente en el lote' },
        { status: 400 }
      );
    }

    const userId = Number(session.user.id);

    const result = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.productBatch.update({
        where: { id: batchId },
        data: {
          remaining: {
            decrement: quantity,
          },
        },
      });

      const updatedProduct = await tx.product.update({
        where: { id: batch.productId },
        data: {
          currentQuantity: {
            decrement: quantity,
          },
        },
      });

      await tx.productMovement.create({
        data: {
          userId,
          productId: batch.productId,
          movementType: 'salida',
          quantity,
        },
      });

      return { updatedBatch, updatedProduct };
    });

    return NextResponse.json({
      success: true,
      batch: result.updatedBatch,
      product: result.updatedProduct,
    });
  } catch (error) {
    console.error('Error consumiendo lote:', error);
    return NextResponse.json(
      { success: false, error: 'Error al registrar salida' },
      { status: 500 }
    );
  }
}
