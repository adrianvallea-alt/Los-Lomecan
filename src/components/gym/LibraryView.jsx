import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ArrowLeft, Plus, Edit3, Trash2, Film, Lock, Search, Dumbbell,
  AlertTriangle, X
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ExerciseForm from './ExerciseForm';

// Paleta de músculos alineada con la marca (acentos sobre fondo oscuro)
const MUSCLE_STYLES = {
  'pecho': 'text-[#D4FF00] bg-[#D4FF00]/10 border-[#D4FF00]/20',
  'espalda': 'text-zinc-300 bg-white/[0.05] border-white/[0.08]',
  'pierna': 'text-zinc-300 bg-white/[0.05] border-white/[0.08]',
  'hombro': 'text-zinc-300 bg-white/[0.05] border-white/[0.08]',
  'brazo': 'text-zinc-300 bg-white/[0.05] border-white/[0.08]',
  'abdomen': 'text-zinc-300 bg-white/[0.05] border-white/[0.08]',
  'default': 'text-zinc-400 bg-white/[0.04] border-white/[0.06]'
};

export default function LibraryView({ password, onSetPassword, onBack }) {
  // --- TODA LA LÓGICA PERMANECE EXACTAMENTE IGUAL ---
  const [exercises, setExercises] = useState([]);
  const [editingExercise, setEditingExercise] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState(!password);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadExercises = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('exercises').select('*').order('name');
    if (!error) setExercises(data || []);
    setLoading(false);
  };

  useEffect(() => { loadExercises(); }, []);

  // Pantalla de creación de contraseña rediseñada
  if (passwordForm) {
    const [newPass, setNewPass] = useState('');
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 safe-top safe-bottom animate-fade-in bg-[#09090B]">
        <div className="w-20 h-20 rounded-2xl bg-[#D4FF00]/5 border border-[#D4FF00]/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(212,255,0,0.1)]">
          <Lock size={36} className="text-[#D4FF00]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Crear contraseña</h2>
        <p className="text-xs text-zinc-500 mb-8 text-center max-w-[250px]">
          Protege la biblioteca de ejercicios
        </p>
        <input
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          placeholder="Nueva contraseña"
          className="w-full max-w-xs bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-white text-center placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none transition-colors mb-4"
        />
        <button
          onClick={() => {
            if (newPass) {
              onSetPassword(newPass);
              setPasswordForm(false);
            }
          }}
          disabled={!newPass}
          className="w-full max-w-xs bg-[#D4FF00] text-[#09090B] font-bold py-4 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/20 disabled:opacity-30"
        >
          Guardar contraseña
        </button>
      </div>
    );
  }

  const handleDeleteExercise = async (id) => {
    const ex = exercises.find(e => e.id === id);
    if (ex?.video_url) {
      try {
        const url = new URL(ex.video_url);
        const path = url.pathname.split('/').pop();
        await supabase.storage.from('exercise-videos').remove([path]);
      } catch (e) {}
    }
    await supabase.from('exercises').delete().eq('id', id);
    setConfirmDelete(null);
    loadExercises();
  };

  const handleSaveExercise = async (exerciseData, file) => {
    try {
      setUploading(true);
      let video_url = exerciseData.video_url || '';

      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          alert('El archivo no puede superar 50 MB');
          setUploading(false);
          return;
        }
        const fileName = `exercise_${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('exercise-videos')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded / p.total) * 100))
          });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('exercise-videos').getPublicUrl(fileName);
        video_url = publicUrlData.publicUrl;
      }

      const record = {
        name: exerciseData.name,
        muscle: exerciseData.muscle.toLowerCase(),
        secondary_muscles: exerciseData.secondaryMuscles || '',
        description: exerciseData.description,
        video_url,
        default_series: exerciseData.defaultSeries || 0,
        default_reps: exerciseData.defaultReps || '',
      };

      if (exerciseData.id) {
        await supabase.from('exercises').update(record).eq('id', exerciseData.id);
      } else {
        await supabase.from('exercises').insert([record]);
      }

      setShowForm(false);
      setEditingExercise(null);
      loadExercises();
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const filtered = exercises.filter(ex =>
    ex.name.toLowerCase().includes(search.toLowerCase()) ||
    ex.muscle.toLowerCase().includes(search.toLowerCase()) ||
    (ex.secondary_muscles && ex.secondary_muscles.toLowerCase().includes(search.toLowerCase()))
  );

  const getMuscleStyle = (muscle) => {
    const key = muscle?.toLowerCase();
    return MUSCLE_STYLES[key] || MUSCLE_STYLES.default;
  };

  return (
    <div className="flex flex-col h-full animate-fade-in safe-top safe-bottom bg-[#09090B]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack} 
            className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Volver"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-white tracking-tight">Biblioteca</h2>
        </div>
        <button
          onClick={() => { setEditingExercise(null); setShowForm(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#D4FF00] text-[#09090B] text-xs font-bold rounded-full active:scale-95 transition-all shadow-lg shadow-[#D4FF00]/20"
        >
          <Plus size={14} strokeWidth={2.5} />
          Nuevo
        </button>
      </div>

      {/* Barra de búsqueda */}
      <div className="px-5 mb-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-3 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o músculo..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Lista de ejercicios */}
      <div className="flex-1 overflow-y-auto px-5 pb-safe space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-2 border-[#D4FF00]/20 border-t-[#D4FF00] rounded-full animate-spin mb-4" />
            <p className="text-zinc-500 text-sm">Cargando ejercicios...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Dumbbell size={44} className="text-zinc-700 mb-4" />
            <p className="text-zinc-500 text-sm">
              {search ? 'Sin resultados' : 'No hay ejercicios'}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {search ? 'Prueba con otro término' : 'Crea el primero usando el botón "Nuevo"'}
            </p>
          </div>
        ) : (
          filtered.map((ex, index) => {
            const muscleStyle = getMuscleStyle(ex.muscle);
            return (
              <div 
                key={ex.id} 
                className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 transition-all hover:border-white/[0.08] hover:bg-white/[0.03] group animate-fade-in-up"
                style={{ animationDelay: `${index * 35}ms` }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-white font-semibold text-sm truncate">{ex.name}</h3>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${muscleStyle}`}>
                        {ex.muscle}
                      </span>
                    </div>
                    {ex.secondary_muscles && (
                      <p className="text-[10px] text-zinc-500 ml-1 mb-1.5">
                        + {ex.secondary_muscles}
                      </p>
                    )}
                    {ex.description && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 whitespace-pre-wrap leading-relaxed">
                        {ex.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5">
                      {(ex.default_series > 0 || ex.default_reps) && (
                        <span className="text-[10px] bg-white/[0.04] border border-white/[0.05] px-2.5 py-0.5 rounded-full text-zinc-400">
                          {ex.default_series} series{ex.default_reps ? ` · ${ex.default_reps}` : ''}
                        </span>
                      )}
                      {ex.video_url && (
                        <span className="text-[10px] bg-[#D4FF00]/5 border border-[#D4FF00]/10 px-2.5 py-0.5 rounded-full text-[#D4FF00] flex items-center gap-1">
                          <Film size={10} /> Video
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 ml-2 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button
                      onClick={() => { setEditingExercise(ex); setShowForm(true); }}
                      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05] text-zinc-400 hover:text-white active:scale-90 transition-all"
                      aria-label={`Editar ${ex.name}`}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(ex.id)}
                      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.05] text-zinc-400 hover:text-red-400 hover:border-red-400/20 active:scale-90 transition-all"
                      aria-label={`Eliminar ${ex.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL DEL FORMULARIO (PORTAL) con estética Quiet Premium */}
      {showForm &&
        ReactDOM.createPortal(
          <div 
            className="fixed inset-0 z-[200] bg-[#09090B]/95 backdrop-blur-xl flex items-end sm:items-center justify-center animate-fade-in"
            onClick={() => { setShowForm(false); setEditingExercise(null); }}
          >
            <div 
              className="w-full sm:max-w-md bg-[#0A0A0C] border border-white/[0.08] sm:rounded-[2.5rem] rounded-t-[2.5rem] flex flex-col max-h-[90vh] overflow-hidden shadow-2xl shadow-black/40 animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1.5 bg-white/[0.08] rounded-full mx-auto mt-4 sm:hidden" />
              <div className="flex justify-between items-center px-6 pt-4 pb-3">
                <h3 className="text-lg font-bold text-white">
                  {editingExercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}
                </h3>
                <button 
                  onClick={() => { setShowForm(false); setEditingExercise(null); }} 
                  className="p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
                  aria-label="Cerrar"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <ExerciseForm
                  initial={editingExercise}
                  onSave={handleSaveExercise}
                  onCancel={() => { setShowForm(false); setEditingExercise(null); }}
                  uploading={uploading}
                  uploadProgress={uploadProgress}
                />
              </div>
            </div>
          </div>,
          document.body
        )
      }

      {/* MODAL DE CONFIRMACIÓN (PORTAL) con estética Quiet Premium */}
      {confirmDelete &&
        ReactDOM.createPortal(
          <div 
            className="fixed inset-0 z-[210] bg-[#09090B]/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setConfirmDelete(null)}
          >
            <div 
              className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <h3 className="text-white font-semibold text-sm">Eliminar ejercicio</h3>
              </div>
              <p className="text-zinc-400 text-sm mb-5 leading-relaxed">
                ¿Estás seguro? También se borrará su video asociado.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleDeleteExercise(confirmDelete)}
                  className="flex-1 py-3 bg-red-400/10 border border-red-400/20 text-red-400 font-semibold rounded-xl text-sm hover:bg-red-400/20 transition-colors"
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 bg-white/[0.03] border border-white/[0.08] text-white rounded-xl text-sm hover:bg-white/[0.05] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.96) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}