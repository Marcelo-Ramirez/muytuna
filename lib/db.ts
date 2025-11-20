import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Tipo para el usuario (basado en el modelo Prisma)
export interface User {
  id: number;
  userName: string;
  name: string;
  phone?: string | null;
  role: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;
  userNameGenerated: boolean;
  createdAt: Date;
}

// Instancia global de Prisma Client
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Función para crear un nuevo usuario
export async function createUser(
  userName: string, 
  name: string, 
  password: string, 
  phone?: string, 
  role: string = 'cliente',
  userNameGenerated: boolean = false
): Promise<User | null> {
  try {
    const existingUser = await prisma.user.findUnique({ where: { userName } });
    if (existingUser) throw new Error("El usuario ya existe");

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await prisma.user.create({
      data: { 
        userName, 
        name, 
        password: hashedPassword, 
        phone, 
        role,
        userNameGenerated 
      },
      select: {
        id: true,
        userName: true,
        name: true,
        phone: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        userNameGenerated: true,
        createdAt: true,
      },
    });

    return newUser;
  } catch (error) {
    console.error("Error creando usuario:", error);
    throw error;
  }
}

// Función para verificar las credenciales del usuario
export async function verifyUser(userName: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { userName },
      select: {
        id: true,
        userName: true,
        name: true,
        phone: true,
        role: true,
        password: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        userNameGenerated: true,
        createdAt: true,
      },
    });

    if (!user) return null;
    if (!user.password) return null;

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return null;

    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  } catch (error) {
    console.error("Error verificando usuario:", error);
    return null;
  }
}

// Función para obtener un usuario por ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        userName: true,
        name: true,
        phone: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        userNameGenerated: true,
        createdAt: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Error obteniendo usuario por ID:", error);
    return null;
  }
}

// Función para obtener un usuario por userName
export async function getUserByUserName(userName: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { userName },
      select: {
        id: true,
        userName: true,
        name: true,
        phone: true,
        role: true,
        twoFactorEnabled: true,
        twoFactorSecret: true,
        userNameGenerated: true,
        createdAt: true,
      },
    });
    return user;
  } catch (error) {
    console.error("Error obteniendo usuario por userName:", error);
    return null;
  }
}