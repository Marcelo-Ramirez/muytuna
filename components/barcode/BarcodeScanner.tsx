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
  readonly beepVolume?: number;
  readonly beepFrequency?: number;
}

export function BarcodeScanner({
  onProductFound,
  onError,
  className = '',
  placeholder = 'Escanea o ingresa código de barras / SKU...',
  autoFocus = true,
  beepVolume = 0.9,
  beepFrequency = 2000,
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
  // Overlay/focus visual when a barcode is detected
  const [focusRect, setFocusRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  } | null>(null);

  // Reusable AudioContext for beeps
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize and unlock audio on user interaction
  useEffect(() => {
    const initAudio = () => {
      if (!audioContextRef.current) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioContextRef.current = new AudioContextClass();
          }
        } catch (e) {
          console.warn('AudioContext not available', e);
        }
      }
      // Resume if suspended (required by some browsers after user gesture)
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        void audioContextRef.current.resume();
      }
    };

    // Unlock audio on first user interaction (click, touch, keydown)
    const unlockAudio = () => {
      initAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };

    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Simple beep using WebAudio
  const playBeep = (opts?: { durationMs?: number; frequency?: number; volume?: number }) => {
    try {
      const duration = opts?.durationMs ?? 150;
  const freq = opts?.frequency ?? beepFrequency ?? 2000;
      const vol = opts?.volume ?? 0.3;

      const ctx = audioContextRef.current;
      if (!ctx) {
        console.warn('AudioContext not initialized');
        return;
      }

      // Ensure context is running
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }

      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = vol;
      o.connect(g);
      g.connect(ctx.destination);

      const startTime = ctx.currentTime;
      o.start(startTime);
      // Fade out quickly at the end
      g.gain.setValueAtTime(vol, startTime);
      g.gain.exponentialRampToValueAtTime(0.01, startTime + duration / 1000);
      o.stop(startTime + duration / 1000);

      // Clean up nodes after playback
      setTimeout(() => {
        try {
          o.disconnect();
          g.disconnect();
        } catch (e) {
          // ignore if already disconnected
        }
      }, duration + 50);
    } catch (err) {
      console.warn('Beep failed', err);
    }
  };

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
          // do not refocus the input after a scan to avoid stealing focus
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
            // compute focus rectangle from result points and show visual feedback
            try {
              const points = (result as any).getResultPoints?.() as
                | Array<{ x: number; y: number }>
                | undefined;

              if (videoRef.current && points && points.length > 0) {
                const video = videoRef.current as HTMLVideoElement;
                const rect = video.getBoundingClientRect();

                // Map points (camera coordinate space) into video element coordinates.
                // ZXing result points are in the image coordinate system; we approximate by
                // normalizing by videoWidth/videoHeight if available, else use bounding box.
                const videoWidth = (video.videoWidth && video.videoWidth > 0) ? video.videoWidth : rect.width;
                const videoHeight = (video.videoHeight && video.videoHeight > 0) ? video.videoHeight : rect.height;

                const xs = points.map((p) => p.x);
                const ys = points.map((p) => p.y);
                const minX = Math.min(...xs);
                const maxX = Math.max(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);

                // scale to element size
                const scaleX = rect.width / videoWidth;
                const scaleY = rect.height / videoHeight;

                const fx = (minX * scaleX);
                const fy = (minY * scaleY);
                const fwidth = Math.max(24, (maxX - minX) * scaleX);
                const fheight = Math.max(20, (maxY - minY) * scaleY * 1.6);

                // convert to relative coords within video container
                const containerRect = video.parentElement?.getBoundingClientRect() || rect;
                const relX = fx;
                const relY = fy;

                setFocusRect({ x: relX, y: relY, width: fwidth, height: fheight, visible: true });

                // play beep for new codes
                if (text && text !== lastScanRef.current) {
                  playBeep({ volume: beepVolume });
                }

                // hide after 1s but keep scanner running
                window.setTimeout(() => {
                  setFocusRect((s) => (s ? { ...s, visible: false } : s));
                }, 1000);
              } else if (videoRef.current) {
                // fallback: center small rect
                const video = videoRef.current as HTMLVideoElement;
                const rect = video.getBoundingClientRect();
                const fwidth = Math.min(240, rect.width * 0.6);
                const fheight = Math.min(160, rect.height * 0.4);
                const fx = (rect.width - fwidth) / 2;
                const fy = (rect.height - fheight) / 2;
                setFocusRect({ x: fx, y: fy, width: fwidth, height: fheight, visible: true });
                if (text && text !== lastScanRef.current) {
                  playBeep({ volume: beepVolume });
                }
                window.setTimeout(() => {
                  setFocusRect((s) => (s ? { ...s, visible: false } : s));
                }, 1000);
              }
            } catch (err) {
              // ignore overlay errors
              console.warn('Error computing focus rect', err);
            }

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
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full aspect-video object-cover bg-black"
                muted
                autoPlay
                playsInline
              />

              {/* Focus overlay: positioned absolutely over the video element */}
              {focusRect && (
                <div
                  aria-hidden
                  className={`pointer-events-none absolute transition-opacity duration-200 ease-out ${
                    focusRect.visible ? 'opacity-100' : 'opacity-0'
                  }`}
                  style={{
                    left: focusRect.x,
                    top: focusRect.y,
                    width: focusRect.width,
                    height: focusRect.height,
                    boxShadow: focusRect.visible
                      ? '0 0 12px 4px rgba(34,197,94,0.85), inset 0 0 8px rgba(34,197,94,0.35)'
                      : 'none',
                    border: '2px solid rgba(34,197,94,0.95)',
                    borderRadius: 6,
                    mixBlendMode: 'screen',
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
