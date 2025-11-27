// pages/api/yape/confirmar.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const YAPE_API_KEY = process.env.YAPE_API_KEY || "e8B4fG9tPz6jL1wA0sD2hY5uQ7xN3rK"; 

// Función para extraer nombre del pagador del texto de notificación
// Formato esperado: "QR DE Apellido1 Apellido2 Nombre1 Nombre2 te envió Bs. XX"
function extractPayerName(text: string): string | null {
  try {
    // Patrón principal: "QR DE [Nombre Completo] te envió"
    const qrPattern = /QR DE\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)\s+te envió/i;
    const qrMatch = text.match(qrPattern);
    
    if (qrMatch && qrMatch[1]) {
      return qrMatch[1].trim();
    }

    // Patrones alternativos (por si acaso)
    const patterns = [
      /Te pagó\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s+S\/|\s+Bs\.?|\s+\d)/i,
      /Recibiste de\s+([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s+S\/|\s+Bs\.?|\s+\d)/i,
      /(?:De|From):\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s+S\/|\s+Bs\.?|\s+\d)/i,
      /Pagador:\s*([A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\s+S\/|\s+Bs\.?|\s+\d)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  } catch (error) {
    console.error('Error al extraer nombre del pagador:', error);
    return null;
  }
}

// Función para extraer el monto del texto de notificación
// Formato esperado: "Bs. XX" o "Bs XX"
function extractAmount(text: string): number | null {
  try {
    // Patrón principal: "Bs. 2" o "Bs 2.50"
    const bsPattern = /Bs\.?\s*(\d+(?:\.\d{1,2})?)/i;
    const bsMatch = text.match(bsPattern);
    
    if (bsMatch && bsMatch[1]) {
      return parseFloat(bsMatch[1]);
    }

    // Patrones alternativos
    const patterns = [
      /(?:S\/|BOB|PEN)\s*(\d+(?:\.\d{2})?)/i,
      /(\d+(?:\.\d{2})?)\s*(?:S\/|Bs\.?|BOB|PEN)/i,
      /Monto:\s*(\d+(?:\.\d{2})?)/i,
      /Total:\s*(\d+(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    }

    return null;
  } catch (error) {
    console.error('Error al extraer monto:', error);
    return null;
  }
}

// Función para normalizar nombres (quitar acentos, convertir a mayúsculas, etc.)
function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' '); // Normalizar espacios
}

// Función para reordenar nombre según formato boliviano
// En Bolivia: 2 apellidos + 1 o 2 nombres
// Esta función convierte cualquier orden a: APELLIDO1 APELLIDO2 NOMBRE(S)
function reorderBolivianName(name: string, isFromQR: boolean = false): string {
  const normalized = normalizeName(name);
  const words = normalized.split(' ').filter(w => w.length > 0);
  
  // Si tiene menos de 3 palabras, no se puede reordenar
  if (words.length < 3) {
    console.warn(`⚠️ Nombre con menos de 3 palabras: ${name}`);
    return normalized;
  }
  
  if (words.length === 3) {
    // 3 palabras = 2 apellidos + 1 nombre
    if (isFromQR) {
      // QR: "APELLIDO1 APELLIDO2 NOMBRE"
      return normalized; // Ya está en el formato correcto
    } else {
      // Usuario: "NOMBRE APELLIDO1 APELLIDO2"
      // Reordenar: últimas 2 son apellidos, primera es nombre
      return `${words[1]} ${words[2]} ${words[0]}`;
    }
  }
  
  if (words.length === 4) {
    // 4 palabras = 2 apellidos + 2 nombres
    if (isFromQR) {
      // QR: "APELLIDO1 APELLIDO2 NOMBRE1 NOMBRE2"
      return normalized; // Ya está en el formato correcto
    } else {
      // Usuario: "NOMBRE1 NOMBRE2 APELLIDO1 APELLIDO2"
      // Reordenar: últimas 2 son apellidos, primeras 2 son nombres
      return `${words[2]} ${words[3]} ${words[0]} ${words[1]}`;
    }
  }
  
  // Si tiene más de 4 palabras
  if (isFromQR) {
    // QR: primeras 2 son apellidos, resto son nombres
    return normalized;
  } else {
    // Usuario: últimas 2 son apellidos, resto son nombres
    const apellidos = words.slice(-2);
    const nombres = words.slice(0, -2);
    return `${apellidos.join(' ')} ${nombres.join(' ')}`;
  }
}

