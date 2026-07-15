import React, { useState } from 'react';
import { X, Edit3, Trash2, Users, Search, Save, AlertTriangle, Check } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { updateProfile, deleteProfile } from '../lib/dataService';
import { COLORS } from '../utils/colors';

const AVATARS = ['🏋️', '🏃', '🧘', '💪', '🏊', '🚴', '🤸', '🏌️', '⛹️', '🤾', '🏄', '🧗', '🤼', '🏋️‍♀️', '🤹', '🏃‍♀️', '🚣', '🧗‍♂️', '🎯', '🔥'];

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
    color: COLORS[0]?.name || '',
    goals: { cal: 2000, pro: 100, carb: 200, fat: 50 },
    pin: '',
    avatar: null,
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
      color: COLORS[0]?.name || '',
      goals: { cal: 2000, pro: 100, carb: 200, fat: 50 },
      pin: '',
      avatar: null,
    });
    setEditingProfileId(null);
  };

  const handleEdit = (profile) => {
    setEditingProfileId(profile.id);
    setForm({
      id: profile.id,
      name: profile.name,
      role: profile.role || 'Athlete',
      color: COLORS.some(c => c.name === profile.color) ? profile.color : COLORS[0]?.name || '',
      goals: profile.goals || { cal: 2000, pro: 100, carb: 200, fat: 50 },
      pin: profile.pin || '',
      avatar: profile.avatar || null,
    });
  };

  const handleNew = () => {
    resetForm();
    toast('Ingresa los datos del nuevo perfil', { icon: '✨' });
  };

  const validateForm = () => {
    if (!form.id.trim()) {
      toast.error('El ID es obligatorio');
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
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (profileId) => {
    if (profileId === 'adrian') {
      toast.error('No se puede eliminar al administrador');
      return;
    }
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
    <div className="fixed inset-0 z-[100] bg-[#09090B]/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-[#0F0F11] border border-white/[0.06] rounded-[2.5rem] p-6 max-h-[90vh] overflow-y-auto shadow-2xl shadow-black/40">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 tracking-tight">
            <Users size={20} className="text-[#D4FF00]" />
            Perfiles
          </h2>
          <button 
            onClick={onClose} 
            className="p-2.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Búsqueda */}
        <div className="relative mb-5">
          <Search size={16} className="absolute left-3.5 top-3 text-zinc-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, ID o rol..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:border-[#D4FF00]/40 transition-colors outline-none"
            aria-label="Buscar perfiles"
          />
        </div>

        {/* Lista de perfiles */}
        <div className="space-y-2 mb-6">
          {filteredProfiles.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-4">No se encontraron perfiles</p>
          ) : (
            filteredProfiles.map(profile => {
              const colorObj = COLORS.find(c => c.name === profile.color);
              return (
                <div
                  key={profile.id}
                  className={`bg-white/[0.02] border ${
                    editingProfileId === profile.id ? 'border-[#D4FF00]/40' : 'border-white/[0.05]'
                  } rounded-2xl p-4 flex justify-between items-center transition-all hover:border-white/10 group`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0"
                      style={{ backgroundColor: colorObj?.hex || '#52525b' }}
                    >
                      {profile.avatar && profile.avatar.startsWith('http') ? (
                        <img src={profile.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span>{profile.avatar || profile.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-semibold text-sm truncate">{profile.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {profile.role} · <span className="text-[#D4FF00]/80">{profile.id}</span>
                      </p>
                      <div className="flex gap-2 mt-1 text-[10px] text-zinc-500">
                        <span>{profile.goals?.cal || '?'} kcal</span>
                        <span>·</span>
                        <span>P:{profile.goals?.pro || '?'} C:{profile.goals?.carb || '?'} G:{profile.goals?.fat || '?'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all active:scale-90"
                      aria-label={`Editar ${profile.name}`}
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(profile.id)}
                      className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-zinc-400 hover:text-red-400 hover:border-red-400/20 active:scale-90 transition-all"
                      aria-label={`Eliminar ${profile.name}`}
                      disabled={deleting === profile.id}
                    >
                      {deleting === profile.id ? (
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={handleNew}
          className="w-full py-3.5 border border-dashed border-white/[0.08] rounded-2xl text-sm text-zinc-400 hover:border-[#D4FF00]/30 hover:text-[#D4FF00] transition-all mb-6 active:scale-[0.98] font-medium"
        >
          + Nuevo perfil
        </button>

        {/* Formulario */}
        {(editingProfileId !== null || (!editingProfileId && form.name === '')) && (
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5 space-y-5 backdrop-blur-sm">
            <h3 className="text-white font-semibold text-sm flex items-center gap-2">
              <Edit3 size={15} className="text-[#D4FF00]" />
              {editingProfileId ? 'Editar' : 'Nuevo perfil'}
            </h3>

            <div className="space-y-4">
              {/* ID y Nombre */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] text-zinc-500 ml-1 mb-1 block">ID</label>
                  <input
                    value={form.id}
                    onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, '') })}
                    placeholder="ej: juan"
                    disabled={!!editingProfileId}
                    className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white disabled:opacity-40 focus:border-[#D4FF00]/40 transition-colors outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-zinc-500 ml-1 mb-1 block">Nombre</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Nombre"
                    className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/40 transition-colors outline-none"
                  />
                </div>
              </div>

              {/* Rol */}
              <div>
                <label className="text-[11px] text-zinc-500 ml-1 mb-1 block">Rol</label>
                <input
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value })}
                  placeholder="Ej: Coach, Athlete"
                  className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/40 transition-colors outline-none"
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-[11px] text-zinc-500 ml-1 mb-2 block">Color de fondo</label>
                <div className="flex gap-2 flex-wrap">
                  {/*
                    Se reemplaza el .map() por botones individuales con key explícita
                    para eliminar cualquier posibilidad de warning.
                  */}
                  <button key="silver" type="button" onClick={() => setForm({ ...form, color: 'silver' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'silver' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#A1A1AA' }} aria-label="Plata">{form.color === 'silver' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="red" type="button" onClick={() => setForm({ ...form, color: 'red' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'red' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#EF4444' }} aria-label="Rojo">{form.color === 'red' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="orange" type="button" onClick={() => setForm({ ...form, color: 'orange' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'orange' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#F97316' }} aria-label="Naranja">{form.color === 'orange' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="amber" type="button" onClick={() => setForm({ ...form, color: 'amber' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'amber' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#F59E0B' }} aria-label="Ámbar">{form.color === 'amber' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="yellow" type="button" onClick={() => setForm({ ...form, color: 'yellow' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'yellow' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#EAB308' }} aria-label="Amarillo">{form.color === 'yellow' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="lime" type="button" onClick={() => setForm({ ...form, color: 'lime' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'lime' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#84CC16' }} aria-label="Lima">{form.color === 'lime' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="green" type="button" onClick={() => setForm({ ...form, color: 'green' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'green' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#22C55E' }} aria-label="Verde">{form.color === 'green' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="emerald" type="button" onClick={() => setForm({ ...form, color: 'emerald' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'emerald' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#10B981' }} aria-label="Esmeralda">{form.color === 'emerald' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="teal" type="button" onClick={() => setForm({ ...form, color: 'teal' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'teal' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#14B8A6' }} aria-label="Turquesa">{form.color === 'teal' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="cyan" type="button" onClick={() => setForm({ ...form, color: 'cyan' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'cyan' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#06B6D4' }} aria-label="Cian">{form.color === 'cyan' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="sky" type="button" onClick={() => setForm({ ...form, color: 'sky' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'sky' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#0EA5E9' }} aria-label="Cielo">{form.color === 'sky' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="blue" type="button" onClick={() => setForm({ ...form, color: 'blue' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'blue' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#3B82F6' }} aria-label="Azul">{form.color === 'blue' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="indigo" type="button" onClick={() => setForm({ ...form, color: 'indigo' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'indigo' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#6366F1' }} aria-label="Índigo">{form.color === 'indigo' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="violet" type="button" onClick={() => setForm({ ...form, color: 'violet' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'violet' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#8B5CF6' }} aria-label="Violeta">{form.color === 'violet' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="purple" type="button" onClick={() => setForm({ ...form, color: 'purple' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'purple' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#A855F7' }} aria-label="Púrpura">{form.color === 'purple' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="fuchsia" type="button" onClick={() => setForm({ ...form, color: 'fuchsia' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'fuchsia' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#D946EF' }} aria-label="Fucsia">{form.color === 'fuchsia' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="pink" type="button" onClick={() => setForm({ ...form, color: 'pink' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'pink' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#EC4899' }} aria-label="Rosa">{form.color === 'pink' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="rose" type="button" onClick={() => setForm({ ...form, color: 'rose' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'rose' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#F43F5E' }} aria-label="Rosado">{form.color === 'rose' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="pastelPink" type="button" onClick={() => setForm({ ...form, color: 'pastelPink' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'pastelPink' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#FFD1DC' }} aria-label="Pastel Rosa">{form.color === 'pastelPink' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="mint" type="button" onClick={() => setForm({ ...form, color: 'mint' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'mint' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#C1E1C1' }} aria-label="Menta">{form.color === 'mint' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="babyBlue" type="button" onClick={() => setForm({ ...form, color: 'babyBlue' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'babyBlue' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#CFE2F3' }} aria-label="Bebé Azul">{form.color === 'babyBlue' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="peach" type="button" onClick={() => setForm({ ...form, color: 'peach' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'peach' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#FDE2E4' }} aria-label="Melocotón">{form.color === 'peach' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="lavender" type="button" onClick={() => setForm({ ...form, color: 'lavender' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'lavender' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#E6E6FA' }} aria-label="Lavanda">{form.color === 'lavender' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                  <button key="cream" type="button" onClick={() => setForm({ ...form, color: 'cream' })} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${form.color === 'cream' ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0F0F11] scale-110' : 'hover:scale-105'}`} style={{ backgroundColor: '#FFFACD' }} aria-label="Crema">{form.color === 'cream' && <Check size={14} className="text-white drop-shadow-md" strokeWidth={3} />}</button>
                </div>
              </div>

              {/* Avatar */}
              <div>
                <label className="text-[11px] text-zinc-500 ml-1 mb-2 block">Avatar</label>
                <div className="flex flex-wrap gap-1.5">
                  {/*
                    Se reemplaza el .map() de avatares por botones individuales con key.
                  */}
                  <button key="🏋️" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🏋️' ? null : '🏋️' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🏋️' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🏋️</button>
                  <button key="🏃" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🏃' ? null : '🏃' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🏃' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🏃</button>
                  <button key="🧘" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🧘' ? null : '🧘' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🧘' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🧘</button>
                  <button key="💪" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '💪' ? null : '💪' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '💪' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>💪</button>
                  <button key="🏊" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🏊' ? null : '🏊' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🏊' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🏊</button>
                  <button key="🚴" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🚴' ? null : '🚴' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🚴' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🚴</button>
                  <button key="🤸" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🤸' ? null : '🤸' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🤸' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🤸</button>
                  <button key="🏌️" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🏌️' ? null : '🏌️' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🏌️' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🏌️</button>
                  <button key="⛹️" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '⛹️' ? null : '⛹️' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '⛹️' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>⛹️</button>
                  <button key="🤾" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🤾' ? null : '🤾' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🤾' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🤾</button>
                  <button key="🏄" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🏄' ? null : '🏄' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🏄' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🏄</button>
                  <button key="🧗" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🧗' ? null : '🧗' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🧗' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🧗</button>
                  <button key="🤼" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🤼' ? null : '🤼' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🤼' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🤼</button>
                  <button key="🏋️‍♀️" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🏋️‍♀️' ? null : '🏋️‍♀️' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🏋️‍♀️' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🏋️‍♀️</button>
                  <button key="🤹" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🤹' ? null : '🤹' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🤹' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🤹</button>
                  <button key="🏃‍♀️" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🏃‍♀️' ? null : '🏃‍♀️' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🏃‍♀️' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🏃‍♀️</button>
                  <button key="🚣" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🚣' ? null : '🚣' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🚣' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🚣</button>
                  <button key="🧗‍♂️" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🧗‍♂️' ? null : '🧗‍♂️' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🧗‍♂️' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🧗‍♂️</button>
                  <button key="🎯" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🎯' ? null : '🎯' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🎯' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🎯</button>
                  <button key="🔥" type="button" onClick={() => setForm({ ...form, avatar: form.avatar === '🔥' ? null : '🔥' })} className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-all active:scale-90 ${form.avatar === '🔥' ? 'bg-white/10 ring-1 ring-white/30' : 'bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05]'}`}>🔥</button>
                </div>
              </div>

              {/* PIN */}
              <div>
                <label className="text-[11px] text-zinc-500 ml-1 mb-1 block">PIN (4 dígitos, opcional)</label>
                <input
                  type="password"
                  maxLength={4}
                  value={form.pin || ''}
                  onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  placeholder="••••"
                  className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white focus:border-[#D4FF00]/40 transition-colors outline-none"
                />
              </div>

              {/* Metas diarias */}
              <div>
                <label className="text-[11px] text-zinc-500 ml-1 mb-2 block">Macros objetivo</label>
                <div className="grid grid-cols-2 gap-3">
                  <div key="cal">
                    <label className="text-[10px] text-zinc-600">Calorías</label>
                    <input
                      type="number"
                      value={form.goals.cal}
                      onChange={e => setForm({ ...form, goals: { ...form.goals, cal: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white mt-1 focus:border-[#D4FF00]/40 transition-colors outline-none"
                    />
                  </div>
                  <div key="pro">
                    <label className="text-[10px] text-zinc-600">Proteínas (g)</label>
                    <input
                      type="number"
                      value={form.goals.pro}
                      onChange={e => setForm({ ...form, goals: { ...form.goals, pro: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white mt-1 focus:border-[#D4FF00]/40 transition-colors outline-none"
                    />
                  </div>
                  <div key="carb">
                    <label className="text-[10px] text-zinc-600">Carbohidratos (g)</label>
                    <input
                      type="number"
                      value={form.goals.carb}
                      onChange={e => setForm({ ...form, goals: { ...form.goals, carb: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white mt-1 focus:border-[#D4FF00]/40 transition-colors outline-none"
                    />
                  </div>
                  <div key="fat">
                    <label className="text-[10px] text-zinc-600">Grasas (g)</label>
                    <input
                      type="number"
                      value={form.goals.fat}
                      onChange={e => setForm({ ...form, goals: { ...form.goals, fat: parseInt(e.target.value) || 0 } })}
                      className="w-full bg-[#09090B] border border-white/[0.08] rounded-xl p-3 text-sm text-white mt-1 focus:border-[#D4FF00]/40 transition-colors outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-[#D4FF00] text-[#09090B] font-bold py-3.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-[#e5ff1a] active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg shadow-[#D4FF00]/10"
              >
                {saving ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <Save size={16} />
                )}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={resetForm}
                className="px-5 py-3.5 border border-white/[0.08] rounded-xl text-sm text-zinc-400 hover:text-white hover:bg-white/[0.03] transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-[#09090B]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[120]">
          <div className="bg-[#0F0F11] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={22} className="text-red-400" />
              <h3 className="text-base font-semibold text-white">Eliminar perfil</h3>
            </div>
            <p className="text-zinc-400 text-sm mb-6">
              ¿Eliminar <strong className="text-white">{profiles.find(p => p.id === showDeleteConfirm)?.name}</strong>? Se perderán rutinas y registros.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 bg-red-500/10 border border-red-400/20 text-red-400 font-semibold py-3 rounded-xl text-sm hover:bg-red-500/20 transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-white/[0.03] border border-white/[0.08] text-white py-3 rounded-xl text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster 
        position="top-center" 
        toastOptions={{ 
          style: { 
            background: '#0F0F11', 
            color: '#fff', 
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '1rem',
            fontSize: '13px'
          } 
        }} 
      />
    </div>
  );
}