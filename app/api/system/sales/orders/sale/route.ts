import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth"; // Ajusta si tu proyecto usa otro import

export async function POST(req: Request) {
  // 1. Obtener la sesión y validar el usuario
  const session = await getServerSession();
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const numericUserId = Number(session.user.id);
  if (isNaN(numericUserId)) {
    return NextResponse.json({ error: "User ID inválido" }, { status: 400 });
  }

  // 2. Obtener y validar el body
  const body = await req.json();
  const orderClientIdRaw = body.orderClientId ?? body.orderClientIdRaw ?? body.orderClient;
  const numericOrderClientId = Number(orderClientIdRaw);

  if (isNaN(numericOrderClientId)) {
    return NextResponse.json({ error: "ID de pedido inválido" }, { status: 400 });
  }

  try {
    // Ejecutar la lógica de venta dentro de una Transacción
    const saleResult = await prisma.$transaction(async (tx) => {
      // A. Obtener el pedido básico (sin assumes sobre includes)
      const orderClient = await tx.orderClient.findUnique({
        where: { id: numericOrderClientId },
        // seleccion mínima para evitar errores de select desconocidos
        select: {
          id: true,
          status: true,
          createdAt: true,
          quantity: true,
          productId: true,
          clientId: true,
        },
      });

      if (!orderClient) {
        throw new Error("Pedido no encontrado.");
      }

      // B. Verificar si ya existe una venta asociada al orderClient
      const existingSale = await tx.saleOrder.findFirst({
        where: { orderClientId: numericOrderClientId },
        select: { id: true },
      });
      if (existingSale) {
        throw new Error("P2002: Este pedido ya ha sido confirmado como venta.");
      }

      // C. Obtener el producto asociado por productId
      const product = await tx.product.findUnique({
        where: { id: orderClient.productId },
      });
      if (!product) {
        throw new Error("Producto asociado no encontrado.");
      }

      // D. Determinar campo de stock y precio en el producto (fallbacks seguros)
      const productAny = product as any;
      const stockValue = Number(
        productAny.currentQuantity ?? productAny.stock ?? productAny.remaining ?? productAny.quantity ?? 0
      );
      const unitPrice = Number(productAny.pricePerUnit ?? productAny.unitPrice ?? productAny.price ?? 0);

      if (stockValue < orderClient.quantity) {
        throw new Error("Verifique el stock. Cantidad solicitada supera el stock disponible.");
      }

      // E. Crear el registro SaleOrder (asegurando userId numérico)
      const saleOrder = await tx.saleOrder.create({
        data: {
          userId: numericUserId,
          orderClientId: numericOrderClientId,
          totalCostOrder: unitPrice * orderClient.quantity,
        },
      });

      // F. Actualizar el estado del OrderClient a 'sale'
      await tx.orderClient.update({
        where: { id: numericOrderClientId },
        data: { status: "sale" },
      });

      // G. Reducir el stock del producto (usar campo determinado dinámicamente)
      const stockFieldName =
        productAny.currentQuantity !== undefined
          ? "currentQuantity"
          : productAny.stock !== undefined
          ? "stock"
          : productAny.remaining !== undefined
          ? "remaining"
          : productAny.quantity !== undefined
          ? "quantity"
          : null;

      if (!stockFieldName) {
        throw new Error("No se pudo determinar el campo de stock en Product.");
      }

      // Usar cast any para la actualización dinámica del campo de stock
      await tx.product.update({
        where: { id: orderClient.productId },
        data: ({ [stockFieldName]: { decrement: orderClient.quantity } } as any),
      });

      return saleOrder;
    });

    return NextResponse.json({ success: true, saleOrder: saleResult });
  } catch (error) {
    console.error("Error en la venta:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al procesar la venta.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}