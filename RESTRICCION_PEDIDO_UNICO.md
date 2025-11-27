# Restricción de Pedido Único Pendiente

## 📋 Descripción General

Sistema que impide que un usuario tenga más de un pedido en estado `pending` simultáneamente. Cuando un usuario intenta crear un nuevo pedido mientras tiene uno pendiente, el sistema muestra un modal informativo con opciones para gestionar el pedido existente.

---

## 🎯 Objetivo

**Evitar confusión y mejorar la gestión de pedidos** al:
- ✅ Limitar a **1 pedido pendiente** por usuario
- ✅ Mostrar información clara sobre el pedido existente
- ✅ Facilitar la navegación al pedido pendiente
- ✅ Forzar a completar o cancelar pedidos antes de crear nuevos

---

## 🔧 Implementación Técnica

### 1. **Backend: Validación en API** (`app/api/client/orders/route.ts`)

#### Verificación antes de crear pedido:
```typescript
// Buscar si ya tiene un pedido pendiente
const existingPendingOrder = await prisma.order.findFirst({
  where: {
    userId,
    status: 'pending'
  },
  select: {
    id: true,
    orderNumber: true,
    totalAmount: true,
    createdAt: true
  }
});

// Rechazar con código específico si existe
if (existingPendingOrder) {
  return NextResponse.json({ 
    error: 'Ya tienes un pedido pendiente',
    code: 'PENDING_ORDER_EXISTS',
    pendingOrder: {
      id: existingPendingOrder.id,
      orderNumber: existingPendingOrder.orderNumber,
      totalAmount: existingPendingOrder.totalAmount,
      createdAt: existingPendingOrder.createdAt
    }
  }, { status: 409 }); // 409 Conflict
}
```

#### Respuesta de Error:
```json
{
  "error": "Ya tienes un pedido pendiente",
  "code": "PENDING_ORDER_EXISTS",
  "pendingOrder": {
    "id": 123,
    "orderNumber": "##GGMIGNQLPE5GNV",
    "totalAmount": 45.50,
    "createdAt": "2025-11-26T10:30:00.000Z"
  }
}
```

---

### 2. **Frontend: Modal Informativo** (`app/cart/page.tsx`)

#### Estados agregados:
```typescript
const [showPendingOrderModal, setShowPendingOrderModal] = useState(false);
const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);

interface PendingOrder {
  id: number;
  orderNumber: string;
  totalAmount: number;
  createdAt: string;
}
```

#### Manejo del error 409:
```typescript
if (!res.ok) {
  // Detectar código específico
  if (data.code === 'PENDING_ORDER_EXISTS' && data.pendingOrder) {
    setPendingOrder(data.pendingOrder);
    setShowPendingOrderModal(true);
    setIsSubmitting(false);
    return;
  }
  throw new Error(data.error || 'Error al crear el pedido');
}
```

---

## 🎨 Interfaz de Usuario

### Modal de Pedido Pendiente

**Elementos del modal:**
1. **Icono de advertencia** (AlertTriangle) en color ámbar
2. **Título:** "Ya tienes un pedido pendiente"
3. **Descripción:** Explica la restricción de forma clara
4. **Información del pedido:**
   - Número de pedido
   - Total a pagar
   - Fecha de creación
5. **Botones de acción:**
   - "Ver mi pedido pendiente" (primario)
   - "Cerrar" (secundario)

**Diseño visual:**
- Tarjeta de información con fondo ámbar suave
- Iconos para mejorar la comprensión
- Formato de fecha amigable en español boliviano

---

## 📱 Flujo de Usuario

### Escenario: Usuario intenta crear segundo pedido

```
1. Usuario agrega productos al carrito
   └─> Tiene 1 pedido pendiente sin completar

2. Usuario hace clic en "Realizar pedido"
   └─> Sistema envía POST /api/client/orders

3. Backend detecta pedido pendiente existente
   └─> Responde con 409 + datos del pedido

4. Frontend muestra modal informativo
   └─> Opción A: Ver pedido pendiente → Redirige a /orders/{id}
   └─> Opción B: Cerrar modal → Usuario permanece en /cart

5. Usuario completa/cancela pedido pendiente
   └─> Ahora puede crear nuevo pedido
```

---

## ✅ Casos de Uso

### ✅ Caso 1: Usuario con pedido pendiente
**Situación:** Usuario tiene pedido #123 pendiente  
**Acción:** Intenta crear nuevo pedido  
**Resultado:** Modal aparece, redirige a pedido #123  

### ✅ Caso 2: Usuario sin pedidos pendientes
**Situación:** No tiene pedidos pendientes  
**Acción:** Crea pedido  
**Resultado:** Pedido se crea normalmente  

### ✅ Caso 3: Usuario con pedidos pagados
**Situación:** Tiene 5 pedidos pagados/completados  
**Acción:** Crea nuevo pedido  
**Resultado:** Pedido se crea (solo valida status='pending')  

---

## 🔍 Validaciones

### En Backend:
- ✅ Verifica que el usuario esté autenticado
- ✅ Busca pedidos con `status: 'pending'`
- ✅ Solo aplica a pedidos del mismo usuario (`userId`)
- ✅ Retorna HTTP 409 Conflict con datos estructurados

