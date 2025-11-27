import { PrismaClient } from '@prisma/client';
import { random } from './helpers';

export interface OrdersSeederResult {
  orders: any[];
  orderItemsCount: number;
}

// Generar número de orden único
function generateOrderNumber(index: number): string {
  const prefix = 'GG';
  const timestamp = (Date.now() - index * 1000).toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `#${prefix}${timestamp}${randomPart}`;
}

// Teléfonos de ejemplo
const samplePhones = [
  '+591 72345678', '+591 76543210', '+591 78901234', 
  '+591 71234567', '+591 73456789', '+591 79876543'
];

// Direcciones de ejemplo
const sampleAddresses = [
  'Av. América #123, Cochabamba',
  'Calle Jordán esq. Heroinas, Centro',
  'Av. Blanco Galindo Km 5, Quillacollo',
  'Zona Norte, Calle Innominada #456',
  'Av. Uyuni #789, Zona Sud',
  'Calle Sucre #321, Cercado'
];

export async function seedOrders(
  prisma: PrismaClient,
  clients: any[],
  products: any[],
  salesStaff: any[]
): Promise<OrdersSeederResult> {
  console.log('📋 Creando órdenes (Order + OrderItem)...');
  
  const orders: any[] = [];
  let orderItemsCount = 0;
  
  // Crear 300-400 órdenes a lo largo de 18 meses (540 días) para pronósticos
  const numOrders = random(300, 400);
  const maxDaysHistory = 540; // 18 meses de historia
  
  for (let i = 0; i < numOrders; i++) {
    // Decidir si es venta online (con usuario) o en persona (sin usuario)
    const isOnline = random(1, 10) <= 3; // 30% online, 70% en persona
    const client = isOnline ? clients[random(0, clients.length - 1)] : null;
    
    // Estado de la orden (distribución realista)
    const statusWeighted = random(1, 10);
    let status: string;
    if (statusWeighted <= 7) status = 'completed';  // 70% completadas
    else if (statusWeighted <= 9) status = 'paid';  // 20% pagadas/pendientes de recoger
    else status = 'pending';                         // 10% pendientes de pago
    
    // Canal según tipo de cliente
    const channel = isOnline ? 'ONLINE' : 'IN_PERSON';
    
    // Fecha distribuida con patrón estacional
    let daysAgo = random(1, maxDaysHistory);
    
    // Simular estacionalidad: más órdenes en nov-dic, jun-jul
    const testDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const month = testDate.getMonth();
    const isHighSeason = month === 11 || month === 0 || month === 5 || month === 6;
    
    if (isHighSeason && random(1, 10) > 4) {
      daysAgo = random(1, Math.floor(maxDaysHistory / 3));
    }
    
    const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Seleccionar 1-6 productos únicos para esta orden
    const numProductsInOrder = random(1, 6);
    const selectedProducts: { product: any; quantity: number }[] = [];
    const availableProducts = [...products];
    
    for (let j = 0; j < numProductsInOrder && availableProducts.length > 0; j++) {
      const index = random(0, availableProducts.length - 1);
      const product = availableProducts[index];
      const quantity = random(1, 12);
      selectedProducts.push({ product, quantity });
      availableProducts.splice(index, 1);
    }
    
    // Calcular subtotal
    let subtotal = 0;
    const itemsData: { productId: number; quantity: number; unitPrice: number; subtotal: number }[] = [];
    
    for (const { product, quantity } of selectedProducts) {
      const unitPrice = product.pricePerUnit;
      const itemSubtotal = Math.round(unitPrice * quantity * 100) / 100;
      subtotal += itemSubtotal;
      itemsData.push({
        productId: product.id,
        quantity,
        unitPrice,
        subtotal: itemSubtotal,
      });
    }
    
    subtotal = Math.round(subtotal * 100) / 100;
    
    // Calcular costos adicionales (solo para pedidos online)
    const shippingCost = isOnline ? 3.00 : 0;
    const taxRate = 0.08;
    const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
    const totalAmount = Math.round((subtotal + shippingCost + taxAmount) * 100) / 100;
    
    // Datos de contacto (solo para órdenes online o completadas)
    const contactPhone = isOnline ? samplePhones[random(0, samplePhones.length - 1)] : null;
    const shippingAddress = isOnline ? sampleAddresses[random(0, sampleAddresses.length - 1)] : null;
    
    // Método de pago
    const paymentMethods = ['QR', 'CASH', 'TRANSFER'];
    const paymentMethod = status !== 'pending' ? paymentMethods[random(0, 2)] : null;
    
    // Fecha de pago (solo si está pagado o completado)
    const paidAt = status !== 'pending' ? new Date(orderDate.getTime() + random(1, 60) * 60 * 1000) : null;
    
    // Crear Order con sus OrderItems
    const order = await prisma.order.create({
      data: {
        userId: client?.id ?? null,
        channel,
        status,
        orderNumber: generateOrderNumber(i),
        contactPhone,
        shippingAddress,
        paymentMethod,
        subtotal,
        shippingCost,
        taxAmount,
        totalAmount,
        paidAt,
        createdAt: orderDate,
        updatedAt: orderDate,
        items: {
          create: itemsData.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            createdAt: orderDate,
          })),
        },
      },
      include: {
        items: true,
      },
    });
    
    orders.push(order);
    orderItemsCount += order.items.length;
  }
  
  // Estadísticas
  const onlineOrders = orders.filter(o => o.channel === 'ONLINE').length;
  const inPersonOrders = orders.filter(o => o.channel === 'IN_PERSON').length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const paidOrders = orders.filter(o => o.status === 'paid').length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  
  console.log(`✅ ${orders.length} órdenes creadas con ${orderItemsCount} items`);
  console.log(`   📱 Online: ${onlineOrders} | 🏪 En persona: ${inPersonOrders}`);
  console.log(`   ✔️ Completadas: ${completedOrders} | 💳 Pagadas: ${paidOrders} | ⏳ Pendientes: ${pendingOrders}`);

  return { orders, orderItemsCount };
}
