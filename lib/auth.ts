/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma, verifyUser } from '@/lib/db';
import { verify2FA } from '@/lib/twofactor/verify';
import { decrypt } from '@/lib/twofactor/encrypt';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const MAX_USERNAME_LENGTH = 20;

const sanitizeUsernameCandidate = (value: string) => {
  return (
    value
      ?.toLowerCase()
      .normalize('NFD')
      .replaceAll(/[^a-z0-9._-]/g, '')
      .replaceAll(/\.\.+/g, '.')
      .replaceAll(/(\.+$)|(^\.+)/g, '')
      .slice(0, MAX_USERNAME_LENGTH) || 'user'
  );
};

const getPreferredUsernameSource = (name?: string | null, email?: string | null) => {
  if (name?.trim()) {
    return name.trim().replaceAll(/\s+/g, '.');
  }
  if (email) {
    return email.split('@')[0] ?? 'user';
  }
  return 'user';
};

const generateUniqueUsername = async (preferred: string) => {
  const base = sanitizeUsernameCandidate(preferred);

  const existing = await prisma.user.findUnique({
    where: { userName: base } as any,
  });

  if (!existing) {
    return { userName: base, generated: false };
  }

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = crypto.randomInt(0, 9999).toString().padStart(4, '0');
    const candidate = sanitizeUsernameCandidate(`${base}-${suffix}`);
    const taken = await prisma.user.findUnique({
      where: { userName: candidate } as any,
    });
    if (!taken) {
      return { userName: candidate, generated: true };
    }
  }

  const fallback = `user-${Date.now().toString(36)}`;
  return { userName: fallback, generated: true };
};

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma as any),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          prompt: 'select_account',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        userName: { label: 'Nombre de Usuario', type: 'text' },
        password: { label: 'Contraseña', type: 'password' },
        token2FA: { label: 'Token 2FA', type: 'text' },
      },
      async authorize(credentials, _req) {
        if (!credentials?.userName || !credentials?.password) return null;
        try {
          const user = await verifyUser(credentials.userName, credentials.password);
          if (!user) return null;
          if (user.twoFactorEnabled) {
            if (!credentials.token2FA) {
              return {
                id: user.id.toString(),
                name: user.name,
                userName: user.userName,
                role: user.role,
                twoFactorEnabled: user.twoFactorEnabled,
                requires2FA: true,
                userNameGenerated: user.userNameGenerated,
                createdAt: user.createdAt,
              };
            }
            const secret = decrypt(user.twoFactorSecret || '');
            const isValid = verify2FA(credentials.token2FA, secret);
            if (!isValid) return null;
          }
          return {
            id: user.id.toString(),
            name: user.name,
            userName: user.userName,
            role: user.role,
            twoFactorEnabled: user.twoFactorEnabled,
            requires2FA: false,
            userNameGenerated: user.userNameGenerated,
            createdAt: user.createdAt,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  pages: { signIn: '/login' },
  session: { strategy: 'jwt' },
  // Configuración para que funcione con cualquier dominio
  useSecureCookies: process.env.NODE_ENV === 'production',
  callbacks: {
  async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email;
        const providerAccountId = account.providerAccountId;
        if (!email || !providerAccountId) {
          return false;
        }

        const existingByEmail = await prisma.user.findFirst({
          where: { email } as any,
        });

        if (existingByEmail) {
          await prisma.account.upsert({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId,
              },
            },
            update: {
              userId: existingByEmail.id,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
            create: {
              userId: existingByEmail.id,
              type: account.type ?? 'oauth',
              provider: account.provider,
              providerAccountId,
              access_token: account.access_token,
              refresh_token: account.refresh_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            },
          });

          const updateData: Record<string, unknown> = {
            name: user.name ?? existingByEmail.name,
          };
          if (user.image !== undefined) {
            updateData.image = user.image;
          }

          await prisma.user.update({
            where: { id: existingByEmail.id },
            data: updateData as any,
          });

          (user as any).id = existingByEmail.id.toString();
        }
      }
      return true;
    },
  async jwt({ token, user, trigger, session: newSessionData }) {
      if (trigger === 'update' && newSessionData) {
        if (newSessionData?.requires2FA !== undefined) {
          (token as Record<string, unknown>).requires2FA = newSessionData.requires2FA as unknown;
        }
        if (newSessionData?.twoFactorEnabled !== undefined) {
          (token as Record<string, unknown>).twoFactorEnabled = newSessionData.twoFactorEnabled as unknown;
        }
      }
      if (user) {
        const t = token as Record<string, unknown>;
        t.id = user.id as unknown;
        t.name = user.name as unknown;
        t.userName = user.userName as unknown;
        t.role = user.role as unknown;
        t.requires2FA = (user.requires2FA as unknown) || false;
        t.twoFactorEnabled = (user.twoFactorEnabled as unknown) || false;
        t.userNameGenerated = (user.userNameGenerated as unknown) || false;
        t.createdAt = user.createdAt instanceof Date ? user.createdAt.toISOString() : (user.createdAt as unknown);
      }
  return token as any;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const t = token as Record<string, unknown>;
        session.user.id = t.id as any;
        session.user.name = t.name as any;
        session.user.userName = t.userName as any;
        session.user.role = t.role as any;
        session.user.requires2FA = (t.requires2FA as boolean) || false;
        session.user.twoFactorEnabled = (t.twoFactorEnabled as boolean) || false;
        session.user.userNameGenerated = (t.userNameGenerated as boolean) || false;
        session.user.createdAt = t.createdAt as any;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      const email = user.email;
      const userId = Number(user.id);
      if (!email || Number.isNaN(userId)) {
        return;
      }

      const preferredSource = getPreferredUsernameSource(user.name, email);
      const { userName: finalUserName, generated } = await generateUniqueUsername(preferredSource);

      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 12);

      await prisma.user.update({
        where: { id: userId },
        data: {
          userName: finalUserName,
          name: user.name?.trim() || finalUserName,
          password: hashedPassword,
          role: 'cliente',
          statusAccount: 'active',
          userNameGenerated: generated,
        } as any,
      });
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'tu-secreto-aqui',
};
             