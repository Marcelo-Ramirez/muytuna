// app/api/inventory/products/history/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// GET: Obtener historial de movimientos
export async function GET(req: Request, context: { params: any }) {
  const params = context.params;
  const productIdParam = (await params).id;
  console.log(`LOG: Solicitud GET recibida para historial de producto ID: ${productIdParam}`);

  if (!productIdParam) {
    console.warn("WARN: Solicitud GET de historial sin ID de producto.");
    return NextResponse.json(
      { success: false, error: "ID de producto no proporcionado" },
      { status: 400 }
    );
  }

  const productId = parseInt(productIdParam);

  try {
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      console.log(`LOG: Producto con ID ${productId} no encontrado para historial.`);
      return NextResponse.json(
        { success: false, error: "Producto no encontrado" },
        { status: 404 }
      );
    }

  const movements = await prisma.productMovement.findMany({
      where: { productId },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });
    
    console.log(`LOG: Se encontraron ${movements.length} movimientos para el producto ${productId}.`); 
    return NextResponse.json({ success: true, product, movements });
  } catch (error) {
    console.error(`ERROR: Error al obtener historial para el producto ${productId}:`, error);
    return NextResponse.json(
      { success: false, error: "Error al obtener historial de movimientos" },
      { status: 500 }
    );
  }
}

// POST: Registrar un nuevo movimiento
export async function POST(req: Request) {
  console.log("LOG: Solicitud POST recibida para registrar un movimiento.");
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    console.warn("WARN: Intento de registrar movimiento sin autenticación.");
    return NextResponse.json(
      { success: false, error: "Usuario no autenticado" },
      { status: 401 }
    );
  }
  
  try {
    const { productId, movementType, quantity, reason } = await req.json();
    console.log(`LOG: Usuario ${session.user.id} intentando registrar ${movementType} de ${quantity} para producto ${productId}.`); 
    
    if (!productId || !movementType || !quantity || !reason) {
      console.warn("WARN: Solicitud de movimiento con campos faltantes.");
      return NextResponse.json(
        { success: false, error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }
    
    const numericProductId = Number(productId);
    const numericQuantity = Number(quantity);
    
    if (isNaN(numericProductId)) { 
      console.warn("WARN: ID de producto no válido.");
      return NextResponse.json(
        { success: false, error: "El ID del producto no es válido" },
        { status: 400 }
      );
    }

    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      console.warn("WARN: Cantidad no válida en el registro de movimiento.");
      return NextResponse.json(
        { success: false, error: "La cantidad debe ser un número positivo" },
        { status: 400 }
      );
    }
    
    const updatedQuantity = movementType === 'entrada' ? numericQuantity : -numericQuantity;
    
    const userId = Number(session.user.id);
    
    const [newMovement, updatedProduct] = await prisma.$transaction([
      prisma.productMovement.create({
        // Usamos la variable numérica
        data: { userId, productId: numericProductId, movementType, quantity: numericQuantity }, // <-- CORRECCIÓN 3
      }),
      prisma.product.update({
        // Usamos la variable numérica
        where: { id: numericProductId }, // <-- CORRECCIÓN 4
        data: { currentQuantity: { increment: updatedQuantity } },
      }),
    ]);
    
    console.log(`LOG: Movimiento de ${movementType} registrado. Producto ${numericProductId} actualizado a ${updatedProduct.currentQuantity}.`);
    return NextResponse.json({ success: true, movement: newMovement, product: updatedProduct });
  } catch (error) {
    console.error("ERROR: Error al registrar movimiento:", error);
    if (error instanceof Error) {
      console.error("Detalle del error:", error.message);
    }
    return NextResponse.json(
      { success: false, error: "Error al registrar movimiento" },
      { status: 500 }
    );
  }
}