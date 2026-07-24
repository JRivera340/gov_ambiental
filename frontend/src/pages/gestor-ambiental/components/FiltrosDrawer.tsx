import React, { useState } from 'react';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';

export const FiltrosDrawer: React.FC = () => {
  const {
    genFilterSubtipo, setGenFilterSubtipo,
    genFilterEstado, setGenFilterEstado,
    globalBarrio, setGlobalBarrio,
    barriosUnicos,
    listSearchNumber, setListSearchNumber,
    mapaEstadoRecoleccionFilter, setMapaEstadoRecoleccionFilter,
    setGenFilterTipo,
  } = useGestorAmbientalCtx();

  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Pestaña fija en el borde derecho — angosta en móvil, sin ícono para no ocupar espacio */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-[1650] bg-neutral-900/90 hover:bg-neutral-900 text-white px-1 py-3 md:px-2 md:py-4 rounded-l-xl md:rounded-l-2xl shadow-xl backdrop-blur-md flex items-center transition-opacity ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ writingMode: 'vertical-rl' }}
        aria-label="Abrir filtros"
      >
        <span className="text-[10px] md:text-xs font-bold tracking-widest">Filtros</span>
      </button>

      {/* Overlay + panel deslizable */}
      {open && (
        <div className="fixed inset-0 z-[1700]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-[88%] max-w-sm bg-white/95 backdrop-blur-md rounded-l-[24px] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-4 border-b border-neutral-100">
              <h3 className="text-base font-black text-neutral-800 uppercase tracking-widest">Filtros</h3>
              <button onClick={() => setOpen(false)} className="p-2 -mr-2 text-neutral-400 hover:text-red-500" aria-label="Cerrar filtros">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Tipo de Actividad</label>
                <select value={genFilterSubtipo} onChange={e => setGenFilterSubtipo(e.target.value)} className="input-field py-2 px-3 text-xs border-neutral-100 bg-neutral-50/50 w-full">
                  <option value="">Todos los tipos</option>
                  <option value="AMBIENTAL_PUNTOS_ACUMULACION">Puntos de Residuos</option>
                  <option value="AMBIENTAL">Act. Ambiental</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Filtrar por Estado</label>
                <select value={genFilterEstado} onChange={e => setGenFilterEstado(e.target.value)} className="input-field py-2 px-3 text-xs border-neutral-100 bg-neutral-50/50 w-full">
                  <option value="">Todos los estados</option>
                  <option value="ENVIADA">En Validación</option>
                  <option value="PUBLICADA">Publicadas</option>
                  <option value="RECHAZADA">Rechazadas</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Filtrar por Barrio</label>
                <select value={globalBarrio} onChange={e => setGlobalBarrio(e.target.value)} className="input-field py-2 px-3 text-xs border-neutral-100 bg-neutral-50/50 w-full">
                  <option value="">Todos los barrios</option>
                  {barriosUnicos.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Buscar por #</label>
                <input
                  type="text"
                  placeholder="Ej: 1"
                  value={listSearchNumber}
                  onChange={(e) => setListSearchNumber(e.target.value)}
                  className="input-field py-2 px-3 text-xs border-neutral-100 bg-neutral-50/50 w-full"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-neutral-400 uppercase tracking-widest pl-1">Estado Recoleccion</label>
                <div className="flex gap-1 w-full h-9">
                  <button
                    onClick={() => setMapaEstadoRecoleccionFilter(prev => prev === 'RECOGIDOS' ? 'ALL' : 'RECOGIDOS')}
                    className={`flex-1 text-[11px] font-bold rounded-lg border transition-all ${
                      mapaEstadoRecoleccionFilter === 'RECOGIDOS'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    Recogidos
                  </button>
                  <button
                    onClick={() => setMapaEstadoRecoleccionFilter(prev => prev === 'NO_RECOGIDOS' ? 'ALL' : 'NO_RECOGIDOS')}
                    className={`flex-1 text-[11px] font-bold rounded-lg border transition-all ${
                      mapaEstadoRecoleccionFilter === 'NO_RECOGIDOS'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    Pends
                  </button>
                </div>
              </div>
              <button
                onClick={() => { setGenFilterTipo(''); setGenFilterEstado(''); setGenFilterSubtipo(''); setGlobalBarrio(''); setListSearchNumber(''); setMapaEstadoRecoleccionFilter('ALL'); }}
                className="w-full text-xs font-bold text-neutral-400 hover:text-red-500 transition-colors p-2.5 bg-neutral-100 rounded-xl flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Limpiar Todos los Filtros
              </button>
              <p className="text-[11px] text-neutral-400 text-center">
                Los puntos de residuos se muestran siempre sin filtro de fecha
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
