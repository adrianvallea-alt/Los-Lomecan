// src/components/gym/ExerciseDetailModal.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, WifiOff, Film, BookOpen, Activity, Eye, Zap, Sparkles 
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
  const [videoError, setVideoError] = useState(false);

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

  // Auto-cargar desde caché local o reproducir directo y guardar en background
  useEffect(() => {
    let active = true;
    let localBlobUrl = null;

    if (exercise.video_url && !isYouTube) {
      // 1. Intentar cargar desde IndexedDB
      getCachedMediaBlob(exercise.video_url).then((blob) => {
        if (active && blob) {
          localBlobUrl = URL.createObjectURL(blob);
          setVideoSrc(localBlobUrl);
          setIsLocalCached(true);
        } else if (active) {
          // 2. Si no está en caché, reproducir online y guardar en segundo plano
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
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&playlist=${youtubeId}&controls=1&enablejsapi=1`
    : '';

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[210] bg-[#09090B]/95 backdrop-blur-2xl flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#0A0A0C] border border-[#D4FF00]/30 sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col max-h-[90dvh] overflow-hidden shadow-2xl shadow-black/80 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra táctil móvil */}
        <div className="w-12 h-1 bg-white/15 rounded-full mx-auto mt-3 sm:hidden shrink-0" />

        {/* Cabecera */}
        <div className="px-6 pt-4 pb-3 flex items-start justify-between border-b border-white/[0.05] shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-white tracking-tight truncate">{exercise.name}</h2>
              <span className="w-2 h-2 rounded-full bg-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.8)] shrink-0" />
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] font-bold text-[#D4FF00] uppercase tracking-wider">
                {exercise.muscle}
              </span>
              {exercise.secondaryMuscles && (
                <span className="text-[11px] text-zinc-500 truncate">
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

        {/* Pestañas de Navegación */}
        <div className="px-6 py-2.5 bg-black/40 border-b border-white/[0.04] flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('demo')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'demo'
                  ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white'
              }`}
            >
              <Film size={13} /> Demostración
            </button>
            <button
              onClick={() => setActiveTab('technique')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'technique'
                  ? 'bg-[#D4FF00] text-[#09090B] shadow-[0_0_12px_rgba(212,255,0,0.3)]'
                  : 'bg-white/[0.03] text-zinc-400 hover:text-white'
              }`}
            >
              <BookOpen size={13} /> Técnica
            </button>
          </div>

          {/* Micro-indicador de estado */}
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold">
            {isLocalCached ? (
              <span className="flex items-center gap-1 text-[#D4FF00]">
                <Zap size={11} /> Offline listo
              </span>
            ) : isOnline ? (
              <span className="flex items-center gap-1 text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> R2 Streaming
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400">
                <WifiOff size={11} /> Sin conexión
              </span>
            )}
          </div>
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
          
          {/* PESTAÑA: DEMOSTRACIÓN */}
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
                          Revisa la pestaña de <strong>Técnica</strong> para ver los puntos clave.
                        </p>
                        <button
                          onClick={() => setActiveTab('technique')}
                          className="px-4 py-2 bg-white/[0.05] border border-white/[0.1] rounded-xl text-xs font-bold text-white hover:border-[#D4FF00]"
                        >
                          Ver técnica →
                        </button>
                      </div>
                    ) : (
                      <div className="relative w-full aspect-video">
                        <iframe
                          src={youtubeEmbedUrl}
                          title={`Video de ${exercise.name}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full"
                          onError={() => setVideoError(true)}
                        />
                      </div>
                    )
                  ) : (
                    /* Video directo de Cloudflare R2 (Auto-cacheado en IndexedDB) */
                    <video
                      key={videoSrc}
                      src={videoSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                      className="w-full max-h-72 object-cover"
                      onError={() => setVideoError(true)}
                    />
                  )}
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-500 bg-white/[0.01] border border-white/[0.04] rounded-3xl p-6">
                  <Film size={32} className="mx-auto text-zinc-700 mb-2" />
                  <p className="text-xs">No hay video registrado para este ejercicio.</p>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA: TÉCNICA */}
          {activeTab === 'technique' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Activity size={14} className="text-[#D4FF00]" /> Grupos Musculares
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
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

              <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                  <Eye size={14} className="text-[#D4FF00]" /> Pasos de Ejecución
                </div>
                {exercise.description ? (
                  <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap pt-1 font-sans">
                    {exercise.description}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 pt-1">
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
            className="w-full py-3.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-zinc-300 font-black text-xs uppercase tracking-wider active:scale-95"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}