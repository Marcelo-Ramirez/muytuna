import { PrismaClient } from '@prisma/client';
import { random, orderStatuses } from './helpers';

export interface OrdersSeederResult {
  orderClients: any[];
  saleOrderCount: number;
}

export async function seedOrders(
  prisma: PrismaClient,
  clients: any[],
  products: any[],
  salesStaff: any[]
): Promise<OrdersSeederResult> {
  console.log('📋 Creando órdenes de clientes realistas...');
  const orderClients = [];
  
  // Crear 300-400 órdenes a lo largo de 18 meses (540 días) para pronósticos
  const numOrders = random(300, 400);
  const maxDaysHistory = 540; // 18 meses de historia
  
  for (let i = 0; i < numOrders; i++) {
    const client = clients[random(0, clients.length - 1)];
    
    // Cada orden puede tener 1-6 productos diferentes
    const numProductsInOrder = random(1, 6);
    const selectedProducts = [];
    
    // Seleccionar productos únicos para esta orden
    const availableProducts = [...products];
    for (let j = 0; j < numProductsInOrder; j++) {
      if (availableProducts.length === 0) break;
      const index = random(0, availableProducts.length - 1);
      selectedProducts.push(availableProducts[index]);
      availableProducts.splice(index, 1); // Evitar duplicados
    }
    
    // Estado de la orden (80% completadas para tener datos de ventas)
    const statusWeighted = random(1, 10);
    let status: string;
    if (statusWeighted <= 8) status = 'completado'; // 80%
    else if (statusWeighted <= 9) status = 'en_proceso'; // 10%
    else status = 'pendiente'; // 10%
    
    // Fecha distribuida con patrón estacional (más ventas en ciertas épocas)
    let daysAgo = random(1, maxDaysHistory);
    
    // Simular estacionalidad: más órdenes en nov-dic, jun-jul (fiestas/vacaciones)
    const month = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).getMonth();
    const isHighSeason = month === 11 || month === 0 || month === 5 || month === 6; // Dic, Ene, Jun, Jul
    
    // En temporada alta, sesgar hacia fechas más recientes
    if (isHighSeason && random(1, 10) > 4) {
      daysAgo = random(1, maxDaysHistory / 3); // Más concentrado
    }
    
    const orderDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    
    // Crear OrderClient para cada producto en esta orden
    for (const product of selectedProducts) {
      const orderClient = await prisma.orderClient.create({
        data: {
          clientId: client.id,
          productId: product.id,
          quantity: random(2, 25), // Cantidades más realistas
          status,
          createdAt: orderDate,
        },
      });
      orderClients.push(orderClient);
    }
  }
  
  console.log(`✅ ${orderClients.length} items en ${numOrders} órdenes de clientes`);

  // Crear Órdenes de Venta (solo para completadas)
  console.log('💰 Creando órdenes de venta...');
  let saleOrderCount = 0;
  
  // Agrupar OrderClients por cliente y fecha (misma orden)
  const orderGroups = new Map<string, any[]>();
  
  for (const orderClient of orderClients) {
    if (orderClient.status !== 'completado') continue;
    
    // Clave: clientId + fecha (día)
    const dateKey = new Date(orderClient.createdAt).toDateString();
    const key = `${orderClient.clientId}-${dateKey}`;
    
    if (!orderGroups.has(key)) {
      orderGroups.set(key, []);
    }
    orderGroups.get(key)!.push(orderClient);
  }
  
  // Crear SaleOrder para cada grupo (una venta por orden completa)
  for (const [key, orderGroup] of orderGroups.entries()) {
    const employee = salesStaff[random(0, salesStaff.length - 1)];
    
    // Calcular costo total de todos los productos
    let totalCost = 0;
    for (const orderClient of orderGroup) {
      const product = products.find(p => p.id === orderClient.productId);
      if (product) {
        totalCost += product.pricePerUnit * orderClient.quantity;
      }
    }
    
    // Usar el primer orderClient como referencia para la venta
    const firstOrderClient = orderGroup[0];
    
    // Crear SaleOrder (1-3 días después de la orden)
    const saleOrder = await prisma.saleOrder.create({
      data: {
        userId: employee.id,
        orderClientId: firstOrderClient.id,
        totalCostOrder: totalCost,
        createdAt: new Date(firstOrderClient.createdAt.getTime() + random(1, 3) * 24 * 60 * 60 * 1000),
      },
    });
    saleOrderCount++;
    
    // Crear SaleProduct para cada producto en la orden
    for (const orderClient of orderGroup) {
      await prisma.saleProduct.create({
        data: {
          userId: employee.id,
          productId: orderClient.productId,
          quantity: orderClient.quantity,
          saleOrderId: saleOrder.id,
          createdAt: saleOrder.createdAt,
        },
      });
    }
  }
  
  console.log(`✅ ${saleOrderCount} ventas procesadas con múltiples productos`);

  return { orderClients, saleOrderCount };
}
