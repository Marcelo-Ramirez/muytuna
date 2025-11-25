import { PrismaClient } from '@prisma/client';
import { random, movementTypes } from './helpers';

export async function seedProductMovements(
  prisma: PrismaClient,
  products: any[],
  inventoryStaff: any[]
): Promise<number> {
  console.log('📊 Creando movimientos de productos con seguimiento realista...');
  
  let totalMovements = 0;
  
  // Para cada producto, crear un historial realista de movimientos
  for (const product of products) {
    const user = inventoryStaff[random(0, inventoryStaff.length - 1)];
    
    // Ordenar batches por fecha de producción (FIFO - First In First Out)
    const batchesOrdered = [...product.batches].sort((a, b) => 
      new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
    );
    
    // Track remaining por batch
    const batchRemaining = new Map();
    batchesOrdered.forEach(b => batchRemaining.set(b.id, b.initialQuantity));
    
    let productTotal = 0;
    
    // Crear entradas iniciales para cada lote
    for (const batch of batchesOrdered) {
      await prisma.productMovement.create({
        data: {
          userId: user.id,
          productId: product.id,
          batchId: batch.id,
          movementType: 'entrada',
          quantity: batch.initialQuantity,
          notes: `Entrada inicial - Lote ${batch.batchNumber}`,
          createdAt: batch.productionDate,
        },
      });
      productTotal += batch.initialQuantity;
      totalMovements++;
    }
    
    // Crear solo SALIDAS (las entradas ya están en los lotes iniciales)
    const numMovements = random(10, 15);
    
    for (let i = 0; i < numMovements; i++) {
      const user = inventoryStaff[random(0, inventoryStaff.length - 1)];
      const daysAgo = random(1, 50);
      
      // Buscar el batch más antiguo con stock disponible (FIFO)
      let availableBatch = null;
      for (const batch of batchesOrdered) {
        if (batchRemaining.get(batch.id) > 0) {
          availableBatch = batch;
          break;
        }
      }
      
      if (!availableBatch) break; // No hay más stock, terminar
      
      const batchId = availableBatch.id;
      const currentRemaining = batchRemaining.get(batchId);
      
      let quantity: number;
      let notes: string;
      
      // Si es el primer lote (más antiguo) y queda poco, agotarlo
      if (availableBatch === batchesOrdered[0]) {
        if (currentRemaining <= 30 || i >= numMovements - 3) {
          quantity = currentRemaining; // Agotar completamente
          notes = `Salida FIFO - Lote ${availableBatch.batchNumber} AGOTADO`;
        } else {
          quantity = random(5, 15);
          notes = `Salida FIFO - Lote ${availableBatch.batchNumber}`;
        }
      } else {
        quantity = Math.min(currentRemaining, random(3, 12));
        notes = `Salida FIFO - Lote ${availableBatch.batchNumber}`;
      }
      
      batchRemaining.set(batchId, currentRemaining - quantity);
      productTotal -= quantity;

      await prisma.productMovement.create({
        data: {
          userId: user.id,
          productId: product.id,
          batchId,
          movementType: 'salida',
          quantity,
          notes,
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
      totalMovements++;
    }
    
    // Actualizar currentQuantity del producto con el total real
    await prisma.product.update({
      where: { id: product.id },
      data: { currentQuantity: productTotal },
    });
    
    // Actualizar remaining de cada batch
    for (const batch of batchesOrdered) {
      const finalRemaining = batchRemaining.get(batch.id);
      const status = finalRemaining <= 0 ? 'INACTIVE' : 'ACTIVE';
      
      await prisma.productBatch.update({
        where: { id: batch.id },
        data: { 
          remaining: finalRemaining,
          status: status,
        },
      });
    }
  }
  
  console.log(`✅ ${totalMovements} movimientos creados (stock sincronizado)`);
  
  return totalMovements;
}
