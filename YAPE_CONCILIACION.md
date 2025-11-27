# 🔄 Sistema de Conciliación Automática de Pagos Yape

## 📋 Descripción

Sistema que intercepta notificaciones de la app Android de Yape, extrae el nombre del pagador y el monto, y automáticamente marca los pedidos como pagados cuando coinciden con los datos registrados.

---

## 🎯 Flujo Completo

### 1. Cliente realiza pedido
- Usuario completa su pedido online
- Selecciona método de pago: Yape/QR
- Ingresa su **nombre completo exacto** (igual al de su cuenta Yape)
- Sistema guarda el pedido con `status: 'pending'` y `payerName: "Nombre Completo"`

### 2. Cliente realiza pago
- Descarga QR de pago desde la página del pedido
- Escanea QR con su app Yape
- Realiza transferencia por el monto exacto

### 3. Notificación recibida
- App Android intercepta notificación de Yape
- Extrae el texto completo de la notificación
- Envía POST a `/api/yape/confirmar` con:
  ```json
  {
    "text": "Te pagó Juan Pérez García S/ 53.00 por concepto de Compra"
  }
  ```

### 4. Conciliación automática
El sistema:
1. ✅ Valida token de seguridad (`X-Auth-Token`)
2. 📝 Extrae nombre del pagador del texto
3. 💰 Extrae monto del texto
4. 🔍 Busca pedidos pendientes con `payerName` establecido
5. 🎯 Compara nombre y monto (con tolerancia)
6. ✅ Marca como pagado si hay coincidencia exacta
7. 📧 (TODO) Envía email de confirmación

---

## 🔧 Funciones Principales

### `extractPayerName(text: string)`
Extrae el nombre del pagador del texto de notificación.

**Patrones soportados:**
- `"Te pagó [Nombre]"`
- `"Recibiste de [Nombre]"`
- `"De: [Nombre]"`
- `"Pagador: [Nombre]"`

**Ejemplo:**
```typescript
extractPayerName("Te pagó Juan Pérez García S/ 53.00")
// Retorna: "Juan Pérez García"
```

### `extractAmount(text: string)`
Extrae el monto del texto de notificación.

**Patrones soportados:**
- `"S/ 50.00"`
- `"Bs 50.00"`
- `"50.00 Bs"`
- `"Monto: 50.00"`
- `"Total: 50.00"`

**Ejemplo:**
```typescript
extractAmount("Te pagó Juan Pérez García S/ 53.00")
// Retorna: 53.00
```

### `normalizeName(name: string)`
Normaliza nombres para comparación (quita acentos, mayúsculas, espacios extra).

**Ejemplo:**
```typescript
normalizeName("José María Pérez")
// Retorna: "JOSE MARIA PEREZ"
```

### `namesMatch(name1: string, name2: string, threshold: number = 0.8)`
Compara dos nombres con tolerancia para coincidencias parciales.

**Características:**
- ✅ Coincidencia exacta
- ✅ Uno contiene al otro
- ✅ Similitud por palabras (≥ 80% por defecto)

**Ejemplos:**
```typescript
namesMatch("Juan Pérez García", "JUAN PEREZ GARCIA")  // true
namesMatch("Juan Pérez", "Juan Pérez García")         // true
namesMatch("María López", "Juan Pérez")               // false
```

---

## 🎨 Criterios de Coincidencia

### ✅ Coincidencia EXACTA (automática)
Se requiere:
1. **Nombre:** Coincidencia ≥ 80% (normalizado, sin acentos)
2. **Monto:** Diferencia ≤ Bs 0.50

**Ejemplo:**
```
Pedido en DB:
  - payerName: "Juan Carlos Pérez García"
  - totalAmount: 53.00

Notificación Yape:
  - Nombre extraído: "Juan Carlos Perez Garcia"
  - Monto extraído: 53.00

✅ MATCH → Pedido marcado como PAGADO automáticamente
```

### ⚠️ Coincidencia PARCIAL (requiere revisión)
Si solo coincide el monto pero no el nombre:
- ✅ Se registra en logs para revisión manual
- ❌ NO se marca como pagado automáticamente

---

## 📊 Respuestas del Endpoint

