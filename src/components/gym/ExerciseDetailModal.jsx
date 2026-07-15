import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

export default function ExerciseDetailModal({ exercise, onClose }) {
  if (!exercise) return null;

  const isImage = exercise.video_url?.toLowerCase().endsWith('.webp');
  const isYouTube = exercise.video_url?.includes('youtube.com') || exercise.video_url?.includes('youtu.be');
  const youtubeId = isYouTube ? getYouTubeId(exercise.video_url) : null;
  const [videoError, setVideoError] = useState(false);

  const [mediaKey, setMediaKey] = useState(0);
  useEffect(() => {
    setMediaKey(prev => prev + 1);
    setVideoError(false);
  }, [exercise.video_url]);

  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&enablejsapi=1`
    : '';

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[200] bg-[#09090B]/95 backdrop-blur-xl flex items-end sm:items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#0A0A0C] border border-white/[0.08] sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col h-full sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl shadow-black/40 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Indicador de arrastre premium */}
        <div className="w-12 h-1.5 bg-white/[0.08] rounded-full mx-auto mt-4 sm:hidden" />

        {/* Cabecera */}
        <div className="px-6 pt-4 pb-3 flex justify-between items-start">
          <div>
            <h2 className="text-lg font-bold text-white">{exercise.name}</h2>
            <p className="text-xs text-[#D4FF00]/80 mt-0.5">
              {exercise.muscle}
              {exercise.secondaryMuscles ? ` + ${exercise.secondaryMuscles}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-2 p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {exercise.description && (
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Instrucciones
              </h3>
              <div className="text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
                {exercise.description}
              </div>
            </div>
          )}

          {exercise.video_url && (
            <div>
              <h3 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                Demostración
              </h3>
              <div className="rounded-2xl overflow-hidden bg-[#09090B] border border-white/[0.06]">
                {isYouTube ? (
                  videoError ? (
                    <div className="flex flex-col items-center justify-center py-10 text-zinc-500 gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                        <AlertTriangle size={22} className="text-amber-400" />
                      </div>
                      <p className="text-sm font-medium">Video no disponible</p>
                      <p className="text-xs text-zinc-600">Busca el ejercicio directamente en YouTube</p>
                    </div>
                  ) : (
                    <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                      <iframe
                        key={mediaKey}
                        src={youtubeEmbedUrl}
                        title="Video del ejercicio"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="absolute inset-0 w-full h-full"
                        onError={() => setVideoError(true)}
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                      />
                    </div>
                  )
                ) : isImage ? (
                  <img
                    src={exercise.video_url}
                    alt={exercise.name}
                    className="w-full h-auto object-contain max-h-56"
                  />
                ) : (
                  <video
                    key={mediaKey}
                    src={exercise.video_url}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-auto max-h-64"
                    onError={() => setVideoError(true)}
                  />
                )}
              </div>
            </div>
          )}

          {!exercise.description && !exercise.video_url && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 gap-3">
              <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <p className="text-sm">No hay información adicional.</p>
            </div>
          )}
        </div>

        {/* Botón cerrar móvil */}
        <div className="p-4 border-t border-white/[0.05] sm:hidden">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-white text-sm font-medium active:scale-[0.98] transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>,
    document.body
  );
}