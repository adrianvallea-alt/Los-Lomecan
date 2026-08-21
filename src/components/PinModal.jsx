import React, { useState, useEffect, useCallback } from 'react';
import { X, ShieldAlert, Lock, Fingerprint } from 'lucide-react';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'clear', 0, 'delete'];
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 30;

export default function PinModal({ profileName, onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [pressedKey, setPressedKey] = useState(null);

  // Cuenta regresiva de bloqueo
  useEffect(() => {
    if (!lockedUntil) return;
    const timer = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setError('');
        setPin('');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [lockedUntil]);

  const handleDigit = useCallback((value) => {
    if (lockedUntil) return;
    setPressedKey(value);
    setTimeout(() => setPressedKey(null), 100);

    if (pin.length < 4) {
      const newPin = pin + value;
      setPin(newPin);
      setError('');

      if (newPin.length === 4) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setError(`Demasiados intentos. Espera ${LOCKOUT_TIME}s`);
          setLockedUntil(Date.now() + LOCKOUT_TIME * 1000);
          setPin('');
          return;
        }

        onSuccess(newPin);
      }
    }
  }, [pin, attempts, lockedUntil, onSuccess]);

  const handleDelete = () => {
    if (lockedUntil) return;
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (lockedUntil) return;
    setPin('');
    setError('');
  };

  // Efecto de vibración cuando el componente padre notifica error
  useEffect(() => {
    const handlePinError = () => {
      setShake(true);
      setPin('');
      setTimeout(() => setShake(false), 500);
    };
    window.__pinErrorShake = handlePinError;
    return () => delete window.__pinErrorShake;
  }, []);

  const remainingSeconds = lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090B]/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-sm relative">
        {/* Aura de seguridad ultra sutil */}
        <div className="absolute -inset-10 bg-[#D4FF00]/[0.05] blur-3xl rounded-full pointer-events-none" />

        <div className={`relative bg-gradient-to-br from-[#0A0A0C] via-[#0A0A0C] to-[#111] border border-[#D4FF00]/20 rounded-[2.5rem] p-8 text-center shadow-[0_0_40px_rgba(212,255,0,0.15)] ${shake ? 'animate-shake' : ''}`}>
          {/* Botón cerrar */}
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.03] border border-white/[0.08] text-zinc-500 hover:text-white hover:border-[#D4FF00]/40 hover:shadow-[0_0_12px_rgba(212,255,0,0.2)] active:scale-95 transition-all"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          {/* Icono de seguridad con neón */}
          <div className="w-16 h-16 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-5 shadow-[0_0_20px_rgba(212,255,0,0.2)]">
            {lockedUntil ? (
              <Lock size={30} className="text-[#D4FF00]" />
            ) : (
              <Fingerprint size={30} className="text-[#D4FF00]" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">{profileName}</h2>
          <p className="text-sm text-zinc-400 mb-8">
            {lockedUntil
              ? `Bloqueado ${remainingSeconds}s`
              : 'Ingresa tu PIN de 4 dígitos'}
          </p>

          {/* Indicador de dígitos (círculos) con neón */}
          <div className="flex justify-center gap-5 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                  pin.length > i
                    ? 'bg-[#D4FF00] border-[#D4FF00] shadow-[0_0_12px_rgba(212,255,0,0.6)] scale-110'
                    : 'border-white/20 bg-transparent scale-100'
                } ${lockedUntil ? 'opacity-30' : ''}`}
              />
            ))}
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-5 animate-fade-in">
              <ShieldAlert size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Teclado numérico premium */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {DIGITS.map((item) => {
              if (item === 'clear') {
                return (
                  <button
                    key="clear"
                    onClick={handleClear}
                    disabled={lockedUntil}
                    className="h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-zinc-400 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.06] hover:border-[#D4FF00]/30 active:scale-95 transition-all disabled:opacity-20"
                    aria-label="Limpiar"
                  >
                    Limpiar
                  </button>
                );
              }
              if (item === 'delete') {
                return (
                  <button
                    key="delete"
                    onClick={handleDelete}
                    disabled={lockedUntil}
                    className="h-14 bg-white/[0.03] border border-white/[0.08] rounded-2xl text-zinc-400 text-xl hover:bg-white/[0.06] hover:border-[#D4FF00]/30 active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center"
                    aria-label="Borrar dígito"
                  >
                    ⌫
                  </button>
                );
              }
              return (
                <button
                  key={item}
                  onClick={() => handleDigit(item.toString())}
                  disabled={lockedUntil}
                  className={`h-14 rounded-2xl font-semibold text-2xl transition-all duration-150 active:scale-90 flex items-center justify-center ${
                    pressedKey === item.toString()
                      ? 'bg-[#D4FF00]/15 border-[#D4FF00]/40 scale-95 shadow-[0_0_15px_rgba(212,255,0,0.2)]'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white hover:bg-white/[0.06] hover:border-[#D4FF00]/30'
                  } disabled:opacity-20`}
                  aria-label={`Dígito ${item}`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Intentos restantes */}
          {attempts > 0 && !lockedUntil && (
            <p className="text-xs text-zinc-500 mb-2">
              {attempts}/{MAX_ATTEMPTS} intentos
            </p>
          )}

          <button
            onClick={onCancel}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}