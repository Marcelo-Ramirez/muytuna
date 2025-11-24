'use client';

import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'

interface BarcodeGeneratorProps {
  value: string
  format?: 'CODE128' | 'EAN13' | 'UPC'
  width?: number
  height?: number
  displayValue?: boolean
  className?: string
}

export function BarcodeGenerator({
  value,
  format = 'CODE128',
  width = 2,
  height = 100,
  displayValue = true,
  className = '',
}: BarcodeGeneratorProps) {
  const barcodeRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (barcodeRef.current && value) {
      try {
        JsBarcode(barcodeRef.current, value, {
          format,
          width,
          height,
          displayValue,
          fontSize: 14,
          margin: 10,
        })
      } catch (error) {
        console.error('Error generando código de barras:', error)
      }
    }
  }, [value, format, width, height, displayValue])

  if (!value) {
    return (
      <div className="text-muted-foreground text-sm">
        No hay código disponible
      </div>
    )
  }

  return <svg ref={barcodeRef} className={className} />
}
