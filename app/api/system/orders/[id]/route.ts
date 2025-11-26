import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Obtener orden por ID
export async function GET(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        items: {
          include: {
            product: {
              select: { 
                id: true, 
                name: true, 
                flavor: true, 
                type: true, 
                imageUrl: true,
                sku: true,
                barcode: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Error al obtener orden" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar estado de orden
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { id } = await params;
    const orderId = parseInt(id);
    const body = await req.json();

    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const { status } = body;

    // Validar status
    const validStatuses = ["pending", "paid", "completed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Estado inválido. Use: pending, paid, completed" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    // Validar transición de estados
    const allowedTransitions: Record<string, string[]> = {
      pending: ["paid", "completed"],
      paid: ["completed"],
      completed: [], // No se puede cambiar desde completado
    };

    if (status && !allowedTransitions[existingOrder.status]?.includes(status)) {
      return NextResponse.json(
        { 
          error: `No se puede cambiar de '${existingOrder.status}' a '${status}'`,
          currentStatus: existingOrder.status,
          allowedTransitions: allowedTransitions[existingOrder.status],
        },
        { status: 400 }
      );
    }

    // Actualizar orden
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status || existingOrder.status,
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

    // Si se marca como completado, decrementar stock Y registrar movimientos
    if (status === "completed" && existingOrder.status !== "completed") {
      // Obtener userId del que procesa la orden (de sesión) o del dueño de la orden
      const numericUserId = session?.user?.id 
        ? Number(session.user.id) 
        : updatedOrder.userId ?? 1; // fallback a admin si no hay usuario

      await prisma.$transaction(async (tx) => {
        for (const item of updatedOrder.items) {
          // 1. Decrementar stock del producto
          await tx.product.update({
            where: { id: item.productId },
            data: {
              currentQuantity: { decrement: item.quantity },
            },
          });

          // 2. Buscar lote más antiguo con stock (FIFO) para asociar el movimiento
          const oldestBatch = await tx.productBatch.findFirst({
            where: {
              productId: item.productId,
              remaining: { gt: 0 },
              status: "ACTIVE",
            },
            orderBy: { productionDate: "asc" },
          });

          // 3. Si hay lote, decrementar también el remaining del lote
          if (oldestBatch) {
            const quantityToDeduct = Math.min(item.quantity, oldestBatch.remaining);
            await tx.productBatch.update({
              where: { id: oldestBatch.id },
              data: {
                remaining: { decrement: quantityToDeduct },
              },
            });
          }

          // 4. Crear ProductMovement de salida/venta
          await tx.productMovement.create({
            data: {
              userId: numericUserId,
              productId: item.productId,
              batchId: oldestBatch?.id ?? null,
              movementType: "EGRESO",
              quantity: item.quantity,
              notes: `Venta - Orden #${orderId}`,
            },
          });
        }
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: status ? `Estado actualizado a '${status}'` : "Orden actualizada",
    });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Error al actualizar orden" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar orden (solo pending)
export async function DELETE(req: Request, { params }: RouteParams) {
  try {
    const session = await getServerSession();
    const { id } = await params;
    const orderId = parseInt(id);

    if (isNaN(orderId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // Verificar que existe y está en pending
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (existingOrder.status !== "pending") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar órdenes pendientes" },
        { status: 400 }
      );
    }

    // Eliminar orden (cascade elimina items)
    await prisma.order.delete({
      where: { id: orderId },
    });

    return NextResponse.json({
      success: true,
      message: "Orden eliminada correctamente",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Error al eliminar orden" },
      { status: 500 }
    );
  }
}
