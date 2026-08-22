import React from 'react';

// Encabezado institucional: los dos logos, la identificación del sistema y la
// salida de sesión. Mismo lenguaje que ya usa el mapa del validador, pero como
// pieza propia para que cualquier pantalla lo monte sin copiar el markup.

interface InstitutionalHeaderProps {
  titulo: string;
  subtitulo?: string;
  usuario?: { name?: string; lastname?: string; email?: string } | null;
  onCerrarSesion?: () => void;
  /** Contenido opcional a la derecha, antes del bloque de usuario. */
  acciones?: React.ReactNode;
}

export const InstitutionalHeader: React.FC<InstitutionalHeaderProps> = ({
  titulo,
  subtitulo,
  usuario,
  onCerrarSesion,
  acciones,
}) => {
  const nombre = [usuario?.name, usuario?.lastname].filter(Boolean).join(' ').trim();
  const inicial = (usuario?.name || usuario?.email || 'A').charAt(0).toUpperCase();

  return (
    <header
      className="relative shrink-0 flex items-center justify-between gap-4 px-4 sm:px-6"
      style={{
        height: 64,
        background: 'linear-gradient(90deg, #8b021c 0%, #c9142f 48%, #e4032e 100%)',
        boxShadow: '0 6px 24px -8px rgba(139, 2, 28, 0.55)',
      }}
    >
      {/* Brillo superior: da el borde de vidrio sin agregar un nodo visible. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent)' }}
      />

      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/images/alcaldialocalsantafe-sinfondo.png"
          alt="Alcaldía Local de Santa Fe"
          className="h-9 sm:h-10 w-auto object-contain shrink-0"
        />
        <div className="hidden sm:block w-px h-8 bg-white/25" />
        <div className="min-w-0 hidden sm:block">
          <p className="font-display text-[15px] font-bold text-white leading-tight truncate">{titulo}</p>
          {subtitulo && <p className="text-[11px] text-white/70 leading-tight truncate">{subtitulo}</p>}
        </div>
      </div>

      <img
        src="/images/bogotaneidapp_sinfondo.png"
        alt="BogotaneidApp"
        className="hidden md:block absolute left-1/2 -translate-x-1/2 h-16 w-auto object-contain"
      />

      <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
        {acciones}
        {usuario && (
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/25 flex items-center justify-center text-white font-display font-bold text-xs">
              {inicial}
            </div>
            <div className="leading-tight">
              {nombre && <p className="text-[12px] font-semibold text-white">{nombre}</p>}
              <p className="text-[10px] text-white/60">{usuario.email}</p>
            </div>
          </div>
        )}
        {onCerrarSesion && (
          <button
            onClick={onCerrarSesion}
            className="text-[11px] font-bold text-white bg-white/15 hover:bg-white/25 border border-white/25 px-3 py-1.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            Cerrar sesión
          </button>
        )}
      </div>
    </header>
  );
};
