import React, { useState, useEffect, useCallback } from 'react';
import { X, ShieldAlert } from 'lucide-react';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 'clear', 0, 'delete'];
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 30;

export default function PinModal({ profileName, onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [pressedKey, setPressedKey] = useState(null); // para feedback táctil visual

  // Cuenta regresiva de bloqueo (sin cambios)
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

  // Efecto de vibración cuando el componente padre notifica error (conservado)
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
      <div className="w-full max-w-xs relative">
        {/* Aura de seguridad ultra sutil */}
        <div className="absolute -inset-8 bg-[#D4FF00]/[0.03] blur-3xl rounded-full pointer-events-none" />

        <div className={`relative bg-[#0A0A0C] border border-white/[0.07] rounded-[2.5rem] p-7 text-center shadow-2xl shadow-black/30 ${shake ? 'animate-shake' : ''}`}>
          {/* Botón cerrar */}
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-500 hover:text-white active:scale-95 transition-all"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>

          {/* Icono de seguridad */}
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5">
            <ShieldAlert size={30} className="text-[#D4FF00]" />
          </div>

          <h2 className="text-xl font-bold text-white mb-1 tracking-tight">{profileName}</h2>
          <p className="text-xs text-zinc-500 mb-8">
            {lockedUntil
              ? `Bloqueado ${remainingSeconds}s`
              : 'Ingresa tu PIN de 4 dígitos'}
          </p>

          {/* Indicador de dígitos (círculos) rediseñado */}
          <div className="flex justify-center gap-5 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border transition-all duration-300 ${
                  pin.length > i
                    ? 'bg-[#D4FF00] border-[#D4FF00] shadow-[0_0_8px_rgba(212,255,0,0.3)] scale-100'
                    : 'border-white/15 bg-transparent scale-90'
                } ${lockedUntil ? 'opacity-30' : ''}`}
              />
            ))}
          </div>

          {/* Mensaje de error */}
          {error && (
            <div className="flex items-center justify-center gap-1.5 text-red-400 text-xs mb-5 animate-fade-in">
              <ShieldAlert size={12} />
              <span>{error}</span>
            </div>
          )}

          {/* Teclado numérico premium con área táctil generosa */}
          <div className="grid grid-cols-3 gap-2.5 mb-6">
            {DIGITS.map((item) => {
              if (item === 'clear') {
                return (
                  <button
                    key="clear"
                    onClick={handleClear}
                    disabled={lockedUntil}
                    className="h-14 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-zinc-400 text-xs font-semibold uppercase tracking-wider hover:bg-white/[0.06] active:scale-95 transition-all disabled:opacity-20"
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
                    className="h-14 bg-white/[0.03] border border-white/[0.06] rounded-2xl text-zinc-400 text-lg hover:bg-white/[0.06] active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center"
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
                  className={`h-14 rounded-2xl font-semibold text-2xl transition-all duration-150 active:scale-90 flex items-center justify-center
                    ${pressedKey === item.toString() 
                      ? 'bg-white/[0.08] border-white/20 scale-95' 
                      : 'bg-white/[0.02] border border-white/[0.05] text-white hover:bg-white/[0.05] hover:border-white/10'
                    }
                    disabled:opacity-20 shadow-sm`}
                  aria-label={`Dígito ${item}`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {/* Intentos restantes estilizado */}
          {attempts > 0 && !lockedUntil && (
            <p className="text-[11px] text-zinc-600 mb-2">
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