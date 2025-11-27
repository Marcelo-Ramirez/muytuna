import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET: Obtener sabores únicos de productos
export async function GET() {
  try {
    // Obtener todos los productos con sus sabores
    const products = await prisma.product.findMany({
      select: {
        flavor: true,
      },
      distinct: ['flavor'],
      orderBy: {
        flavor: 'asc',
      },
    });

    // Extraer sabores únicos y filtrar valores nulos/vacíos
    const flavors = products
      .map(p => p.flavor)
      .filter((flavor): flavor is string => !!flavor)
      .sort();

    return NextResponse.json({
      success: true,
      flavors,
    });
  } catch (error) {
    console.error('Error fetching flavors:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener sabores' },
      { status: 500 }
    );
  }
}
