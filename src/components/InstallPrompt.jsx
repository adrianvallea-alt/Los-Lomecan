import React, { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Si ya está instalada, no mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
      return;
    }

    // Si después de 5s no se ha disparado el evento, mostramos el botón igual
    const timeout = setTimeout(() => {
      if (!deferredPrompt) setShowPrompt(true);
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(timeout);
    };
  }, [deferredPrompt]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') console.log('Usuario instaló la app');
      setDeferredPrompt(null);
      setShowPrompt(false);
    } else if (isIOS) {
      alert('Para instalar Lomecan en iOS:\n1. Toca el ícono de compartir (📤)\n2. Desliza y elige "Agregar a inicio"\n3. Toca "Agregar"');
      setShowPrompt(false);
    } else {
      alert('Puedes instalar esta aplicación desde el menú del navegador (normalmente "Agregar a pantalla de inicio").');
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 bg-[#0A0A0C] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-4 flex items-center justify-between shadow-2xl shadow-black/40 animate-slide-up">
      <div className="flex items-center gap-3">
        {isIOS ? <Share size={20} className="text-[#D4FF00]" /> : <Download size={20} className="text-[#D4FF00]" />}
        <span className="text-white text-sm font-medium">
          {isIOS ? 'Agregar a inicio' : 'Instalar Lomecan'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleInstall}
          className="px-4 py-2 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-xs active:scale-95 transition-all"
        >
          {isIOS ? 'Cómo' : 'Instalar'}
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-2 text-zinc-400 hover:text-white"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}