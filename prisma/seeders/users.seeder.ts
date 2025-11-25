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

export async function seedUsers(prisma: PrismaClient): Promise<UserSeederResult> {
  console.log('👥 Creando usuarios...');
  const users = [];
  
  for (let i = 0; i < 20; i++) {
    const name = `${names[random(0, names.length - 1)]} ${lastNames[random(0, lastNames.length - 1)]}`;
    const userName = `user${i + 1}`;
    const hashedPassword = await bcrypt.hash('prueba123', 10);
    
    let role = 'client';
    if (i < 2) role = 'admin';
    else if (i < 4) role = 'sales';
    else if (i < 6) role = 'stockroom';

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
  console.log(`✅ ${users.length} usuarios creados`);

  const admins = users.filter(u => u.role === 'admin');
  const salesUsers = users.filter(u => u.role === 'sales');
  const stockUsers = users.filter(u => u.role === 'stockroom');
  const clients = users.filter(u => u.role === 'client');

  const inventoryStaff = [...admins, ...stockUsers];
  const salesStaff = [...admins, ...salesUsers];

  return { users, admins, salesUsers, stockUsers, clients, inventoryStaff, salesStaff };
}
