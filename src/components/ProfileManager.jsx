// src/components/ProfileManager.jsx
import React, { useState } from 'react';
import { X, Edit3, Trash2, Users, Search, Save, AlertTriangle, Check, Plus, Shield, User } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { updateProfile, deleteProfile } from '../lib/dataService';
import { COLORS, getColorHex } from '../utils/colors';

const AVATARS = [
  '😎', '🏋️', '🏃', '🧘', '💪', '🏊', '🚴', '🤸', '🏌️', '⛹️', 
  '🤾', '🏄', '🧗', '🤼', '🏋️‍♀️', '🤹', '🏃‍♀️', '🚣', '🧗‍♂️', '🎯', '🔥', '⚡', '👑', '🐺'
];

const ROLES = ['Coach', 'Athlete', 'Atleta Pro', 'Fitness Partner', 'Principiante'];

const triggerHaptic = (ms = 20) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

export default function ProfileManager({ profiles, onUpdateProfiles, onClose }) {
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const [form, setForm] = useState({
    id: '',
    name: '',
    role: 'Athlete',
    color: COLORS[0]?.id || 'silver',
    goals: { cal: 2000, pro: 120, carb: 200, fat: 55 },
    pin: '',
    avatar: '😎',
  });

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.id.toLowerCase().includes(search.toLowerCase()) ||
    (p.role && p.role.toLowerCase().includes(search.toLowerCase()))
  );

  const resetForm = () => {
    setForm({
      id: '',
      name: '',
      role: 'Athlete',
      color: COLORS[0]?.id || 'silver',
      goals: { cal: 2000, pro: 120, carb: 200, fat: 55 },
      pin: '',
      avatar: '😎',
    });
    setEditingProfileId(null);
  };

  const handleEdit = (profile) => {
    triggerHaptic(20);
    setEditingProfileId(profile.id);
    setForm({
      id: profile.id,
      name: profile.name,
      role: profile.role || 'Athlete',
      color: profile.color || COLORS[0]?.id || 'silver',
      goals: profile.goals || { cal: 2000, pro: 120, carb: 200, fat: 55 },
      pin: profile.pin || '',
      avatar: profile.avatar || '😎',
    });
  };

  const handleNew = () => {
    triggerHaptic(25);
    resetForm();
    toast('Ingresa los datos del nuevo atleta', { icon: '✨' });
  };

  const validateForm = () => {
    if (!form.id.trim()) {
      toast.error('El ID único es obligatorio');
      return false;
    }
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return false;
    }
    if (!editingProfileId && profiles.some(p => p.id === form.id)) {
      toast.error('Ya existe un perfil con ese ID');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    triggerHaptic(30);
    setSaving(true);
    const updatedProfile = { ...form };

    let updatedProfiles;
    if (editingProfileId) {
      updatedProfiles = profiles.map(p => p.id === editingProfileId ? updatedProfile : p);
    } else {
      updatedProfiles = [...profiles, updatedProfile];
    }

    try {
      await updateProfile(updatedProfile);
      onUpdateProfiles(updatedProfiles);
      toast.success(editingProfileId ? 'Perfil actualizado' : 'Perfil creado');
      resetForm();
    } catch (e) {
      console.error('Error al guardar perfil:', e);
      toast.error('Error al guardar en base de datos');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profileId) => {
    if (profileId === 'adrian') {
      toast.error('No se puede eliminar la cuenta de administrador');
      setShowDeleteConfirm(null);
      return;
    }
    triggerHaptic(40);
    setDeleting(profileId);
    try {
      await deleteProfile(profileId);
      const updatedProfiles = profiles.filter(p => p.id !== profileId);
      onUpdateProfiles(updatedProfiles);
      toast.success('Perfil eliminado');
      setShowDeleteConfirm(null);
    } catch (e) {
      console.error('Error al eliminar:', e);
      toast.error('Error al eliminar');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090B]/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="w-full max-w-lg bg-[#0C0C12] border border-white/[0.08] rounded-[2.5rem] p-6 max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/80 no-scrollbar">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#D4FF00]/10 text-[#D4FF00] border border-[#D4FF00]/25 shadow-[0_0_12px_rgba(212,255,0,0.2)]">
              <Users size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider font-sans">
                Gestión de Miembros
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">Perfiles del Club</span>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Buscador */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-3.5 top-3.5 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, ID o rol..."
            className="w-full bg-black/50 border border-white/[0.08] rounded-2xl pl-10 pr-4 py-3 text-xs text-white placeholder-zinc-500 focus:border-[#D4FF00]/50 transition-colors outline-none font-sans"
          />
        </div>

        {/* Lista de perfiles */}
        <div className="space-y-2.5 mb-6">
          {filteredProfiles.length === 0 ? (
            <p className="text-center text-zinc-500 text-xs py-6 font-mono">No se encontraron perfiles</p>
          ) : (
            filteredProfiles.map(profile => {
              const hexColor = getColorHex(profile.color);
              const isEditing = editingProfileId === profile.id;

              return (
                <div
                  key={profile.id}
                  className={`bg-white/[0.02] border ${
                    isEditing ? 'border-[#D4FF00] shadow-[0_0_15px_rgba(212,255,0,0.15)]' : 'border-white/[0.05]'
                  } rounded-2xl p-3.5 flex justify-between items-center transition-all hover:border-white/10`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-md shrink-0 border border-white/10"
                      style={{ backgroundColor: hexColor }}
                    >
                      {profile.avatar && profile.avatar.startsWith('http') ? (
                        <img src={profile.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{profile.avatar || profile.name?.charAt(0)}</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-white font-bold text-xs truncate">{profile.name}</p>
                      <p className="text-[10px] text-zinc-400 font-mono">
                        {profile.role} · <span className="text-[#D4FF00] font-bold">{profile.id}</span>
                      </p>
                      <div className="flex gap-2 mt-0.5 text-[9px] font-mono text-zinc-500">
                        <span>{profile.goals?.cal || 2000} kcal</span>
                        <span>·</span>
                        <span>P:{profile.goals?.pro || 0}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 ml-2 shrink-0">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-white hover:border-[#D4FF00]/40 transition-all active:scale-90"
                      aria-label={`Editar ${profile.name}`}
                    >
                      <Edit3 size={14} />
                    </button>
                    {profile.id !== 'adrian' && (
                      <button
                        onClick={() => setShowDeleteConfirm(profile.id)}
                        className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-zinc-400 hover:text-rose-400 hover:border-rose-400/40 active:scale-90 transition-all"
                        aria-label={`Eliminar ${profile.name}`}
                        disabled={deleting === profile.id}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Botón Nuevo Perfil */}
        <button
          onClick={handleNew}
          className="w-full py-3.5 border border-dashed border-white/[0.12] rounded-2xl text-xs font-mono font-bold text-zinc-400 hover:border-[#D4FF00]/40 hover:text-[#D4FF00] hover:bg-[#D4FF00]/[0.02] transition-all mb-6 active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <Plus size={15} /> Añadir Nuevo Atleta
        </button>

        {/* Formulario de Creación / Edición */}
        {(editingProfileId !== null || (!editingProfileId && form.name === '')) && (
          <div className="luxury-card p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-white/[0.06] pb-3">
              <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Edit3 size={14} className="text-[#D4FF00]" />
                {editingProfileId ? `Editando: ${form.name}` : 'Nuevo Perfil'}
              </h3>
              {editingProfileId && (
                <button onClick={resetForm} className="text-[10px] font-mono text-zinc-500 hover:text-white">
                  Cancelar edición
                </button>
              )}
            </div>

            <div className="space-y-3.5">
              {/* ID y Nombre */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">ID ÚNICO</label>
                  <input
                    value={form.id}
                    onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    placeholder="ej: carlos"
                    disabled={!!editingProfileId}
                    className="w-full bg-black/60 border border-white/[0.1] rounded-xl p-2.5 text-xs text-white disabled:opacity-40 focus:border-[#D4FF00] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">NOMBRE</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Carlos Pérez"
                    className="w-full bg-black/60 border border-white/[0.1] rounded-xl p-2.5 text-xs text-white focus:border-[#D4FF00] outline-none"
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">ROL / NIVEL</label>
                <div className="flex gap-1.5 flex-wrap">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm({ ...form, role: r })}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                        form.role === r 
                          ? 'bg-[#D4FF00] text-[#09090B]' 
                          : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.05]'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paleta de Colores Dinámica (Ergonómica de 40px) */}
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1.5">COLOR DE IDENTIDAD</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => {
                    const isSelected = form.color === c.id || form.color === c.name;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic(15);
                          setForm({ ...form, color: c.id });
                        }}
                        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-md ${
                          isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0C0C12] scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        aria-label={c.label}
                      >
                        {isSelected && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Avatar / Emojis */}
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1.5">AVATAR / ICONO</label>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto no-scrollbar p-1 bg-black/40 rounded-2xl border border-white/[0.05]">
                  {AVATARS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        triggerHaptic(15);
                        setForm({ ...form, avatar: emoji });
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all active:scale-90 ${
                        form.avatar === emoji 
                          ? 'bg-[#D4FF00]/20 border border-[#D4FF00] scale-105' 
                          : 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.06]'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN Opcional */}
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1">PIN DE ACCESO (4 DÍGITOS, OPCIONAL)</label>
                <input
                  type="password"
                  maxLength={4}
                  inputMode="numeric"
                  value={form.pin || ''}
                  onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="••••"
                  className="w-full bg-black/60 border border-white/[0.1] rounded-xl p-2.5 text-center text-sm font-mono tracking-widest text-[#D4FF00] outline-none focus:border-[#D4FF00]"
                />
              </div>

              {/* Metas Nutricionales */}
              <div>
                <label className="text-[10px] font-mono font-bold text-zinc-400 block mb-1.5">OBJETIVOS DIARIOS (METAS)</label>
                <div className="grid grid-cols-4 gap-2 font-mono text-center">
                  <div>
                    <span className="text-[9px] text-zinc-400 uppercase">Kcal</span>
                    <input
                      type="number"
                      value={form.goals.cal}
                      onChange={e => setForm({ ...form, goals: { ...form.goals, cal: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-black/60 border border-white/[0.1] rounded-lg p-1.5 text-xs text-center font-bold text-white mt-0.5 focus:border-[#D4FF00] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-blue-400 uppercase">Proteína</span>
                    <input
                      type="number"
                      value={form.goals.pro}
                      onChange={e => setForm({ ...form, goals: { ...form.goals, pro: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-black/60 border border-white/[0.1] rounded-lg p-1.5 text-xs text-center font-bold text-blue-400 mt-0.5 focus:border-[#D4FF00] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-purple-400 uppercase">Carbos</span>
                    <input
                      type="number"
                      value={form.goals.carb}
                      onChange={e => setForm({ ...form, goals: { ...form.goals, carb: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-black/60 border border-white/[0.1] rounded-lg p-1.5 text-xs text-center font-bold text-purple-400 mt-0.5 focus:border-[#D4FF00] outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 uppercase">Grasas</span>
                    <input
                      type="number"
                      value={form.goals.fat}
                      onChange={e => setForm({ ...form, goals: { ...form.goals, fat: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-black/60 border border-white/[0.1] rounded-lg p-1.5 text-xs text-center font-bold text-amber-400 mt-0.5 focus:border-[#D4FF00] outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones de Guardar */}
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-3 rounded-xl border border-white/[0.08] text-xs font-mono font-bold text-zinc-400 hover:text-white active:scale-95"
              >
                Limpiar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 volt-button rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(212,255,0,0.3)] disabled:opacity-40"
              >
                <Save size={15} />
                {saving ? 'Guardando...' : editingProfileId ? 'Actualizar Atleta' : 'Crear Atleta'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DIÁLOGO DARK GLASS DE CONFIRMACIÓN PARA ELIMINAR */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-5 animate-fade-in">
          <div className="luxury-card p-6 max-w-sm w-full space-y-4 border-rose-500/30 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle size={20} />
              </div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Eliminar Atleta</h3>
            </div>

            <p className="text-zinc-400 text-xs leading-relaxed font-sans">
              ¿Estás seguro de eliminar a <strong className="text-white">{profiles.find(p => p.id === showDeleteConfirm)?.name}</strong>? Se borrarán sus rutinas locales y registros.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 bg-white/[0.04] border border-white/[0.08] text-white text-xs font-bold rounded-xl active:scale-95"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-3 bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-black uppercase tracking-wider rounded-xl active:scale-95 hover:bg-rose-500/30"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            background: '#0C0C12', 
            color: '#fff', 
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '1rem',
            fontSize: '12px',
            fontFamily: 'monospace'
          } 
        }} 
      />
    </div>
  );
}