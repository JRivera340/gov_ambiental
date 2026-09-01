import { describe, it, expect } from 'vitest';
import { getParadasDeQuincena, resumenQuincena } from './rutasQuincena';
import type { QuincenaPlanDTO } from '../../../services/ambiental.service';

const parada = (puntoId: string): any => ({
  numeroGlobal: 0, numeroSegmento: 0, puntoId, lat: 0, lng: 0, barrio: 'X',
  diasVencido: 0, tiposResiduo: [], visitado: false, diasSinSeguimiento: 0, pendienteAnterior: false,
});

const quincena = (over: Partial<QuincenaPlanDTO> = {}): QuincenaPlanDTO => ({
  indice: 68,
  inicioISO: '2026-08-10T05:00:00.000Z',
  finISO: '2026-08-24T04:59:59.999Z',
  etiqueta: 'Quincena del 10 al 23 de agosto',
  emergencia: [],
  regular: [],
  planificados: [],
  visitados: [],
  ...over,
});

describe('getParadasDeQuincena', () => {
  it('deja solo los puntos planificados de la quincena', () => {
    const paradas = [parada('p1'), parada('p2'), parada('p3')];
    const q = quincena({ regular: ['p1', 'p3'], planificados: ['p1', 'p3'] });
    expect(getParadasDeQuincena(paradas, q).map((p) => p.puntoId)).toEqual(['p1', 'p3']);
  });

  it('pone las emergencias primero', () => {
    const paradas = [parada('p1'), parada('p2')];
    const q = quincena({ emergencia: ['p2'], regular: ['p1'], planificados: ['p2', 'p1'] });
    expect(getParadasDeQuincena(paradas, q)[0].puntoId).toBe('p2');
  });

  it('devuelve vacio si ninguna parada pertenece a la quincena', () => {
    const q = quincena({ regular: ['otro'], planificados: ['otro'] });
    expect(getParadasDeQuincena([parada('p1')], q)).toEqual([]);
  });
});

describe('resumenQuincena', () => {
  it('cuenta total, visitados, pendientes y porcentaje', () => {
    const q = quincena({ emergencia: ['p1'], regular: ['p2', 'p3', 'p4'], planificados: ['p1', 'p2', 'p3', 'p4'], visitados: ['p1'] });
    expect(resumenQuincena(q)).toEqual({ total: 4, visitados: 1, pendientes: 3, emergencias: 1, pct: 25 });
  });

  it('no divide por cero cuando la quincena esta vacia', () => {
    expect(resumenQuincena(quincena()).pct).toBe(0);
  });
});
