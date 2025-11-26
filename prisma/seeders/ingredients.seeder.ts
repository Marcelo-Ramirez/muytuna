import { PrismaClient } from '@prisma/client';
import { random, randomFloat, ingredientsData, movementTypes, reasons } from './helpers';

export interface IngredientsSeederResult {
  ingredients: any[];
}

export async function seedIngredients(
  prisma: PrismaClient,
  inventoryStaff: any[]
): Promise<IngredientsSeederResult> {
  // Crear Ingredientes
  console.log('🥚 Creando ingredientes...');
  const ingredients = [];
  for (const ingData of ingredientsData) {
    const ingredient = await prisma.ingredient.create({
      data: {
        name: ingData.name,
        unit: ingData.unit,
        pricePerUnit: ingData.pricePerUnit,
        provider: ingData.provider,
        currentQuantity: ingData.currentQuantity,
      },
    });
    ingredients.push(ingredient);
  }
  console.log(`✅ ${ingredients.length} ingredientes creados`);

  // Crear modelos EOQ para ingredientes
  console.log('📊 Creando modelos EOQ...');
  for (const ingredient of ingredients) {
    const dailyDemand = randomFloat(5, 50);
    const annualDemand = dailyDemand * 365;
    const leadTimeDays = randomFloat(2, 10);
    
    await prisma.ingredientEOQModel.create({
      data: {
        idIngredient: ingredient.id,
        orderingCost: randomFloat(50, 200),
        annualMaintenanceCost: randomFloat(100, 500),
        leadTimeDays,
        dailyDemand,
        annualDemand,
        reorderPoint: dailyDemand * leadTimeDays,
      },
    });
  }
  console.log(`✅ Modelos EOQ creados`);

  // Crear Movimientos de Inventario (Generales)
  console.log('📦 Creando movimientos de inventario generales...');
  for (let i = 0; i < 50; i++) {
    const ingredient = ingredients[random(0, ingredients.length - 1)];
    const user = inventoryStaff[random(0, inventoryStaff.length - 1)]; 
    // Solo entrada o salida, sin ajustes
    const movementType = random(0, 1) === 0 ? 'entrada' : 'salida';
    const quantity = random(5, 100);

    await prisma.inventoryMovement.create({
      data: {
        userId: user.id,
        ingredientId: ingredient.id,
        movementType,
        reason: reasons[random(0, reasons.length - 1)],
        quantity,
        createdAt: new Date(Date.now() - random(0, 90) * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ 50 movimientos generales creados`);

  // Crear Movimientos de Salida a Producción (para EOQ)
  console.log('🏭 Creando movimientos de salida a producción (histórico anual)...');
  let productionMovementsCount = 0;
  
  for (const ingredient of ingredients) {
    // Generar entre 10-30 movimientos de producción para cada ingrediente en el último año
    const numMovements = random(10, 30);
    
    for (let i = 0; i < numMovements; i++) {
      const user = inventoryStaff[random(0, inventoryStaff.length - 1)];
      // Cantidad de salida coherente con el tipo de ingrediente (5-50 unidades enteras)
      const quantity = random(5, 50);
      // Distribuir los movimientos uniformemente en los últimos 365 días
      const daysAgo = random(0, 365);
      
      await prisma.inventoryMovement.create({
        data: {
          userId: user.id,
          ingredientId: ingredient.id,
          movementType: 'salida',
          reason: 'produccion', // Importante: minúscula para que coincida con el API
          quantity,
          createdAt: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
        },
      });
      productionMovementsCount++;
    }
  }
  console.log(`✅ ${productionMovementsCount} movimientos de producción creados`);

  return { ingredients };
}
