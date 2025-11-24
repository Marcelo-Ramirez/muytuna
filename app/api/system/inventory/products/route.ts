import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET: Obtener todos los productos
export async function GET() {
  try {
    const products = await prisma.product.findMany();
    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener productos" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo producto
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Usuario no autenticado" },
        { status: 401 }
      );
    }

    const { 
      name, 
      flavor, 
      type, 
      pricePerUnit, 
      imageUrl, 
      currentQuantity,
      sku,
      barcode,
      barcodeFormat 
    } = await req.json();

    const newProduct = await prisma.product.create({
      data: {
        name,
        flavor,
        type,
        pricePerUnit,
        imageUrl,
        currentQuantity,
        sku: sku || '',
        barcode: barcode || '',
        barcodeFormat: barcodeFormat || 'EAN13',
      },
    });

    return NextResponse.json(
      { success: true, product: newProduct },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear producto:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear producto" },
      { status: 500 }
    );
  }
}
