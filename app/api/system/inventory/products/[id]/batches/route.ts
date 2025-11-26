// app/api/system/inventory/products/[id]/batches/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateBatchNumber, generateEAN13Barcode } from '@/lib/barcode/generator';
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

    // Verificar que el usuario existe (para evitar error de clave foránea en movimiento)
    const userId = parseInt(session.user.id);
    if (isNaN(userId)) {
        return NextResponse.json({ success: false, error: 'ID de usuario inválido en sesión' }, { status: 400 });
    }
    const userExists = await prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
        return NextResponse.json({ success: false, error: 'Usuario no encontrado en la base de datos. Por favor inicie sesión nuevamente.' }, { status: 401 });
    }

    // Generar número de lote único
    const batchNumber = generateBatchNumber(
      productionDate ? new Date(productionDate) : new Date()
    );

    // Crear el lote, generar barcode, registrar movimiento y actualizar producto en una transacción
    const { batch, movement, updatedProduct } = await prisma.$transaction(async (tx) => {
      // 1. Crear el lote sin barcode primero
      const batch = await tx.productBatch.create({
        data: {
          productId,
          batchNumber,
          initialQuantity: parseFloat(quantity),
          remaining: parseFloat(quantity),
          productionDate: productionDate ? new Date(productionDate) : new Date(),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          notes: notes || null,
        },
      });

      // 1b. Generar un barcode para el lote. Usamos productId y batch.id como seed/attempt para reducir colisiones
      let barcodeValue = generateEAN13Barcode(productId);
      // If batch.id is available, try a variant including batch.id to reduce collisions
      try {
        barcodeValue = generateEAN13Barcode(productId + batch.id);
      } catch (err) {
        // fallback to simple product-based code
      }

      // A: ensure column exists (sqlite ALTER TABLE ADD COLUMN is idempotent if handled)
      try {
        await tx.$executeRaw`ALTER TABLE "Product_batches" ADD COLUMN barcode TEXT`; // may fail if column exists
      } catch (e) {
        // ignore errors (column likely exists)
      }

      // B: update barcode using raw SQL to avoid Prisma client validation errors
      await tx.$executeRaw`
        UPDATE "Product_batches"
        SET barcode = ${barcodeValue}
        WHERE id = ${batch.id}
      `;

      // Build a returned batch object merging created batch and barcode value
      const returnedBatch = { ...batch, barcode: barcodeValue };

      // 2. Registrar movimiento de entrada vinculado al lote
      const movement = await tx.productMovement.create({
        data: {
          userId, // Usamos el ID verificado
          productId,
          batchId: batch.id, // Ahora sí podemos vincularlo
          movementType: 'entrada',
          quantity: parseFloat(quantity),
          notes: `Creación de lote: ${batchNumber}`, // Usamos notes en lugar de reason
        },
      });

      // 3. Actualizar producto
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          currentQuantity: {
            increment: parseFloat(quantity),
          },
        },
      });

  return { batch: returnedBatch, movement, updatedProduct };
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
