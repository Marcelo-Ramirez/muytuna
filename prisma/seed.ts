import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSKU, generateEAN13Barcode, generateBatchNumber } from '../lib/barcode/generator';

const prisma = new PrismaClient();

// Función auxiliar para generar números aleatorios
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

// Datos de ejemplo
const names = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Lucía', 'Diego', 'Sofia', 'Miguel', 'Laura'];
const lastNames = ['García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez'];
const ingredientNames = ['Harina', 'Azúcar', 'Huevos', 'Mantequilla', 'Leche', 'Chocolate', 'Vainilla', 'Canela', 'Sal', 'Levadura', 'Crema', 'Frutas', 'Nueces', 'Almendras', 'Coco'];
const units = ['kg', 'litros', 'unidades', 'gramos'];
const providers = ['Proveedor A', 'Proveedor B', 'Proveedor C', 'Distribuidora XYZ', 'Alimentos del Sur'];
const productTypes = ['Torta', 'Pastel', 'Cupcake', 'Galleta', 'Pan', 'Brownie'];
const flavors = ['Chocolate', 'Vainilla', 'Fresa', 'Limón', 'Naranja', 'Café', 'Red Velvet', 'Zanahoria', 'Coco', 'Frambuesa'];
const movementTypes = ['entrada', 'salida', 'ajuste'];
const reasons = ['Compra', 'Venta', 'Merma', 'Ajuste de inventario', 'Devolución', 'Producción'];
const orderStatuses = ['pendiente', 'en_proceso', 'completado', 'cancelado'];

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar base de datos
  console.log('🧹 Limpiando base de datos...');
  await prisma.productMovement.deleteMany();
  await prisma.saleProduct.deleteMany();
  await prisma.saleOrder.deleteMany();
  await prisma.orderClient.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.ingredientEOQModel.deleteMany();
  await prisma.productBatch.deleteMany(); // Added to clean batches
  await prisma.product.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.user.deleteMany();

  // 1. Crear Usuarios (20 usuarios)
  console.log('👥 Creando usuarios...');
  const users = [];
  for (let i = 0; i < 20; i++) {
    const name = `${names[random(0, names.length - 1)]} ${lastNames[random(0, lastNames.length - 1)]}`;
    const userName = `user${i + 1}`;
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        userName,
        name,
        phone: `+591 ${random(60000000, 79999999)}`,
        password: hashedPassword,
        role: i === 0 ? 'admin' : i < 5 ? 'empleado' : 'cliente',
        twoFactorEnabled: random(0, 10) > 7,
        statusAccount: random(0, 10) > 8 ? 'inactive' : 'active',
      },
    });
    users.push(user);
  }
  console.log(`✅ ${users.length} usuarios creados`);

  // 2. Crear Ingredientes (15 ingredientes)
  console.log('🥚 Creando ingredientes...');
  const ingredients = [];
  for (let i = 0; i < ingredientNames.length; i++) {
    const ingredient = await prisma.ingredient.create({
      data: {
        name: ingredientNames[i],
        unit: units[random(0, units.length - 1)],
        pricePerUnit: randomFloat(5, 100),
        provider: providers[random(0, providers.length - 1)],
        currentQuantity: random(10, 500), // Ahora es entero
      },
    });
    ingredients.push(ingredient);
  }
  console.log(`✅ ${ingredients.length} ingredientes creados`);

  // 3. Crear modelos EOQ para ingredientes
  console.log('📊 Creando modelos EOQ...');
  for (const ingredient of ingredients) {
    const dailyDemand = randomFloat(5, 50);
    const annualDemand = dailyDemand * 365;
    const leadTimeDays = randomFloat(2, 10);
    
    await prisma.ingredientEOQModel.create({
      data: {
        idIngredient: ingredient.id,
        orderingCost: randomFloat(50, 200),
        annualMaintenanceCost: randomFloat(100, 500),
        leadTimeDays,
        dailyDemand,
        annualDemand,
        reorderPoint: dailyDemand * leadTimeDays,
      },
    });
  }
  console.log(`✅ Modelos EOQ creados`);

  // 4. Crear Movimientos de Inventario (50 movimientos)
  console.log('📦 Creando movimientos de inventario...');
  for (let i = 0; i < 50; i++) {
    const ingredient = ingredients[random(0, ingredients.length - 1)];
    const user = users[random(0, 4)]; // Solo empleados y admin
    const movementType = movementTypes[random(0, movementTypes.length - 1)];
    const quantity = random(5, 100); // Ahora es entero

    await prisma.inventoryMovement.create({
      data: {
        userId: user.id,
        ingredientId: ingredient.id,
        movementType,
        reason: reasons[random(0, reasons.length - 1)],
        quantity,
        createdAt: new Date(Date.now() - random(0, 90) * 24 * 60 * 60 * 1000), // Últimos 90 días
      },
    });
  }
  console.log(`✅ 50 movimientos de inventario creados`);

  // 5. Crear Productos (solo lista solicitada)
  console.log(' Creando los productos solicitados...');
  const products = [];

  // Lista solicitada: 8 gomitas y 8 pulpas
  const gomitas = [
    'gomita de tuna',
    'gomita de manzana',
    'gomita de manzanilla',
    'gomita de zanahoria',
    'gomita de frutilla',
    'gomita de beterraga',
    'gomita de limon',
    'gomita de mandarina',
  ];

  const pulpas = [
    'pulpa de tuna',
    'pulpa de manzana',
    'pulpa de manzanilla',
    'pulpa de zanahoria',
    'pulpa de frutilla',
    'pulpa de beterraga',
    'pulpa de limon',
    'pulpa de mandarina',
  ];

  // Predecible: gimita prices integer 1-3 Bs; pulpa prices 5-10 Bs  // Crear gomitas con códigos de barras
  for (const name of gomitas) {
    const key = name.split(' ').slice(-1)[0];
    // Capitalizar primera letra para match con archivos reales: gomitaTuna.png
    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
    const imageFile = `gomita${capitalizedKey}.png`;
    const imageUrl = `/images/products/${imageFile}`;
    const qty = random(10, 100);

    const product = await prisma.product.create({
      data: {
        name,
        flavor: key,
        type: 'Gomita',
        imageUrl,
        pricePerUnit: random(1, 3),
        currentQuantity: qty,
        sku: '', // Temporal
        barcode: '', // Temporal
        barcodeFormat: 'EAN13',
      },
    });
    
    // Generar códigos basados en ID
    const sku = generateSKU('Gomita', key, product.id);
    const barcode = generateEAN13Barcode(product.id);
    
    // Actualizar con códigos
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { sku, barcode },
    });
    
    // Crear lote inicial
    await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: generateBatchNumber(new Date()),
        quantity: qty,
        remaining: qty,
        productionDate: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    
    products.push({ ...updated, sku, barcode });
  }

  // Crear pulpas con códigos de barras
  for (const name of pulpas) {
    const key = name.split(' ').slice(-1)[0];
    // Capitalizar primera letra para match con archivos reales: pulpaTuna.png
    const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
    const imageFile = `pulpa${capitalizedKey}.png`;
    const imageUrl = `/images/products/${imageFile}`;
    const qty = random(5, 50);

    const product = await prisma.product.create({
      data: {
        name,
        flavor: key,
        type: 'Pulpa',
        imageUrl,
        pricePerUnit: random(5, 10),
        currentQuantity: qty,
        sku: '', // Temporal
        barcode: '', // Temporal
        barcodeFormat: 'EAN13',
      },
    });
    
    // Generar códigos basados en ID
    const sku = generateSKU('Pulpa', key, product.id);
    const barcode = generateEAN13Barcode(product.id);
    
    // Actualizar con códigos
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { sku, barcode },
    });
    
    // Crear lote inicial
    await prisma.productBatch.create({
      data: {
        productId: product.id,
        batchNumber: generateBatchNumber(new Date()),
        quantity: qty,
        remaining: qty,
        productionDate: new Date(),
        expiryDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
    });
    
    products.push({ ...updated, sku, barcode });
  }

  console.log(`✅ ${products.length} productos creados con códigos de barras y lotes iniciales`);
  console.log('📋 Creando órdenes de clientes...');
  const orderClients = [];
  for (let i = 0; i < 40; i++) {
    const client = users[random(5, users.length - 1)]; // Solo clientes
    const product = products[random(0, products.length - 1)];
    
    const orderClient = await prisma.orderClient.create({
      data: {
        clientId: client.id,
        productId: product.id,
        quantity: random(1, 10),
        status: orderStatuses[random(0, orderStatuses.length - 1)],
        createdAt: new Date(Date.now() - random(0, 60) * 24 * 60 * 60 * 1000), // Últimos 60 días
      },
    });
    orderClients.push(orderClient);
  }
  console.log(`✅ ${orderClients.length} órdenes de clientes creadas`);

  // 7. Crear Órdenes de Venta y Productos Vendidos
  console.log('💰 Creando órdenes de venta...');
  let saleOrderCount = 0;
  let saleProductCount = 0;
  
  for (const orderClient of orderClients) {
    // Solo crear SaleOrder para órdenes completadas
    if (orderClient.status === 'completado' && random(0, 10) > 3) {
      const employee = users[random(0, 4)]; // Empleado que procesó la venta
      const product = products.find(p => p.id === orderClient.productId);
      
      if (product) {
        const totalCost = product.pricePerUnit * orderClient.quantity;
        
        const saleOrder = await prisma.saleOrder.create({
          data: {
            userId: employee.id,
            orderClientId: orderClient.id,
            totalCostOrder: totalCost,
            createdAt: new Date(orderClient.createdAt.getTime() + random(1, 24) * 60 * 60 * 1000),
          },
        });
        saleOrderCount++;

        // Crear SaleProducts asociados
        await prisma.saleProduct.create({
          data: {
            userId: employee.id,
            productId: product.id,
            quantity: orderClient.quantity,
            saleOrderId: saleOrder.id,
            createdAt: saleOrder.createdAt,
          },
        });
        saleProductCount++;
      }
    }
  }
  console.log(`✅ ${saleOrderCount} órdenes de venta creadas`);
  console.log(`✅ ${saleProductCount} productos vendidos registrados`);

  // 8. Crear Movimientos de Productos (60 movimientos)
  console.log('📊 Creando movimientos de productos...');
  for (let i = 0; i < 60; i++) {
    const product = products[random(0, products.length - 1)];
    const user = users[random(0, 4)]; // Empleados
    const movementType = movementTypes[random(0, movementTypes.length - 1)];
    const quantity = random(1, 20); // Ahora es entero

    await prisma.productMovement.create({
      data: {
        userId: user.id,
        productId: product.id,
        movementType,
        quantity,
        createdAt: new Date(Date.now() - random(0, 90) * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ 60 movimientos de productos creados`);

  console.log('');
  console.log('🎉 ¡Seed completado exitosamente!');
  console.log('═══════════════════════════════════════');
  console.log(`👥 Usuarios: ${users.length}`);
  console.log(`🥚 Ingredientes: ${ingredients.length}`);
  console.log(`📦 Movimientos de inventario: 50`);
  console.log(`🍰 Productos: ${products.length}`);
  console.log(`📋 Órdenes de clientes: ${orderClients.length}`);
  console.log(`💰 Órdenes de venta: ${saleOrderCount}`);
  console.log(`📊 Productos vendidos: ${saleProductCount}`);
  console.log(`📊 Movimientos de productos: 60`);
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('🔑 Usuario admin: user1 / password123');
  console.log('🔑 Empleados: user2-user5 / password123');
  console.log('🔑 Clientes: user6-user20 / password123');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });