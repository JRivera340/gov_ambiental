// ObjetivosDiariosTile.tsx — meta semanal agregada vs completado real, pensado
// para mostrarse en pantalla/proyector (vista resumen tipo "objetivos"). Usa
// el mismo agregado que DesempenoGestoresPanel (getResumenDesempeno sin
// filtro) — una sola fuente de verdad para ambos.
import React, { useEffect, useState } from 'react';
import { ambientalService } from '../../../../services/ambiental.service';

export const ObjetivosDiariosTile: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [semanaISO, setSemanaISO] = useState('');
  const [targetTotal, setTargetTotal] = useState(0);
  const [actualTotal, setActualTotal] = useState(0);

  useEffect(() => {
    let cancelado = false;
    ambientalService.getDesempeno()
      .then((data) => {
        if (cancelado) return;
        setSemanaISO(data.semanaISO);
        setTargetTotal(data.targetTotal);
        setActualTotal(data.actualTotal);
      })
      .catch(() => {})
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const pct = targetTotal > 0 ? Math.round((actualTotal / targetTotal) * 100) : 0;

  return (
    <div className="card p-3 bg-white border-l-4 border-l-[#9333ea] shadow-sm flex flex-col min-h-[110px] overflow-hidden">
      <div className="flex justify-between items-center mb-2 pb-1 border-b border-neutral-50">
        <h3 className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider">Objetivos Semanales — Todos los Gestores</h3>
        {semanaISO && <span className="text-[7px] text-neutral-400 font-bold uppercase">Semana {semanaISO}</span>}
      </div>
      {loading ? (
        <p className="text-[10px] text-neutral-400">Cargando…</p>
      ) : (
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-neutral-400 leading-none mb-1">Meta</span>
            <span className="text-lg font-black text-neutral-800 leading-none">{targetTotal}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] uppercase font-bold text-[#16a34a] leading-none mb-1">Completado</span>
            <span className="text-lg font-black text-[#16a34a] leading-none">{actualTotal}</span>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-bold text-neutral-500 mb-1">
              <span>Avance</span>
              <span>{pct}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
              <div className="h-full rounded-full bg-[#9333ea]" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
