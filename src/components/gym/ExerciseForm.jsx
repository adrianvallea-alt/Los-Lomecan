import React, { useRef, useState } from 'react';
import { Film, Link } from 'lucide-react';

export default function ExerciseForm({ initial, onSave, onCancel, uploading, uploadProgress }) {
  // --- TODA LA LÓGICA DE ESTADO PERMANECE EXACTAMENTE IGUAL ---
  const [name, setName] = useState(initial?.name || '');
  const [muscle, setMuscle] = useState(initial?.muscle || '');
  const [secondaryMuscles, setSecondaryMuscles] = useState(initial?.secondary_muscles || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [defaultSeries, setDefaultSeries] = useState(initial?.default_series?.toString() || '');
  const [defaultReps, setDefaultReps] = useState(initial?.default_reps || '');

  const [videoMode, setVideoMode] = useState(() => {
    if (initial?.video_url?.includes('youtube.com') || initial?.video_url?.includes('youtu.be')) {
      return 'link';
    }
    return initial?.video_url ? 'upload' : null;
  });

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(initial?.video_url || null);
  const [videoUrl, setVideoUrl] = useState(() => {
    if (initial?.video_url?.includes('youtube.com') || initial?.video_url?.includes('youtu.be')) {
      return initial.video_url;
    }
    return '';
  });
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setVideoMode('upload');
      setVideoUrl('');
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setVideoUrl(url);
    setVideoPreview(null);
    setVideoFile(null);
    setVideoMode('link');
  };

  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !muscle) return;

    const exerciseData = {
      id: initial?.id,
      name,
      muscle,
      secondaryMuscles,
      description,
      video_url: videoMode === 'link' ? videoUrl : (initial?.video_url || ''),
      defaultSeries: parseInt(defaultSeries) || 0,
      defaultReps,
    };

    onSave(exerciseData, videoMode === 'upload' ? videoFile : null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-[2rem] p-5 space-y-5 mb-4 mx-4 animate-scale-in"
    >
      {/* Nombre del ejercicio */}
      <input
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nombre del ejercicio"
        className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none transition-colors"
        aria-label="Nombre del ejercicio"
      />

      {/* Músculos */}
      <div className="grid grid-cols-2 gap-3">
        <input
          required
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
          placeholder="Músculo primario"
          className="bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none"
          aria-label="Músculo primario"
        />
        <input
          value={secondaryMuscles}
          onChange={(e) => setSecondaryMuscles(e.target.value)}
          placeholder="Secundarios (comas)"
          className="bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none"
          aria-label="Músculos secundarios"
        />
      </div>

      {/* Descripción */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción (cada línea será un paso)"
        className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none resize-none"
        rows={3}
        aria-label="Descripción del ejercicio"
      />

      {/* Selector de modo de video */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { setVideoMode('upload'); setVideoUrl(''); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            videoMode === 'upload'
              ? 'bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/30'
              : 'bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white'
          }`}
        >
          <Film size={14} />
          Subir video
        </button>
        <button
          type="button"
          onClick={() => { setVideoMode('link'); setVideoFile(null); setVideoPreview(null); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            videoMode === 'link'
              ? 'bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/30'
              : 'bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white'
          }`}
        >
          <Link size={14} />
          Enlace
        </button>
      </div>

      {/* Modo subir archivo */}
      {videoMode === 'upload' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="w-full py-3 border border-dashed border-white/[0.08] rounded-xl text-sm text-zinc-400 hover:border-[#D4FF00]/40 hover:text-[#D4FF00] transition-colors flex items-center justify-center gap-2"
          >
            <Film size={16} />
            {videoFile || initial?.video_url ? 'Cambiar video (webp, mp4)' : 'Subir video (webp, mp4)'}
          </button>
          <input ref={fileRef} type="file" accept="video/*,image/webp" onChange={handleFileChange} className="hidden" />
          {videoPreview && !videoUrl && (
            <video src={videoPreview} controls className="w-full rounded-xl max-h-24 object-cover border border-white/[0.05]" />
          )}
          {uploading && (
            <div className="w-full bg-white/[0.05] rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-[#D4FF00] h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Modo enlace */}
      {videoMode === 'link' && (
        <div className="space-y-3">
          <input
            type="url"
            value={videoUrl}
            onChange={handleUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none"
          />
          {youtubeId && (
            <div className="rounded-xl overflow-hidden bg-[#09090B] border border-white/[0.06]">
              <img
                src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                alt="Miniatura del video"
                className="w-full h-auto object-cover max-h-36"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      )}

      {/* Series y repeticiones */}
      <div className="grid grid-cols-2 gap-3">
        <input
          type="number"
          value={defaultSeries}
          onChange={(e) => setDefaultSeries(e.target.value)}
          placeholder="Series (opcional)"
          className="bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none"
          aria-label="Series por defecto"
        />
        <input
          value={defaultReps}
          onChange={(e) => setDefaultReps(e.target.value)}
          placeholder="Reps sugeridas (ej: 12,10,8)"
          className="bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none"
          aria-label="Repeticiones sugeridas"
        />
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-xl border border-white/[0.08] text-sm text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={uploading}
          className="px-6 py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/20"
        >
          {initial ? 'Actualizar' : 'Guardar'}
        </button>
      </div>

      <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </form>
  );
}