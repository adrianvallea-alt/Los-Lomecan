// src/components/gym/ExerciseForm.jsx
import React, { useRef, useState } from 'react';
import { Film, Link, Check, Dumbbell } from 'lucide-react';

const PRIMARY_MUSCLES = [
  { id: 'Pecho', label: 'Pecho', desc: 'Pectoral mayor, superior' },
  { id: 'Espalda', label: 'Espalda', desc: 'Dorsales, trapecio, lumbares' },
  { id: 'Pierna', label: 'Pierna', desc: 'Cuádriceps, femoral, glúteo, pantorrilla' },
  { id: 'Hombro', label: 'Hombro', desc: 'Deltoides anterior, lateral, posterior' },
  { id: 'Brazo', label: 'Brazo', desc: 'Bíceps, tríceps, antebrazo' },
  { id: 'Abdomen', label: 'Abdomen', desc: 'Core, oblicuos, recto abdominal' },
];

export default function ExerciseForm({ initial, onSave, onCancel, uploading, uploadProgress }) {
  const [name, setName] = useState(initial?.name || '');
  
  // Normalizar el músculo inicial si ya existía
  const [muscle, setMuscle] = useState(() => {
    if (!initial?.muscle) return 'Pecho';
    const found = PRIMARY_MUSCLES.find(m => m.id.toLowerCase() === initial.muscle.toLowerCase());
    return found ? found.id : 'Pecho';
  });

  const [secondaryMuscles, setSecondaryMuscles] = useState(initial?.secondary_muscles || initial?.secondaryMuscles || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [defaultSeries, setDefaultSeries] = useState(initial?.default_series?.toString() || initial?.defaultSeries?.toString() || '3');
  const [defaultReps, setDefaultReps] = useState(initial?.default_reps || initial?.defaultReps || '10-12');

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
    if (!name.trim() || !muscle) return;

    const exerciseData = {
      id: initial?.id,
      name: name.trim(),
      muscle: muscle, // Se guarda exactamente como 'Pecho', 'Espalda', etc.
      secondaryMuscles: secondaryMuscles.trim(),
      description: description.trim(),
      video_url: videoMode === 'link' ? videoUrl : (initial?.video_url || ''),
      defaultSeries: parseInt(defaultSeries) || 3,
      defaultReps: defaultReps.trim() || '10-12',
    };

    onSave(exerciseData, videoMode === 'upload' ? videoFile : null);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl rounded-[2rem] p-5 space-y-4 mb-4 animate-scale-in select-none"
    >
      {/* Nombre del ejercicio */}
      <div>
        <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
          Nombre del Ejercicio *
        </label>
        <input
          required
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Press Inclinado con Mancuernas"
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3.5 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] outline-none font-bold transition-colors"
          aria-label="Nombre del ejercicio"
        />
      </div>

      {/* 🎯 SELECTOR DE MÚSCULO PRIMARIO (PILLS TÁCTILES) */}
      <div>
        <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
          Músculo Primario Objetivo *
        </label>
        <div className="grid grid-cols-3 gap-2">
          {PRIMARY_MUSCLES.map((m) => {
            const isSelected = muscle === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMuscle(m.id)}
                className={`py-3 px-2 rounded-2xl border text-left transition-all active:scale-95 flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#D4FF00] border-[#D4FF00] text-[#09090B] shadow-[0_0_15px_rgba(212,255,0,0.35)]'
                    : 'bg-black/60 border-white/[0.06] text-zinc-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase font-mono ${isSelected ? 'text-[#09090B]' : 'text-white'}`}>
                    {m.label}
                  </span>
                  {isSelected && <Check size={13} strokeWidth={3.5} />}
                </div>
                <span className={`text-[8px] font-mono leading-tight mt-1 line-clamp-1 ${isSelected ? 'text-black/75 font-semibold' : 'text-zinc-600'}`}>
                  {m.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Músculos Secundarios / Subgrupo Opcional */}
      <div>
        <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
          Músculos Secundarios / Sub-zona (Opcional)
        </label>
        <input
          value={secondaryMuscles}
          onChange={(e) => setSecondaryMuscles(e.target.value)}
          placeholder="Ej: Tríceps, Deltoides frontal o Pecho superior"
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] outline-none font-mono"
          aria-label="Músculos secundarios"
        />
      </div>

      {/* Descripción / Técnica */}
      <div>
        <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
          Técnica de Ejecución / Notas (Paso a paso)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="1. Ajustar banco a 30 grados.&#10;2. Retraer escápulas y controlar la fase excéntrica."
          className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] outline-none resize-none leading-relaxed font-sans"
          rows={3}
          aria-label="Descripción del ejercicio"
        />
      </div>

      {/* Selector de modo de video */}
      <div>
        <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
          Demostración en Video (Opcional)
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setVideoMode('upload'); setVideoUrl(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              videoMode === 'upload'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md'
                : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white'
            }`}
          >
            <Film size={13} />
            Subir Video
          </button>
          <button
            type="button"
            onClick={() => { setVideoMode('link'); setVideoFile(null); setVideoPreview(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
              videoMode === 'link'
                ? 'bg-[#D4FF00] text-[#09090B] shadow-md'
                : 'bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white'
            }`}
          >
            <Link size={13} />
            Enlace YouTube
          </button>
        </div>
      </div>

      {/* Modo subir archivo */}
      {videoMode === 'upload' && (
        <div className="space-y-3 bg-black/40 border border-white/[0.06] p-3 rounded-2xl">
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="w-full py-3 border border-dashed border-white/[0.1] rounded-xl text-xs font-mono font-bold text-zinc-300 hover:border-[#D4FF00] hover:text-[#D4FF00] transition-colors flex items-center justify-center gap-2"
          >
            <Film size={15} />
            {videoFile || initial?.video_url ? 'Cambiar video (mp4, webp)' : 'Seleccionar video (mp4, webp)'}
          </button>
          <input ref={fileRef} type="file" accept="video/*,image/webp" onChange={handleFileChange} className="hidden" />
          {videoPreview && !videoUrl && (
            <video src={videoPreview} controls className="w-full rounded-xl max-h-28 object-cover border border-white/[0.05]" />
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

      {/* Modo enlace YouTube */}
      {videoMode === 'link' && (
        <div className="space-y-2 bg-black/40 border border-white/[0.06] p-3 rounded-2xl">
          <input
            type="url"
            value={videoUrl}
            onChange={handleUrlChange}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00] outline-none font-mono"
          />
          {youtubeId && (
            <div className="rounded-xl overflow-hidden bg-[#09090B] border border-white/[0.06] max-h-32">
              <img
                src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                alt="Miniatura"
                className="w-full h-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      )}

      {/* Series y Reps sugeridas por defecto */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            Series por Defecto
          </label>
          <input
            type="number"
            value={defaultSeries}
            onChange={(e) => setDefaultSeries(e.target.value)}
            placeholder="3"
            className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-center text-white font-mono font-bold focus:border-[#D4FF00] outline-none"
            aria-label="Series por defecto"
          />
        </div>
        <div>
          <label className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider block mb-1">
            Reps Sugeridas
          </label>
          <input
            value={defaultReps}
            onChange={(e) => setDefaultReps(e.target.value)}
            placeholder="10-12"
            className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-xs text-center text-white font-mono font-bold focus:border-[#D4FF00] outline-none"
            aria-label="Repeticiones sugeridas"
          />
        </div>
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 rounded-xl border border-white/[0.08] text-xs font-mono font-bold text-zinc-400 hover:text-white active:scale-95 transition-all"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={uploading || !name.trim()}
          className="px-6 py-3.5 volt-button rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none active:scale-95 transition-all shadow-md font-mono"
        >
          {initial ? 'Actualizar Ejercicio' : 'Guardar en Biblioteca'}
        </button>
      </div>
    </form>
  );
}