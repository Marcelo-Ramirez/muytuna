import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { generateSKU, generateEAN13Barcode, generateBatchNumber } from '../lib/barcode/generator';

const prisma = new PrismaClient();

// Función auxiliar para generar números aleatorios
const random = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

// Datos de ejemplo para Nombres
const names = ['Juan', 'María', 'Carlos', 'Ana', 'Pedro', 'Lucía', 'Diego', 'Sofia', 'Miguel', 'Laura'];
const lastNames = ['García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez'];

// Datos Reales de Ingredientes
const ingredientsData = [
  { name: 'Azúcar', unit: 'kg', pricePerUnit: 1.85, provider: 'Dulce Sol S.A.', currentQuantity: 150.0 },
  { name: 'Mantequilla sin sal', unit: 'kg', pricePerUnit: 7.50, provider: 'Lácteos El Campo', currentQuantity: 25.0 },
  { name: 'Huevos', unit: 'docena', pricePerUnit: 2.30, provider: 'Granja Avícola', currentQuantity: 60.0 },
  { name: 'Polvo de hornear', unit: 'kg', pricePerUnit: 5.90, provider: 'Repostería Superior', currentQuantity: 10.0 },
  { name: 'Sal', unit: 'kg', pricePerUnit: 0.80, provider: 'Salinera La Costa', currentQuantity: 200.0 },
  { name: 'Cacao en polvo', unit: 'kg', pricePerUnit: 9.20, provider: 'Chocolates Puros', currentQuantity: 15.0 },
  { name: 'Levadura fresca', unit: 'kg', pricePerUnit: 4.00, provider: 'Levaduras El Panadero', currentQuantity: 5.0 },
  { name: 'Grenetina hidrolizada', unit: 'kg', pricePerUnit: 12.50, provider: 'Gelatinas Premium', currentQuantity: 50.0 },
  { name: 'Jarabe de agave orgánico', unit: 'litro', pricePerUnit: 8.20, provider: 'Agaves Del Sol', currentQuantity: 30.0 },
  { name: 'Ácido cítrico en polvo', unit: 'kg', pricePerUnit: 6.75, provider: 'Químicos Naturales', currentQuantity: 15.0 },
  { name: 'Saborizante de fresa', unit: 'litro', pricePerUnit: 15.00, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Saborizante de limón', unit: 'litro', pricePerUnit: 14.50, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Saborizante de mango', unit: 'litro', pricePerUnit: 16.00, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Saborizante de mora', unit: 'litro', pricePerUnit: 16.50, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Saborizante de zanahoria', unit: 'litro', pricePerUnit: 13.00, provider: 'Extractos Frutales S.A.', currentQuantity: 5.0 },
  { name: 'Pulpa de betabel', unit: 'kg', pricePerUnit: 4.50, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de tuna', unit: 'kg', pricePerUnit: 5.20, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de durazno', unit: 'kg', pricePerUnit: 5.80, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de maracuyá', unit: 'kg', pricePerUnit: 6.20, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de coco', unit: 'kg', pricePerUnit: 6.50, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
  { name: 'Pulpa de tamarindo', unit: 'kg', pricePerUnit: 5.40, provider: 'Cosechas Frescas', currentQuantity: 25.0 },
];

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
  await prisma.productBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.user.deleteMany();

  // 1. Crear Usuarios (Roles distribuidos por pares)
  console.log('👥 Creando usuarios...');
  const users = [];
  
  // user1, user2 -> Admin
  // user3, user4 -> Sales
  // user5, user6 -> Stockroom
  // user7...user20 -> Client
  for (let i = 0; i < 20; i++) {
    const name = `${names[random(0, names.length - 1)]} ${lastNames[random(0, lastNames.length - 1)]}`;
    const userName = `user${i + 1}`;
    const hashedPassword = await bcrypt.hash('prueba123', 10);
    
    let role = 'client'; // Por defecto
    
    if (i < 2) role = 'admin';          // 0, 1
    else if (i < 4) role = 'sales';     // 2, 3
    else if (i < 6) role = 'stockroom'; // 4, 5
    // 6 en adelante son clients

    const user = await prisma.user.create({
      data: {
        userName,
        name,
        phone: `+591 ${random(60000000, 79999999)}`,
        password: hashedPassword,
        role: role,
        twoFactorEnabled: random(0, 10) > 7,
        statusAccount: 'active',
      },
    });
    users.push(user);
  }
  console.log(`✅ ${users.length} usuarios creados`);

  // Filtramos usuarios por rol para usarlos luego
  const admins = users.filter(u => u.role === 'admin');
  const salesUsers = users.filter(u => u.role === 'sales');
  const stockUsers = users.filter(u => u.role === 'stockroom');
  const clients = users.filter(u => u.role === 'client');

  // Combinamos staff autorizado para movimientos de inventario (Admin + Stockroom)
  const inventoryStaff = [...admins, ...stockUsers];
  // Combinamos staff autorizado para ventas (Admin + Sales)
  const salesStaff = [...admins, ...salesUsers];

  // 2. Crear Ingredientes
  console.log('🥚 Creando ingredientes...');
  const ingredients = [];
  for (const ingData of ingredientsData) {
    const ingredient = await prisma.ingredient.create({
      data: {
        name: ingData.name,
        unit: ingData.unit,
        pricePerUnit: ingData.pricePerUnit,
        provider: ingData.provider,
        currentQuantity: ingData.currentQuantity,
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

  // 4. Crear Movimientos de Inventario (Realizados por Stockroom o Admin)
  console.log('📦 Creando movimientos de inventario...');
  for (let i = 0; i < 50; i++) {
    const ingredient = ingredients[random(0, ingredients.length - 1)];
    // Seleccionar aleatoriamente un usuario autorizado (Admin o Stockroom)
    const user = inventoryStaff[random(0, inventoryStaff.length - 1)]; 
    const movementType = movementTypes[random(0, movementTypes.length - 1)];
    const quantity = random(5, 100);

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

  // 5. Crear Productos
  console.log('🍭 Creando productos...');
  const products = [];

  const gomitas = [
    'gomita de tuna', 'gomita de manzana', 'gomita de manzanilla', 'gomita de zanahoria',
    'gomita de frutilla', 'gomita de beterraga', 'gomita de limon', 'gomita de mandarina',
  ];

  const pulpas = [
    'pulpa de tuna', 'pulpa de manzana', 'pulpa de manzanilla', 'pulpa de zanahoria',
    'pulpa de frutilla', 'pulpa de beterraga', 'pulpa de limon', 'pulpa de mandarina',
  ];

  // Crear gomitas
  for (const name of gomitas) {
    const key = name.split(' ').slice(-1)[0]; 
    const flavor = key.charAt(0).toUpperCase() + key.slice(1); 
    
    // Ruta Específica: /images/products/gomita/g-[flavor].png
    const imageFile = `g-${key.toLowerCase()}.png`;
    const imageUrl = `/images/products/gomita/${imageFile}`;
    const qty = random(10, 100);

    const product = await prisma.product.create({
      data: {
        name: `Gomita de ${flavor}`,
        flavor: flavor,
        type: 'Gomita',
        imageUrl,
        pricePerUnit: random(1, 3),
        currentQuantity: qty,
        sku: '', 
        barcode: '', 
        barcodeFormat: 'EAN13',
      },
    });
    
    const sku = generateSKU('Gomita', flavor, product.id);
    const barcode = generateEAN13Barcode(product.id);
    
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { sku, barcode },
    });
    
    // Lote inicial
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

  // Crear pulpas
  for (const name of pulpas) {
    const key = name.split(' ').slice(-1)[0];
    const flavor = key.charAt(0).toUpperCase() + key.slice(1);
    
    // Ruta Específica: /images/products/pulpa/p-[flavor].png
    const imageFile = `p-${key.toLowerCase()}.png`;
    const imageUrl = `/images/products/pulpa/${imageFile}`;
    const qty = random(5, 50);

    const product = await prisma.product.create({
      data: {
        name: `Pulpa de ${flavor}`,
        flavor: flavor,
        type: 'Pulpa',
        imageUrl,
        pricePerUnit: random(5, 10),
        currentQuantity: qty,
        sku: '',
        barcode: '',
        barcodeFormat: 'EAN13',
      },
    });
    
    const sku = generateSKU('Pulpa', flavor, product.id);
    const barcode = generateEAN13Barcode(product.id);
    
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { sku, barcode },
    });
    
    // Lote inicial
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

  console.log(`✅ ${products.length} productos creados`);

  // 6. Crear Órdenes de Clientes (Solo Clients hacen pedidos)
  console.log('📋 Creando órdenes de clientes...');
  const orderClients = [];
  for (let i = 0; i < 40; i++) {
    // Seleccionar aleatoriamente un CLIENTE
    const client = clients[random(0, clients.length - 1)];
    const product = products[random(0, products.length - 1)];
    
    const orderClient = await prisma.orderClient.create({
      data: {
        clientId: client.id,
        productId: product.id,
        quantity: random(1, 10),
        status: orderStatuses[random(0, orderStatuses.length - 1)],
        createdAt: new Date(Date.now() - random(0, 60) * 24 * 60 * 60 * 1000),
      },
    });
    orderClients.push(orderClient);
  }
  console.log(`✅ ${orderClients.length} órdenes de clientes creadas`);

  // 7. Crear Órdenes de Venta (Procesadas por Sales o Admin)
  console.log('💰 Creando órdenes de venta...');
  let saleOrderCount = 0;
  
  for (const orderClient of orderClients) {
    // Solo crear SaleOrder para órdenes completadas (simulamos 30% de probabilidad)
    if (orderClient.status === 'completado' && random(0, 10) > 3) {
      // Quien procesa la venta: Sales o Admin
      const employee = salesStaff[random(0, salesStaff.length - 1)];
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

        await prisma.saleProduct.create({
          data: {
            userId: employee.id,
            productId: product.id,
            quantity: orderClient.quantity,
            saleOrderId: saleOrder.id,
            createdAt: saleOrder.createdAt,
          },
        });
      }
    }
  }
  console.log(`✅ ${saleOrderCount} ventas registradas por personal autorizado`);

  // 8. Crear Movimientos de Productos (Salidas/Entradas por Stockroom o Admin)
  console.log('📊 Creando movimientos de productos...');
  for (let i = 0; i < 60; i++) {
    const product = products[random(0, products.length - 1)];
    const user = inventoryStaff[random(0, inventoryStaff.length - 1)];
    const movementType = movementTypes[random(0, movementTypes.length - 1)];
    const quantity = random(1, 20);

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
  console.log('🔑 CREDENCIALES DE ACCESO (Password: prueba123)');
  console.log('---------------------------------------');
  console.log('👑 ADMINS (Todo):');
  console.log('   - user1');
  console.log('   - user2');
  console.log('💼 VENTAS (Sales):');
  console.log('   - user3');
  console.log('   - user4');
  console.log('📦 ALMACÉN (Stockroom):');
  console.log('   - user5');
  console.log('   - user6');
  console.log('👤 CLIENTES (Pedidos):');
  console.log('   - user7 ... user20');
  console.log('═══════════════════════════════════════');
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