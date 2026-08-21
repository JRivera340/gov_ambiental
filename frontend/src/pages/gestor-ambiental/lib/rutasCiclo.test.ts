import { describe, it, expect } from 'vitest';
import { getParadasDeSemana, resumenSemana } from './rutasCiclo';
import type { SemanaPlanDTO } from '../../../services/ambiental.service';

const parada = (puntoId: string): any => ({
  numeroGlobal: 0, numeroSegmento: 0, puntoId, lat: 0, lng: 0, barrio: 'X',
  diasVencido: 0, tiposResiduo: [], visitado: false, diasSinSeguimiento: 0, pendienteAnterior: false,
});

const semana = (over: Partial<SemanaPlanDTO> = {}): SemanaPlanDTO => ({
  slot: 0,
  semanaISO: '2026-W34',
  inicioISO: '2026-08-17T05:00:00.000Z',
  finISO: '2026-08-24T04:59:59.999Z',
  etiqueta: 'Semana del 17 al 23 de agosto',
  ventanaDesdeISO: '2026-08-17T05:00:00.000Z',
  esActual: true,
  emergencia: [],
  regular: [],
  planificados: [],
  visitados: [],
  ...over,
});

describe('getParadasDeSemana', () => {
  it('deja solo los puntos planificados para esa semana', () => {
    const paradas = [parada('p1'), parada('p2'), parada('p3')];
    const s = semana({ regular: ['p1', 'p3'], planificados: ['p1', 'p3'] });
    expect(getParadasDeSemana(paradas, s).map((p) => p.puntoId)).toEqual(['p1', 'p3']);
  });

  it('pone las emergencias primero', () => {
    const paradas = [parada('p1'), parada('p2')];
    const s = semana({ emergencia: ['p2'], regular: ['p1'], planificados: ['p2', 'p1'] });
    expect(getParadasDeSemana(paradas, s)[0].puntoId).toBe('p2');
  });

  it('devuelve vacio si ninguna parada pertenece a la semana', () => {
    const s = semana({ regular: ['otro'], planificados: ['otro'] });
    expect(getParadasDeSemana([parada('p1')], s)).toEqual([]);
  });
});

describe('resumenSemana', () => {
  it('cuenta total, visitados, pendientes y porcentaje', () => {
    const s = semana({ emergencia: ['p1'], regular: ['p2', 'p3', 'p4'], planificados: ['p1', 'p2', 'p3', 'p4'], visitados: ['p1'] });
    expect(resumenSemana(s)).toEqual({ total: 4, visitados: 1, pendientes: 3, emergencias: 1, pct: 25 });
  });

  it('no divide por cero cuando la semana esta vacia', () => {
    expect(resumenSemana(semana()).pct).toBe(0);
  });
});
