import React from 'react';

export const Loading: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50">
      <div className="relative">
        {/* Spinner principal */}
        <div className="w-10 h-10 border-4 border-neutral-200 border-t-primary rounded-full animate-spin"></div>
        {/* Efecto de pulso */}
        <div className="absolute inset-0 w-10 h-10 rounded-full bg-primary/10 animate-ping"></div>
      </div>
      <p className="mt-4 text-sm text-neutral-500 font-medium">Cargando...</p>
    </div>
  );
};

