// app/api/system/barcode/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateSKU, generateEAN13Barcode } from '@/lib/barcode/generator';
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
    const { type, flavor, productId } = body;

    if (!type || !flavor) {
      return NextResponse.json(
        { success: false, error: 'Tipo y sabor son requeridos' },
        { status: 400 }
      );
    }

    const sku = generateSKU(type, flavor, productId);
    const barcode = productId ? generateEAN13Barcode(productId) : null;

    return NextResponse.json({
      success: true,
      sku,
      barcode,
      barcodeFormat: 'EAN13',
    });
  } catch (error) {
    console.error('Error generando códigos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar códigos' },
      { status: 500 }
    );
  }
}
