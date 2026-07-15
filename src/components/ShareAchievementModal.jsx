import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Share2 } from 'lucide-react';

export default function ShareAchievementModal({ profile, achievements, currentStreak, longestStreak, onClose }) {
  const canvasRef = useRef(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = 400;
    const height = 500;
    canvas.width = width;
    canvas.height = height;

    // Fondo oscuro con gradiente
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#111015');
    gradient.addColorStop(1, '#09090b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Borde decorativo usando tu verde característico
    ctx.strokeStyle = 'rgba(212, 255, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    // Título Principal
    ctx.fillStyle = '#d4ff00';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOMECAN', width / 2, 55);

    // Nombre del perfil
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(profile?.name || 'Atleta', width / 2, 90);

    // Avatar (emoji)
    if (profile?.avatar) {
      ctx.font = '42px system-ui, -apple-system, sans-serif';
      ctx.fillText(profile.avatar.startsWith('http') ? '😎' : profile.avatar, width / 2, 140);
    }

    // Rachas (con fondo sutil para dar estilo de tarjeta)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fillRect(40, 165, width - 80, 55);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.strokeRect(40, 165, width - 80, 55);

    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#E4E4E7';
    ctx.fillText(`🔥 Racha actual: ${currentStreak} días`, width / 2, 185);
    ctx.fillText(`🏆 Mejor racha: ${longestStreak} días`, width / 2, 208);

    // Logros
    if (achievements && achievements.length > 0) {
      ctx.fillStyle = '#d4ff00';
      ctx.font = 'bold 13px system-ui, -apple-system, sans-serif';
      ctx.fillText('LOGROS DESBLOQUEADOS', width / 2, 255);
      
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '13px system-ui, -apple-system, sans-serif';
      let yPos = 285;
      achievements.slice(0, 5).forEach(ach => {
        ctx.fillText(`${ach.icon}  ${ach.name}`, width / 2, yPos);
        yPos += 26;
      });
    }

    // Pie de imagen
    ctx.fillStyle = '#71717a';
    ctx.font = '10px monospace';
    ctx.fillText('ENTRENA CON LOMECAN', width / 2, height - 32);

    // Convertir a URL de objeto y manejar la limpieza de memoria anterior
    let currentUrl = null;
    canvas.toBlob((blob) => {
      if (blob) {
        currentUrl = URL.createObjectURL(blob);
        setImageUrl(currentUrl);
      }
      setIsGenerating(false);
    }, 'image/png');

    // Retorno de limpieza (Evita fugas de memoria al re-generar)
    return () => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [profile, achievements, currentStreak, longestStreak]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `lomecan_logros_${profile?.name || 'usuario'}.png`;
    a.click();
  };

  const handleShare = async () => {
    if (!imageUrl) return;
    if (navigator.share) {
      try {
        const blob = await fetch(imageUrl).then(r => r.blob());
        const file = new File([blob], 'logros.png', { type: 'image/png' });
        await navigator.share({
          title: 'Mis logros en Lomecan',
          text: 'Mira mi progreso en Lomecan 🏆',
          files: [file],
        });
      } catch (err) {
        console.log('Compartir cancelado o no soportado');
      }
    } else {
      // Fallback a descarga si la API de compartir no está disponible
      handleDownload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#18181b] border border-white/10 rounded-[2.5rem] p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
        {/* Destellos de fondo estilizados */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#d4ff00]/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex justify-between items-center mb-5 relative z-10">
          <h3 className="text-white font-black text-base uppercase tracking-wider font-mono">Compartir logros</h3>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-white p-1.5 bg-zinc-900 rounded-full border border-white/5 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex justify-center mb-6 relative z-10">
          <canvas ref={canvasRef} className="hidden" />
          {isGenerating ? (
            <div className="w-64 h-80 bg-zinc-900/60 rounded-2xl flex items-center justify-center text-zinc-500 text-xs font-mono tracking-widest uppercase">
              Generando...
            </div>
          ) : imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Logros" 
              className="w-64 h-80 object-contain rounded-2xl border border-white/10 shadow-lg" 
            />
          ) : null}
        </div>

        <div className="flex gap-3 relative z-10">
          <button
            onClick={handleDownload}
            disabled={!imageUrl}
            className="flex-1 py-3 bg-zinc-900 border border-white/10 rounded-xl text-zinc-300 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:text-white hover:border-white/20 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            <Download size={14} />
            Descargar
          </button>
          <button
            onClick={handleShare}
            disabled={!imageUrl}
            className="flex-1 py-3 bg-[#d4ff00] text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            <Share2 size={14} strokeWidth={2.5} />
            Compartir
          </button>
        </div>
      </div>
    </div>
  );
}