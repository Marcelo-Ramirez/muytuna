'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarcodePrintable } from '@/components/barcode/BarcodePrintable';
import { Printer, ArrowLeft, Check } from 'lucide-react';

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

export default function BulkPrintLabelsPage() {
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/system/inventory/products');
      const data = await res.json();
      if (data.success) {
        // Filter products that have barcodes
        const productsWithBarcodes = data.products.filter(
          (p: Product) => p.barcode || p.sku
        );
        setProducts(productsWithBarcodes);
      }
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Etiquetas-${new Date().toISOString().split('T')[0]}`,
  });

  const selectedProducts = products.filter(p => selectedIds.has(p.id));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-6xl">
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
              Impresión Masiva de Etiquetas
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Selecciona productos para imprimir sus etiquetas
            </p>
          </div>
        </div>
      </div>

      {/* Selection Summary & Actions */}
      <Card className="mb-6 bg-card">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-foreground">
                {selectedIds.size} de {products.length} productos seleccionados
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedIds.size > 0
                  ? `Se imprimirán ${selectedIds.size} etiquetas (1 por producto)`
                  : 'Selecciona productos para imprimir'}
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={handleSelectAll}
                className="flex-1 sm:flex-none"
              >
                {selectedIds.size === products.length ? 'Deseleccionar Todo' : 'Seleccionar Todo'}
              </Button>
              <Button
                onClick={() => handlePrint()}
                disabled={selectedIds.size === 0}
                className="flex-1 sm:flex-none"
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product List */}
      {products.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No hay productos con códigos de barras generados
            </p>
            <Button onClick={() => router.push('/sys/stockroom/products')}>
              Ver Productos
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card
              key={product.id}
              className={`cursor-pointer transition-all bg-card ${
                selectedIds.has(product.id)
                  ? 'ring-2 ring-primary'
                  : 'hover:ring-1 hover:ring-border'
              }`}
              onClick={() => handleToggle(product.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base text-foreground">
                      {product.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {product.type} - {product.flavor}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      selectedIds.has(product.id)
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground'
                    }`}
                  >
                    {selectedIds.has(product.id) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                <div>
                  <p className="text-xs text-muted-foreground">SKU</p>
                  <p className="font-mono text-xs text-foreground">
                    {product.sku || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Código de Barras</p>
                  <p className="font-mono text-xs text-foreground">
                    {product.barcode || product.sku || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Precio</p>
                  <p className="text-sm font-semibold text-primary">
                    S/ {product.pricePerUnit.toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hidden Print Area */}
      <div className="hidden print:block">
        <div ref={printRef}>
          {selectedProducts.map((product) => (
            <div key={product.id} className="break-after-page">
              <BarcodePrintable
                product={product}
                copies={1}
                includePrice={true}
                includeDetails={true}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
