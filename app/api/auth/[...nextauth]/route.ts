// pages/api/auth/[...nextauth].ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { NextRequest } from 'next/server';

// Wrapper para configurar NEXTAUTH_URL dinámicamente basado en el request
async function auth(req: NextRequest, ctx: any) {
  // Detectar el origen del request
  const protocol = req.headers.get('x-forwarded-proto') || 'http';
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  
  // Si NEXTAUTH_URL no está configurado o es localhost, usar el host del request
  if (host && (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.includes('localhost'))) {
    process.env.NEXTAUTH_URL = `${protocol}://${host}`;
  }
  
  return NextAuth(req as any, ctx, authOptions as any);
}

export { auth as GET, auth as POST };