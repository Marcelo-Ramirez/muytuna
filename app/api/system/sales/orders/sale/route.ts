import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// POST: Confirmar una venta (cambiar estado a 'completed')
export async function POST(req: Request) {
  // 1. Obtener la sesión y validar el usuario
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const numericUserId = Number(session.user.id);
  if (isNaN(numericUserId)) {
    return NextResponse.json({ error: "User ID inválido" }, { status: 400 });
  }

  // 2. Obtener y validar el body
  const body = await req.json();
  const orderId = Number(body.orderId);

  if (isNaN(orderId)) {
    return NextResponse.json({ error: "ID de pedido inválido" }, { status: 400 });
  }

  try {
    // Ejecutar la lógica de venta dentro de una Transacción
    const saleResult = await prisma.$transaction(async (tx) => {
      // A. Obtener el pedido con sus items
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!order) {
        throw new Error("Pedido no encontrado.");
      }

      if (order.status === 'completed') {
        throw new Error("Este pedido ya ha sido completado.");
      }

      if (order.status === 'cancelled') {
        throw new Error("No se puede completar un pedido cancelado.");
      }

      // B. Verificar stock de todos los productos
      for (const item of order.items) {
        if (item.product.currentQuantity < item.quantity) {
          throw new Error(`Stock insuficiente para ${item.product.name}. Disponible: ${item.product.currentQuantity}, Solicitado: ${item.quantity}`);
        }
      }

      // C. Reducir el stock de cada producto
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { 
            currentQuantity: { decrement: item.quantity } 
          },
        });
      }

      // D. Actualizar el estado del pedido a 'completed'
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { 
          status: "completed",
          paidAt: order.paidAt || new Date() // Si no estaba pagado, marcar como pagado ahora
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  type: true,
                  flavor: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      return updatedOrder;
    });

    return NextResponse.json({ success: true, order: saleResult });
  } catch (error) {
    console.error("Error en la venta:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al procesar la venta.";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}