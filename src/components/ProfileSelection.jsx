// src/components/ProfileSelection.jsx
import React, { useState } from 'react';
import { Plus, Edit3, Lock, Crown, Sparkles, Shield, User, ChevronRight } from 'lucide-react';
import PinModal from './PinModal';
import EditProfileModal from './EditProfileModal';
import { getColorHex } from '../utils/colors';

const triggerHaptic = (ms = 20) => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(ms); } catch (e) {}
  }
};

export default function ProfileSelection({ profiles, onSelectProfile, onAddProfile, onUpdateProfile }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [pinAction, setPinAction] = useState(null); // 'select' | 'edit'
  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);

  const handleProfileClick = (profile) => {
    triggerHaptic(20);
    if (profile.pin) {
      setSelectedProfile(profile);
      setPinAction('select');
      setShowPinModal(true);
    } else {
      onSelectProfile(profile);
    }
  };

  const handleEditClick = (e, profile) => {
    e.stopPropagation();
    triggerHaptic(20);
    if (profile.pin) {
      setSelectedProfile(profile);
      setPinAction('edit');
      setShowPinModal(true);
    } else {
      setEditingProfile(profile);
      setShowEditModal(true);
    }
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    const targetProfile = selectedProfile;
    setSelectedProfile(null);

    if (pinAction === 'edit') {
      setEditingProfile(targetProfile);
      setShowEditModal(true);
    } else {
      onSelectProfile(targetProfile);
    }
  };

  const handleSaveProfile = (updatedProfile) => {
    onUpdateProfile(updatedProfile);
    setShowEditModal(false);
    setEditingProfile(null);
  };

  return (
    <div className="min-h-[100dvh] bg-[#050507] flex flex-col justify-between py-10 px-6 select-none relative overflow-hidden no-scrollbar">
      
      {/* Luces atmosféricas de fondo OLED */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[350px] bg-[#D4FF00]/[0.04] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[350px] h-[300px] bg-[#00F5FF]/[0.02] rounded-full blur-[140px]" />
      </div>

      {/* Header del Club VIP */}
      <div className="w-full text-center mt-2 shrink-0 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Crown size={15} className="text-[#D4FF00]" />
          <span className="luxury-badge text-[8px] py-0.5 px-2.5">
            CLUB DE RENDIMIENTO
          </span>
          <Crown size={15} className="text-[#D4FF00]" />
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight leading-tight font-sans">
          ¿Quién va a <span className="text-[#D4FF00] drop-shadow-[0_0_12px_rgba(212,255,0,0.5)]">entrenar</span>?
        </h1>
        <p className="text-zinc-400 text-xs mt-2 max-w-[270px] mx-auto font-sans leading-relaxed">
          Selecciona tu credencial para cargar tu telemetría y rutinas asignadas.
        </p>
      </div>

      {/* Grid de Membresías VIP */}
      <div className="w-full max-w-sm mx-auto my-auto py-6 relative z-10">
        <div className="grid grid-cols-2 gap-4">
          {profiles.map((profile, index) => {
            const hexColor = getColorHex(profile.color);
            const isDicebear = profile.avatar?.includes('api.dicebear.com');

            return (
              <div
                key={profile.id}
                className="relative luxury-card p-4 flex flex-col items-center text-center animate-fade-in hover:border-[#D4FF00]/40 transition-all cursor-pointer group active:scale-[0.98]"
                style={{ animationDelay: `${index * 60}ms` }}
                onClick={() => handleProfileClick(profile)}
              >
                {/* Botón de configuración / edición estilo perno metálico */}
                <button
                  onClick={(e) => handleEditClick(e, profile)}
                  className="absolute top-2.5 right-2.5 p-1.5 bg-[#050507] border border-white/[0.08] rounded-full text-zinc-500 hover:text-white hover:border-[#D4FF00]/40 active:scale-90 transition-all z-20"
                  aria-label={`Editar ${profile.name}`}
                >
                  <Edit3 size={11} />
                </button>

                {/* Avatar con bisel especular */}
                <div className="relative w-20 h-20 mb-3 mt-1">
                  <div
                    className="absolute inset-0 rounded-full blur-md opacity-30 group-hover:opacity-60 transition-opacity"
                    style={{ backgroundColor: hexColor }}
                  />
                  
                  <div className="absolute inset-0 rounded-full border-2 border-white/[0.08] group-hover:border-[#D4FF00]/60 transition-colors shadow-inner-light" />
                  
                  <div
                    className={`absolute inset-[5px] rounded-full flex items-center justify-center text-xl font-bold overflow-hidden transition-transform group-hover:scale-105 ${profile.color}`}
                  >
                    {profile.avatar && profile.avatar.startsWith('http') ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white drop-shadow-md">{profile.avatar || profile.name?.charAt(0)}</span>
                    )}
                  </div>

                  {/* Icono de PIN */}
                  {profile.pin && (
                    <div className="absolute -top-1 -left-1 w-6 h-6 bg-[#050507] border border-[#D4FF00]/40 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(212,255,0,0.3)]">
                      <Lock size={10} className="text-[#D4FF00]" />
                    </div>
                  )}

                  {isDicebear && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#D4FF00]/20 border border-[#D4FF00] rounded-full flex items-center justify-center shadow-sm">
                      <Sparkles size={9} className="text-[#D4FF00]" />
                    </div>
                  )}
                </div>

                {/* Nombre y Rol */}
                <span className="text-xs font-black text-white group-hover:text-[#D4FF00] transition-colors truncate max-w-[120px] tracking-tight">
                  {profile.name}
                </span>

                <span className="text-[8.5px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-500 mt-1">
                  {profile.role || 'ATLETA'}
                </span>

                {/* Mini-resumen de calorías */}
                <div className="mt-2.5 pt-2 border-t border-white/[0.04] w-full flex justify-center items-center gap-1 text-[9px] font-mono text-zinc-400">
                  <span className="text-[#D4FF00] font-bold">{profile.goals?.cal || 2000}</span>
                  <span className="text-zinc-600">KCAL</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer: Crear nuevo miembro VIP */}
      <div className="w-full max-w-xs mx-auto text-center mt-2 shrink-0 relative z-10">
        <button
          onClick={() => {
            triggerHaptic(25);
            onAddProfile();
          }}
          className="w-full py-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] text-xs font-mono font-extrabold text-white uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-white/[0.05] hover:border-[#D4FF00]/40 active:scale-95 transition-all shadow-inner-light"
        >
          <Plus size={15} className="text-[#D4FF00]" />
          Añadir Miembro VIP
        </button>

        <p className="text-[9px] font-mono text-zinc-600 mt-3 tracking-[0.25em] uppercase">
          LOMECAN PERFORMANCE CLUB
        </p>
      </div>

      {/* Modal de PIN */}
      {showPinModal && selectedProfile && (
        <PinModal
          profileName={selectedProfile.name}
          expectedPin={selectedProfile.pin}
          onSuccess={handlePinSuccess}
          onCancel={() => {
            setShowPinModal(false);
            setSelectedProfile(null);
            setPinAction(null);
          }}
        />
      )}

      {/* Modal de Edición */}
      {showEditModal && editingProfile && (
        <EditProfileModal
          profile={editingProfile}
          onSave={handleSaveProfile}
          onCancel={() => {
            setShowEditModal(false);
            setEditingProfile(null);
          }}
        />
      )}
    </div>
  );
}