// pages/api/yape/confirmar.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { compareTwoStrings } from "string-similarity";

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

/**
 * ALGORITMO ROBUSTO DE COMPARACIÓN DE NOMBRES
 * 
 * No asume ningún orden específico de palabras (nombres/apellidos).
 * Compara todas las palabras sin importar su posición.
 * Usa múltiples estrategias para máxima flexibilidad.
 */
function namesMatch(name1: string, name2: string, minSimilarity: number = 0.75): boolean {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);

  console.log(`   🔄 Comparación avanzada de nombres:`);
  console.log(`      Nombre 1: "${name1}" → "${normalized1}"`);
  console.log(`      Nombre 2: "${name2}" → "${normalized2}"`);

  // ESTRATEGIA 1: Coincidencia exacta
  if (normalized1 === normalized2) {
    console.log(`      ✅ COINCIDENCIA EXACTA`);
    return true;
  }

  // ESTRATEGIA 2: Similitud general usando Dice coefficient (string-similarity)
  const overallSimilarity = compareTwoStrings(normalized1, normalized2);
  console.log(`      📊 Similitud general: ${(overallSimilarity * 100).toFixed(1)}%`);
  
  if (overallSimilarity >= minSimilarity) {
    console.log(`      ✅ COINCIDENCIA POR SIMILITUD GENERAL (${(overallSimilarity * 100).toFixed(1)}%)`);
    return true;
  }

  // ESTRATEGIA 3: Comparación por palabras individuales (orden independiente)
  const words1 = normalized1.split(' ').filter(w => w.length > 0);
  const words2 = normalized2.split(' ').filter(w => w.length > 0);

  console.log(`      Palabras 1: [${words1.join(', ')}]`);
  console.log(`      Palabras 2: [${words2.join(', ')}]`);

  // Contar cuántas palabras de name1 aparecen en name2 (y viceversa)
  let matchedWords1 = 0;
  let matchedWords2 = 0;
  const matchDetails: string[] = [];

  for (const word1 of words1) {
    // Buscar coincidencia exacta
    if (words2.includes(word1)) {
      matchedWords1++;
      matchDetails.push(`"${word1}" ✓`);
      continue;
    }
    
    // Buscar coincidencia parcial (similitud >= 85%)
    let bestMatch = 0;
    let bestWord = '';
    for (const word2 of words2) {
      const similarity = compareTwoStrings(word1, word2);
      if (similarity > bestMatch) {
        bestMatch = similarity;
        bestWord = word2;
      }
    }
    
    if (bestMatch >= 0.85) {
      matchedWords1++;
      matchDetails.push(`"${word1}" ≈ "${bestWord}" (${(bestMatch * 100).toFixed(0)}%)`);
    } else {
      matchDetails.push(`"${word1}" ✗`);
    }
  }

  for (const word2 of words2) {
    // Buscar coincidencia exacta
    if (words1.includes(word2)) {
      matchedWords2++;
      continue;
    }
    
    // Buscar coincidencia parcial (similitud >= 85%)
    let bestMatch = 0;
    for (const word1 of words1) {
      const similarity = compareTwoStrings(word1, word2);
      if (similarity > bestMatch) {
        bestMatch = similarity;
      }
    }
    
    if (bestMatch >= 0.85) {
      matchedWords2++;
    }
  }

  console.log(`      Coincidencias: ${matchDetails.join(', ')}`);

  // Calcular porcentaje de coincidencia bidireccional
  const coverage1 = words1.length > 0 ? matchedWords1 / words1.length : 0;
  const coverage2 = words2.length > 0 ? matchedWords2 / words2.length : 0;
  const wordMatchScore = (coverage1 + coverage2) / 2;

  console.log(`      📊 Cobertura palabras: ${(coverage1 * 100).toFixed(0)}% (1→2) | ${(coverage2 * 100).toFixed(0)}% (2→1)`);
  console.log(`      📊 Puntuación final: ${(wordMatchScore * 100).toFixed(1)}%`);

  // ESTRATEGIA 4: Verificación estricta de apellidos comunes
  // Si al menos 2 palabras coinciden exactamente (probablemente apellidos)
  const exactMatches = words1.filter(w => words2.includes(w)).length;
  
  if (exactMatches >= 2 && wordMatchScore >= 0.6) {
    console.log(`      ✅ COINCIDENCIA POR APELLIDOS COMUNES (${exactMatches} palabras exactas + ${(wordMatchScore * 100).toFixed(0)}% cobertura)`);
    return true;
  }

  // CRITERIO FINAL: Puntuación combinada
  if (wordMatchScore >= minSimilarity) {
    console.log(`      ✅ COINCIDENCIA POR PALABRAS (${(wordMatchScore * 100).toFixed(1)}%)`);
    return true;
  }

  console.log(`      ❌ SIN COINCIDENCIA (similitud: ${(wordMatchScore * 100).toFixed(1)}% < ${(minSimilarity * 100).toFixed(0)}%)`);
  return false;
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
    console.log(`   Nombre normalizado: ${normalizeName(payerName)}`);
    console.log(`   Monto: Bs ${amount.toFixed(2)}`);

    // 5. GUARDAR PAGO EN LA BASE DE DATOS (SIEMPRE)
    let yapePayment = await prisma.yapePayment.create({
      data: {
        payerName: normalizeName(payerName),
        amount,
        rawText: text,
        status: 'unmatched', // Se actualizará si encuentra match
        receivedAt: new Date()
      }
    });

    console.log(`💾 [YAPE] Pago registrado en BD con ID: ${yapePayment.id}`);

    // 6. BUSCAR PEDIDO PENDIENTE QUE COINCIDA
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

    // 7. BUSCAR COINCIDENCIA POR NOMBRE Y MONTO
    let matchedOrder = null;
    let matchConfidence = 0;
    const tolerance = 0.50; // Tolerancia de Bs 0.50 en el monto

    for (const order of pendingOrders) {
      if (!order.payerName) continue;

      const nameMatches = namesMatch(payerName, order.payerName, 0.75); // 75% de similitud mínima
      const amountMatches = Math.abs(order.totalAmount - amount) <= tolerance;

      console.log(`   Comparando con pedido #${order.orderNumber}:`);
      console.log(`      Pagador DB: ${order.payerName} | Coincide: ${nameMatches}`);
      console.log(`      Total DB: Bs ${order.totalAmount.toFixed(2)} | Recibido: Bs ${amount.toFixed(2)} | Coincide: ${amountMatches}`);

      if (nameMatches && amountMatches) {
        matchedOrder = order;
        matchConfidence = 95; // Alta confianza cuando nombre y monto coinciden
        console.log(`✅ [YAPE] ¡COINCIDENCIA ENCONTRADA! Pedido #${order.orderNumber}`);
        break;
      }
    }

    // 8. NO BUSCAR SOLO POR MONTO - Siempre requiere coincidencia de nombre
    // Esto previene asignaciones incorrectas cuando dos pedidos tienen el mismo monto

    // 9. MARCAR PEDIDO COMO PAGADO SI HAY COINCIDENCIA
    if (matchedOrder) {
      // Actualizar el pago con el pedido encontrado
      yapePayment = await prisma.yapePayment.update({
        where: { id: yapePayment.id },
        data: {
          status: 'matched',
          orderId: matchedOrder.id,
          assignedBy: 'auto',
          assignedAt: new Date(),
          matchConfidence,
          processedAt: new Date()
        }
      });

      // Actualizar el pedido como pagado
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
      console.log(`   Pago ID: ${yapePayment.id} vinculado automáticamente`);

      // TODO: Enviar email de confirmación al cliente aquí
      // await sendPaymentConfirmationEmail(updatedOrder);

      return NextResponse.json({ 
        status: 'success', 
        message: 'Pago confirmado automáticamente.',
        paymentId: yapePayment.id,
        order: {
          orderNumber: updatedOrder.orderNumber,
          customerName: updatedOrder.user?.name,
          amount: updatedOrder.totalAmount,
          paidAt: updatedOrder.paidAt
        }
      }, { status: 200 });
    }

    // 10. SI NO HAY COINCIDENCIA, MANTENER COMO NO EMPAREJADO
    console.log(`❌ [YAPE] No se encontró pedido que coincida con:`);
    console.log(`   Nombre: ${payerName}`);
    console.log(`   Monto: Bs ${amount.toFixed(2)}`);
    console.log(`   Pago ID ${yapePayment.id} guardado para conciliación manual.`);

    return NextResponse.json({ 
      status: 'no_match', 
      message: 'Pago recibido pero no se encontró pedido coincidente. Guardado para revisión manual.',
      paymentId: yapePayment.id,
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