### ✅ Pago confirmado
```json
{
  "status": "success",
  "message": "Pago confirmado automáticamente.",
  "order": {
    "orderNumber": "ORD-2024-001",
    "customerName": "Juan Pérez",
    "amount": 53.00,
    "paidAt": "2024-11-26T21:30:00.000Z"
  }
}
```

### ⚠️ Datos incompletos
```json
{
  "status": "warning",
  "message": "Notificación recibida pero no se pudo extraer información completa.",
  "extracted": {
    "payerName": "Juan Pérez",
    "amount": null
  }
}
```

### ❌ Sin coincidencia
```json
{
  "status": "no_match",
  "message": "Pago recibido pero no se encontró pedido coincidente. Requiere revisión manual.",
  "data": {
    "payerName": "María López",
    "amount": 45.00
  }
}
```

### 🔒 Token inválido
```json
{
  "error": "Token de aplicación inválido."
}
```
Status: `401 Unauthorized`

---

## 🧪 Pruebas

### Ejemplo de solicitud con cURL

```bash
curl -X POST http://localhost:3000/api/yape/confirmar \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: e8B4fG9tPz6jL1wA0sD2hY5uQ7xN3rK" \
  -d '{
    "text": "Te pagó Juan Pérez García S/ 53.00 por concepto de Compra en MuyTuna"
  }'
```

### Ejemplos de textos de notificación

**Formato 1 (Yape Perú):**
```
"Te pagó Juan Pérez García S/ 53.00 por concepto de Compra"
```

**Formato 2 (Yape Bolivia):**
```
"Recibiste de María López Bs 45.00"
```

**Formato 3 (Genérico):**
```
"De: Carlos Rodríguez
Monto: Bs 38.50
Fecha: 26/11/2024"
```

---

## 📝 Logs del Sistema

El sistema registra información detallada en consola:

```
✅ [YAPE RECEIVED] Texto completo: Te pagó Juan Pérez García S/ 53.00
📋 [YAPE] Datos extraídos:
   Nombre: Juan Pérez García
   Monto: Bs 53.00
🔍 [YAPE] Buscando entre 3 pedidos pendientes...
   Comparando con pedido #ORD-2024-001:
      Pagador DB: Juan Pérez García | Coincide: true
      Total DB: Bs 53.00 | Recibido: Bs 53.00 | Coincide: true
✅ [YAPE] ¡COINCIDENCIA ENCONTRADA! Pedido #ORD-2024-001
🎉 [YAPE] Pedido #ORD-2024-001 marcado como PAGADO
   Cliente: Juan Pérez
   Email: juan@example.com
   Total: Bs 53.00
```

---

## 🔐 Seguridad

### Token de Autenticación
- Header requerido: `X-Auth-Token`
- Valor: `e8B4fG9tPz6jL1wA0sD2hY5uQ7xN3rK` (o variable de entorno `YAPE_API_KEY`)
- Sin token válido → `401 Unauthorized`

### Validaciones
- ✅ Solo pedidos con `status: 'pending'`
- ✅ Solo pedidos con `payerName` establecido
- ✅ Solo pedidos online (`channel: 'ONLINE'`)
- ✅ Tolerancia de Bs 0.50 en el monto
- ✅ Coincidencia de nombre ≥ 80%

---

## 🚀 Próximas Mejoras

### 1. Email de Confirmación
```typescript
// TODO: Implementar en línea 213
await sendPaymentConfirmationEmail(updatedOrder);
```

### 2. Dashboard de Conciliación Manual
- Página para revisar pagos sin coincidencia
- Asignar pagos manualmente a pedidos
- Historial de conciliaciones

### 3. Notificaciones Push
- Notificar al cliente cuando su pago sea confirmado
- Notificar al admin cuando haya pagos pendientes de conciliar

### 4. Múltiples métodos de pago
- Extender para otros métodos (Banco, Transferencia)
- Adaptar patrones de extracción según método

---

## 📞 Soporte

Para problemas o preguntas sobre el sistema de conciliación:
1. Revisar logs en consola del servidor
2. Verificar que `payerName` esté establecido en el pedido
3. Confirmar que el monto coincida (±Bs 0.50)
4. Verificar formato de la notificación de Yape

---

**Última actualización:** 26 de Noviembre de 2025
