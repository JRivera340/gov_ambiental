import { describe, it, expect } from 'vitest';
import { getPuntoSurveyAnswers } from './puntoInfo';

describe('getPuntoSurveyAnswers', () => {
  it('devuelve respuestas del punto con label de __fieldMeta', () => {
    const od = {
      __fieldMeta: {
        entorno_escolar: { label: '¿Es un entorno escolar?', type: 'radio', options: [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }] },
        tipo_zona: { label: 'Tipo de zona', type: 'text' },
      },
      entorno_escolar: 'true',
      tipo_zona: 'Comercial',
    };
    const rows = getPuntoSurveyAnswers(od);
    expect(rows).toEqual([
      { key: 'entorno_escolar', label: '¿Es un entorno escolar?', value: 'Sí' },
      { key: 'tipo_zona', label: 'Tipo de zona', value: 'Comercial' },
    ]);
  });

  it('excluye claves internas y de nivel-residuo', () => {
    const od = {
      __fieldMeta: {}, residuos: [{ id: 'r1' }], tipo: 'AMBIENTAL_PUNTOS_ACUMULACION',
      quienDispuso: 'COMUNIDAD', tipoResiduo: 'ESCOMBROS', actoresIndisciplina: ['RESIDENTES'],
      tipo_zona: 'Residencial',
    };
    expect(getPuntoSurveyAnswers(od).map((r) => r.key)).toEqual(['tipo_zona']);
  });

  it('multiselección se une con labels de opciones', () => {
    const od = {
      __fieldMeta: { condiciones: { options: [{ value: 'MALA_VIA', label: 'Mal estado de la vía' }, { value: 'SIN_LUZ', label: 'Falta de iluminación' }] } },
      condiciones: ['MALA_VIA', 'SIN_LUZ'],
    };
    expect(getPuntoSurveyAnswers(od)[0].value).toBe('Mal estado de la vía, Falta de iluminación');
  });

  it('omite vacíos y objetos complejos (ubicaciones)', () => {
    const od = { a: '', b: null, c: [], ubicacion: { lat: 1, lng: 2 }, d: 'ok' };
    expect(getPuntoSurveyAnswers(od).map((r) => r.key)).toEqual(['d']);
  });

  it('oculta claves UUID sin etiqueta pero muestra las que tienen __fieldMeta', () => {
    const od = {
      __fieldMeta: {
        '50d05499-cffe-4c48-b7c2-ed232413f715': { label: 'Operador de aseo', type: 'text' },
      },
      '50d05499-cffe-4c48-b7c2-ed232413f715': 'UAESP',
      '14671882-dd40-40af-828d-843c5eedbe75': 'COMUNIDAD',
    };
    expect(getPuntoSurveyAnswers(od)).toEqual([
      { key: '50d05499-cffe-4c48-b7c2-ed232413f715', label: 'Operador de aseo', value: 'UAESP' },
    ]);
  });

  it('operativoData nulo → vacío', () => {
    expect(getPuntoSurveyAnswers(null)).toEqual([]);
    expect(getPuntoSurveyAnswers(undefined)).toEqual([]);
  });

  it('renderiza preguntas nuevas del generador e intervenciones vía __fieldMeta', () => {
    const od = {
      __fieldMeta: {
        identificacionGenerador: { label: '¿Se logró identificar quién dispone los residuos?', type: 'radio', options: [{ value: 'SI', label: 'Sí' }] },
        intervencionesRecomendadas: { label: 'Intervenciones recomendadas', type: 'multiselect', options: [{ value: 'LIMPIEZA_INMEDIATA', label: 'Limpieza inmediata' }] },
        telefonoActor: { label: 'Teléfono del actor', type: 'text' },
      },
      identificacionGenerador: 'SI',
      intervencionesRecomendadas: ['LIMPIEZA_INMEDIATA'],
      telefonoActor: '3001234567',
    };
    const rows = getPuntoSurveyAnswers(od);
    expect(rows).toEqual([
      { key: 'identificacionGenerador', label: '¿Se logró identificar quién dispone los residuos?', value: 'Sí' },
      { key: 'intervencionesRecomendadas', label: 'Intervenciones recomendadas', value: 'Limpieza inmediata' },
      { key: 'telefonoActor', label: 'Teléfono del actor', value: '3001234567' },
    ]);
  });
});
