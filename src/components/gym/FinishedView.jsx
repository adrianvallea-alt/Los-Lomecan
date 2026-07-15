import React, { useState, useRef, useEffect } from 'react';
import { Award, Download, Share2, Check } from 'lucide-react';

export default function FinishedView({ onRestart }) {
  const [showShareOptions, setShowShareOptions] = useState(false);
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);

  // Generar imagen de marca personalizada con identidad visual correcta
  const generateShareImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;

    // Fondo oscuro premium
    ctx.fillStyle = '#09090B';
    ctx.fillRect(0, 0, 400, 300);

    // Aura central sutil
    const gradient = ctx.createRadialGradient(200, 120, 20, 200, 120, 180);
    gradient.addColorStop(0, 'rgba(212,255,0,0.08)');
    gradient.addColorStop(1, 'rgba(9,9,11,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);

    // Título principal
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('¡Entrenamiento', 200, 70);
    ctx.fillText('Completado!', 200, 105);

    // Acento neón amarillo
    ctx.fillStyle = '#D4FF00';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText('LOMECAN', 200, 155);

    // Línea divisoria
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 175);
    ctx.lineTo(300, 175);
    ctx.stroke();

    // Fecha y mensaje motivacional
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText(new Date().toLocaleDateString(), 200, 205);
    
    ctx.fillStyle = '#D4FF00';
    ctx.font = 'italic 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Sigue superando tus límites', 200, 240);

    canvas.toBlob((blob) => {
      if (blob) setImageUrl(URL.createObjectURL(blob));
    }, 'image/png');
  };

  useEffect(() => {
    if (showShareOptions) generateShareImage();
  }, [showShareOptions]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'lomecan_entrenamiento.png';
    a.click();
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    if (navigator.share) {
      try {
        const blob = await fetch(imageUrl).then(r => r.blob());
        const file = new File([blob], 'entrenamiento.png', { type: 'image/png' });
        await navigator.share({
          title: 'Entrenamiento completado en Lomecan',
          text: '¡Acabo de terminar mi entrenamiento! 💪',
          files: [file],
        });
      } catch (err) {
        console.log('Compartir cancelado');
      }
    } else {
      handleDownload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 safe-top safe-bottom animate-fade-in bg-[#09090B]">
      {/* Ícono de logro */}
      <div className="w-28 h-28 rounded-full bg-[#D4FF00]/5 border-2 border-[#D4FF00]/20 flex items-center justify-center mb-8 shadow-[0_0_40px_rgba(212,255,0,0.15)] animate-scale-in">
        <Award size={52} className="text-[#D4FF00]" />
      </div>

      {/* Texto principal */}
      <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
        ¡Entrenamiento Completado!
      </h2>
      <p className="text-zinc-400 text-sm mb-10 max-w-xs leading-relaxed">
        Tus pesos y repeticiones han quedado registrados para seguir tu evolución.
      </p>

      {/* Botones de acción */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={onRestart}
          className="px-6 py-3.5 bg-white/[0.03] border border-white/[0.08] text-white rounded-2xl text-sm font-medium hover:bg-white/[0.06] active:scale-95 transition-all"
        >
          Volver al inicio
        </button>
        <button
          onClick={() => setShowShareOptions(!showShareOptions)}
          className="px-6 py-3.5 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm flex items-center gap-2 hover:bg-[#e5ff1a] active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/20"
        >
          <Share2 size={16} />
          Compartir
        </button>
      </div>

      {/* Panel de compartir */}
      {showShareOptions && (
        <div className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-2xl p-5 w-full max-w-xs space-y-4 animate-scale-in">
          <canvas ref={canvasRef} className="hidden" />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Vista previa para compartir"
              className="w-full rounded-xl border border-white/[0.05] shadow-lg"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 py-3 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white text-sm flex items-center justify-center gap-1.5 hover:bg-white/[0.06] transition-all"
            >
              <Download size={14} />
              Descargar
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-[#e5ff1a] active:scale-95 transition-all"
            >
              <Share2 size={14} />
              Compartir
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}