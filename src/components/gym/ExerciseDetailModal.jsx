// src/components/gym/ExerciseDetailModal.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, WifiOff, Film, BookOpen, Activity, Eye, Zap 
} from 'lucide-react';
import { 
  getCachedMediaBlob, 
  autoCacheMediaInBackground 
} from '../../utils/mediaCache';

const getYouTubeId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

export default function ExerciseDetailModal({ exercise, onClose }) {
  if (!exercise) return null;

  const [activeTab, setActiveTab] = useState('demo');
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [videoSrc, setVideoSrc] = useState(exercise.video_url || null);
  const [isLocalCached, setIsLocalCached] = useState(false);

  const isYouTube = exercise.video_url?.includes('youtube.com') || exercise.video_url?.includes('youtu.be');
  const youtubeId = isYouTube ? getYouTubeId(exercise.video_url) : null;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    let active = true;
    let localBlobUrl = null;

    if (exercise.video_url && !isYouTube) {
      getCachedMediaBlob(exercise.video_url).then((blob) => {
        if (active && blob) {
          localBlobUrl = URL.createObjectURL(blob);
          setVideoSrc(localBlobUrl);
          setIsLocalCached(true);
        } else if (active) {
          setVideoSrc(exercise.video_url);
          setIsLocalCached(false);
          autoCacheMediaInBackground(exercise.video_url).then(() => {
            if (active) setIsLocalCached(true);
          });
        }
      });
    }

    return () => {
      active = false;
      if (localBlobUrl) URL.revokeObjectURL(localBlobUrl);
    };
  }, [exercise.video_url, isYouTube]);

  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0`
    : '';

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[210] bg-[#09090B]/95 backdrop-blur-2xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#0A0A0C] border border-[#D4FF00]/30 sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col max-h-[90dvh] overflow-hidden shadow-2xl shadow-black/80 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Cabecera */}
        <div className="px-6 pt-4 pb-3 flex items-start justify-between border-b border-white/[0.05] shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight truncate">{exercise.name}</h2>
              <span className="w-2 h-2 rounded-full bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.8)] shrink-0" />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-mono font-bold text-[#D4FF00] uppercase tracking-wider">
                {exercise.muscle}
              </span>
              {exercise.secondaryMuscles && (
                <span className="text-[11px] text-zinc-500 truncate font-mono">
                  + {exercise.secondaryMuscles}
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all shrink-0"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pestañas */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('demo')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'demo'
                  ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white'
              }`}
            >
              <Film size={13} /> Demostración
            </button>
            <button
              onClick={() => setActiveTab('technique')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'technique'
                  ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen size={13} /> Técnica
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold">
            {isLocalCached ? (
              <span className="flex items-center gap-1 text-[#D4FF00]">
                <Zap size={11} /> Offline listo
              </span>
            ) : isOnline ? (
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> HD
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <WifiOff size={11} /> Sin conexión
              </span>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
          {activeTab === 'demo' && (
            <div className="space-y-3 animate-fade-in">
              {exercise.video_url ? (
                <div className="rounded-3xl overflow-hidden bg-black border border-white/[0.08] shadow-2xl relative">
                  {isYouTube ? (
                    !isOnline ? (
                      <div className="p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                          <WifiOff size={24} />
                        </div>
                        <h4 className="text-sm font-bold text-white">Video no disponible sin internet</h4>
                        <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                          Revisa la pestaña de <strong>Técnica</strong> para ver la ejecución.
                        </p>
                      </div>
                    ) : (
                      <div className="relative w-full aspect-video pointer-events-none">
                        <iframe
                          src={youtubeEmbedUrl}
                          title={`Video de ${exercise.name}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          className="absolute inset-0 w-full h-full border-0"
                        />
                      </div>
                    )
                  ) : (
                    <video
                      key={videoSrc}
                      src={videoSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="w-full max-h-80 object-cover pointer-events-none"
                    />
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 bg-white/[0.01] border border-white/[0.04] rounded-3xl p-6">
                  <Film size={32} className="mx-auto text-zinc-700 mb-2" />
                  <p className="text-xs font-mono">No hay video registrado para este ejercicio.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'technique' && (
            <div className="space-y-4 animate-fade-in">
              <div className="luxury-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider font-mono">
                  <Activity size={14} className="text-[#D4FF00]" /> Grupos Musculares
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1 font-mono">
                  <span className="px-3 py-1 rounded-full bg-[#D4FF00]/10 border border-[#D4FF00]/30 text-[#D4FF00] text-xs font-bold">
                    Primario: {exercise.muscle}
                  </span>
                  {exercise.secondaryMuscles && (
                    <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-300 text-xs font-semibold">
                      Secundario: {exercise.secondaryMuscles}
                    </span>
                  )}
                </div>
              </div>

              <div className="luxury-card p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider font-mono">
                  <Eye size={14} className="text-[#D4FF00]" /> Pasos de Ejecución
                </div>
                {exercise.description ? (
                  <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pt-1 font-sans">
                    {exercise.description}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 pt-1 font-sans">
                    Controla el tempo en la bajada, mantén tensión constante en el músculo objetivo y asegura una postura firme.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botón inferior móvil */}
        <div className="p-4 border-t border-white/[0.05] sm:hidden shrink-0 bg-[#09090B]">
          <button
            onClick={onClose}
            className="w-full py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-zinc-300 font-mono font-bold text-xs uppercase tracking-wider active:scale-95"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}