// Función para comparar nombres con tolerancia (permite coincidencias parciales)
function namesMatch(name1: string, name2: string, threshold: number = 0.8, name1FromQR: boolean = true): boolean {
  // Reordenar ambos nombres al formato boliviano estándar
  const reordered1 = reorderBolivianName(name1, name1FromQR);
  const reordered2 = reorderBolivianName(name2, false); // name2 es siempre del usuario (DB)

  console.log(`   🔄 Comparación de nombres:`);
  console.log(`      Original 1: ${name1} ${name1FromQR ? '(QR)' : '(Usuario)'}`);
  console.log(`      Reordenado 1: ${reordered1}`);
  console.log(`      Original 2: ${name2} (Usuario)`);
  console.log(`      Reordenado 2: ${reordered2}`);

  // Coincidencia exacta después de reordenar
  if (reordered1 === reordered2) {
    console.log(`      ✅ Coincidencia EXACTA`);
    return true;
  }

  // Verificar si uno contiene al otro (para nombres parciales)
  if (reordered1.includes(reordered2) || reordered2.includes(reordered1)) {
    console.log(`      ✅ Coincidencia por CONTENCIÓN`);
    return true;
  }

  // Calcular similitud por palabras (los apellidos son más importantes)
  const words1 = reordered1.split(' ');
  const words2 = reordered2.split(' ');
  
  // Verificar que al menos los 2 apellidos coincidan (primeras 2 palabras)
  const apellidosMatch = words1.length >= 2 && words2.length >= 2 &&
                         words1[0] === words2[0] && words1[1] === words2[1];
  
  if (!apellidosMatch) {
    console.log(`      ❌ Apellidos NO coinciden`);
    return false;
  }
  
  console.log(`      ✅ Apellidos coinciden: ${words1[0]} ${words1[1]}`);
  
  // Si los apellidos coinciden, verificar nombres (más flexible)
  let matchingWords = 2; // Ya contamos los 2 apellidos
  for (let i = 2; i < words1.length; i++) {
    for (let j = 2; j < words2.length; j++) {
      if (words1[i] === words2[j]) {
        matchingWords++;
        break;
      }
    }
  }

  const similarity = matchingWords / Math.max(words1.length, words2.length);
  console.log(`      Similitud: ${(similarity * 100).toFixed(0)}% (umbral: ${(threshold * 100).toFixed(0)}%)`);
  
  return similarity >= threshold;
}

