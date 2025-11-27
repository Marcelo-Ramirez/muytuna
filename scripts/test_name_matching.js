// Script de prueba para el algoritmo de comparación de nombres
// Ejecutar con: node scripts/test_name_matching.js

import { compareTwoStrings } from 'string-similarity';

// Normalización de nombres
function normalizeName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Función de comparación (misma del API)
function namesMatch(name1, name2, minSimilarity = 0.75) {
  const normalized1 = normalizeName(name1);
  const normalized2 = normalizeName(name2);

  console.log(`\n🔍 Comparando:`);
  console.log(`   Nombre 1: "${name1}" → "${normalized1}"`);
  console.log(`   Nombre 2: "${name2}" → "${normalized2}"`);

  // ESTRATEGIA 1: Coincidencia exacta
  if (normalized1 === normalized2) {
    console.log(`   ✅ COINCIDENCIA EXACTA`);
    return true;
  }

  // ESTRATEGIA 2: Similitud general
  const overallSimilarity = compareTwoStrings(normalized1, normalized2);
  console.log(`   📊 Similitud general: ${(overallSimilarity * 100).toFixed(1)}%`);
  
  if (overallSimilarity >= minSimilarity) {
    console.log(`   ✅ COINCIDENCIA POR SIMILITUD GENERAL`);
    return true;
  }

  // ESTRATEGIA 3: Comparación por palabras
  const words1 = normalized1.split(' ').filter(w => w.length > 0);
  const words2 = normalized2.split(' ').filter(w => w.length > 0);

  let matchedWords1 = 0;
  let matchedWords2 = 0;
  const matchDetails = [];

  for (const word1 of words1) {
    if (words2.includes(word1)) {
      matchedWords1++;
      matchDetails.push(`"${word1}" ✓`);
      continue;
    }
    
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
    if (words1.includes(word2)) {
      matchedWords2++;
      continue;
    }
    
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

  console.log(`   Detalles: ${matchDetails.join(', ')}`);

  const coverage1 = words1.length > 0 ? matchedWords1 / words1.length : 0;
  const coverage2 = words2.length > 0 ? matchedWords2 / words2.length : 0;
  const wordMatchScore = (coverage1 + coverage2) / 2;

  console.log(`   📊 Cobertura: ${(coverage1 * 100).toFixed(0)}% (1→2) | ${(coverage2 * 100).toFixed(0)}% (2→1)`);
  console.log(`   📊 Puntuación final: ${(wordMatchScore * 100).toFixed(1)}%`);

  // ESTRATEGIA 4: Apellidos comunes
  const exactMatches = words1.filter(w => words2.includes(w)).length;
  
  if (exactMatches >= 2 && wordMatchScore >= 0.6) {
    console.log(`   ✅ COINCIDENCIA POR APELLIDOS (${exactMatches} palabras exactas)`);
    return true;
  }

  if (wordMatchScore >= minSimilarity) {
    console.log(`   ✅ COINCIDENCIA POR PALABRAS`);
    return true;
  }

  console.log(`   ❌ SIN COINCIDENCIA`);
  return false;
}

// CASOS DE PRUEBA
console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║     PRUEBAS DEL ALGORITMO DE COMPARACIÓN DE NOMBRES      ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

const testCases = [
  {
    name: 'Caso 1: Coincidencia Exacta',
    qr: 'MARCOS RODRIGO MAMANI CONDORI',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true,
  },
  {
    name: 'Caso 2: Orden Invertido Completo',
    qr: 'MAMANI CONDORI MARCOS RODRIGO',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true,
  },
  {
    name: 'Caso 3: Orden Parcialmente Invertido',
    qr: 'MARCOS MAMANI RODRIGO CONDORI',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true,
  },
  {
    name: 'Caso 4: Con Error Tipográfico Menor',
    qr: 'MARCOS RODRGO MAMANI CONDORI',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true,
  },
  {
    name: 'Caso 5: Con Acentos',
    qr: 'MARCOS RODRÍGO MAMANÍ CÓNDORI',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true,
  },
  {
    name: 'Caso 6: Nombre Parcial (3 de 4 palabras)',
    qr: 'MAMANI CONDORI MARCOS',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true,
  },
  {
    name: 'Caso 7: Solo Apellidos',
    qr: 'MAMANI CONDORI',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: false, // Muy corto
  },
  {
    name: 'Caso 8: Nombres Completamente Diferentes',
    qr: 'JUAN CARLOS PEREZ LOPEZ',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: false,
  },
  {
    name: 'Caso 9: Un Apellido Diferente',
    qr: 'MARCOS RODRIGO MAMANI GONZALEZ',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true, // 75% coincidencia
  },
  {
    name: 'Caso 10: Solo Un Nombre en Común',
    qr: 'MARCOS GARCIA LOPEZ FERNANDEZ',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: false, // Solo 1 palabra coincide
  },
  {
    name: 'Caso 11: Con Espacios Extra',
    qr: '  MARCOS   RODRIGO  MAMANI   CONDORI  ',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true,
  },
  {
    name: 'Caso 12: Minúsculas vs Mayúsculas',
    qr: 'marcos rodrigo mamani condori',
    db: 'MARCOS RODRIGO MAMANI CONDORI',
    expected: true,
  },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 ${test.name}`);
  console.log(`${'='.repeat(60)}`);
  
  const result = namesMatch(test.qr, test.db);
  const success = result === test.expected;
  
  if (success) {
    console.log(`\n✅ PASÓ - Resultado: ${result} (esperado: ${test.expected})`);
    passed++;
  } else {
    console.log(`\n❌ FALLÓ - Resultado: ${result} (esperado: ${test.expected})`);
    failed++;
  }
});

// RESUMEN
console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
console.log('║                     RESUMEN DE PRUEBAS                    ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');
console.log(`   Total de pruebas: ${testCases.length}`);
console.log(`   ✅ Aprobadas: ${passed} (${((passed / testCases.length) * 100).toFixed(1)}%)`);
console.log(`   ❌ Falladas: ${failed} (${((failed / testCases.length) * 100).toFixed(1)}%)`);

if (failed === 0) {
  console.log('\n   🎉 ¡TODAS LAS PRUEBAS PASARON! 🎉\n');
} else {
  console.log('\n   ⚠️  Algunas pruebas fallaron. Revisar umbrales.\n');
}
