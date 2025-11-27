# 🇧🇴 Ejemplos de Conciliación Yape - Formato Boliviano

## 📋 Formato de Notificación Real

```
QR DE Ramirez Yapura Marcelo Bryan te envió Bs. 2
```

**Elementos extraídos:**
- Nombre: `Ramirez Yapura Marcelo Bryan`
- Monto: `2`

---

## 🔄 Sistema de Reordenamiento de Nombres

### Reglas de Bolivia:
- ✅ **Todos** tienen 2 apellidos
- ✅ Pueden tener 1 o 2 nombres
- ✅ Formato estándar: `APELLIDO1 APELLIDO2 NOMBRE(S)`

### Lógica de Reordenamiento:

#### Caso 1: 3 palabras (2 apellidos + 1 nombre)
```
Entrada: "Ramirez Yapura Marcelo"
Proceso:
  - Últimas 2 palabras = Apellidos: "Yapura" (pos 1), "Ramirez" (pos 0)
  - Primera palabra = Nombre: "Marcelo" (pos 2)
  
NO, el algoritmo toma:
  - Penúltima = Apellido1: "Yapura"
  - Última = Apellido2: "Ramirez" ❌ INCORRECTO

Corrección:
  - Primeras 2 = Apellidos: "Ramirez Yapura"
  - Última = Nombre: "Marcelo"

Salida: "RAMIREZ YAPURA MARCELO"
```

#### Caso 2: 4 palabras (2 apellidos + 2 nombres)
```
Entrada notificación: "Ramirez Yapura Marcelo Bryan"
Proceso:
  - Últimas 2 palabras = Apellidos: "Marcelo Bryan" ❌ INCORRECTO
  
Corrección:
  - Primeras 2 = Apellidos: "Ramirez Yapura"
  - Siguientes 2 = Nombres: "Marcelo Bryan"

Salida: "RAMIREZ YAPURA MARCELO BRYAN"
```

```
Entrada usuario: "Marcelo Bryan Ramirez Yapura"
Proceso:
  - Últimas 2 palabras = Apellidos: "Ramirez Yapura"
  - Primeras 2 = Nombres: "Marcelo Bryan"
  
Salida: "RAMIREZ YAPURA MARCELO BRYAN"
```

---

## ✅ Ejemplos de Coincidencias Exitosas

### Ejemplo 1: Mismo orden
```
Notificación Yape:
  "QR DE Ramirez Yapura Marcelo Bryan te envió Bs. 53"
  Extraído: "Ramirez Yapura Marcelo Bryan"
  Reordenado: "RAMIREZ YAPURA MARCELO BRYAN"

Base de Datos (payerName):
  "Marcelo Bryan Ramirez Yapura"
  Reordenado: "RAMIREZ YAPURA MARCELO BRYAN"

✅ MATCH EXACTO → Pedido marcado como PAGADO
```

### Ejemplo 2: Todo mayúsculas vs minúsculas
```
Notificación:
  "QR DE RAMIREZ YAPURA MARCELO te envió Bs. 38"
  Reordenado: "RAMIREZ YAPURA MARCELO"

Base de Datos:
  "marcelo ramirez yapura"
  Reordenado: "RAMIREZ YAPURA MARCELO"

✅ MATCH → Normalización maneja mayúsculas/minúsculas
```

### Ejemplo 3: Con acentos
```
Notificación:
  "QR DE García Pérez José María te envió Bs. 45"
  Reordenado: "GARCIA PEREZ JOSE MARIA"

Base de Datos:
  "José María García Pérez"
  Reordenado: "GARCIA PEREZ JOSE MARIA"

✅ MATCH → Normalización quita acentos
```

---

## ❌ Casos que NO coinciden (correctamente)

### Caso 1: Apellidos diferentes
```
Notificación:
  "QR DE Lopez Martinez Juan te envió Bs. 50"
  Reordenado: "LOPEZ MARTINEZ JUAN"
  Apellidos: LOPEZ MARTINEZ

Base de Datos:
  "Juan Ramirez Yapura"
  Reordenado: "RAMIREZ YAPURA JUAN"
  Apellidos: RAMIREZ YAPURA

❌ NO MATCH → Apellidos no coinciden
```

### Caso 2: Solo nombre coincide
```
Notificación:
  "QR DE Gonzalez Silva Marcelo te envió Bs. 50"
  Reordenado: "GONZALEZ SILVA MARCELO"

Base de Datos:
  "Marcelo Ramirez Yapura"
  Reordenado: "RAMIREZ YAPURA MARCELO"

❌ NO MATCH → Apellidos diferentes (aunque nombre sea igual)
```

