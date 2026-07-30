import React from 'react';

// Mismo color por tipo que ya usan los marcadores del mapa (ver
// adminConstants.ts, tipoResiduoColors) — este ícono es la versión "de
// tarjeta" del mismo lenguaje visual, para tarjetas/listas de residuo que
// hoy solo muestran el nombre del tipo en texto.
const COLOR_BY_TIPO: Record<string, string> = {
  RESIDUOS_ORDINARIOS: '#3b82f6',
  RESIDUOS_VOLUMINOSOS: '#f97316',
  ESCOMBROS: '#8b5cf6',
  PLANTAS: '#10b981',
};

interface ResiduoTipoIconProps {
  tipo: string;
  size?: number;
}

export const ResiduoTipoIcon: React.FC<ResiduoTipoIconProps> = ({ tipo, size = 20 }) => {
  const color = COLOR_BY_TIPO[(tipo || '').toUpperCase()] || '#6b7280';
  return (
    <span
      title={tipo}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        background: color, color: 'white',
      }}
    >
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 7h12M9 7V4h6v3m-8 0 1 13a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2l1-13" />
      </svg>
    </span>
  );
};
