import { useState, useMemo, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { differenceInDays } from 'date-fns';
import type { Activity } from '../../../types';
import type { ViewMode } from '../lib/constants';
import type { ParadaRuta, RutaActiva } from '../lib/ruta.types';
import { getResiduos, isPuntoEmergencia } from '../lib/residuos';
import { diasDesdeUltimoToque } from '../lib/visitado';
import {
  getRutaActiva, saveRutaActiva, clearRutaActiva,
  addToHistorial, cancelarRutaAndAddToHistorial, getHistorialRutas, deleteFromHistorial,
  buildSegmentos, getUnvisitedActivityIds,
} from '../lib/ruta';
import { nearestNeighborRoute } from '../lib/geo';
import { getParadasDeSemana, type SlotRuta } from '../lib/rutasCiclo';
import { ambientalService, type RutaSemanalDTO, type PlanCicloDTO } from '../../../services/ambiental.service';
import { paradaLiteFromParadaRuta, hidratarParadas } from '../lib/rutaSemanal.lib';

type RutaUser = { id: string; name: string; lastname?: string } | null;
type ToastSetter = (t: { message: string; type: 'success' | 'error' | 'info' } | null) => void;

function reconstruirRutaActiva(dto: RutaSemanalDTO, puntos: ParadaRuta[]): RutaActiva {
  const paradas = hidratarParadas(dto, puntos);
  const estado: RutaActiva['estado'] =
    dto.estado === 'cancelada' ? 'cancelada'
    : dto.estado === 'cerrada' || dto.estado === 'completada' ? 'finalizada'
    : 'en_progreso';
  return {
    id: dto.id,
    gestorId: dto.gestorId,
    gestorNombre: '',
    fechaCreacion: dto.semanaInicio,
    estado,
    totalPuntos: paradas.length,
    puntosVencidos: paradas.filter(p => p.diasVencido >= 4).length,
    // Los segmentos se reconstruyen siempre desde las paradas hidratadas: el
    // backend congela dto.segmentos al crear la ruta y marcarParada solo
    // actualiza dto.paradas[].visitado, así que preferir dto.segmentos
    // mostraría checkmarks obsoletos.
    segmentos: buildSegmentos(paradas),
  };
}

// Planificador y seguimiento de rutas del gestor ambiental. Autónomo dado
// (activities, user, setViewMode); toda la lógica y estado de ruta viven aquí.
export function useRutaAmbiental(
  activities: Activity[],
  user: RutaUser,
  setViewMode: Dispatch<SetStateAction<ViewMode>>,
  setToast?: ToastSetter,
) {
  const [rutaActiva, setRutaActiva] = useState<RutaActiva | null>(() =>
    user ? getRutaActiva(user.id) : null
  );
  const [activeSegmento, setActiveSegmento] = useState<'A' | 'B' | 'C' | null>(null);
  const [historialRutas, setHistorialRutas] = useState<RutaActiva[]>(() =>
    user ? getHistorialRutas(user.id) : []
  );
  const [historialRutaSeleccionada, setHistorialRutaSeleccionada] = useState<RutaActiva | null>(null);
  const [puntosAsignados, setPuntosAsignados] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanCicloDTO | null>(null);
  const [rutaSemanalId, setRutaSemanalId] = useState<string | null>(null);
  const [arrastreIds, setArrastreIds] = useState<string[]>([]);
  const [semanaFinISO, setSemanaFinISO] = useState<string | null>(null);

  // El plan del ciclo trae, además del reparto en dos semanas, qué puntos ya
  // están visitados. Es la única fuente de "visitado": antes cada pantalla lo
  // deducía por su cuenta (unas por ultimoSeguimientoAt, otras por autoría de
  // residuo) y los números no coincidían entre sí ni con el backend.
  const recargarPlan = useCallback(async () => {
    try {
      setPlan(await ambientalService.getPlanCiclo());
    } catch {
      setPlan(null);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    if (!user) return;
    ambientalService.getMisPuntos()
      .then(ps => { if (vivo) setPuntosAsignados(ps); })
      .catch(() => { if (vivo) setPuntosAsignados([]); });
    recargarPlan();
    return () => { vivo = false; };
  }, [user, recargarPlan]);

  const semanaEnCurso = plan?.semanas[0] ?? null;
  const semanaSiguiente = plan?.semanas[1] ?? null;

  // Visitados de todo el ciclo: un punto visitado cuenta como tal aunque
  // pertenezca a la semana siguiente.
  const visitadosIds = useMemo(
    () => new Set((plan?.semanas ?? []).flatMap((s) => s.visitados)),
    [plan],
  );

  // ── Puntos candidatos para la ruta ─────────────────────────────
  const puntosParaRuta = useMemo((): ParadaRuta[] => {
    const pendientesAnteriores = user ? getUnvisitedActivityIds(user.id) : new Set<string>();
    // La ruta se arma con TODOS los puntos asignados al gestor. Se filtra por
    // asignados primero (antes de ordenar), para no perder puntos por un corte
    // global; y se incluyen los ya recogidos (resto) para que el gestor pueda
    // recorrer todos sus puntos, no solo los vencidos/pendientes.
    // Mono-subtipo: todo lo que llega a este backend ya es punto de
    // acumulación — operativoSubtipo es un campo del hub que no existe acá.
    // Chequearlo siempre daba false y dejaba la ruta completa vacía.
    const asignados = new Set(puntosAsignados);
    const acumulacion = activities.filter(a => asignados.has(a.id));
    const tienePendiente = (a: Activity) => getResiduos(a).some(r => !r.recogido);
    const vencidos = acumulacion.filter(a => isPuntoEmergencia(a));
    const pendientes = acumulacion.filter(a => !isPuntoEmergencia(a) && tienePendiente(a));
    const resto = acumulacion.filter(a => !isPuntoEmergencia(a) && !tienePendiente(a));
    const sortedVencidos = [...vencidos].sort((a, b) => {
      const dA = Math.max(0, ...getResiduos(a).filter(r => !r.recogido).map(r => differenceInDays(new Date(), new Date(r.dateTime))));
      const dB = Math.max(0, ...getResiduos(b).filter(r => !r.recogido).map(r => differenceInDays(new Date(), new Date(r.dateTime))));
      return dB - dA;
    });
    const sortedPendientes = [...pendientes].sort((a, b) => {
      const aPrev = pendientesAnteriores.has(a.id) ? 0 : 1;
      const bPrev = pendientesAnteriores.has(b.id) ? 0 : 1;
      if (aPrev !== bPrev) return aPrev - bPrev;
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
    });
    const combined = [...sortedVencidos, ...sortedPendientes, ...resto];
    return combined.map((a, idx): ParadaRuta => {
      const residuos = getResiduos(a).filter(r => !r.recogido);
      const maxDias = residuos.length > 0
        ? Math.max(...residuos.map(r => differenceInDays(new Date(), new Date(r.dateTime))))
        : 0;
      // Columna propia de PuntoResiduo en este backend, no un sub-campo de
      // operativoData (ese campo es del hub, no existe acá).
      const ultimoSeguimientoAt = (a as any).ultimoSeguimientoAt as string | undefined;
      const ahora = new Date();
      return {
        numeroGlobal: idx + 1,
        numeroSegmento: 0,
        puntoId: a.id,
        lat: a.lat,
        lng: a.lng,
        barrio: a.barrio,
        diasVencido: maxDias,
        tiposResiduo: [...new Set(residuos.map(r => r.tipoResiduo))],
        // Visitado según el backend (recogido / residuo nuevo / nota hechos
        // por este gestor), no según ultimoSeguimientoAt, que no distingue
        // quién tocó el punto y no se actualizaba al dejar una nota.
        visitado: visitadosIds.has(a.id),
        diasSinSeguimiento: diasDesdeUltimoToque(ultimoSeguimientoAt, ahora),
        pendienteAnterior: pendientesAnteriores.has(a.id),
      };
    });
  }, [activities, user, puntosAsignados, visitadosIds]);

  const puntosRef = useRef(puntosParaRuta);
  useEffect(() => {
    puntosRef.current = puntosParaRuta;
  }, [puntosParaRuta]);

  useEffect(() => {
    let vivo = true;
    if (!user) return;
    Promise.all([ambientalService.getRutaSemanal(), ambientalService.getArrastre()])
      .then(([dto, arr]) => {
        if (!vivo) return;
        setArrastreIds(arr);
        if (dto) {
          setRutaSemanalId(dto.id);
          setSemanaFinISO(dto.semanaFin ?? null);
          if (dto.estado === 'en_progreso') {
            setRutaActiva(reconstruirRutaActiva(dto, puntosRef.current));
          } else if (user) {
            // No es una ruta en curso (se cerró sola al pasar la semana, o
            // quedó cancelada) y el frontend nunca la movió a historial —
            // se registra ahora con la hora real de cierre, sin mostrarla
            // como activa.
            const yaRegistrada = getHistorialRutas(user.id).some(h => h.fechaCreacion === dto.semanaInicio);
            if (!yaRegistrada) {
              const cerrada = reconstruirRutaActiva(dto, puntosRef.current);
              const fechaCierre = dto.updatedAt ?? dto.semanaFin;
              if (cerrada.estado === 'cancelada') {
                cancelarRutaAndAddToHistorial(cerrada, fechaCierre);
              } else {
                addToHistorial(cerrada, fechaCierre);
              }
              setHistorialRutas(getHistorialRutas(user.id));
            }
            setRutaActiva(null);
          }
        }
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [user]);

  // ── Handlers de ruta ────────────────────────────────────────────
  const iniciarPlanificacion = useCallback(() => {
    setViewMode('planificador-ruta');
  }, []);

  // Se planifica una de las dos semanas del ciclo (0 = en curso, 1 = siguiente).
  // Antes se elegía entre tres modos armados sobre todos los puntos asignados,
  // y el gestor podía recorrer una semana que no le tocaba sin que contara.
  const calcularRuta = useCallback(async (slot: SlotRuta) => {
    if (!user) return;
    if (rutaActiva && rutaActiva.estado === 'en_progreso') {
      if (setToast) setToast({ message: 'Ya tenés una ruta activa — finalizala o cancelala antes de calcular una nueva', type: 'info' });
      setViewMode('ruta-activa');
      return;
    }
    const semana = plan?.semanas[slot];
    if (!semana) {
      if (setToast) setToast({ message: 'No se pudo cargar el plan de la semana', type: 'error' });
      return;
    }
    const candidatos = getParadasDeSemana(puntosParaRuta, semana).filter((p) => !p.visitado);
    if (candidatos.length === 0) {
      if (setToast) setToast({ message: 'No quedan puntos por visitar en esta semana', type: 'info' });
      return;
    }
    const origen = await new Promise<{ lat: number; lng: number }>((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: candidatos[0].lat, lng: candidatos[0].lng });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: candidatos[0].lat, lng: candidatos[0].lng }),
        { enableHighAccuracy: true, timeout: 5000 },
      );
    });
    const rutaOrdenada = nearestNeighborRoute(origen, candidatos).map((p, idx) => ({ ...p, numeroGlobal: idx + 1 }));
    const segmentos = buildSegmentos(rutaOrdenada);
    try {
      const dto = await ambientalService.crearRutaSemana(
        rutaOrdenada.map(paradaLiteFromParadaRuta),
        segmentos,
        semana.inicioISO,
      );
      setRutaSemanalId(dto.id);
      setSemanaFinISO(dto.semanaFin ?? null);
      const nuevaRuta = reconstruirRutaActiva(dto, puntosParaRuta);
      saveRutaActiva(nuevaRuta);
      setRutaActiva(nuevaRuta);
      setViewMode('ruta-activa');
    } catch (error) {
      console.error('Error al crear la ruta de la semana:', error);
      if (setToast) setToast({ message: 'No se pudo crear la ruta de la semana', type: 'error' });
    }
  }, [user, puntosParaRuta, setToast, rutaActiva, plan]);

  const entrarSegmento = useCallback((segId: 'A' | 'B' | 'C') => {
    setActiveSegmento(segId);
    setViewMode('ruta-segmento');
  }, []);

  const finalizarRuta = useCallback(() => {
    if (!rutaActiva || !user) return;
    const finalizada: RutaActiva = { ...rutaActiva, estado: 'finalizada' };
    addToHistorial(finalizada);
    clearRutaActiva(user.id);
    setRutaActiva(null);
    setHistorialRutas(getHistorialRutas(user.id));
    setViewMode('historial-rutas');
  }, [rutaActiva, user]);

  const cancelarRuta = useCallback(async () => {
    if (!rutaActiva || !user) return;
    if (rutaSemanalId) {
      try {
        await ambientalService.cancelarRutaSemana(rutaSemanalId);
      } catch (error) {
        console.error('Error al cancelar la ruta en el servidor:', error);
        if (setToast) setToast({ message: 'No se pudo cancelar la ruta en el servidor', type: 'error' });
        return;
      }
    }
    cancelarRutaAndAddToHistorial(rutaActiva);
    clearRutaActiva(user.id);
    setRutaActiva(null);
    setHistorialRutas(getHistorialRutas(user.id));
    setViewMode('historial-rutas');
  }, [rutaActiva, user, rutaSemanalId, setToast]);

  const descartarRutaActiva = useCallback(() => {
    if (!user) return;
    clearRutaActiva(user.id);
    setRutaActiva(null);
    setViewMode('general-map');
  }, [user]);

  const verHistorialRuta = useCallback((ruta: RutaActiva) => {
    setHistorialRutaSeleccionada(ruta);
    setViewMode('historial-ruta-detalle');
  }, []);

  const eliminarRutaHistorial = useCallback((rutaId: string) => {
    if (!user) return;
    deleteFromHistorial(user.id, rutaId);
    setHistorialRutas(getHistorialRutas(user.id));
  }, [user]);

  return {
    rutaActiva,
    historialRutas,
    activeSegmento,
    historialRutaSeleccionada,
    puntosParaRuta,
    puntosAsignados,
    plan,
    semanaEnCurso,
    semanaSiguiente,
    recargarPlan,
    rutaSemanalId,
    arrastreIds,
    semanaFinISO,
    iniciarPlanificacion,
    calcularRuta,
    entrarSegmento,
    finalizarRuta,
    cancelarRuta,
    descartarRutaActiva,
    verHistorialRuta,
    eliminarRutaHistorial,
  };
}