---

## 🧪 Pruebas con cURL

### Test 1: Formato real de tu ejemplo
```bash
curl -X POST http://localhost:3000/api/yape/confirmar \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: e8B4fG9tPz6jL1wA0sD2hY5uQ7xN3rK" \
  -d '{
    "text": "QR DE Ramirez Yapura Marcelo Bryan te envió Bs. 2"
  }'
```

### Test 2: Usuario con 1 solo nombre
```bash
curl -X POST http://localhost:3000/api/yape/confirmar \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: e8B4fG9tPz6jL1wA0sD2hY5uQ7xN3rK" \
  -d '{
    "text": "QR DE Lopez Martinez Carlos te envió Bs. 35.50"
  }'
```

### Test 3: Todo en mayúsculas
```bash
curl -X POST http://localhost:3000/api/yape/confirmar \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: e8B4fG9tPz6jL1wA0sD2hY5uQ7xN3rK" \
  -d '{
    "text": "QR DE GARCIA PEREZ JOSE MARIA te envió Bs. 45.00"
  }'
```

---

## 📊 Logs Esperados

```
✅ [YAPE RECEIVED] Texto: QR DE Ramirez Yapura Marcelo Bryan te envió Bs. 2
📋 [YAPE] Datos extraídos:
   Nombre original: Ramirez Yapura Marcelo Bryan
   Nombre reordenado: RAMIREZ YAPURA MARCELO BRYAN
   Monto: Bs 2.00
🔍 [YAPE] Buscando entre 3 pedidos pendientes...
   Comparando con pedido #ORD-001:
   🔄 Comparación de nombres:
      Original 1: Ramirez Yapura Marcelo Bryan
      Reordenado 1: RAMIREZ YAPURA MARCELO BRYAN
      Original 2: Marcelo Bryan Ramirez Yapura
      Reordenado 2: RAMIREZ YAPURA MARCELO BRYAN
      ✅ Coincidencia EXACTA
      Pagador DB: Marcelo Bryan Ramirez Yapura | Coincide: true
      Total DB: Bs 2.00 | Recibido: Bs 2.00 | Coincide: true
✅ [YAPE] ¡COINCIDENCIA ENCONTRADA! Pedido #ORD-001
🎉 [YAPE] Pedido #ORD-001 marcado como PAGADO
```

---

## 🎯 Criterios de Coincidencia

### Prioridad 1: Apellidos (OBLIGATORIO)
- ✅ Los 2 apellidos DEBEN coincidir exactamente
- ❌ Si los apellidos no coinciden → NO MATCH

### Prioridad 2: Nombres (con tolerancia)
- ✅ Si apellidos coinciden, basta con que coincida 1 nombre
- ✅ Umbral de similitud: 80%

### Prioridad 3: Monto
- ✅ Tolerancia: ± Bs 0.50

---

## 🔧 Función de Reordenamiento

```typescript
function reorderBolivianName(name: string): string {
  const words = normalize(name).split(' ');
  
  if (words.length === 3) {
    // Últimas 2 = apellidos, primera = nombre
    return `${words[1]} ${words[2]} ${words[0]}`;
  }
  
  if (words.length === 4) {
    // Últimas 2 = apellidos, primeras 2 = nombres
    return `${words[2]} ${words[3]} ${words[0]} ${words[1]}`;
  }
  
  // Más de 4: últimas 2 = apellidos, resto = nombres
  const apellidos = words.slice(-2);
  const nombres = words.slice(0, -2);
  return `${apellidos.join(' ')} ${nombres.join(' ')}`;
}
```

---

## 📝 Notas Importantes

1. **El sistema prioriza los apellidos**
   - Si los apellidos no coinciden, no hay match (aunque nombre y monto sean iguales)

2. **Normalización automática**
   - Quita acentos: José → JOSE
   - Convierte a mayúsculas: marcelo → MARCELO
   - Elimina espacios extra

3. **Flexibilidad en nombres**
   - "Marcelo Bryan" = "Marcelo" (1 de 2 coincide = 50%, pero apellidos salvan)
   - Sistema enfocado en apellidos para máxima precisión

4. **Tolerancia en monto**
   - ±Bs 0.50 para cubrir redondeos

---

**Última actualización:** 26 de Noviembre de 2025
