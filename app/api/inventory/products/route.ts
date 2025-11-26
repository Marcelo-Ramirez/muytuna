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

    // Convertir términos a minúsculas para búsqueda insensible a mayúsculas
    const termLower = searchTerm.toLowerCase();
    
    // Construir la cláusula WHERE
    const where: WhereClause = {};
    const searchConditions: WhereClause[] = [];
    
    if (searchTerm) {
        searchConditions.push({ name: { contains: termLower } });
        searchConditions.push({ type: { contains: termLower } });
        searchConditions.push({ flavor: { contains: termLower } });
    }

    const filterConditions: WhereClause[] = [];
    if (activeFilter && activeFilter !== 'All') {
        // Usamos activeFilter directamente para respetar mayúsculas/minúsculas de la BD
        filterConditions.push({ type: { equals: activeFilter } });
        filterConditions.push({ flavor: { equals: activeFilter } });
        // Y también probamos con minúsculas por si acaso
        filterConditions.push({ type: { equals: activeFilter.toLowerCase() } });
        filterConditions.push({ flavor: { equals: activeFilter.toLowerCase() } });
    }

    if (searchTerm && activeFilter && activeFilter !== 'All') {
        where.AND = [
            { OR: searchConditions },
            { OR: filterConditions }
        ];
    } else if (searchTerm) {
        where.OR = searchConditions;
    } else if (activeFilter && activeFilter !== 'All') {
        where.OR = filterConditions;
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