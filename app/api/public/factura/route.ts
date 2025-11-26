import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type ExtraItem = { desc: string; precio: number; cant: number; total: number };

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderIdRaw = body?.orderId;
    const backendUrl: string | undefined = body?.backendUrl || process.env.EXTERNAL_INVOICE_URL;
    const deliveryAddress: string = body?.deliveryAddress || "";
    const extras: ExtraItem[] = Array.isArray(body?.extras) ? body.extras : [];

    const orderClientId = parseInt(String(orderIdRaw), 10);
    if (Number.isNaN(orderClientId)) {
      return NextResponse.json({ error: "ID de pedido inválido" }, { status: 400 });
    }

    const saleOrder = await prisma.saleOrder.findFirst({
      where: { orderClientId },
      include: {
        orderClient: { select: { createdAt: true, clientId: true, status: true } },
        saleProducts: {
          include: { product: { select: { name: true, pricePerUnit: true } } },
        },
      },
    });

    if (!saleOrder) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const client = saleOrder.orderClient?.clientId
      ? await prisma.user.findUnique({ where: { id: saleOrder.orderClient.clientId }, select: { name: true, phone: true } })
      : null;

    const items = saleOrder.saleProducts.map((sp) => {
      const precio = sp.product?.pricePerUnit || 0;
      return {
        desc: sp.product?.name || "",
        precio,
        cant: sp.quantity,
        total: parseFloat((precio * sp.quantity).toFixed(2)),
      };
    });

    const allItems = [...items, ...extras];
    const computedTotal = allItems.reduce((sum, it) => sum + (Number.isFinite(it.total) ? it.total : it.precio * it.cant), 0);

    const reciboVenta = {
      empresa: {
        nombre: "MuyTuna - Gomitas Saludables",
        tipo: "Tienda 100% Online",
        direccion: "Casa Matriz: La Paz, Bolivia",
        web: "www.muytuna.shop",
        whatsapp: "76966841",
      },
      documento: {
        titulo: "RECIBO DE VENTA",
        numero: `PED-${saleOrder.orderClientId}`,
        fecha: saleOrder.orderClient?.createdAt ? new Date(saleOrder.orderClient.createdAt).toLocaleDateString("es-BO") : "",
      },
      cliente: {
        nombre: client?.name || "",
        celular: client?.phone || "",
        direccionEntrega: deliveryAddress,
      },
      items: allItems,
      total: parseFloat((computedTotal || saleOrder.totalCostOrder || 0).toFixed(2)),
      qrLink: `https://muytuna.shop/orders/${saleOrder.orderClientId}`,
      mensajePie:
        "¡Gracias por tu compra! Este documento es un comprobante de entrega, no válido para crédito fiscal.",
    };

    if (backendUrl) {
      const res = await fetch(backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reciboVenta),
      });
      if (!res.ok) {
        return NextResponse.json(
          { error: `Fallo al enviar recibo: ${res.status}`, reciboVenta },
          { status: 502 }
        );
      }
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({ success: true, forwarded: true, reciboVenta, externalResponse: data });
    }

    return NextResponse.json({ success: true, forwarded: false, reciboVenta });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
