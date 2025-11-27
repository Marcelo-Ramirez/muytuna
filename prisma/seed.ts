import { PrismaClient } from '@prisma/client';
import { seedUsers } from './seeders/users.seeder';
import { seedIngredients } from './seeders/ingredients.seeder';
import { seedProducts } from './seeders/products.seeder';
import { seedOrders } from './seeders/orders.seeder';
import { seedProductMovements } from './seeders/movements.seeder';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // Limpiar base de datos (orden importante por FKs)
  console.log('🧹 Limpiando base de datos...');
  await prisma.productMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.ingredientEOQModel.deleteMany();
  await prisma.productBatch.deleteMany();
  await prisma.product.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users
  const { users, admins, salesUsers, stockUsers, clients, inventoryStaff, salesStaff } = 
    await seedUsers(prisma);

  // 2. Seed Ingredients (requiere inventoryStaff)
  const { ingredients } = await seedIngredients(prisma, inventoryStaff);

  // 3. Seed Products
  const { products } = await seedProducts(prisma);

  // 4. Seed Orders (Order + OrderItem) - requiere clients, products, salesStaff
  const { orders, orderItemsCount } = await seedOrders(prisma, clients, products, salesStaff);

  // 5. Seed Product Movements (requiere products, inventoryStaff)
  await seedProductMovements(prisma, products, inventoryStaff);

  console.log('');
  console.log('🎉 ¡Seed completado exitosamente!');
  console.log('═══════════════════════════════════════');
  console.log('📊 RESUMEN DE DATOS');
  console.log('---------------------------------------');
  console.log(`👥 Usuarios: ${users.length}`);
  console.log(`🧪 Ingredientes: ${ingredients.length}`);
  console.log(`🍰 Productos: ${products.length}`);
  console.log(`📦 Órdenes: ${orders.length} (${orderItemsCount} items)`);
  console.log('');
  console.log('🔑 CREDENCIALES DE ACCESO (Password: 123123)');
  console.log('---------------------------------------');
  console.log('👑 ADMINS:   admin1, admin2');
  console.log('💼 VENTAS:   ventas1, ventas2, ventas3');
  console.log('📦 ALMACÉN:  almacen1, almacen2');
  console.log('👤 CLIENTES: cliente1 ... cliente10');
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