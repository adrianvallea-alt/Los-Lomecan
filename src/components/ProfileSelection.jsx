import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Lock, Users, Crown, Sparkles } from 'lucide-react';
import PinModal from './PinModal';
import EditProfileModal from './EditProfileModal';
import { COLORS, getColorHex } from '../utils/colors';

export default function ProfileSelection({ profiles, onSelectProfile, onAddProfile, onUpdateProfile }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [pinError, setPinError] = useState('');
  const [isExiting, setIsExiting] = useState(false);
  const [exitingProfileId, setExitingProfileId] = useState(null);

  const handleProfileClick = (profile) => {
    if (profile.pin) {
      setSelectedProfile(profile);
      setShowPinModal(true);
    } else {
      setExitingProfileId(profile.id);
      setIsExiting(true);
      setTimeout(() => {
        onSelectProfile(profile);
      }, 500);
    }
  };

  const handlePinSuccess = (enteredPin) => {
    if (enteredPin === selectedProfile.pin) {
      setShowPinModal(false);
      setPinError('');
      setExitingProfileId(selectedProfile.id);
      setIsExiting(true);
      setTimeout(() => {
        onSelectProfile(selectedProfile);
      }, 500);
    } else {
      setPinError('PIN incorrecto');
      setShowPinModal(false);
      setTimeout(() => setShowPinModal(true), 100);
    }
  };

  const handleEditClick = (e, profile) => {
    e.stopPropagation();
    if (profile.pin) {
      setSelectedProfile(profile);
      window.__editProfileAfterPin = true;
      setShowPinModal(true);
    } else {
      setEditingProfile(profile);
      setShowEditModal(true);
    }
  };

  const handlePinSuccessWithEdit = (enteredPin) => {
    if (window.__editProfileAfterPin) {
      if (enteredPin === selectedProfile.pin) {
        setShowPinModal(false);
        window.__editProfileAfterPin = false;
        setEditingProfile(selectedProfile);
        setShowEditModal(true);
      } else {
        setPinError('PIN incorrecto');
        setShowPinModal(false);
        setTimeout(() => setShowPinModal(true), 100);
      }
    } else {
      handlePinSuccess(enteredPin);
    }
  };

  const handleSaveProfile = (updatedProfile) => {
    onUpdateProfile(updatedProfile);
    setShowEditModal(false);
    setEditingProfile(null);
  };

  return (
    <div className="min-h-screen bg-[#09090B] flex flex-col justify-between py-10 px-6 select-none relative overflow-hidden">
      {/* Luces ambientales neón */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#D4FF00]/[0.03] rounded-full blur-[140px]" />
        <div className="absolute bottom-[-20%] left-[-20%] w-[400px] h-[400px] bg-[#D4FF00]/[0.02] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-20%] w-[350px] h-[350px] bg-[#D4FF00]/[0.02] rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <div className="w-full text-center mt-6 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Crown size={18} className="text-[#D4FF00]" />
          <span className="text-[10px] font-bold tracking-[0.3em] text-[#D4FF00] uppercase">
            Los Lomecan
          </span>
          <Crown size={18} className="text-[#D4FF00]" />
        </div>
        <h1 className="text-4xl font-black text-white tracking-tight leading-tight">
          ¿Listo para <span className="text-[#D4FF00] drop-shadow-[0_0_8px_rgba(212,255,0,0.5)]">entrenar</span>?
        </h1>
        <p className="text-zinc-400 text-sm mt-3 max-w-[280px] mx-auto leading-relaxed">
          Elige tu perfil para cargar tus datos y continuar tu progreso.
        </p>
      </div>

      {/* Grid de perfiles */}
      <div className="w-full max-w-sm mx-auto my-auto py-8 relative z-10">
        <div className="grid grid-cols-2 gap-5">
          {profiles.map((profile, index) => {
            const hexColor = getColorHex(profile.color);
            const isDicebear = profile.avatar?.includes('api.dicebear.com');
            return (
              <div
                key={profile.id}
                className={`relative flex flex-col items-center animate-fade-in-up transition-all duration-500 ease-out-expo ${
                  exitingProfileId === profile.id ? 'opacity-0 translate-y-4 scale-95 blur-sm' : 'opacity-100 translate-y-0 scale-100'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <button
                  onClick={() => handleProfileClick(profile)}
                  className="w-full flex flex-col items-center focus:outline-none group cursor-pointer active:scale-[0.97] transition-transform duration-200"
                  aria-label={`Seleccionar perfil de ${profile.name}`}
                >
                  {/* Avatar */}
                  <div className="relative w-24 h-24 mb-4">
                    {/* Glow de color dinámico */}
                    <div 
                      className="absolute inset-0 rounded-full blur-xl opacity-40 transition-opacity duration-300 group-hover:opacity-70 animate-pulse-slow"
                      style={{ backgroundColor: hexColor }}
                    />
                    
                    {/* Marco base (redondo) */}
                    <div className={`absolute inset-0 rounded-full border-2 transition-all duration-300 ${
                      isDicebear
                        ? 'border-[#D4FF00]/60 shadow-[0_0_25px_rgba(212,255,0,0.4)]'
                        : 'border-white/10 group-hover:border-[#D4FF00]/50 group-hover:shadow-[0_0_20px_rgba(212,255,0,0.25)]'
                    }`} />
                    
                    {/* Imagen o emoji */}
                    <div
                      className={`absolute inset-[6px] rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden transition-transform duration-300 group-hover:scale-[1.05] ${profile.color}`}
                    >
                      {profile.avatar && profile.avatar.startsWith('http') ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.5)]">
                          {profile.avatar || profile.name.charAt(0)}
                        </span>
                      )}
                    </div>

                    {/* Indicador de PIN */}
                    {profile.pin && (
                      <div className="absolute -top-1 -left-1 w-7 h-7 bg-zinc-900 border border-[#D4FF00]/40 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(212,255,0,0.3)] backdrop-blur-sm">
                        <Lock size={12} className="text-[#D4FF00]" />
                      </div>
                    )}

                    {/* Badge de avatar IA (DiceBear) */}
                    {isDicebear && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#D4FF00]/20 border border-[#D4FF00]/60 rounded-full flex items-center justify-center shadow-[0_0_12px_rgba(212,255,0,0.5)]">
                        <Sparkles size={12} className="text-[#D4FF00]" />
                      </div>
                    )}
                  </div>

                  <span className="text-sm font-bold text-white group-hover:text-[#D4FF00] transition-colors tracking-wide leading-tight">
                    {profile.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-medium">
                    {profile.role}
                  </span>
                </button>

                <button
                  onClick={(e) => handleEditClick(e, profile)}
                  className="absolute top-0 right-1 w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-[#D4FF00] hover:border-[#D4FF00]/40 hover:shadow-[0_0_12px_rgba(212,255,0,0.2)] active:scale-90 transition-all shadow-lg backdrop-blur-md z-20"
                  aria-label={`Editar perfil de ${profile.name}`}
                >
                  <Edit3 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-xs mx-auto text-center mt-4 relative z-10">
        <button
          onClick={onAddProfile}
          className="w-full py-4 rounded-2xl border border-[#D4FF00]/30 bg-[#D4FF00]/[0.05] hover:bg-[#D4FF00]/[0.1] hover:border-[#D4FF00]/50 hover:shadow-[0_0_20px_rgba(212,255,0,0.2)] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-sm font-bold text-white tracking-wider uppercase backdrop-blur-sm"
        >
          <Plus size={16} className="text-[#D4FF00]" />
          Crear nuevo perfil
        </button>
        <p className="text-[9px] text-zinc-600 mt-3 text-center tracking-widest">
          v.1.0
        </p>
      </div>

      {/* Modales */}
      {showPinModal && selectedProfile && (
        <PinModal
          profileName={selectedProfile.name}
          onSuccess={handlePinSuccessWithEdit}
          onCancel={() => {
            setShowPinModal(false);
            setSelectedProfile(null);
            window.__editProfileAfterPin = false;
          }}
        />
      )}

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

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(14px); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse-slow 2.5s ease-in-out infinite;
        }
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}