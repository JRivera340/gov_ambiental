import { describe, it, expect } from 'vitest';
import { getPuntoSurveyAnswers } from './puntoInfo';

describe('getPuntoSurveyAnswers', () => {
  it('devuelve respuestas con el label fijo del catálogo de campos', () => {
    const activity = { entornoEscolar: true, tipoZona: 'COMERCIAL' };
    const rows = getPuntoSurveyAnswers(activity);
    expect(rows).toEqual([
      { key: 'entornoEscolar', label: '¿Es un entorno escolar y/o universitario?', value: 'Sí' },
      { key: 'tipoZona', label: 'Tipo de zona', value: 'Comercial' },
    ]);
  });

  it('multiselección se une con labels de opciones', () => {
    const activity = { condicionesZona: ['MAL_ESTADO_VIA', 'FALTA_ILUMINACION'] };
    const rows = getPuntoSurveyAnswers(activity);
    expect(rows.find((r) => r.key === 'condicionesZona')?.value).toBe('Mal estado de la vía, Falta de iluminación');
  });

  it('omite vacíos', () => {
    const activity = { observaciones: '', poblacionHabitanteCalle: null, m2Invasion: 12 };
    const rows = getPuntoSurveyAnswers(activity);
    expect(rows.map((r) => r.key)).toEqual(['m2Invasion']);
  });

  it('no repite fecha/ubicación/entidad responsable (se muestran aparte en el detalle)', () => {
    const activity = { fecha_operativo: '2026-07-01', ubicacion_mapa: { lat: 1, lng: 2 }, entidad_responsable: 'UAESP', observaciones: 'ok' };
    const rows = getPuntoSurveyAnswers(activity);
    expect(rows.map((r) => r.key)).toEqual(['observaciones']);
  });

  it('actividad nula o indefinida → vacío', () => {
    expect(getPuntoSurveyAnswers(null)).toEqual([]);
    expect(getPuntoSurveyAnswers(undefined)).toEqual([]);
  });

  it('renderiza los campos de la cadena de evidencia con sus labels reales', () => {
    const activity = {
      identificacionGenerador: 'SI',
      intervencionesRecomendadas: ['LIMPIEZA_INMEDIATA'],
      telefonoActor: '3001234567',
    };
    const rows = getPuntoSurveyAnswers(activity);
    expect(rows).toEqual([
      { key: 'identificacionGenerador', label: '¿Se logró identificar quién dispone los residuos?', value: 'Sí' },
      { key: 'telefonoActor', label: 'Teléfono del actor', value: '3001234567' },
      { key: 'intervencionesRecomendadas', label: 'Intervenciones recomendadas', value: 'Limpieza inmediata' },
    ]);
  });
});
