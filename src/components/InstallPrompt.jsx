// src/components/InstallPrompt.jsx
import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Si ya estamos dentro de la app nativa de Capacitor (Android/iOS), NO mostrar nunca
    if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform()) {
      return;
    }

    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;

    if (isStandalone) return;

    const isDismissed = localStorage.getItem('lomecan_install_dismissed') === 'true';

    // 1. Si el evento ya fue capturado en index.html
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      if (!isDismissed) setIsVisible(true);
    }

    // 2. Evento nativo del navegador
    const nativeHandler = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
      if (!isDismissed) setIsVisible(true);
    };

    const customHandler = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        if (!isDismissed) setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', nativeHandler);
    window.addEventListener('lomecan-prompt-ready', customHandler);

    // Para iOS Safari
    const iosTimeout = setTimeout(() => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS && !isStandalone && !isDismissed) {
        setIsVisible(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', nativeHandler);
      window.removeEventListener('lomecan-prompt-ready', customHandler);
      clearTimeout(iosTimeout);
    };
  }, []);

  const handleInstall = async () => {
    const promptToUse = deferredPrompt || window.deferredPrompt;

    if (promptToUse) {
      promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        localStorage.setItem('lomecan_install_dismissed', 'true');
      }
      setDeferredPrompt(null);
      window.deferredPrompt = null;
    } else {
      setShowInstructions(true);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('lomecan_install_dismissed', 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Banner flotante ubicado arriba del BottomNav */}
      <div 
        className="fixed left-4 right-4 z-40 bg-[#0A0A0C]/95 border border-white/[0.12] p-4 rounded-[1.75rem] flex items-center justify-between gap-3 shadow-[0_15px_35px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-fade-in max-w-md mx-auto"
        style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#D4FF00]/10 border border-[#D4FF00]/25 rounded-2xl text-[#D4FF00] shadow-[0_0_12px_rgba(212,255,0,0.2)]">
            <Download size={18} />
          </div>
          <div>
            <h4 className="text-white font-bold text-xs leading-none">Instalar Lomecan</h4>
            <p className="text-zinc-400 text-[10px] mt-1 leading-none font-mono">Accede al instante desde tu inicio.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="bg-[#D4FF00] text-[#09090B] text-xs font-black uppercase tracking-wider px-3.5 py-2 rounded-xl active:scale-95 transition-all whitespace-nowrap shadow-md font-mono"
          >
            {(deferredPrompt || window.deferredPrompt) ? 'Instalar' : '¿Cómo?'}
          </button>
          
          <button 
            onClick={handleDismiss}
            className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors"
            aria-label="Descartar"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Modal de instrucciones */}
      {showInstructions && (
        <div className="fixed inset-0 z-[200] bg-[#09090B]/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-[2rem] p-6 max-w-sm w-full shadow-2xl animate-scale-in">
            <h3 className="text-white font-bold text-sm mb-4 font-sans">Cómo instalar Lomecan</h3>
            <ol className="text-zinc-400 text-xs space-y-3 list-decimal list-inside font-sans leading-relaxed">
              <li>Abre el menú del navegador (toca los <span className="text-white font-bold">⋮</span> o el icono de compartir <span className="text-white font-bold">⎋</span>).</li>
              <li>Toca <strong className="text-[#D4FF00]">"Agregar a pantalla de inicio"</strong> (o "Instalar aplicación").</li>
              <li>Confirma la acción para tener acceso directo como app nativa.</li>
            </ol>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-3.5 volt-button rounded-xl text-xs font-black uppercase tracking-wider active:scale-95 transition-all font-mono"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}