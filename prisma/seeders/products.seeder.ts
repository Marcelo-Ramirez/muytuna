import { PrismaClient } from '@prisma/client';
import { generateSKU, generateEAN13Barcode, generateBatchNumber } from '@/lib/barcode/generator';
import { random, gomitas, pulpas } from './helpers';

export interface ProductSeederResult {
  products: any[];
}

export async function seedProducts(prisma: PrismaClient): Promise<ProductSeederResult> {
  console.log('🍭 Creando productos y lotes...');
  const products: any[] = [];

  // Crear gomitas
  for (const name of gomitas) {
    const key = name.split(' ').slice(-1)[0]; 
    const flavor = key.charAt(0).toUpperCase() + key.slice(1); 
    const imageFile = `g-${key.toLowerCase()}.png`;
    const imageUrl = `/images/products/gomita/${imageFile}`;
    
    // Cantidad total inicial
    const totalQty = random(50, 200);

    const product = await prisma.product.create({
      data: {
        name: `Gomita de ${flavor}`,
        flavor: flavor,
        type: 'Gomita',
        imageUrl,
        pricePerUnit: random(1, 3),
        currentQuantity: totalQty,
        sku: '', 
        barcode: '', 
        barcodeFormat: 'EAN13',
      },
    });
    
    const sku = generateSKU('Gomita', flavor, product.id);
    const barcode = generateEAN13Barcode(product.id);
    
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { sku, barcode },
    });
    
    // Crear 2-4 lotes por producto
    const numBatches = random(2, 4);
    const batches = [];
    let remainingQty = totalQty;
    
    for (let i = 0; i < numBatches; i++) {
      const isLastBatch = i === numBatches - 1;
      const batchQty = isLastBatch ? remainingQty : random(Math.floor(totalQty / numBatches) - 10, Math.floor(totalQty / numBatches) + 10);
      remainingQty -= batchQty;
      
      const daysAgo = random(10, 90);
      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: generateBatchNumber(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)),
          initialQuantity: batchQty,
          remaining: batchQty,
          productionDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + random(30, 120) * 24 * 60 * 60 * 1000), // 30-120 días en el futuro
        },
      });
      batches.push(batch);
    }
    
    products.push({ ...updated, sku, barcode, batches });
  }

  // Crear pulpas
  for (const name of pulpas) {
    const key = name.split(' ').slice(-1)[0];
    const flavor = key.charAt(0).toUpperCase() + key.slice(1);
    const imageFile = `p-${key.toLowerCase()}.png`;
    const imageUrl = `/images/products/pulpa/${imageFile}`;
    
    // Cantidad total inicial
    const totalQty = random(30, 150);

    const product = await prisma.product.create({
      data: {
        name: `Pulpa de ${flavor}`,
        flavor: flavor,
        type: 'Pulpa',
        imageUrl,
        pricePerUnit: random(5, 10),
        currentQuantity: totalQty,
        sku: '',
        barcode: '',
        barcodeFormat: 'EAN13',
      },
    });
    
    const sku = generateSKU('Pulpa', flavor, product.id);
    const barcode = generateEAN13Barcode(product.id);
    
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { sku, barcode },
    });
    
    // Crear 2-4 lotes por producto
    const numBatches = random(2, 4);
    const batches = [];
    let remainingQty = totalQty;
    
    for (let i = 0; i < numBatches; i++) {
      const isLastBatch = i === numBatches - 1;
      const batchQty = isLastBatch ? remainingQty : random(Math.floor(totalQty / numBatches) - 10, Math.floor(totalQty / numBatches) + 10);
      remainingQty -= batchQty;
      
      const daysAgo = random(10, 90);
      const batch = await prisma.productBatch.create({
        data: {
          productId: product.id,
          batchNumber: generateBatchNumber(new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)),
          initialQuantity: batchQty,
          remaining: batchQty,
          productionDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
          expiryDate: new Date(Date.now() + random(45, 150) * 24 * 60 * 60 * 1000), // 45-150 días en el futuro
        },
      });
      batches.push(batch);
    }
    
    products.push({ ...updated, sku, barcode, batches });
  }

  console.log(`✅ ${products.length} productos creados con múltiples lotes`);

  return { products };
}
