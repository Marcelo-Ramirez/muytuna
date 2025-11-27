import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { random, names, lastNames } from './helpers';

export interface UserSeederResult {
  users: any[];
  admins: any[];
  salesUsers: any[];
  stockUsers: any[];
  clients: any[];
  inventoryStaff: any[];
  salesStaff: any[];
}

// Configuración de usuarios por rol
const userConfig = {
  admin: { count: 2, prefix: 'admin', displayPrefix: 'Administrador' },
  sales: { count: 3, prefix: 'ventas', displayPrefix: 'Vendedor' },
  stockroom: { count: 2, prefix: 'almacen', displayPrefix: 'Almacenero' },
  client: { count: 10, prefix: 'cliente', displayPrefix: 'Cliente' },
};

export async function seedUsers(prisma: PrismaClient): Promise<UserSeederResult> {
  console.log('👥 Creando usuarios...');
  const users: any[] = [];
  
  // Hashear contraseña común: 123123
  const hashedPassword = await bcrypt.hash('123123', 10);
  
  // Crear usuarios por cada rol
  for (const [role, config] of Object.entries(userConfig)) {
    for (let i = 1; i <= config.count; i++) {
      const userName = `${config.prefix}${i}`;
      const name = `${config.displayPrefix} ${i}`;
      
      const user = await prisma.user.create({
        data: {
          userName,
          name,
          phone: `+591 ${random(60000000, 79999999)}`,
          password: hashedPassword,
          role: role,
          twoFactorEnabled: false,
          statusAccount: 'active',
        },
      });
      users.push(user);
    }
  }
  
  console.log(`✅ ${users.length} usuarios creados`);

  const admins = users.filter(u => u.role === 'admin');
  const salesUsers = users.filter(u => u.role === 'sales');
  const stockUsers = users.filter(u => u.role === 'stockroom');
  const clients = users.filter(u => u.role === 'client');

  const inventoryStaff = [...admins, ...stockUsers];
  const salesStaff = [...admins, ...salesUsers];

  return { users, admins, salesUsers, stockUsers, clients, inventoryStaff, salesStaff };
}
