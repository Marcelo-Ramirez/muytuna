# ============================================================================
# Dockerfile optimizado para Next.js en ARM64 (Debian proot-distro Termux)
# Target: Xperia XA (Helio P10 / ARMv8-A 64-bit)
# ============================================================================

# ============================================================================
# Etapa 1: Construcción y generación de dependencias
# ============================================================================
FROM --platform=linux/amd64 node:22-alpine AS deps
WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias de producción solamente
RUN npm ci --only=production --ignore-scripts && \
    cp -R node_modules /tmp/prod_node_modules

# Instalar todas las dependencias (incluyendo dev) para el build
RUN npm ci --ignore-scripts

# ============================================================================
# Etapa 2: Build de Next.js (standalone mode)
# ============================================================================
FROM --platform=linux/amd64 node:22-alpine AS builder
WORKDIR /app

# Copiar node_modules completo desde deps
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copiar Prisma schema y generar cliente
COPY prisma ./prisma/
RUN npx prisma generate

# Variables de entorno para el build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build de Next.js con output standalone (reduce tamaño ~80%)
RUN npm run build

# ============================================================================
# Etapa 3: Imagen final ARM64 ultra-comprimida para Debian
# ============================================================================
FROM --platform=linux/arm64 node:22-slim AS runner
WORKDIR /app

# Variables de entorno de producción
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Instalar solo dependencias mínimas necesarias
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copiar archivos standalone generados por Next.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar Prisma schema y cliente generado
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma/
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma/
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma/

# Copiar base de datos SQLite si existe (usar script para manejar caso opcional)
RUN --mount=type=bind,from=builder,source=/app/prisma,target=/tmp/prisma \
    if [ -f /tmp/prisma/database.sqlite ]; then \
      cp /tmp/prisma/database.sqlite ./prisma/ && chown nextjs:nodejs ./prisma/database.sqlite; \
    fi

# Copiar .env para producción
COPY --chown=nextjs:nodejs .env ./

# Cambiar a usuario no-root
USER nextjs

# Exponer puerto
EXPOSE 3000

# Healthcheck para verificar que el servidor esté corriendo
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/auth/session', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando de inicio (standalone server.js)
CMD ["node", "server.js"]
