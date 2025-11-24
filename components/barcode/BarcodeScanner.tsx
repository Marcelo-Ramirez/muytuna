'use client';

import { useState, useRef, useEffect } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import type { Result } from '@zxing/library';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Barcode, Loader2, AlertCircle, CheckCircle2, Camera, CameraOff } from 'lucide-react';

interface BatchSummary {
  id: number;
  batchNumber: string;
  remaining: number;
  expiryDate: string | null;
  productionDate: string;
}

interface Product {
  id: number;
  name: string;
  flavor: string;
  type: string;
  sku: string | null;
  barcode: string | null;
  pricePerUnit: number;
  currentQuantity: number;
  batches?: BatchSummary[];
}

interface ScanMeta {
  totalStock: number;
  batch?: BatchSummary | null;
}

interface BarcodeScannerProps {
  readonly onProductFound: (product: Product, batchId?: number, meta?: ScanMeta) => void;
  readonly onError?: (error: string) => void;
  readonly className?: string;
  readonly placeholder?: string;
  readonly autoFocus?: boolean;
}

export function BarcodeScanner({
  onProductFound,
  onError,
  className = '',
  placeholder = 'Escanea o ingresa código de barras / SKU...',
  autoFocus = true,
}: BarcodeScannerProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef<string>('');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [initializingCamera, setInitializingCamera] = useState(false);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSearch = async (searchCode: string) => {
    if (!searchCode.trim()) return;

    setLoading(true);
    setLastResult(null);

    try {
      const res = await fetch(
        `/api/system/inventory/products/search-by-barcode?code=${encodeURIComponent(
          searchCode
        )}`
      );
      const data = await res.json();

      if (data.success && data.product) {
        setLastResult({
          type: 'success',
          message: `${data.product.name} encontrado`,
        });

        // Get oldest batch if FIFO exists
        const oldestBatch = data.oldestBatch as BatchSummary | undefined;
        onProductFound(data.product, oldestBatch?.id, {
          totalStock: data.totalStock,
          batch: oldestBatch || null,
        });

        // Clear input after short delay
        setTimeout(() => {
          setCode('');
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }, 500);
      } else {
        const errorMsg = data.error || 'Producto no encontrado';
        setLastResult({
          type: 'error',
          message: errorMsg,
        });
        onError?.(errorMsg);
      }
    } catch (error) {
      console.error('Error buscando producto:', error);
      const errorMsg = 'Error al buscar producto';
      setLastResult({
        type: 'error',
        message: errorMsg,
      });
      onError?.(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(code);
    }
  };

  const stopCamera = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (stream) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!cameraEnabled) {
      stopCamera();
      setInitializingCamera(false);
      return;
    }

    if (!videoRef.current) return;

    const reader = new BrowserMultiFormatReader();
    setCameraError(null);
    setInitializingCamera(true);

    let isMounted = true;

    reader
      .decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result: Result | undefined, error: unknown, controls?: IScannerControls) => {
          if (!isMounted) {
            controls?.stop();
            return;
          }
          if (controls) {
            controlsRef.current = controls;
          }
          if (result) {
            const text = result.getText();
            if (text && text !== lastScanRef.current) {
              lastScanRef.current = text;
              handleSearch(text);
            }
          }
        }
      )
      .then(() => {
        if (isMounted) {
          setInitializingCamera(false);
        }
      })
      .catch((err: unknown) => {
        console.error('Error inicializando cámara:', err);
        if (isMounted) {
          let errorMessage = 'No se pudo acceder a la cámara.';
          if (err instanceof Error) {
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
              errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
              errorMessage = 'No se encontró ninguna cámara.';
            } else if (
              err.name === 'NotSupportedError' ||
              err.message.includes('secure context')
            ) {
              errorMessage =
                'El acceso a la cámara requiere HTTPS o localhost. Si estás en móvil, asegúrate de usar HTTPS.';
            }
          }
          setCameraError(errorMessage);
          setCameraEnabled(false);
        }
      });

    return () => {
      isMounted = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraEnabled]);

  const toggleCamera = () => {
    if (cameraEnabled) {
      setCameraEnabled(false);
      lastScanRef.current = '';
    } else {
      setCameraEnabled(true);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="barcode-input" className="flex items-center gap-2 text-foreground">
        <Barcode className="h-4 w-4" />
        Escanear Código de Barras
      </Label>

      <div className="relative">
        <Input
          ref={inputRef}
          id="barcode-input"
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={loading}
          className="bg-background text-foreground pr-10 font-mono"
          autoComplete="off"
        />

        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && lastResult && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {lastResult.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}
      </div>

      {lastResult && (
        <Card
          className={`border-2 ${
            lastResult.type === 'success'
              ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
              : 'border-destructive bg-destructive/10'
          }`}
        >
          <CardContent className="py-2 px-3">
            <p
              className={`text-sm ${
                lastResult.type === 'success'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-destructive'
              }`}
            >
              {lastResult.message}
            </p>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        💡 Tip: Mantén el cursor en este campo para escanear rápidamente
      </p>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={cameraEnabled ? 'destructive' : 'outline'}
            size="sm"
            onClick={toggleCamera}
            disabled={initializingCamera}
          >
            {cameraEnabled ? (
              <>
                <CameraOff className="h-4 w-4 mr-2" />
                Detener cámara
              </>
            ) : (
              <>
                <Camera className="h-4 w-4 mr-2" />
                Activar cámara
              </>
            )}
          </Button>
          {initializingCamera && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Inicializando cámara...
            </div>
          )}
        </div>

        {cameraError && (
          <p className="text-xs text-destructive">{cameraError}</p>
        )}

        {cameraEnabled && (
          <div className="rounded-md border border-dashed border-border overflow-hidden">
            <video
              ref={videoRef}
              className="w-full aspect-video object-cover bg-black"
              muted
              autoPlay
              playsInline
            />
          </div>
        )}
      </div>
    </div>
  );
}
