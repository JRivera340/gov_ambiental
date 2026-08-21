import React, { useState } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { useGestorAmbientalCtx } from '../context/GestorAmbientalContext';
import { RutaPolylineLayer } from './RutaPolylineLayer';
import { BoundaryLayer } from '../../../components/BoundaryLayer';
import { EdgeDrawer } from '../../../components/shell/EdgeDrawer';
import { esLunesBogota, diasRestantesSemana } from '../lib/rutaSemanal.lib';
import { resumenSemana, type SlotRuta } from '../lib/rutasCiclo';
import type { SemanaPlanDTO } from '../../../services/ambiental.service';

interface SemanaCardProps {
  semana: SemanaPlanDTO;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}

// Una tarjeta por semana del ciclo. Antes había tres modos (Completa /
// Emergencia / Sin Visita) armados sobre todos los puntos asignados: el gestor
// podía recorrer puntos de la semana que no le tocaba y esas visitas no
// contaban. Ahora solo se planifica una de las dos semanas reales del ciclo.
const SemanaCard: React.FC<SemanaCardProps> = ({ semana, disabled, loading, onClick }) => {
  const { total, visitados, pendientes, emergencias, pct } = resumenSemana(semana);
  const color = semana.esActual ? '#2563eb' : '#64748b';

  return (
    <div className="p-3 rounded-2xl border border-neutral-200 shadow-sm bg-white">
      <div className="flex items-center justify-between mb-1 gap-2">
        <p className="text-xs font-bold text-neutral-800">{semana.etiqueta}</p>
        <span
          className="text-[11px] font-black px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${color}1a`, color }}
        >
          {total}
        </span>
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color }}>
        {semana.esActual ? 'En curso' : 'Siguiente'}
      </p>
      <p className="text-[11px] text-neutral-500 mb-1">
        {visitados} de {total} visitados · {pendientes} por visitar
      </p>
      {emergencias > 0 && (
        <p className="text-[11px] font-bold text-red-600 mb-1">{emergencias} en emergencia</p>
      )}
      <div className="h-1.5 rounded-full bg-neutral-100 mb-3 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="w-full py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        style={{ background: color }}
      >
        {loading ? 'Calculando...' : 'Calcular Ruta'}
      </button>
    </div>
  );
};

export const PlanificadorRutaView: React.FC = () => {
  const {
    puntosParaRuta,
    calcularRuta,
    descartarRutaActiva,
    semanaFinISO,
    rutaActiva,
    setViewMode,
    plan,
  } = useGestorAmbientalCtx();

  const [calculando, setCalculando] = useState<SlotRuta | null>(null);
  const hayRutaActiva = !!rutaActiva && rutaActiva.estado === 'en_progreso';

  const handleCalcular = async (slot: SlotRuta) => {
    setCalculando(slot);
    try {
      await calcularRuta(slot);
    } finally {
      setCalculando(null);
    }
  };

  const center: [number, number] =
    puntosParaRuta.length > 0
      ? [puntosParaRuta[0].lat, puntosParaRuta[0].lng]
      : [4.5981, -74.0758];

  const esLunes = esLunesBogota(new Date());
  const diasRestantes = semanaFinISO ? diasRestantesSemana(semanaFinISO, new Date()) : null;

  const sidebarContent = (
    <>
      <div className="p-4 border-b border-neutral-100">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-black text-neutral-900">Planificar Ruta</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('historial-rutas')}
              className="text-[11px] font-bold text-neutral-500 hover:text-neutral-700 border border-neutral-200 hover:border-neutral-300 px-2 py-1 rounded-lg transition-all"
            >
              Historial
            </button>
            <button
              onClick={descartarRutaActiva}
              className="hidden md:block text-neutral-400 hover:text-neutral-600 transition-colors"
              aria-label="Descartar planificación"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-[11px] text-neutral-500">
          {puntosParaRuta.length} puntos con residuos pendientes ·{' '}
          {puntosParaRuta.filter(p => p.diasVencido >= 4).length} vencidos
        </p>
        {diasRestantes !== null && (
          <p className="text-[11px] text-neutral-500 mt-1">
            Semana: quedan {diasRestantes} días
          </p>
        )}
        {esLunes && (
          <div className="mt-2 p-2 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-[11px] font-bold text-blue-700">
              Es lunes — arma la ruta de la semana
            </p>
            <p className="text-[10px] text-blue-600">
              {puntosParaRuta.length} puntos pendientes en tu zona
            </p>
          </div>
        )}
      </div>

      {hayRutaActiva && (
        <div className="p-4 border-b border-neutral-100">
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
            <p className="text-[11px] font-bold text-blue-700 mb-0.5">Ya tienes una ruta activa</p>
            <p className="text-[10px] text-blue-600 mb-2">
              No podés calcular una ruta nueva hasta finalizar, cancelar, o que se cierre sola (fin de semana o todos los puntos visitados).
            </p>
            <button
              onClick={() => setViewMode('ruta-activa')}
              className="w-full py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-sm"
            >
              Ver Ruta Activa →
            </button>
          </div>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3">
        {!plan && <p className="text-[11px] text-neutral-400">Cargando el plan del ciclo…</p>}
        {plan?.semanas.map((semana, i) => (
          <SemanaCard
            key={semana.inicioISO}
            semana={semana}
            disabled={hayRutaActiva || semana.planificados.length === 0 || calculando !== null}
            loading={calculando === (i as SlotRuta)}
            onClick={() => handleCalcular(i as SlotRuta)}
          />
        ))}
      </div>
    </>
  );

  return (
    <div className="relative flex h-full overflow-hidden">
      {/* Sidebar desktop */}
      <div className="hidden md:flex md:w-80 shrink-0 flex-col bg-white border-r border-neutral-100 overflow-y-auto">
        {sidebarContent}
      </div>

      {/* Aleta desplegable en móvil — el mapa ocupa toda la pantalla */}
      <EdgeDrawer label="Ver rutas">{sidebarContent}</EdgeDrawer>

      <div className="flex-1">
        <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <BoundaryLayer
            filterByName="Santa Fe"
            color="#dc2626"
            fillColor="#dc2626"
            fillOpacity={0.1}
            weight={2}
          />
          <RutaPolylineLayer paradas={puntosParaRuta} color="#2563eb" showNumbers={false} />
        </MapContainer>
      </div>
    </div>
  );
};
