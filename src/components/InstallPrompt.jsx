import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true;

    if (isStandalone) return;

    const isDismissed = localStorage.getItem('lomecan_install_dismissed') === 'true';

    // 1. Si el evento ya fue capturado en index.html, lo usamos de inmediato
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
      if (!isDismissed) setIsVisible(true);
    }

    // 2. Por si acaso el evento se dispara después de montar el componente
    const nativeHandler = (e) => {
      e.preventDefault();
      window.deferredPrompt = e;
      setDeferredPrompt(e);
      if (!isDismissed) setIsVisible(true);
    };

    // 3. Escuchamos nuestro evento personalizado por si index.html lo captura un milisegundo después
    const customHandler = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
        if (!isDismissed) setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', nativeHandler);
    window.addEventListener('lomecan-prompt-ready', customHandler);

    // Para iOS: Mostrar banner automáticamente tras 4s si no está descartado
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
    // Usamos el estado de React o la variable global de respaldo
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
      // Si de verdad no hay evento (como en iOS), abrimos instrucciones
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
      {/* Banner flotante */}
      <div className="fixed bottom-6 left-4 right-4 z-50 bg-[#0A0A0C] border border-white/[0.08] p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xl backdrop-blur-md animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#D4FF00]/10 rounded-xl text-[#D4FF00]">
            <Download size={18} />
          </div>
          <div>
            <h4 className="text-white font-semibold text-xs leading-none">Instalar Lomecan</h4>
            <p className="text-zinc-400 text-[10px] mt-1 leading-none">Accede al instante desde tu inicio.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleInstall}
            className="bg-[#D4FF00] text-[#09090B] text-xs font-bold px-3.5 py-2 rounded-xl active:scale-95 transition-all whitespace-nowrap"
          >
            {(deferredPrompt || window.deferredPrompt) ? 'Instalar' : '¿Cómo?'}
          </button>
          
          <button 
            onClick={handleDismiss}
            className="p-1.5 text-zinc-500 hover:text-white rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Modal de instrucciones */}
      {showInstructions && (
        <div className="fixed inset-0 z-[200] bg-[#09090B]/90 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-4">Cómo instalar Lomecan</h3>
            <ol className="text-zinc-400 text-xs space-y-3 list-decimal list-inside">
              <li>Abre el menú del navegador (toca los <span className="text-white font-bold">⋮</span> o el icono de compartir <span className="text-white font-bold">⎋</span>).</li>
              <li>Toca <strong className="text-white">"Agregar a pantalla de inicio"</strong> (o "Instalar aplicación").</li>
              <li>Confirma la acción. ¡La app se añadirá a tu menú nativo!</li>
            </ol>
            <button
              onClick={() => setShowInstructions(false)}
              className="mt-6 w-full py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-xs active:scale-95 transition-all"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}