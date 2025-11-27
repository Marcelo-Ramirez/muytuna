import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST: Agregar items a una orden existente
export async function POST(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    const body = await req.json();

    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { items } = body; // [{ productId, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un producto" },
        { status: 400 }
      );
    }

    // Verificar que la orden existe y está en pending
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (existingOrder.status !== "pending") {
      return NextResponse.json(
        { error: "Solo se pueden agregar items a órdenes pendientes" },
        { status: 400 }
      );
    }

    // Obtener productos para calcular precios
    const productIds = items.map((item: any) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      return NextResponse.json(
        { error: "Uno o más productos no existen" },
        { status: 400 }
      );
    }

    // Construir items con precios
    let addedAmount = 0;
    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId)!;
      const quantity = Number(item.quantity);
      const unitPrice = product.pricePerUnit;
      const subtotal = Math.round(unitPrice * quantity * 100) / 100;
      addedAmount += subtotal;

      return {
        orderId,
        productId: product.id,
        quantity,
        unitPrice,
        subtotal,
      };
    });

    // Agregar items y actualizar total
    const result = await prisma.$transaction(async (tx) => {
      // Crear items
      await tx.orderItem.createMany({
        data: orderItems,
      });

      // Actualizar total de la orden
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: {
            increment: Math.round(addedAmount * 100) / 100,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, flavor: true, type: true },
              },
            },
          },
        },
      });

      return updatedOrder;
    });

    return NextResponse.json({
      success: true,
      order: result,
      message: `${items.length} item(s) agregado(s)`,
    });
  } catch (error) {
    console.error("Error adding items:", error);
    return NextResponse.json(
      { error: "Error al agregar items" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un item específico de la orden
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const itemId = parseInt(searchParams.get("itemId") || "");

    if (isNaN(orderId) || isNaN(itemId)) {
      return NextResponse.json(
        { error: "ID de orden o item inválido" },
        { status: 400 }
      );
    }

    // Verificar que la orden existe y está en pending
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (existingOrder.status !== "pending") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar items de órdenes pendientes" },
        { status: 400 }
      );
    }

    // Verificar que el item pertenece a la orden
    const item = existingOrder.items.find((i) => i.id === itemId);
    if (!item) {
      return NextResponse.json(
        { error: "Item no encontrado en esta orden" },
        { status: 404 }
      );
    }

    // No permitir eliminar el último item
    if (existingOrder.items.length === 1) {
      return NextResponse.json(
        { error: "No se puede eliminar el último item. Elimine la orden completa." },
        { status: 400 }
      );
    }

    // Eliminar item y actualizar total
    const result = await prisma.$transaction(async (tx) => {
      await tx.orderItem.delete({
        where: { id: itemId },
      });

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          totalAmount: {
            decrement: item.subtotal,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, flavor: true, type: true },
              },
            },
          },
        },
      });

      return updatedOrder;
    });

    return NextResponse.json({
      success: true,
      order: result,
      message: "Item eliminado",
    });
  } catch (error) {
    console.error("Error removing item:", error);
    return NextResponse.json(
      { error: "Error al eliminar item" },
      { status: 500 }
    );
  }
}
