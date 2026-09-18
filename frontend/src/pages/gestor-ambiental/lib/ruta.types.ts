export interface ParadaRuta {
  numeroGlobal: number;
  numeroSegmento: number;
  puntoId: string;
  lat: number;
  lng: number;
  barrio: string;
  diasVencido: number;
  tiposResiduo: string[];
  visitado: boolean;
  diasSinSeguimiento: number;
  fechaVisita?: string;
  pendienteAnterior?: boolean;
  /** Cumple la frecuencia real (pareja de días consecutivos en al menos una mitad) — subconjunto de `visitado`. `visitado` solo exige haber tocado el punto una vez. */
  seguimientoCumplido?: boolean;
  /** Parejas de días consecutivos completadas en la mitad de quincena que corre ahora, contra el mínimo exigido. Solo aplica cuando regimenFrecuencia === 'parejas'. */
  paresMitadActual?: number;
  paresRequeridos?: number;
  regimenFrecuencia?: 'parejas' | 'simple';
  /** Días distintos (sin exigir pareja) visitados en la mitad actual — evidencia de que hubo visita hoy aunque todavía no cuente como cumplido. */
  diasMitadActual?: number;
}

export interface SegmentoRuta {
  id: 'A' | 'B';
  label: string;
  estado: 'pendiente' | 'en_progreso' | 'completado';
  paradas: ParadaRuta[];
}

export interface RutaActiva {
  id: string;
  gestorId: string;
  gestorNombre: string;
  fechaCreacion: string;
  /** Momento real en que se canceló, finalizó, o se cerró sola (fin de semana) — no el inicio de la semana. */
  fechaCierre?: string;
  estado: 'en_progreso' | 'finalizada' | 'cancelada';
  totalPuntos: number;
  puntosVencidos: number;
  segmentos: SegmentoRuta[];
}
