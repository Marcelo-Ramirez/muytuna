'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Package, Plus, ArrowLeft, Calendar } from 'lucide-react';

interface ProductBatch {
  id: number;
  batchNumber: string;
  quantity: number;
  remaining: number;
  productionDate: string;
  expiryDate: string | null;
  notes: string | null;
}

interface Product {
  id: number;
  name: string;
  flavor: string;
  type: string;
  currentQuantity: number;
}

export default function ProductBatchesPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.productId as string; // FIX: usar productId no id

  const [product, setProduct] = useState<Product | null>(null);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    quantity: '',
    expiryDate: '',
    productionDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [productId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch product
      const prodRes = await fetch(`/api/system/inventory/products/${productId}`);
      const prodData = await prodRes.json();
      if (prodData.success) {
        setProduct(prodData.product);
      }

      // Fetch batches
      const batchRes = await fetch(`/api/system/inventory/products/${productId}/batches`);
      const batchData = await batchRes.json();
      if (batchData.success) {
        setBatches(batchData.batches || []);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch(`/api/system/inventory/products/${productId}/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        // Reset form
        setFormData({
          quantity: '',
          expiryDate: '',
          productionDate: new Date().toISOString().split('T')[0],
          notes: '',
        });
        setShowForm(false);
        // Reload data
        fetchData();
      } else {
        alert(data.error || 'Error creando lote');
      }
    } catch (error) {
      console.error('Error creando lote:', error);
      alert('Error creando lote');
    }
  };

  const handlePrintLabels = (batch: ProductBatch) => {
    const normalizeCopies = (value: number | null | undefined) => {
      const base = value && value > 0 ? value : 1;
      return Math.min(50, Math.max(1, Math.round(base)));
    };

    const params = new URLSearchParams();
    params.set('copies', normalizeCopies(batch.remaining).toString());
    if (batch.expiryDate) {
      params.set('expiryDate', batch.expiryDate.split('T')[0] || batch.expiryDate);
    }
    if (batch.batchNumber) {
      params.set('batchNumber', batch.batchNumber);
    }

    router.push(`/sys/stockroom/products/${productId}/barcode?${params.toString()}`);
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

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
              Gestión de Lotes
            </h1>
            {product && (
              <p className="text-sm md:text-base text-muted-foreground mt-1">
                {product.name} - {product.type} {product.flavor}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Lote
        </Button>
      </div>

      {/* Stock Summary */}
      {product && (
        <Card className="mb-6 bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Stock Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl md:text-4xl font-bold text-primary">
              {product.currentQuantity} unidades
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Distribuidas en {batches.length} lote(s)
            </p>
          </CardContent>
        </Card>
      )}

      {/* New Batch Form */}
      {showForm && (
        <Card className="mb-6 bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Registrar Nuevo Lote</CardTitle>
            <CardDescription>Ingresa los detalles del lote que llegó al almacén</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="quantity" className="text-foreground">
                    Cantidad <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({ ...formData, quantity: e.target.value })
                    }
                    placeholder="100"
                    className="bg-background text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="productionDate" className="text-foreground">
                    Fecha de Producción
                  </Label>
                  <Input
                    id="productionDate"
                    type="date"
                    value={formData.productionDate}
                    onChange={(e) =>
                      setFormData({ ...formData, productionDate: e.target.value })
                    }
                    className="bg-background text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="expiryDate" className="text-foreground">
                    Fecha de Vencimiento
                  </Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expiryDate: e.target.value })
                    }
                    className="bg-background text-foreground"
                  />
                </div>

                <div>
                  <Label htmlFor="notes" className="text-foreground">
                    Notas (opcional)
                  </Label>
                  <Input
                    id="notes"
                    type="text"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Lote especial, turno matutino, etc."
                    className="bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button type="submit" className="w-full sm:w-auto">
                  Registrar Lote
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Batches List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Package className="h-5 w-5" />
          Lotes Activos
        </h2>

        {batches.length === 0 ? (
          <Card className="bg-card">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay lotes registrados aún
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="mt-4"
                variant="outline"
              >
                Crear Primer Lote
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {batches.map((batch) => (
              <Card
                key={batch.id}
                className={`bg-card border-2 ${
                  isExpired(batch.expiryDate)
                    ? 'border-destructive'
                    : isExpiringSoon(batch.expiryDate)
                    ? 'border-yellow-500 dark:border-yellow-600'
                    : 'border-border'
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono text-foreground">
                      {batch.batchNumber}
                    </CardTitle>
                    {isExpired(batch.expiryDate) && (
                      <span className="text-xs bg-destructive text-destructive-foreground px-2 py-1 rounded">
                        Vencido
                      </span>
                    )}
                    {!isExpired(batch.expiryDate) && isExpiringSoon(batch.expiryDate) && (
                      <span className="text-xs bg-yellow-500 text-white dark:bg-yellow-600 px-2 py-1 rounded flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Próximo
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {batch.remaining}
                      <span className="text-sm text-muted-foreground font-normal ml-1">
                        / {batch.quantity} un.
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">Disponibles</p>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">
                        Prod: {new Date(batch.productionDate).toLocaleDateString()}
                      </span>
                    </div>
                    {batch.expiryDate && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">
                          Vence: {new Date(batch.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {batch.notes && (
                    <p className="text-xs text-muted-foreground italic mt-2">
                      {batch.notes}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    className="w-full mt-4"
                    onClick={() => handlePrintLabels(batch)}
                  >
                    Imprimir etiquetas
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
