import React, { createContext, useContext } from 'react';
import type { GestorAmbientalValue } from '../hooks/useGestorAmbiental';

// Contexto tipado estricto: el valor es el ReturnType del hook, así tsc
// detecta cableado faltante (consumir un campo inexistente es error) igual
// que con props explícitas, pero sin prop-drilling de ~50 props.
const GestorAmbientalContext = createContext<GestorAmbientalValue | null>(null);

export const GestorAmbientalProvider: React.FC<{
  value: GestorAmbientalValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <GestorAmbientalContext.Provider value={value}>
      {children}
    </GestorAmbientalContext.Provider>
  );
};

export function useGestorAmbientalCtx(): GestorAmbientalValue {
  const ctx = useContext(GestorAmbientalContext);
  if (!ctx) {
    throw new Error('useGestorAmbientalCtx debe usarse dentro de <GestorAmbientalProvider>');
  }
  return ctx;
}
