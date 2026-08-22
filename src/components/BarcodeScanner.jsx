// src/components/BarcodeScanner.jsx
import React, { useEffect, useRef, useState } from 'react';
import { X, Camera, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export default function BarcodeScanner({ onDetected, onClose }) {
  const [error, setError] = useState(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const scannerRef = useRef(null);
  const scannerContainerId = 'lomecan-barcode-reader';

  useEffect(() => {
    let html5QrCode = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];

        html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        const config = {
          fps: 15,
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const edge = Math.floor(minEdge * 0.75);
            return { width: Math.max(edge, 220), height: Math.max(Math.floor(edge * 0.55), 140) };
          },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isMounted) {
              if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                navigator.vibrate(50);
              }
              html5QrCode
                .stop()
                .then(() => onDetected(decodedText))
                .catch(() => onDetected(decodedText));
            }
          },
          () => {}
        );

        if (isMounted) {
          setIsInitializing(false);
          try {
            const capabilities = html5QrCode.getRunningTrackCapabilities();
            if (capabilities && 'torch' in capabilities) {
              setHasTorch(true);
            }
          } catch (e) {}
        }
      } catch (err) {
        if (isMounted) {
          // Manejo limpio de cancelación de permisos sin saturar consola
          const isPermissionDismissed = 
            err?.name === 'NotAllowedError' || 
            err?.message?.includes('Permission dismissed') ||
            err?.message?.includes('Permission denied');

          setError(
            isPermissionDismissed
              ? 'Se canceló el permiso de la cámara. Habilita el acceso para escanear.'
              : 'No fue posible acceder a la cámara trasera del dispositivo.'
          );
          setIsInitializing(false);
        }
      }
    };

    const timer = setTimeout(startScanner, 120);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
          scannerRef.current.clear();
        } catch (e) {}
      }
    };
  }, [onDetected, retryCount]);

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextState = !isTorchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-[120] bg-[#050507] flex flex-col items-center justify-between p-6 animate-fade-in select-none">
      
      {/* Barra superior con controles */}
      <div className="w-full flex items-center justify-between z-20 pt-2">
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-3 rounded-full border transition-all active:scale-90 ${
                isTorchOn
                  ? 'bg-[#D4FF00] border-[#D4FF00] text-[#050507] shadow-[0_0_15px_rgba(212,255,0,0.5)]'
                  : 'bg-white/[0.04] border-white/[0.08] text-zinc-400 hover:text-white'
              }`}
              aria-label="Linterna"
            >
              <Zap size={18} />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all"
          aria-label="Cerrar escáner"
        >
          <X size={20} />
        </button>
      </div>

      {/* Visor central del escáner */}
      <div className="w-full max-w-sm flex-1 flex flex-col items-center justify-center my-auto relative">
        
        {error ? (
          <div className="luxury-card p-6 text-center space-y-4 max-w-xs animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-400">
              <Camera size={26} />
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed font-sans">{error}</p>
            
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setRetryCount(prev => prev + 1)}
                className="flex-1 py-3 bg-[#D4FF00] text-[#050507] text-xs font-mono font-black uppercase tracking-wider rounded-xl active:scale-95 shadow-md"
              >
                Reintentar
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 bg-white/[0.04] border border-white/[0.08] text-white text-xs font-bold rounded-xl active:scale-95"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden border border-white/[0.08] bg-black shadow-2xl">
            
            <div id={scannerContainerId} className="w-full h-full object-cover" />

            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-[#D4FF00] rounded-tl-lg drop-shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-[#D4FF00] rounded-tr-lg drop-shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-[#D4FF00] rounded-bl-lg drop-shadow-[0_0_8px_rgba(212,255,0,0.8)]" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-[#D4FF00] rounded-br-lg drop-shadow-[0_0_8px_rgba(212,255,0,0.8)]" />

              <div className="absolute left-6 right-6 h-[2px] bg-[#D4FF00] shadow-[0_0_12px_rgba(212,255,0,0.9)] animate-scan-laser" />
            </div>

            {isInitializing && (
              <div className="absolute inset-0 bg-[#050507] flex flex-col items-center justify-center gap-3 z-10">
                <RefreshCw size={24} className="text-[#D4FF00] animate-spin" />
                <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">Iniciando cámara...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instrucciones inferiores */}
      <div className="w-full text-center pb-4 z-20">
        <p className="text-white text-sm font-bold tracking-tight">
          Apunta al código de barras del producto
        </p>
        <p className="text-zinc-500 text-xs mt-1 font-mono">
          Detección automática de alimentos
        </p>
      </div>

      <style>{`
        @keyframes scan-laser {
          0% { top: 15%; opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { top: 85%; opacity: 0; }
        }
        .animate-scan-laser {
          animation: scan-laser 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        #${scannerContainerId} video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 1.5rem;
        }
      `}</style>
    </div>
  );
}