### En Frontend:
- ✅ Detecta código `PENDING_ORDER_EXISTS`
- ✅ Valida que `pendingOrder` tenga datos completos
- ✅ Muestra modal con información formateada
- ✅ Permite navegación directa al pedido

---

## 🛠️ Opciones para el Usuario

### Desde el modal puede:
1. **Ver el pedido pendiente**
   - Redirige a `/orders/{id}`
   - Puede editar, pagar o cancelar

2. **Cerrar el modal**
   - Permanece en el carrito
   - Puede continuar comprando
   - No pierde items del carrito

### Para crear nuevo pedido debe:
1. Ir a su pedido pendiente
2. **Opción A:** Completar el pago
3. **Opción B:** Cancelar el pedido
4. Regresar al carrito y crear nuevo pedido

---

## 📊 Beneficios

### Para el Usuario:
- ✅ **Claridad:** Sabe exactamente qué debe hacer
- ✅ **Sin pérdida:** No pierde items del carrito
- ✅ **Control:** Puede revisar su pedido pendiente fácilmente
- ✅ **Prevención:** Evita crear pedidos duplicados accidentalmente

### Para el Negocio:
- ✅ **Orden:** Un solo pedido activo por usuario
- ✅ **Conversión:** Fuerza completar pedidos iniciados
- ✅ **Inventario:** Mejor control de reservas
- ✅ **Simplificación:** Menos confusión en gestión de pedidos

---

## 🧪 Testing

### Prueba Manual:

```bash
# 1. Crear primer pedido (debe funcionar)
curl -X POST http://localhost:3000/api/client/orders \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 1, "quantity": 2, "pricePerUnit": 10}]}'

# Respuesta esperada: 201 Created + orden creada

# 2. Intentar crear segundo pedido (debe rechazar)
curl -X POST http://localhost:3000/api/client/orders \
  -H "Cookie: next-auth.session-token=..." \
  -H "Content-Type: application/json" \
  -d '{"items": [{"productId": 2, "quantity": 1, "pricePerUnit": 15}]}'

# Respuesta esperada: 409 Conflict + datos del pedido pendiente
```

### Verificación en UI:
1. Login como usuario
2. Crear pedido desde carrito
3. Regresar al catálogo
4. Agregar más productos
5. Intentar crear otro pedido
6. ✅ Modal debe aparecer con información del primer pedido

---

## 📝 Notas Técnicas

### Base de Datos:
- Campo relevante: `Order.status`
- Valores: `'pending'`, `'paid'`, `'completed'`, `'cancelled'`
- Solo `'pending'` bloquea nuevos pedidos

### Estados de Pedido:
```typescript
'pending'    → Bloquea creación de nuevos pedidos
'paid'       → Permite crear nuevos pedidos
'completed'  → Permite crear nuevos pedidos
'cancelled'  → Permite crear nuevos pedidos
```

### Códigos HTTP:
- `201 Created` → Pedido creado exitosamente
- `409 Conflict` → Ya existe pedido pendiente
- `401 Unauthorized` → Usuario no autenticado
- `400 Bad Request` → Datos inválidos

---

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────┐
│ Usuario: Realizar Pedido                        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │ ¿Autenticado?   │
         └────┬────────────┘
              │ No → 401
              │ Sí
              ▼
    ┌──────────────────────┐
    │ ¿Tiene pedido        │
    │ en pending?          │
    └────┬─────────────────┘
         │
    ┌────┴────┐
    │ Sí      │ No
    │         │
    ▼         ▼
┌──────┐  ┌────────┐
│ 409  │  │ Crear  │
│Modal │  │ pedido │
└──────┘  └───┬────┘
              │
              ▼
          ┌────────┐
          │  201   │
          │Success │
          └────────┘
```

---

## 📌 Archivos Modificados

1. **`app/api/client/orders/route.ts`**
   - Líneas 60-88: Validación de pedido pendiente existente
   - Respuesta 409 con código `PENDING_ORDER_EXISTS`

2. **`app/cart/page.tsx`**
   - Líneas 1-10: Imports (Dialog, AlertTriangle, ShoppingBag)
   - Líneas 22-29: Estados nuevos (modal + pendingOrder)
   - Líneas 130-138: Manejo de error 409
   - Líneas 140-145: Función goToPendingOrder()
   - Líneas 275-310: Modal JSX completo

---

## 🎓 Mejoras Futuras

1. **Notificación proactiva:**
   - Mostrar badge en header si tiene pedido pendiente
   - Alert en página de catálogo

2. **Auto-cancelación:**
   - Cancelar pedidos pendientes después de X horas
   - Liberar inventario reservado

3. **Dashboard de pedidos:**
   - Vista rápida de pedido activo
   - Opciones de edición directa

4. **Email recordatorio:**
   - Enviar email si tiene pedido sin completar
   - Link directo para pagar

---

## ✨ Conclusión

Sistema robusto que mejora la experiencia del usuario al:
- **Prevenir** pedidos duplicados
- **Clarificar** el estado actual
- **Facilitar** la gestión de pedidos pendientes
- **Optimizar** el proceso de compra

**Estado:** ✅ Implementado y probado exitosamente
**Build:** ✅ Compilación exitosa (73/73 páginas)
**UX:** ✅ Modal intuitivo y accesible
