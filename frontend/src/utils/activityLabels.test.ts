import { describe, it, expect } from 'vitest';
import { getActivityTipoLabel } from './activityLabels';

describe('getActivityTipoLabel', () => {
  it('usa el label del subtipo en vez del activityType', () => {
    const a = {
      operativoSubtipo: 'ESPACIO_PUBLICO_1801',
      activityType: 'ESPACIO_PUBLICO - ESPACIO_PUBLICO_1801',
    };
    expect(getActivityTipoLabel(a)).toBe('1801 - Espacio Público');
  });

  it('evita la duplicación de datos legacy', () => {
    const a = {
      operativoSubtipo: 'ESPACIO_PUBLICO_1801',
      activityType: '1801 - Espacio Público - 1801 - Espacio Público',
    };
    expect(getActivityTipoLabel(a)).toBe('1801 - Espacio Público');
  });

  it('mapea subtipo IVC', () => {
    expect(getActivityTipoLabel({ operativoSubtipo: 'IVC_ESTABLECIMIENTO_COMERCIO' })).toBe(
      'Establecimientos de Comercio',
    );
  });

  it('cae a activityType si el subtipo no está en el catálogo', () => {
    expect(
      getActivityTipoLabel({ operativoSubtipo: 'PYBA_HOJA_VIDA_CANINO', activityType: 'Hoja de vida' }),
    ).toBe('Hoja de vida');
  });

  it('devuelve string vacío si no hay nada', () => {
    expect(getActivityTipoLabel({})).toBe('');
  });
});
