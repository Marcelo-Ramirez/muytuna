import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const DEFAULT_LIMIT = 10;

// Tipos para Prisma where clause
type WhereClause = {
  AND?: Array<WhereClause>;
  OR?: Array<WhereClause>;
  name?: { contains: string };
  type?: { equals: string } | { contains: string };
  flavor?: { equals: string } | { contains: string };
};

// GET: Obtener productos con paginación, búsqueda y filtro
export async function GET(req: Request) {
  try {
    // Obtener parámetros de la URL
    const { searchParams } = new URL(req.url);
    const searchTerm = searchParams.get('search') || '';
    const activeFilter = searchParams.get('filter');
    const page = Number.parseInt(searchParams.get('page') || '1');
    const limit = Number.parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT));

    // Definir paginación
    const skip = (page - 1) * limit;
    const take = limit;

    // Construir la cláusula WHERE
    const where: WhereClause = {};

    // Lógica para búsqueda (searchTerm)
    if (searchTerm) {
      where.OR = [
        { name: { contains: searchTerm } },
        { type: { contains: searchTerm } },
        { flavor: { contains: searchTerm } },
      ];
    }

    // Lógica para filtro de categoría (activeFilter)
    if (activeFilter && activeFilter !== 'All') {
      const filterConditions: WhereClause[] = [
        { type: { equals: activeFilter } },
        { flavor: { equals: activeFilter } },
      ];

      // Combinar búsqueda y filtro con lógica AND
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: filterConditions }];
        delete where.OR;
      } else {
        where.OR = filterConditions;
      }
    }

    // Contar el total de productos
    const totalCount = await prisma.product.count({ where });

    // Obtener los productos de la página actual
    const products = await prisma.product.findMany({
      where,
      skip,
      take,
      orderBy: {
        name: 'asc',
      },
    });

    // Devolver la respuesta
    return NextResponse.json({
      success: true,
      products,
      totalCount,
    });

  } catch (error) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo producto
export async function POST(req: Request) {
  try {
    const { name, flavor, type, pricePerUnit, imageUrl, currentQuantity } = await req.json();

    const newProduct = await prisma.product.create({
      data: {
        name,
        flavor,
        type,
        pricePerUnit,
        imageUrl,
        currentQuantity,
        // createdAt y updatedAt se manejan automáticamente por Prisma
      },
    });

    return NextResponse.json(
      { success: true, product: newProduct },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear producto' },
      { status: 500 }
    );
  }
}