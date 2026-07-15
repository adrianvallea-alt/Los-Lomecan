import React, { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';

export default function LibraryAuth({ password, onCorrectPassword, onBack }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === password) {
      onCorrectPassword();
    } else {
      setError('Contraseña incorrecta');
      setInput('');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 safe-top safe-bottom animate-fade-in bg-[#09090B]">
      {/* Icono de seguridad */}
      <div className="w-20 h-20 rounded-2xl bg-[#D4FF00]/5 border border-[#D4FF00]/20 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(212,255,0,0.1)]">
        <Lock size={36} className="text-[#D4FF00]" />
      </div>

      <h2 className="text-xl font-bold text-white mb-8 tracking-tight">
        Biblioteca de Ejercicios
      </h2>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div className={`${shake ? 'animate-shake' : ''}`}>
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(''); }}
            placeholder="Contraseña"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 text-white text-center placeholder-zinc-500 focus:border-[#D4FF00]/40 focus:ring-1 focus:ring-[#D4FF00]/10 outline-none transition-all"
            aria-label="Contraseña de biblioteca"
            autoFocus
          />
        </div>

        {error && (
          <p className="text-red-400 text-xs text-center animate-fade-in">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-[#D4FF00] text-[#09090B] font-bold py-4 rounded-2xl active:scale-[0.98] transition-all shadow-lg shadow-[#D4FF00]/20"
        >
          Acceder
        </button>
      </form>

      <button
        onClick={onBack}
        className="mt-6 p-3 rounded-full bg-white/[0.03] border border-white/[0.06] text-zinc-400 hover:text-white active:scale-95 transition-all"
        aria-label="Volver"
      >
        <ArrowLeft size={20} />
      </button>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
      `}</style>
    </div>
  );
}