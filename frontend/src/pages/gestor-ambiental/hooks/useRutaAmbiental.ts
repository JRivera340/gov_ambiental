import { useState, useMemo, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { differenceInDays } from 'date-fns';
import type { Activity } from '../../../types';
import type { ViewMode } from '../lib/constants';
import type { ParadaRuta, RutaActiva } from '../lib/ruta.types';
import { getResiduos, isPuntoEmergencia } from '../lib/residuos';
import { diasDesdeUltimoToque } from '../lib/visitado';
import { clearRutaActiva, buildSegmentos } from '../lib/ruta';
import { nearestNeighborRoute } from '../lib/geo';
import { getParadasDeQuincena } from '../lib/rutasQuincena';
import { rutasDesdeHistorial } from '../lib/historialQuincena';
import { ambientalService, type RutaSemanalDTO, type PlanQuincenaDTO } from '../../../services/ambiental.service';
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
  // La ruta de la quincena se guarda como DTO crudo y la ruta activa se deriva
  // de él en cada render. Antes se armaba una sola vez, en el fetch inicial,
  // cuando todavía no habían llegado ni las actividades ni el plan:
  // las paradas quedaban con `visitado: false` para siempre y los segmentos
  // mostraban 0% aunque el gestor ya hubiera visitado media ruta.
  const [rutaDto, setRutaDto] = useState<RutaSemanalDTO | null>(null);
  // Ruta que el gestor finalizó/canceló/descartó en esta sesión — el DTO sigue
  // en memoria para el historial, pero no debe volver a mostrarse como activa.
  const [rutaCerradaId, setRutaCerradaId] = useState<string | null>(null);
  const [activeSegmento, setActiveSegmento] = useState<'A' | 'B' | null>(null);
  // Historial servido por el backend (GET /visitas/historial), no localStorage.
  //
  // El historial local se rehidrataba con los puntos visitados de la quincena
  // EN CURSO, así que una ruta de agosto figuraba completada si el gestor había
  // visitado esos puntos en septiembre — y no coincidía con el panel del admin,
  // que cuenta las visitas dentro del rango real de cada quincena. Ahora las dos
  // pantallas leen lo mismo.
  const [historialRutas, setHistorialRutas] = useState<RutaActiva[]>([]);
  const [historialRutaSeleccionada, setHistorialRutaSeleccionada] = useState<RutaActiva | null>(null);
  const [puntosAsignados, setPuntosAsignados] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanQuincenaDTO | null>(null);
  const [rutaSemanalId, setRutaSemanalId] = useState<string | null>(null);
  const [arrastreIds, setArrastreIds] = useState<string[]>([]);

  // El plan de la quincena trae el 100% de los puntos asignados y cuáles ya
  // están visitados. Es la única fuente de "visitado": antes cada pantalla lo
  // deducía por su cuenta (unas por ultimoSeguimientoAt, otras por autoría de
  // residuo) y los números no coincidían entre sí ni con el backend.
  const recargarPlan = useCallback(async () => {
    try {
      setPlan(await ambientalService.getPlanQuincena());
    } catch {
      setPlan(null);
    }
  }, []);

  const recargarHistorial = useCallback(async () => {
    try {
      setHistorialRutas(rutasDesdeHistorial(await ambientalService.getHistorialRutas()));
    } catch {
      setHistorialRutas([]);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    if (!user) return;
    ambientalService.getMisPuntos()
      .then(ps => { if (vivo) setPuntosAsignados(ps); })
      .catch(() => { if (vivo) setPuntosAsignados([]); });
    recargarPlan();
    recargarHistorial();
    return () => { vivo = false; };
  }, [user, recargarPlan, recargarHistorial]);

  const quincena = plan?.quincena ?? null;

  const visitadosIds = useMemo(
    () => new Set(quincena?.visitados ?? []),
    [quincena],
  );

  const progresoVisitas = quincena?.progresoVisitas;

  // ── Puntos candidatos para la ruta ─────────────────────────────
  const puntosParaRuta = useMemo((): ParadaRuta[] => {
    // Puntos que quedaron sin visitar en la quincena anterior. Salen del
    // backend (GET /rutas-semanales/arrastre/mine): antes se derivaban del
    // historial en localStorage, que ya no se escribe.
    const pendientesAnteriores = new Set(arrastreIds);
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
        paresMitadActual: progresoVisitas?.[a.id]?.paresMitadActual ?? 0,
        paresRequeridos: progresoVisitas?.[a.id]?.paresRequeridos ?? 2,
        regimenFrecuencia: progresoVisitas?.[a.id]?.regimen ?? 'simple',
        diasMitadActual: progresoVisitas?.[a.id]?.diasMitadActual ?? 0,
      };
    });
  }, [activities, user, puntosAsignados, visitadosIds, arrastreIds, progresoVisitas]);

  const puntosRef = useRef(puntosParaRuta);
  useEffect(() => {
    puntosRef.current = puntosParaRuta;
  }, [puntosParaRuta]);

  // Ruta activa derivada: se recalcula cada vez que cambian los puntos (o sea,
  // cada vez que llega el plan o el gestor marca un seguimiento), así
  // el progreso de los segmentos siempre refleja lo que ya visitó.
  const rutaActiva = useMemo<RutaActiva | null>(() => {
    if (!rutaDto || rutaDto.estado !== 'en_progreso') return null;
    if (rutaCerradaId === rutaDto.id) return null;
    return reconstruirRutaActiva(rutaDto, puntosParaRuta);
  }, [rutaDto, rutaCerradaId, puntosParaRuta]);

  useEffect(() => {
    let vivo = true;
    if (!user) return;
    Promise.all([ambientalService.getRutaQuincena(), ambientalService.getArrastre()])
      .then(([dto, arr]) => {
        if (!vivo) return;
        setArrastreIds(arr);
        if (dto) {
          setRutaSemanalId(dto.id);
          setRutaDto(dto);
        }
      })
      .catch(() => {});
    return () => { vivo = false; };
  }, [user]);

  // ── Handlers de ruta ────────────────────────────────────────────
  const iniciarPlanificacion = useCallback(() => {
    setViewMode('planificador-ruta');
  }, []);

  // Se planifica la quincena entera. Antes había que elegir una de las dos
  // semanas del ciclo, y la mitad de los puntos quedaba fuera de alcance hasta
  // que pasara la semana.
  const calcularRuta = useCallback(async () => {
    if (!user) return;
    if (rutaActiva && rutaActiva.estado === 'en_progreso') {
      if (setToast) setToast({ message: 'Ya tenés una ruta activa — finalizala o cancelala antes de calcular una nueva', type: 'info' });
      setViewMode('ruta-activa');
      return;
    }
    if (!quincena) {
      if (setToast) setToast({ message: 'No se pudo cargar el plan de la quincena', type: 'error' });
      return;
    }
    const candidatos = getParadasDeQuincena(puntosParaRuta, quincena).filter((p) => !p.visitado);
    if (candidatos.length === 0) {
      if (setToast) setToast({ message: 'No quedan puntos por visitar en esta quincena', type: 'info' });
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
      const dto = await ambientalService.crearRutaQuincena(
        rutaOrdenada.map(paradaLiteFromParadaRuta),
        segmentos,
      );
      setRutaSemanalId(dto.id);
      setRutaDto(dto);
      setRutaCerradaId(null);
      setViewMode('ruta-activa');
    } catch (error) {
      console.error('Error al crear la ruta de la quincena:', error);
      if (setToast) setToast({ message: 'No se pudo crear la ruta de la quincena', type: 'error' });
    }
  }, [user, puntosParaRuta, setToast, rutaActiva, quincena]);

  const entrarSegmento = useCallback((segId: 'A' | 'B') => {
    setActiveSegmento(segId);
    setViewMode('ruta-segmento');
  }, []);

  const finalizarRuta = useCallback(() => {
    if (!rutaActiva || !user) return;
    clearRutaActiva(user.id);
    setRutaCerradaId(rutaActiva.id);
    // La quincena en curso todavía no está en el historial —ese solo lista las
    // cerradas—, pero se refresca igual para no dejar la lista vieja en pantalla.
    recargarHistorial();
    setViewMode('historial-rutas');
  }, [rutaActiva, user, recargarHistorial]);

  const cancelarRuta = useCallback(async () => {
    if (!rutaActiva || !user) return;
    if (rutaSemanalId) {
      try {
        await ambientalService.cancelarRutaQuincena(rutaSemanalId);
      } catch (error) {
        console.error('Error al cancelar la ruta en el servidor:', error);
        if (setToast) setToast({ message: 'No se pudo cancelar la ruta en el servidor', type: 'error' });
        return;
      }
    }
    clearRutaActiva(user.id);
    setRutaCerradaId(rutaActiva.id);
    recargarHistorial();
    setViewMode('historial-rutas');
  }, [rutaActiva, user, rutaSemanalId, setToast, recargarHistorial]);

  const descartarRutaActiva = useCallback(() => {
    if (!user) return;
    clearRutaActiva(user.id);
    if (rutaActiva) setRutaCerradaId(rutaActiva.id);
    setViewMode('general-map');
  }, [user, rutaActiva]);

  const verHistorialRuta = useCallback((ruta: RutaActiva) => {
    setHistorialRutaSeleccionada(ruta);
    setViewMode('historial-ruta-detalle');
  }, []);

  return {
    rutaActiva,
    historialRutas,
    activeSegmento,
    historialRutaSeleccionada,
    puntosParaRuta,
    puntosAsignados,
    plan,
    quincena,
    recargarPlan,
    rutaSemanalId,
    arrastreIds,
    iniciarPlanificacion,
    calcularRuta,
    entrarSegmento,
    finalizarRuta,
    cancelarRuta,
    descartarRutaActiva,
    verHistorialRuta,
    recargarHistorial,
  };
}