export async function POST(req: NextRequest) {
  // 1. SOLO ACEPTAR PETICIONES POST
  if (req.method !== 'POST') {
    return NextResponse.json({ message: 'Method Not Allowed' }, { status: 405 });
  }

  // 2. OBTENER Y VALIDAR EL TOKEN SECRETO (X-Auth-Token)
  const clientToken = req.headers.get('x-auth-token');

  if (!clientToken || clientToken !== YAPE_API_KEY) {
    // ❌ Rechazar si el token es incorrecto
    console.warn('❌ [YAPE SECURITY] Acceso denegado: Token inválido.');
    return NextResponse.json({ error: 'Token de aplicación inválido.' }, { status: 401 });
  }

  // 3. PROCESAR DATOS (Si el Token es VÁLIDO)
  try {
    const { text } = await req.json();
    
    console.log(`✅ [YAPE RECEIVED] Texto completo: ${text}`);

    // 4. EXTRAER INFORMACIÓN DEL TEXTO
    const payerName = extractPayerName(text);
    const amount = extractAmount(text);

    if (!payerName || !amount) {
      console.warn('⚠️ [YAPE] No se pudo extraer nombre o monto del texto');
      console.warn(`   Nombre extraído: ${payerName}`);
      console.warn(`   Monto extraído: ${amount}`);
      
      return NextResponse.json({ 
        status: 'warning', 
        message: 'Notificación recibida pero no se pudo extraer información completa.',
        extracted: { payerName, amount }
      }, { status: 200 });
    }

    console.log(`📋 [YAPE] Datos extraídos:`);
    console.log(`   Nombre original: ${payerName}`);
    console.log(`   Nombre reordenado: ${reorderBolivianName(payerName, true)}`);
    console.log(`   Monto: Bs ${amount.toFixed(2)}`);

    // 5. BUSCAR PEDIDO PENDIENTE QUE COINCIDA
    const pendingOrders = await prisma.order.findMany({
      where: {
        status: 'pending',
        payerName: { not: null },
        channel: 'ONLINE'
      },
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { product: { select: { name: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`🔍 [YAPE] Buscando entre ${pendingOrders.length} pedidos pendientes...`);

    // 6. BUSCAR COINCIDENCIA POR NOMBRE Y MONTO
    let matchedOrder = null;
    const tolerance = 0.50; // Tolerancia de Bs 0.50 en el monto

    for (const order of pendingOrders) {
      if (!order.payerName) continue;

      const nameMatches = namesMatch(payerName, order.payerName, 0.8, true); // true = nombre viene del QR
      const amountMatches = Math.abs(order.totalAmount - amount) <= tolerance;

      console.log(`   Comparando con pedido #${order.orderNumber}:`);
      console.log(`      Pagador DB: ${order.payerName} | Coincide: ${nameMatches}`);
      console.log(`      Total DB: Bs ${order.totalAmount.toFixed(2)} | Recibido: Bs ${amount.toFixed(2)} | Coincide: ${amountMatches}`);

      if (nameMatches && amountMatches) {
        matchedOrder = order;
        console.log(`✅ [YAPE] ¡COINCIDENCIA ENCONTRADA! Pedido #${order.orderNumber}`);
        break;
      }
    }

    // 7. SI NO HAY COINCIDENCIA EXACTA, BUSCAR SOLO POR MONTO (para casos especiales)
    if (!matchedOrder) {
      console.log(`⚠️ [YAPE] No se encontró coincidencia exacta. Buscando solo por monto...`);
      
      for (const order of pendingOrders) {
        const amountMatches = Math.abs(order.totalAmount - amount) <= tolerance;
        
        if (amountMatches) {
          console.log(`⚠️ [YAPE] Posible coincidencia por monto: Pedido #${order.orderNumber}`);
          console.log(`      Pagador registrado: ${order.payerName}`);
          console.log(`      Pagador en notificación: ${payerName}`);
          // No marcar automáticamente, solo registrar para revisión manual
        }
      }
    }

    // 8. MARCAR PEDIDO COMO PAGADO SI HAY COINCIDENCIA
    if (matchedOrder) {
      const updatedOrder = await prisma.order.update({
        where: { id: matchedOrder.id },
        data: {
          status: 'paid',
          paymentMethod: 'YAPE',
          paidAt: new Date()
        },
        include: {
          user: { select: { name: true, email: true } },
          items: { include: { product: { select: { name: true } } } }
        }
      });

      console.log(`🎉 [YAPE] Pedido #${updatedOrder.orderNumber} marcado como PAGADO`);
      console.log(`   Cliente: ${updatedOrder.user?.name}`);
      console.log(`   Email: ${updatedOrder.user?.email}`);
      console.log(`   Total: Bs ${updatedOrder.totalAmount.toFixed(2)}`);

      // TODO: Enviar email de confirmación al cliente aquí
      // await sendPaymentConfirmationEmail(updatedOrder);

      return NextResponse.json({ 
        status: 'success', 
        message: 'Pago confirmado automáticamente.',
        order: {
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.user?.name,
          amount: updatedOrder.totalAmount,
          paidAt: updatedOrder.paidAt
        }
      }, { status: 200 });
    }

    // 9. SI NO HAY COINCIDENCIA, REGISTRAR PARA REVISIÓN MANUAL
    console.log(`❌ [YAPE] No se encontró pedido que coincida con:`);
    console.log(`   Nombre: ${payerName}`);
    console.log(`   Monto: Bs ${amount.toFixed(2)}`);
    console.log(`   Se requiere conciliación manual.`);

    return NextResponse.json({ 
      status: 'no_match', 
      message: 'Pago recibido pero no se encontró pedido coincidente. Requiere revisión manual.',
      data: { payerName, amount }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ [YAPE ERROR] Error al procesar notificación:', error);
    
    return NextResponse.json({ 
      status: 'error', 
      message: 'Error al procesar la notificación.',
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}