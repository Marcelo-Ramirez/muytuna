// app/api/system/inventory/products/[id]/batches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateBatchNumber } from '@/lib/barcode/generator';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET - Obtener lotes de un producto
export async function GET(
  request: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const paramsObj = 'then' in context.params ? await context.params : context.params;
  const productId = parseInt(paramsObj.id);

  if (isNaN(productId)) {
    return NextResponse.json(
      { success: false, error: 'ID de producto inválido' },
      { status: 400 }
    );
  }

  try {
    const batches = await prisma.productBatch.findMany({
      where: { productId },
      orderBy: [
        { expiryDate: 'asc' },
        { productionDate: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, batches });
  } catch (error) {
    console.error('Error obteniendo lotes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener lotes' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo lote
export async function POST(
  request: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Usuario no autenticado' },
      { status: 401 }
    );
  }

  const paramsObj = 'then' in context.params ? await context.params : context.params;
  const productId = parseInt(paramsObj.id);

  if (isNaN(productId)) {
    return NextResponse.json(
      { success: false, error: 'ID de producto inválido' },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { quantity, expiryDate, productionDate, notes } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Cantidad inválida' },
        { status: 400 }
      );
    }

    // Verificar que el producto existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Generar número de lote único
    const batchNumber = generateBatchNumber(
      productionDate ? new Date(productionDate) : new Date()
    );

    // Crear el lote
    const batch = await prisma.productBatch.create({
      data: {
        productId,
        batchNumber,
        quantity: parseFloat(quantity),
        remaining: parseFloat(quantity),
        productionDate: productionDate ? new Date(productionDate) : new Date(),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes || null,
      },
    });

    // Actualizar cantidad total del producto
    await prisma.product.update({
      where: { id: productId },
      data: {
        currentQuantity: {
          increment: parseFloat(quantity),
        },
      },
    });

    return NextResponse.json(
      { success: true, batch },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creando lote:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear lote' },
      { status: 500 }
    );
  }
}
