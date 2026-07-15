import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Lock } from 'lucide-react';
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
      {/* Luz ambiental minimalista y elegante */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[450px] h-[450px] bg-[#D4FF00]/[0.015] rounded-full blur-[120px]" />
      </div>

      {/* Header refinado */}
      <div className="w-full text-center mt-6 relative z-10">
        <span className="text-[10px] font-semibold tracking-[0.25em] text-[#D4FF00]/80 uppercase">
          LOS Lomecan
        </span>
        <h1 className="text-3xl font-bold text-white tracking-tight mt-2">
          ¿Listo para entrenar?
        </h1>
        <p className="text-zinc-500 text-xs mt-2 max-w-[260px] mx-auto leading-relaxed">
          Elige tu perfil para cargar tus datos.
        </p>
      </div>

      {/* Grid de perfiles con espaciado óptimo */}
      <div className="w-full max-w-sm mx-auto my-auto py-6 relative z-10">
        <div className="grid grid-cols-2 gap-x-5 gap-y-8">
          {profiles.map((profile, index) => {
            const hexColor = getColorHex(profile.color);
            return (
              <div
                key={profile.id}
                className={`relative flex flex-col items-center animate-fade-in-up transition-all duration-500 ease-out-expo ${
                  exitingProfileId === profile.id ? 'opacity-0 translate-y-4 scale-95 blur-sm' : 'opacity-100 translate-y-0 scale-100'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* Tarjeta completa unificada (incluye avatar, datos y botón editar) */}
                <button
                  onClick={() => handleProfileClick(profile)}
                  className="w-full flex flex-col items-center focus:outline-none group cursor-pointer active:scale-[0.97] transition-transform duration-200"
                  aria-label={`Seleccionar perfil de ${profile.name}`}
                >
                  {/* Avatar con indicador de seguridad integrado */}
                  <div className="relative w-24 h-24 mb-4">
                    {/* Sombra de color dinámica */}
                    <div 
                      className="absolute inset-1 rounded-[26px] blur-lg opacity-25 transition-opacity duration-300 group-hover:opacity-45"
                      style={{ backgroundColor: hexColor }}
                    />
                    {/* Borde de cristal */}
                    <div className="absolute inset-0 bg-white/[0.03] border border-white/10 rounded-[28px] transition-all duration-300 group-hover:border-white/20" />
                    {/* Imagen o inicial */}
                    <div
                      className={`absolute inset-[6px] rounded-[22px] flex items-center justify-center text-2xl font-bold overflow-hidden transition-transform duration-300 group-hover:scale-[1.03] ${profile.color}`}
                    >
                      {profile.avatar && profile.avatar.startsWith('http') ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover animate-fade-in" />
                      ) : (
                        <span className="text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                          {profile.avatar || profile.name.charAt(0)}
                        </span>
                      )}
                    </div>
                    {/* Indicador de PIN reposicionado y más visible */}
                    {profile.pin && (
                      <div className="absolute -top-1 -left-1 w-7 h-7 bg-zinc-900 border border-white/15 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm">
                        <Lock size={12} className="text-[#D4FF00]" />
                      </div>
                    )}
                  </div>

                  {/* Metadatos con mejor jerarquía */}
                  <span className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors tracking-wide leading-tight">
                    {profile.name}
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5 font-medium">
                    {profile.role}
                  </span>
                </button>

                {/* Botón de edición reposicionado con área táctil generosa y sin solapamiento */}
                <button
                  onClick={(e) => handleEditClick(e, profile)}
                  className="absolute top-0 right-1 w-10 h-10 bg-zinc-900/80 border border-white/10 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/30 active:scale-90 transition-all shadow-lg backdrop-blur-md z-20"
                  aria-label={`Editar perfil de ${profile.name}`}
                >
                  <Edit3 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer con CTA de alto contraste */}
      <div className="w-full max-w-xs mx-auto text-center mt-4 relative z-10">
        <button
          onClick={onAddProfile}
          className="w-full py-4 rounded-2xl border border-[#D4FF00]/20 bg-[#D4FF00]/[0.03] hover:bg-[#D4FF00]/[0.07] active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-xs font-semibold text-white tracking-wider uppercase backdrop-blur-sm"
        >
          <Plus size={14} className="text-[#D4FF00]" />
          <span>Crear nuevo perfil</span>
        </button>
        <p className="text-[9px] text-zinc-600 mt-3 text-center tracking-wider">
          v.1.0
        </p>
      </div>

      {/* Modales (igual que antes) */}
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
        .animate-fade-in-up {
          animation: fade-in-up 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
        .ease-out-expo {
          transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}