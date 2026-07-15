import React, { useEffect, useRef, useState } from 'react';
import { X, Camera } from 'lucide-react';

export default function BarcodeScanner({ onDetected, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState(null);

  // Toda la lógica del scanner permanece exactamente igual
  useEffect(() => {
    if (!('BarcodeDetector' in window)) {
      setError('Tu navegador no soporta escaneo de códigos.');
      return;
    }
    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] });
    let stream;
    let stopped = false;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) videoRef.current.srcObject = stream;
        scanLoop(detector);
      } catch (e) {
        setError('No se pudo acceder a la cámara.');
      }
    };

    const scanLoop = async (detector) => {
      if (stopped) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          onDetected(barcodes[0].rawValue);
          return;
        }
      } catch (e) {}
      requestAnimationFrame(() => scanLoop(detector));
    };

    startCamera();
    return () => {
      stopped = true;
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-[#09090B] flex flex-col items-center justify-center p-6 animate-fade-in">
      {/* Botón de cierre premium */}
      <button 
        onClick={onClose} 
        className="absolute top-6 right-6 p-3 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all z-10"
        aria-label="Cerrar escáner"
      >
        <X size={22} />
      </button>

      {error ? (
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
            <Camera size={28} className="text-zinc-500" />
          </div>
          <p className="text-zinc-400 text-sm font-medium">{error}</p>
        </div>
      ) : (
        <>
          {/* Contenedor del visor con marco y línea de escaneo animada */}
          <div className="relative w-full max-w-sm">
            {/* Borde decorativo exterior */}
            <div className="absolute -inset-3 border-2 border-white/[0.06] rounded-[2.5rem] pointer-events-none" />
            
            {/* Video */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/40"
            />

            {/* Línea de escaneo animada */}
            <div className="absolute left-4 right-4 top-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#D4FF00] to-transparent animate-scan-line pointer-events-none shadow-[0_0_8px_rgba(212,255,0,0.6)]" />

            {/* Esquinas decorativas */}
            <div className="absolute top-3 left-3 w-8 h-8 border-t-2 border-l-2 border-[#D4FF00]/40 rounded-tl-xl pointer-events-none" />
            <div className="absolute top-3 right-3 w-8 h-8 border-t-2 border-r-2 border-[#D4FF00]/40 rounded-tr-xl pointer-events-none" />
            <div className="absolute bottom-3 left-3 w-8 h-8 border-b-2 border-l-2 border-[#D4FF00]/40 rounded-bl-xl pointer-events-none" />
            <div className="absolute bottom-3 right-3 w-8 h-8 border-b-2 border-r-2 border-[#D4FF00]/40 rounded-br-xl pointer-events-none" />
          </div>

          {/* Instrucción */}
          <div className="mt-6 text-center">
            <p className="text-zinc-400 text-sm font-medium tracking-wide">
              Apunta al código de barras
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              El escaneo es automático
            </p>
          </div>
        </>
      )}

      {/* Estilos para la línea de escaneo */}
      <style>{`
        @keyframes scan-line {
          0% { top: 20%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}