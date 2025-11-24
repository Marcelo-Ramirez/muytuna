// lib/barcode/generator.ts

/**
 * Genera un SKU único para un producto
 * Formato: TIPO-SABOR-TIMESTAMP-RANDOM
 * Ejemplo: GOM-LIM-001
 */
export function generateSKU(type: string, flavor: string, id?: number): string {
  const typeCode = type
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .padEnd(3, 'X');
  
  const flavorCode = flavor
    .substring(0, 3)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quita acentos
    .replace(/[^A-Z]/g, '')
    .padEnd(3, 'X');
  
  const numericPart = id ? id.toString().padStart(3, '0') : Math.floor(Math.random() * 999).toString().padStart(3, '0');
  
  return `${typeCode}-${flavorCode}-${numericPart}`;
}

/**
 * Genera un código de barras EAN-13 válido
 * Formato: 789 (país ficticio) + 3 dígitos empresa + 6 dígitos producto + checksum
 * Se acepta un parámetro `attempt` para generar variantes determinísticas en caso de colisión
 */
export function generateEAN13Barcode(productId: number, attempt = 0): string {
  const prefix = '789'; // Código de país (ficticio para productos internos)
  const company = '123'; // Código de empresa (fijo de 3 dígitos para dejar 6 dígitos de producto)
  const productNumber = ((productId + attempt) % 1_000_000)
    .toString()
    .padStart(6, '0');

  const partial = prefix + company + productNumber; // 12 dígitos antes del checksum
  const checksum = calculateEAN13Checksum(partial);

  return partial + checksum;
}

/**
 * Genera un código CODE128 simple basado en el SKU
 * CODE128 acepta alfanumérico
 */
export function generateCODE128Barcode(sku: string): string {
  // CODE128 puede usar el SKU directamente
  return sku;
}

/**
 * Calcula el dígito verificador (checksum) para EAN-13
 */
function calculateEAN13Checksum(code: string): string {
  let sum = 0;
  
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i]);
    // Posiciones impares (índice par) se multiplican por 1
    // Posiciones pares (índice impar) se multiplican por 3
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  
  const checksum = (10 - (sum % 10)) % 10;
  return checksum.toString();
}

/**
 * Genera un número de lote único
 * Formato: LOTE-YYYYMMDD-XXX
 */
export function generateBatchNumber(date?: Date): string {
  const now = date || new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
  
  return `LOTE-${year}${month}${day}-${random}`;
}

/**
 * Valida si un código EAN-13 es válido
 */
export function validateEAN13(barcode: string): boolean {
  if (barcode.length !== 13) return false;
  if (!/^\d+$/.test(barcode)) return false;
  
  const checksum = barcode[12];
  const calculatedChecksum = calculateEAN13Checksum(barcode.substring(0, 12));
  
  return checksum === calculatedChecksum;
}
