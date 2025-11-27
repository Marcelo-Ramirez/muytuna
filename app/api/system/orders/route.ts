import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";

// GET: Listar órdenes con filtros
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Filtros opcionales
    const status = searchParams.get("status"); // pending | paid | completed
    const channel = searchParams.get("channel"); // IN_PERSON | ONLINE
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Construir where clause
    const where: any = {};
    
    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (userId) where.userId = parseInt(userId);
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Obtener órdenes con items y usuario
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, flavor: true, type: true, imageUrl: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + orders.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al obtener órdenes" },
      { status: 500 }
    );
  }
}

// POST: Crear nueva orden
export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    const body = await req.json();

    const {
      userId,      // opcional: null para ventas en persona
      channel,     // "IN_PERSON" | "ONLINE"
      items,       // [{ productId, quantity }]
    } = body;

    // Validar items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un producto" },
        { status: 400 }
      );
    }

    // Validar channel
    const validChannels = ["IN_PERSON", "ONLINE"];
    const orderChannel = channel || "IN_PERSON";
    if (!validChannels.includes(orderChannel)) {
      return NextResponse.json(
        { error: "Canal inválido. Use IN_PERSON u ONLINE" },
        { status: 400 }
      );
    }

    // Si es ONLINE, debe tener userId
    if (orderChannel === "ONLINE" && !userId) {
      return NextResponse.json(
        { error: "Las órdenes online requieren un usuario" },
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
    let totalAmount = 0;
    const orderItems = items.map((item: any) => {
      const product = products.find((p) => p.id === item.productId)!;
      const quantity = Number(item.quantity);
      const unitPrice = product.pricePerUnit;
      const subtotal = Math.round(unitPrice * quantity * 100) / 100;
      totalAmount += subtotal;

      return {
        productId: product.id,
        quantity,
        unitPrice,
        subtotal,
      };
    });

    totalAmount = Math.round(totalAmount * 100) / 100;

    // Crear orden con items en transacción
    const order = await prisma.$transaction(async (tx) => {
      // Crear orden
      const newOrder = await tx.order.create({
        data: {
          userId: userId ? parseInt(userId) : null,
          channel: orderChannel,
          status: "pending",
          totalAmount,
          items: {
            create: orderItems,
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

      return newOrder;
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Error al crear orden" },
      { status: 500 }
    );
  }
}
