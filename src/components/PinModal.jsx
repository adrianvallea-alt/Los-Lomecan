// src/components/PinModal.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { X, ShieldAlert, Lock, Fingerprint } from 'lucide-react';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'delete'];
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 30;

export default function PinModal({ profileName, expectedPin, onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(null);
  const [pressedKey, setPressedKey] = useState(null);

  // Contador de bloqueo por reintentos fallidos
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

  const triggerKeyHaptic = (val) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(val);
    }
  };

  const handleDigit = useCallback((value) => {
    if (lockedUntil) return;
    triggerKeyHaptic(15);
    setPressedKey(value);
    setTimeout(() => setPressedKey(null), 120);

    if (pin.length < 4) {
      const nextPin = pin + value;
      setPin(nextPin);
      setError('');

      if (nextPin.length === 4) {
        // Validar PIN directamente
        if (!expectedPin || nextPin === expectedPin) {
          triggerKeyHaptic([30, 30, 60]);
          onSuccess(nextPin);
        } else {
          // PIN Incorrecto
          triggerKeyHaptic([80, 50, 80]);
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setShake(true);
          setTimeout(() => {
            setShake(false);
            setPin('');
          }, 450);

          if (newAttempts >= MAX_ATTEMPTS) {
            setError(`Demasiados intentos. Espera ${LOCKOUT_TIME}s`);
            setLockedUntil(Date.now() + LOCKOUT_TIME * 1000);
          } else {
            setError('PIN incorrecto');
          }
        }
      }
    }
  }, [pin, expectedPin, attempts, lockedUntil, onSuccess]);

  const handleDelete = () => {
    if (lockedUntil) return;
    triggerKeyHaptic(15);
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    if (lockedUntil) return;
    triggerKeyHaptic(20);
    setPin('');
    setError('');
  };

  const remainingSeconds = lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090B]/95 backdrop-blur-2xl flex items-center justify-center p-5 animate-fade-in select-none">
      <div className="w-full max-w-sm relative">
        <div className={`relative bg-[#0A0A0C] border border-white/[0.08] rounded-[2.5rem] p-7 text-center shadow-2xl ${shake ? 'animate-shake' : ''}`}>
          
          {/* Botón cerrar */}
          <button
            onClick={onCancel}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
            aria-label="Cerrar modal"
          >
            <X size={18} />
          </button>

          {/* Icono */}
          <div className="w-14 h-14 rounded-2xl bg-[#D4FF00]/10 border border-[#D4FF00]/30 flex items-center justify-center mx-auto mb-4 text-[#D4FF00] shadow-[0_0_20px_rgba(212,255,0,0.15)]">
            {lockedUntil ? <Lock size={26} /> : <Fingerprint size={26} />}
          </div>

          <h2 className="text-xl font-black text-white tracking-tight">{profileName}</h2>
          <p className="text-xs text-zinc-400 mt-1 mb-6">
            {lockedUntil ? `Bloqueado temporalmente: ${remainingSeconds}s` : 'Ingresa tu PIN de 4 dígitos'}
          </p>

          {/* Indicadores de dígitos */}
          <div className="flex justify-center gap-4 mb-7">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                  pin.length > i
                    ? 'bg-[#D4FF00] border-[#D4FF00] shadow-[0_0_10px_rgba(212,255,0,0.6)] scale-110'
                    : 'border-white/20 bg-transparent'
                } ${lockedUntil ? 'opacity-20' : ''}`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center justify-center gap-1.5 text-red-400 text-xs font-semibold mb-4 animate-fade-in">
              <ShieldAlert size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Teclado numérico táctil */}
          <div className="grid grid-cols-3 gap-2.5 mb-4">
            {DIGITS.map((item) => {
              if (item === 'clear') {
                return (
                  <button
                    key="clear"
                    onClick={handleClear}
                    disabled={lockedUntil}
                    className="h-12 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-zinc-400 text-[10px] font-bold uppercase tracking-wider hover:text-white active:scale-95 disabled:opacity-20"
                  >
                    Borrar
                  </button>
                );
              }
              if (item === 'delete') {
                return (
                  <button
                    key="delete"
                    onClick={handleDelete}
                    disabled={lockedUntil}
                    className="h-12 bg-white/[0.02] border border-white/[0.05] rounded-2xl text-zinc-400 text-lg hover:text-white active:scale-95 disabled:opacity-20 flex items-center justify-center"
                    aria-label="Retroceso"
                  >
                    ⌫
                  </button>
                );
              }
              return (
                <button
                  key={item}
                  onClick={() => handleDigit(item)}
                  disabled={lockedUntil}
                  className={`h-12 rounded-2xl font-black text-xl transition-all active:scale-90 flex items-center justify-center ${
                    pressedKey === item
                      ? 'bg-[#D4FF00] text-[#09090B]'
                      : 'bg-white/[0.03] border border-white/[0.06] text-white hover:border-[#D4FF00]/40'
                  } disabled:opacity-20`}
                >
                  {item}
                </button>
              );
            })}
          </div>

          {attempts > 0 && !lockedUntil && (
            <p className="text-[10px] text-zinc-500 font-mono">
              Intento {attempts}/{MAX_ATTEMPTS}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}