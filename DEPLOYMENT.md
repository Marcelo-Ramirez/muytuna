# 🚀 Configuración para Producción

## Variables de Entorno Críticas

### NEXTAUTH_URL
**CRÍTICO: Debes cambiar esto en producción**

**En desarrollo**:
```env
NEXTAUTH_URL=http://localhost:3000
```

**En producción** - Cambiar a tu dominio/IP real:
```env
NEXTAUTH_URL=http://192.168.1.100:3000
```
o
```env
NEXTAUTH_URL=https://tudominio.com
```

**⚠️ IMPORTANTE**: Si dejas `localhost` en producción, las redirecciones NO funcionarán correctamente.

### Ejemplo de .env en Producción

```env
# Base de datos
DATABASE_URL="file:./database.sqlite"

# Secretos
REGISTER_SECRET_KEY=micodigosecreto123
ENCRYPTION_KEY=12345678901234567890123456789012
REGISTRATION_KEY=admin123

# NextAuth - DEJAR VACÍO PARA USAR DOMINIO AUTOMÁTICO
NEXTAUTH_URL=
NEXTAUTH_SECRET=CAMBIA-ESTO-POR-UN-SECRETO-FUERTE-Y-ALEATORIO

# Google OAuth (opcional)
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
```

## Cambios Implementados

✅ **Redirecciones de signOut**:
- Cambiadas de URLs absolutas (`window.location.origin`) a rutas relativas
- `SystemHeader.tsx`: `callbackUrl: "/"`
- `SystemSidebar.tsx`: `callbackUrl: "/sys/login"`
- `PublicHeader.tsx`: `callbackUrl: "/"`
- `Sidebar.tsx`: `callbackUrl: "/login"`

## Cómo Desplegar

1. **Clonar el repositorio en producción**
2. **Copiar y configurar .env**:
   ```bash
   cp .env.example .env
   # Editar .env y cambiar NEXTAUTH_URL a tu dominio/IP de producción
   # Ejemplo: NEXTAUTH_URL=http://192.168.1.100:3000
   ```
3. **Instalar dependencias**:
   ```bash
   npm install
   ```
4. **Generar base de datos**:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
5. **Construir para producción**:
   ```bash
   npm run build
   ```
6. **Iniciar en producción**:
   ```bash
   npm start
   ```

## Verificar que Funciona

1. Accede desde tu dominio/IP: `http://tu-ip:3000`
2. Inicia sesión
3. Cierra sesión
4. Verifica que te redirija a `http://tu-ip:3000/` y NO a `http://localhost:3000`

## Troubleshooting

### Sigue redirigiendo a localhost
- Verifica que `NEXTAUTH_URL` esté vacío o apunte a tu dominio correcto
- Reinicia el servidor después de cambiar `.env`
- Limpia caché: `rm -rf .next && npm run build`

### Error "Invalid URL"
- Asegúrate de incluir el protocolo: `http://` o `https://`
- Verifica que el puerto coincida con donde corre la app
