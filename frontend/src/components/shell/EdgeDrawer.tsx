import React, { useState } from 'react';

interface EdgeDrawerProps {
  label: string;
  side?: 'left' | 'right';
  /** Abrir automáticamente al montar (ej. al entrar recién a la vista). */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

// Pestaña fija + panel deslizable — visible solo en móvil (md:hidden). En
// desktop, el layout de cada vista renderiza su sidebar normal aparte.
export const EdgeDrawer: React.FC<EdgeDrawerProps> = ({ label, side = 'left', defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const isLeft = side === 'left';

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(true)}
        className={`fixed ${isLeft ? 'left-0 rounded-r-xl' : 'right-0 rounded-l-xl'} top-1/2 -translate-y-1/2 z-[1650] bg-neutral-900/90 hover:bg-neutral-900 text-white px-1 py-3 shadow-xl backdrop-blur-md flex items-center transition-opacity ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ writingMode: 'vertical-rl' }}
        aria-label={label}
      >
        <span className="text-[10px] font-bold tracking-widest">{label}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[1700]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div
            className={`absolute ${isLeft ? 'left-0' : 'right-0'} top-0 bottom-0 w-[88%] max-w-sm bg-white/95 backdrop-blur-md ${isLeft ? 'rounded-r-[24px]' : 'rounded-l-[24px]'} shadow-2xl flex flex-col animate-in ${isLeft ? 'slide-in-from-left' : 'slide-in-from-right'} duration-300`}
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-100 shrink-0">
              <h3 className="text-sm font-black text-neutral-800 uppercase tracking-widest">{label}</h3>
              <button onClick={() => setOpen(false)} className="p-2 -mr-2 text-neutral-400 hover:text-red-500" aria-label="Cerrar">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
      )}
    </div>
  );
};
