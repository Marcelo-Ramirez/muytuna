import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getToken } from 'next-auth/jwt';

const prisma = new PrismaClient();

// GET /api/system/inventory/ingredients/history?name=manzana
export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const userRole = token.role as string;
    if (!['stockroom', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'Falta el nombre del ingrediente' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.findFirst({
      where: { name },
      select: {
        id: true,
        name: true,
        provider: true,
        pricePerUnit: true,
        currentQuantity: true,
        ingredientEOQ: {
          select: {
            reorderPoint: true
          }
        }
      },
    });
    if (!ingredient) {
      return NextResponse.json({ error: 'Ingrediente no encontrado' }, { status: 404 });
    }

    const movements = await prisma.inventoryMovement.findMany({
      where: { ingredientId: ingredient.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        movementType: true,
        reason: true,
        quantity: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });
    return NextResponse.json({ success: true, ingredient, movements });
  } catch (error) {
    console.error('Error al obtener historial:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/system/inventory/ingredients/history
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !token.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const userRole = token.role as string;
    if (!['stockroom', 'admin'].includes(userRole)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { name, movementType, reason, quantity } = body;
    if (!name || !movementType || !reason || !quantity) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const ingredient = await prisma.ingredient.findFirst({ where: { name } });
    if (!ingredient) {
      return NextResponse.json({ error: 'Ingrediente no encontrado' }, { status: 404 });
    }

    const movement = await prisma.inventoryMovement.create({
      data: {
        // CORRECCIÓN 1: Usar Number.parseInt
        userId: Number.parseInt(token.id as string),
        ingredientId: ingredient.id,
        movementType,
        reason,
        quantity: movementType === 'salida' ? -Math.abs(quantity) : Math.abs(quantity),
      },
      select: {
        id: true,
        movementType: true,
        reason: true,
        quantity: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    });

    // CORRECCIÓN 2: Usar 'increment' para actualizar el stock (más seguro)
    await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: {
        currentQuantity: {
          increment: movement.quantity
        }
      }
    });
    return NextResponse.json({ success: true, movement });
  } catch (error) {
    console.error('Error al registrar movimiento:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}