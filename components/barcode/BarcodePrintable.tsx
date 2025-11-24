'use client';

import { forwardRef } from 'react'
import { BarcodeGenerator } from './BarcodeGenerator'

interface Product {
  id: number
  name: string
  flavor: string
  type: string
  sku?: string | null
  barcode?: string | null
  barcodeFormat?: string | null
  pricePerUnit: number
}

interface BarcodePrintableProps {
  product: Product
  includePrice?: boolean
  includeDetails?: boolean
  copies?: number
  batchNumber?: string
  productionDate?: string | null
  expiryDate?: string | null
  showBatchInfo?: boolean
  startSequence?: number
  endSequence?: number
}

export const BarcodePrintable = forwardRef<HTMLDivElement, BarcodePrintableProps>(
  (
    {
      product,
      includePrice = true,
      includeDetails = true,
      copies = 1,
      batchNumber,
      productionDate,
      expiryDate,
      showBatchInfo = false,
      startSequence,
      endSequence,
    },
    ref
  ) => {
    const baseBarcodeValue = product.barcode || product.sku || `PROD-${product.id}`;
    const barcodeFormat = (product.barcodeFormat as 'CODE128' | 'EAN13' | 'UPC') ||  'CODE128';
    
    // Si hay secuencia, generamos los valores únicos
    const isSerialized = startSequence !== undefined && endSequence !== undefined;
    const totalCopies = isSerialized ? (endSequence! - startSequence! + 1) : copies;

    // Si es serializado, FORZAMOS CODE128 porque EAN13/UPC no soportan letras ni guiones extra
    const effectiveFormat = isSerialized ? 'CODE128' : ((product.barcodeFormat as 'CODE128' | 'EAN13' | 'UPC') || 'CODE128');

    const getBarcodeValue = (index: number) => {
      if (!isSerialized) return baseBarcodeValue;
      const sequence = startSequence! + index;
      // Formato: BASE-0001 (padding de 4 ceros)
      const sequenceStr = sequence.toString().padStart(4, '0');
      return `${baseBarcodeValue}-${sequenceStr}`;
    };

    const formatDate = (date?: string | null) =>
      date ? new Date(date).toLocaleDateString() : null;

    return (
      <div ref={ref} className="p-4 bg-white">
        {Array.from({ length: totalCopies }).map((_, index) => {
          const barcodeValue = getBarcodeValue(index);
          
          return (
          <div
            key={`${barcodeValue}-${index}`}
            className="border-2 border-dashed border-gray-400 p-4 mb-4 break-after-page bg-white"
            style={{ width: '10cm', minHeight: '5cm' }}
          >
            {/* Nombre del producto */}
            <div className="text-center mb-2">
              <h3 className="text-lg font-bold text-black">{product.name}</h3>
              {includeDetails && (
                <p className="text-sm text-gray-600">
                  {product.type} - {product.flavor}
                </p>
              )}
            </div>

            {/* Código de barras */}
            <div className="flex justify-center mb-2">
              <BarcodeGenerator
                value={barcodeValue}
                format={effectiveFormat}
                width={2}
                height={80}
              />
            </div>

            {showBatchInfo && (batchNumber || productionDate || expiryDate) && (
              <div className="text-xs text-gray-600 space-y-0.5 text-center mb-2">
                {batchNumber && <p>Lote: {batchNumber}</p>}
                {productionDate && (
                  <p>Prod: {formatDate(productionDate)}</p>
                )}
                {expiryDate && <p>Vence: {formatDate(expiryDate)}</p>}
              </div>
            )}

            {/* Precio */}
            {includePrice && (
              <div className="text-center">
                <p className="text-2xl font-bold text-black">
                  S/ {product.pricePerUnit.toFixed(2)}
                </p>
              </div>
            )}

            {/* SKU */}
            {includeDetails && product.sku && (
              <div className="text-center text-xs text-gray-500 mt-2">
                SKU: {product.sku}
              </div>
            )}

            {/* Número de copia o Secuencia */}
            {(copies > 1 || isSerialized) && (
              <div className="text-center text-xs text-gray-400 mt-1">
                {isSerialized 
                  ? `Serie: ${(startSequence! + index).toString().padStart(4, '0')}`
                  : `Copia ${index + 1} de ${copies}`
                }
              </div>
            )}
          </div>
        )})}
      </div>
    )
  }
)

BarcodePrintable.displayName = 'BarcodePrintable'
