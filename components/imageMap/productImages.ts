// productImages.ts
// Static map of product image paths -> StaticImageData imports
import gBeterraga from '@/app/images/products/gomita/g-beterraga.png';
import gFrutilla from '@/app/images/products/gomita/g-frutilla.png';
import gLimon from '@/app/images/products/gomita/g-limon.png';
import gMandarina from '@/app/images/products/gomita/g-mandarina.png';
import gManzana from '@/app/images/products/gomita/g-manzana.png';
import gManzanilla from '@/app/images/products/gomita/g-manzanilla.png';
import gTuna from '@/app/images/products/gomita/g-tuna.png';
import gZanahoria from '@/app/images/products/gomita/g-zanahoria.png';

import pBeterraga from '@/app/images/products/pulpa/p-beterraga.png';
import pFrutilla from '@/app/images/products/pulpa/p-frutilla.png';
import pLimon from '@/app/images/products/pulpa/p-limon.png';
import pMandarina from '@/app/images/products/pulpa/p-mandarina.png';
import pManzana from '@/app/images/products/pulpa/p-manzana.png';
import pManzanilla from '@/app/images/products/pulpa/p-manzanilla.png';
import pTuna from '@/app/images/products/pulpa/p-tuna.png';
import pZanahoria from '@/app/images/products/pulpa/p-zanahoria.png';

export const productImages: Record<string, any> = {
  '/images/products/gomita/g-beterraga.png': gBeterraga,
  '/images/products/gomita/g-frutilla.png': gFrutilla,
  '/images/products/gomita/g-limon.png': gLimon,
  '/images/products/gomita/g-mandarina.png': gMandarina,
  '/images/products/gomita/g-manzana.png': gManzana,
  '/images/products/gomita/g-manzanilla.png': gManzanilla,
  '/images/products/gomita/g-tuna.png': gTuna,
  '/images/products/gomita/g-zanahoria.png': gZanahoria,

  '/images/products/pulpa/p-beterraga.png': pBeterraga,
  '/images/products/pulpa/p-frutilla.png': pFrutilla,
  '/images/products/pulpa/p-limon.png': pLimon,
  '/images/products/pulpa/p-mandarina.png': pMandarina,
  '/images/products/pulpa/p-manzana.png': pManzana,
  '/images/products/pulpa/p-manzanilla.png': pManzanilla,
  '/images/products/pulpa/p-tuna.png': pTuna,
  '/images/products/pulpa/p-zanahoria.png': pZanahoria,
};

// Función para obtener imagen por nombre de producto
export function getProductImage(productName: string): string {
  const nameLower = productName.toLowerCase();
  
  // Detectar tipo (gomita o pulpa)
  const isGomita = nameLower.includes('gomita');
  const isPulpa = nameLower.includes('pulpa');
  const prefix = isGomita ? 'g' : isPulpa ? 'p' : 'g';
  const folder = isGomita ? 'gomita' : isPulpa ? 'pulpa' : 'gomita';
  
  // Detectar sabor
  const flavors = ['beterraga', 'frutilla', 'limon', 'mandarina', 'manzana', 'manzanilla', 'tuna', 'zanahoria'];
  let flavor = 'tuna'; // default
  
  for (const f of flavors) {
    if (nameLower.includes(f)) {
      flavor = f;
      break;
    }
  }
  
  const key = `/images/products/${folder}/${prefix}-${flavor}.png`;
  return productImages[key] || gTuna;
}

export default productImages;
