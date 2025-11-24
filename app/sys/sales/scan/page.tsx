'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { BarcodeScanner } from '@/components/barcode/BarcodeScanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BatchSummary {
  id: number;
  batchNumber: string;
  remaining: number;
  expiryDate: string | null;
  productionDate: string;
}

interface ProductSummary {
  id: number;
  name: string;
  type: string;
  flavor: string;
  sku: string | null;
  barcode: string | null;
  pricePerUnit: number;
}

interface ScanMeta {
  totalStock: number;
  batch?: BatchSummary | null;
}

function SalesScannerContent() {
  const router = useRouter();
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [batch, setBatch] = useState<BatchSummary | null>(null);
  const [meta, setMeta] = useState<ScanMeta | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('Salida por venta');
  const [loading, setLoading] = useState(false);

  const handleProductFound = (
    foundProduct: ProductSummary,
    batchId?: number,
    scanMeta?: ScanMeta
  ) => {
    setProduct(foundProduct);
    setMeta(scanMeta || null);
    const resolvedBatch = scanMeta?.batch || null;
    setBatch(resolvedBatch);
    setQuantity(1);
    if (!reason) {
      setReason('Salida por venta');
    }
  };

  const maxAvailable = batch?.remaining ?? meta?.totalStock ?? 0;

  const handleConsume = async () => {
    if (!product || !batch) {
      toast.error('Debe escanear un producto con lote disponible.');
      return;
    }

    if (quantity <= 0 || quantity > maxAvailable) {
      toast.error('Cantidad inválida para este lote.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/system/inventory/batches/${batch.id}/consume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity, reason }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'No se pudo registrar la salida');
      }

      toast.success('Salida registrada', {
        description: `${quantity} und. descontadas de ${product.name}`,
      });

      // Reset to allow nuevo escaneo
      setProduct(null);
      setBatch(null);
      setMeta(null);
      setQuantity(1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!product) return;
    const copies = Math.min(50, Math.max(1, quantity));
    router.push(`/sys/stockroom/products/${product.id}/barcode?copies=${copies}`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Escanear y Entregar</h1>
        <p className="text-sm text-muted-foreground">
          Escanea el código de barras para descontar del lote más antiguo y, si necesitas, imprime etiquetas.
        </p>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Escáner</CardTitle>
        </CardHeader>
        <CardContent>
          <BarcodeScanner onProductFound={handleProductFound} />
        </CardContent>
      </Card>

      {product && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Producto detectado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-1">
              <p className="text-lg font-semibold text-foreground">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {product.type} · {product.flavor}
              </p>
              <div className="flex flex-wrap gap-2 text-xs">
                {product.sku && <Badge variant="secondary">SKU: {product.sku}</Badge>}
                {product.barcode && <Badge variant="outline">Barcode: {product.barcode}</Badge>}
                {meta?.totalStock !== undefined && (
                  <Badge variant="default">Stock total: {meta.totalStock}</Badge>
                )}
              </div>
            </div>

            {batch ? (
              <div className="p-3 rounded-md border bg-background/80">
                <p className="text-sm font-medium text-foreground">Lote sugerido (FIFO)</p>
                <p className="text-xs text-muted-foreground">{batch.batchNumber}</p>
                <p className="text-sm mt-2">
                  Disponible: <span className="font-semibold">{batch.remaining}</span> unidades
                </p>
                {batch.expiryDate && (
                  <p className="text-xs text-muted-foreground">
                    Vence: {new Date(batch.expiryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay lotes disponibles con stock.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cantidad a entregar</Label>
                <Input
                  type="number"
                  min={1}
                  max={maxAvailable || 1}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                />
                <p className="text-xs text-muted-foreground">
                  Máximo disponible en lote: {maxAvailable}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Salida por venta"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-end">
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!product}
              >
                Imprimir {quantity} etiquetas
              </Button>
              <Button onClick={handleConsume} disabled={loading || !batch}>
                {loading ? 'Procesando...' : 'Confirmar salida'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SalesScanPage() {
  return (
    <ProtectedRoute requiredRole="sales">
      <SalesScannerContent />
    </ProtectedRoute>
  );
}
