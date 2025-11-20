import { DefaultSession, DefaultUser } from "next-auth";
import { JWT as NextAuthJWT } from "next-auth/jwt";

interface CustomUser {
  id: string; 
  userName: string; // CORREGIDO A 'userName' para consistencia con DB y el error TS2551
  role: string;
  twoFactorEnabled: boolean;
  requires2FA: boolean; 
  userNameGenerated: boolean;
}

declare module "next-auth" {
  interface Session {
    user: CustomUser & DefaultSession["user"] & {
      createdAt: string; 
    };
  }

  interface User extends DefaultUser, CustomUser {
    createdAt: Date | string; 
  }
}

declare module "next-auth/jwt" {
  interface JWT extends NextAuthJWT, CustomUser {
    createdAt: string;
  }
}