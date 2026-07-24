export interface ParadaRuta {
  numeroGlobal: number;
  numeroSegmento: number;
  activityId: string;
  lat: number;
  lng: number;
  barrio: string;
  diasVencido: number;
  tiposResiduo: string[];
  visitado: boolean;
  diasSinSeguimiento: number;
  fechaVisita?: string;
  pendienteAnterior?: boolean;
}

export interface SegmentoRuta {
  id: 'A' | 'B' | 'C';
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
