'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { BarcodePrintable } from '@/components/barcode/BarcodePrintable';
import { Printer, ArrowLeft, RefreshCw } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  flavor: string;
  type: string;
  sku: string | null;
  barcode: string | null;
  barcodeFormat: string | null;
  pricePerUnit: number;
}

export default function ProductBarcodePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const productId = (params.productId as string) || (params.id as string);
  const printRef = useRef<HTMLDivElement>(null);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [copies, setCopies] = useState(1);
  const [includePrice, setIncludePrice] = useState(true);
  const [includeDetails, setIncludeDetails] = useState(true);
  const [expiryDate, setExpiryDate] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  
  // Serialization State
  const [isSerializedMode, setIsSerializedMode] = useState(false);
  const [sequenceRange, setSequenceRange] = useState<{start: number, end: number} | null>(null);

  const fetchProduct = useCallback(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/system/inventory/products/${productId}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.product);
        }
      } catch (error) {
        console.error('Error cargando producto:', error);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    const copiesParam = searchParams.get('copies');
    if (copiesParam) {
      const parsed = parseInt(copiesParam, 10);
      if (!Number.isNaN(parsed)) {
        setCopies(Math.min(50, Math.max(1, parsed)));
      }
    }

    const expiryParam = searchParams.get('expiryDate');
    if (expiryParam) {
      setExpiryDate(expiryParam);
    }

    const batchParam = searchParams.get('batchNumber');
    if (batchParam) {
      setBatchNumber(batchParam);
    }
  }, [searchParams]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Codigo-Barras-${product?.name || productId}`,
  });

  const handlePrintWithSequence = async () => {
    if (!isSerializedMode) {
      handlePrint();
      return;
    }

    try {
      // 1. Reservar secuencia
      const res = await fetch('/api/system/barcode/sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product?.id,
          count: copies
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // 2. Actualizar estado para que el componente BarcodePrintable se actualice
      setSequenceRange({ start: data.start, end: data.end });

      // 3. Esperar un momento para que el DOM se actualice antes de imprimir
      setTimeout(() => {
        handlePrint();
      }, 100);

    } catch (error) {
      console.error('Error reservando secuencia:', error);
      alert('Error al preparar impresión serializada');
    }
  };

  const handleGenerateNewBarcode = async () => {
    if (!product) return;

    try {
      const res = await fetch('/api/system/barcode/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: product.type,
          flavor: product.flavor,
          productId: product.id,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Error generando código');
      }

      // Update product in database
      const updateRes = await fetch(`/api/system/inventory/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: data.sku,
          barcode: data.barcode,
          barcodeFormat: data.barcodeFormat,
        }),
      });
      const updateData = await updateRes.json();
      if (!updateData.success) {
        throw new Error(updateData.error || 'Error actualizando producto');
      }

      // Reload product
      fetchProduct();
    } catch (error) {
      console.error('Error generando nuevo código:', error);
      alert('Error generando nuevo código');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-destructive">Producto no encontrado</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Etiqueta de Código de Barras
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              {product.name}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Configuración</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="copies" className="text-foreground">
                  Número de Copias
                </Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="50"
                  value={copies}
                  onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                  className="bg-background text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Máximo 50 copias
                </p>
              </div>

              {/* Serialized Mode Toggle */}
              <div className="flex items-center space-x-2 pt-2 border-t">
                <div
                  onClick={() => {
                    setIsSerializedMode(!isSerializedMode);
                    setSequenceRange(null); // Reset range when toggling
                  }}
                  className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center ${
                    isSerializedMode ? 'bg-blue-600 border-blue-600' : 'border-muted-foreground'
                  }`}
                >
                  {isSerializedMode && (
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <Label
                  className="text-sm font-medium cursor-pointer text-foreground"
                  onClick={() => {
                    setIsSerializedMode(!isSerializedMode);
                    setSequenceRange(null);
                  }}
                >
                  Modo Serializado (Único por etiqueta)
                </Label>
              </div>
              {isSerializedMode && (
                 <p className="text-xs text-blue-500 ml-7">
                   Cada etiqueta tendrá un código único (ej. -001, -002) para seguimiento individual.
                 </p>
              )}

              <div className="flex items-center space-x-2">
                <div
                  onClick={() => setIncludePrice(!includePrice)}
                  className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center ${
                    includePrice ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}
                >
                  {includePrice && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <Label
                  htmlFor="includePrice"
                  className="text-sm font-normal cursor-pointer text-foreground"
                  onClick={() => setIncludePrice(!includePrice)}
                >
                  Incluir precio en la etiqueta
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <div
                  onClick={() => setIncludeDetails(!includeDetails)}
                  className={`w-5 h-5 rounded border-2 cursor-pointer flex items-center justify-center ${
                    includeDetails ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}
                >
                  {includeDetails && (
                    <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <Label
                  htmlFor="includeDetails"
                  className="text-sm font-normal cursor-pointer text-foreground"
                  onClick={() => setIncludeDetails(!includeDetails)}
                >
                  Incluir detalles (tipo, sabor, SKU)
                </Label>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-sm text-muted-foreground">Número de lote</Label>
                  <Input
                    value={batchNumber || 'No especificado'}
                    disabled
                    className="bg-muted-foreground/10 text-foreground mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Fecha de vencimiento del lote</Label>
                  <Input
                    value={expiryDate ? new Date(expiryDate).toLocaleDateString() : 'Sin fecha'}
                    disabled
                    className="bg-muted-foreground/10 text-foreground mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Información del Código</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">SKU</p>
                <p className="font-mono text-sm text-foreground">
                  {product.sku || 'No generado'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Código de Barras</p>
                <p className="font-mono text-sm text-foreground">
                  {product.barcode || 'No generado'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Formato</p>
                <p className="text-sm text-foreground">
                  {product.barcodeFormat || 'CODE128'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button
              onClick={handlePrintWithSequence}
              className="w-full"
              size="lg"
              variant={isSerializedMode ? "default" : "secondary"}
            >
              <Printer className="h-5 w-5 mr-2" />
              {isSerializedMode 
                ? `Imprimir ${copies} Únicos` 
                : `Imprimir ${copies > 1 ? `${copies} Copias` : 'Etiqueta'}`
              }
            </Button>

            <Button
              onClick={handleGenerateNewBarcode}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Generar Nuevo Código
            </Button>
          </div>
        </div>

        {/* Preview Panel */}
        <div>
          <Card className="bg-card sticky top-4">
            <CardHeader>
              <CardTitle className="text-foreground">Vista Previa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-border rounded-lg p-4 bg-background/50 overflow-auto max-h-[600px]">
                {product.barcode || product.sku ? (
                  <div className="scale-90 origin-top">
                    <BarcodePrintable
                      product={product}
                      copies={Math.min(copies, 3)} // Show max 3 in preview
                      includePrice={includePrice}
                      includeDetails={includeDetails}
                      showBatchInfo={Boolean(batchNumber || expiryDate)}
                      batchNumber={batchNumber || undefined}
                      expiryDate={expiryDate || null}
                      startSequence={isSerializedMode ? 1 : undefined} // Preview starts at 1
                      endSequence={isSerializedMode ? copies : undefined}
                    />
                    {copies > 3 && (
                      <p className="text-center text-xs text-muted-foreground mt-4">
                        ... y {copies - 3} más
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      Este producto no tiene código de barras generado
                    </p>
                    <Button onClick={handleGenerateNewBarcode}>
                      Generar Código
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Hidden Print Area */}
      <div className="hidden print:block">
        <div ref={printRef}>
          {product.barcode || product.sku ? (
            <BarcodePrintable
              product={product}
              copies={copies}
              includePrice={includePrice}
              includeDetails={includeDetails}
              showBatchInfo={Boolean(batchNumber || expiryDate)}
              batchNumber={batchNumber || undefined}
              expiryDate={expiryDate || null}
              startSequence={sequenceRange?.start}
              endSequence={sequenceRange?.end}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
