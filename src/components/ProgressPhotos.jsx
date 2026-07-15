import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, X, Trash2, Sliders, ArrowLeftRight, Image as ImageIcon, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const BUCKET_NAME = 'progress-photos';
const STORAGE_KEY = (profileId) => `progressPhotos_${profileId}`;

export default function ProgressPhotos({ activeProfile, onBack }) {
  const [photos, setPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [leftPhoto, setLeftPhoto] = useState(null);
  const [rightPhoto, setRightPhoto] = useState(null);
  const [sliderPos, setSliderPos] = useState(50);
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const fileRef = useRef();
  const sliderRef = useRef();

  // --- Lógica original sin cambios (carga, subida, eliminación, selección, slider) ---
  useEffect(() => {
    const loadPhotos = async () => {
      const cached = localStorage.getItem(STORAGE_KEY(activeProfile.id));
      if (cached) {
        try { setPhotos(JSON.parse(cached)); } catch (e) {}
      }
      try {
        const { data: files, error } = await supabase.storage.from(BUCKET_NAME).list(activeProfile.id, {
          sortBy: { column: 'created_at', order: 'desc' },
          limit: 50,
        });
        if (!error && files) {
          const photoList = files.map(file => {
            const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(`${activeProfile.id}/${file.name}`);
            return {
              id: file.id,
              url: publicUrl,
              name: file.name,
              created_at: file.created_at,
            };
          });
          setPhotos(photoList);
          localStorage.setItem(STORAGE_KEY(activeProfile.id), JSON.stringify(photoList));
        }
      } catch (err) {
        console.error('Error al cargar fotos:', err);
      }
    };
    loadPhotos();
  }, [activeProfile.id]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('La imagen no puede superar 10 MB');
      return;
    }
    setUploading(true);
    try {
      const fileName = `${activeProfile.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from(BUCKET_NAME).getPublicUrl(fileName);
      const newPhoto = {
        id: Date.now().toString(),
        url: publicUrl,
        name: fileName,
        created_at: new Date().toISOString(),
      };
      const updated = [newPhoto, ...photos];
      setPhotos(updated);
      localStorage.setItem(STORAGE_KEY(activeProfile.id), JSON.stringify(updated));
    } catch (err) {
      console.error('Error al subir foto:', err);
      alert('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo) => {
    if (!window.confirm('¿Eliminar esta foto de progreso?')) return;
    try {
      const path = `${activeProfile.id}/${photo.name.split('/').pop()}`;
      await supabase.storage.from(BUCKET_NAME).remove([path]);
      const updated = photos.filter(p => p.id !== photo.id);
      setPhotos(updated);
      localStorage.setItem(STORAGE_KEY(activeProfile.id), JSON.stringify(updated));
      if (leftPhoto?.id === photo.id) setLeftPhoto(null);
      if (rightPhoto?.id === photo.id) setRightPhoto(null);
      setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
    } catch (err) {
      console.error('Error al eliminar:', err);
    }
  };

  const toggleSelect = (photo) => {
    if (selectedPhotos.find(p => p.id === photo.id)) {
      setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
    } else if (selectedPhotos.length < 2) {
      setSelectedPhotos(prev => [...prev, photo]);
    } else {
      setSelectedPhotos([photo]);
    }
  };

  const startCompare = () => {
    if (selectedPhotos.length === 2) {
      setLeftPhoto(selectedPhotos[0]);
      setRightPhoto(selectedPhotos[1]);
      setCompareMode(true);
      setSelectedPhotos([]);
    } else {
      alert('Selecciona dos fotos para comparar');
    }
  };

  const handleSliderMove = useCallback((e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const stopDrag = useCallback(() => {
    document.removeEventListener('mousemove', handleSliderMove);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', handleSliderMove);
    document.removeEventListener('touchend', stopDrag);
  }, [handleSliderMove]);

  const startDrag = (e) => {
    e.preventDefault();
    document.addEventListener('mousemove', handleSliderMove);
    document.addEventListener('mouseup', stopDrag);
    document.addEventListener('touchmove', handleSliderMove, { passive: true });
    document.addEventListener('touchend', stopDrag);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleSliderMove);
      document.removeEventListener('mouseup', stopDrag);
      document.removeEventListener('touchmove', handleSliderMove);
      document.removeEventListener('touchend', stopDrag);
    };
  }, [handleSliderMove, stopDrag]);

  return (
    <div className="flex flex-col h-full animate-fade-in pb-12 relative overflow-hidden bg-[#09090B]">
      {/* Fondo ambiental */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-[#D4FF00]/[0.03] rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

      {/* Header optimizado para pulgares */}
      <div className="flex items-center justify-between px-5 py-4 relative z-10">
        <button 
          onClick={onBack} 
          className="p-3 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-white tracking-tight">Progreso</h2>
        <button
          onClick={() => fileRef.current.click()}
          disabled={uploading}
          className="p-3 rounded-full bg-white/[0.03] border border-white/[0.06] text-[#D4FF00] hover:text-white active:scale-95 transition-all disabled:opacity-40"
          aria-label="Subir foto"
        >
          <Camera size={20} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      {/* Indicador de subida más elegante */}
      {uploading && (
        <div className="px-5 mb-3 relative z-10">
          <div className="bg-white/[0.02] border border-white/[0.05] backdrop-blur-xl rounded-2xl px-4 py-3 flex items-center gap-3 text-xs text-zinc-400">
            <Loader2 size={14} className="animate-spin text-[#D4FF00]" />
            <span className="font-medium tracking-wide">Subiendo foto...</span>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      {compareMode && leftPhoto && rightPhoto ? (
        <div className="flex-1 flex flex-col px-5 space-y-4 relative z-10">
          <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.05] backdrop-blur-sm p-3 rounded-2xl">
            <button 
              onClick={() => setCompareMode(false)} 
              className="text-xs font-semibold uppercase tracking-wider text-[#D4FF00] hover:text-white transition-colors"
            >
              ← Volver
            </button>
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className="font-medium">{new Date(leftPhoto.created_at).toLocaleDateString()}</span>
              <span className="text-[#D4FF00] font-bold">VS</span>
              <span className="font-medium">{new Date(rightPhoto.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div 
            className="relative w-full aspect-[3/4] rounded-3xl overflow-hidden bg-zinc-900 border border-white/[0.08] shadow-2xl shadow-black/30" 
            ref={sliderRef}
          >
            <img src={rightPhoto.url} alt="Después" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 overflow-hidden" style={{ width: `${sliderPos}%` }}>
              <img 
                src={leftPhoto.url} 
                alt="Antes" 
                className="absolute inset-0 w-full h-full object-cover" 
                style={{ width: `${100 / (sliderPos / 100)}%`, maxWidth: 'none' }} 
              />
            </div>
            {/* Línea divisoria premium */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-[#D4FF00]/80 shadow-[0_0_12px_rgba(212,255,0,0.5)] cursor-ew-resize z-10 flex items-center justify-center transition-shadow duration-200"
              style={{ left: `${sliderPos}%` }}
              onMouseDown={startDrag}
              onTouchStart={startDrag}
            >
              <div className="w-10 h-10 bg-zinc-900/90 border border-[#D4FF00]/60 rounded-full shadow-2xl flex items-center justify-center active:scale-110 transition-transform backdrop-blur-sm">
                <ArrowLeftRight size={16} className="text-[#D4FF00]" />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 relative z-10">
          {photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-zinc-500 gap-5">
              <div className="p-6 rounded-full bg-white/[0.02] border border-white/[0.05]">
                <ImageIcon size={48} className="text-zinc-600" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-semibold text-white text-base">Aún no hay fotos</p>
                <p className="text-sm text-zinc-500 max-w-[280px] leading-relaxed mx-auto">
                  Toma tu primera foto hoy. El cambio se construye día a día.
                </p>
              </div>
            </div>
          ) : (
            <>
              {selectedPhotos.length === 2 && (
                <button
                  onClick={startCompare}
                  className="mb-4 w-full py-4 bg-[#D4FF00] text-[#09090B] font-bold rounded-2xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-[#e5ff1a] active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/20"
                >
                  <ArrowLeftRight size={16} strokeWidth={2} />
                  Comparar seleccionadas
                </button>
              )}

              <div className="grid grid-cols-2 gap-4 pb-24">
                {photos.map(photo => {
                  const isSelected = selectedPhotos.some(p => p.id === photo.id);
                  return (
                    <div
                      key={photo.id}
                      onClick={() => toggleSelect(photo)}
                      className={`relative rounded-2xl overflow-hidden border aspect-square cursor-pointer transition-all duration-300 bg-zinc-900/40 backdrop-blur-sm ${
                        isSelected 
                          ? 'border-[#D4FF00]/60 ring-1 ring-[#D4FF00]/30 shadow-lg shadow-[#D4FF00]/10 scale-[0.97]' 
                          : 'border-white/[0.05] hover:border-white/10 hover:scale-[1.02]'
                      }`}
                    >
                      <img src={photo.url} alt="Progreso" className="w-full h-full object-cover" loading="lazy" />
                      
                      {/* Fecha superpuesta minimalista */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                        <span className="text-[11px] font-medium text-white/80">
                          {new Date(photo.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Botón eliminar con área de toque amplia */}
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          handleDelete(photo); 
                        }}
                        className="absolute top-2 right-2 p-2 rounded-full bg-black/60 border border-white/10 text-zinc-300 hover:text-red-400 hover:border-red-400/30 active:scale-90 transition-all backdrop-blur-md"
                        aria-label="Eliminar foto"
                      >
                        <Trash2 size={14} />
                      </button>

                      {/* Indicador de selección */}
                      {isSelected && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-[#D4FF00] flex items-center justify-center text-[#09090B] text-xs font-bold shadow-lg">
                          ✓
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}