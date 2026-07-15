import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('✅ Lomecan instalada');
      }
      setDeferredPrompt(null);
    } else {
      // Si no hay evento, mostramos las instrucciones
      setShowInstructions(true);
    }
  };

  const handleCloseInstructions = () => setShowInstructions(false);

  // Este componente se muestra siempre (ya que queremos forzar la instalación)
  return (
    <>
      <button
        onClick={handleInstall}
        className="fixed bottom-24 left-4 right-4 z-50 bg-[#D4FF00] text-[#09090B] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-[#D4FF00]/30 active:scale-95 transition-all"
      >
        <Download size={20} />
        {deferredPrompt ? 'Instalar Lomecan' : 'Instalar app'}
      </button>

      {showInstructions && (
        <div className="fixed inset-0 z-[200] bg-[#09090B]/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-[#0A0A0C] border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold text-sm mb-4">Cómo instalar Lomecan</h3>
            <ol className="text-zinc-400 text-sm space-y-3 list-decimal list-inside">
              <li>Abre el menú del navegador (⋮ o ⊙).</li>
              <li>Toca <strong className="text-white">"Agregar a pantalla de inicio"</strong> (o "Instalar aplicación").</li>
              <li>Confirma la instalación. La app aparecerá como una aplicación nativa.</li>
            </ol>
            <button
              onClick={handleCloseInstructions}
              className="mt-6 w-full py-3 bg-[#D4FF00] text-[#09090B] font-bold rounded-xl text-sm"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}