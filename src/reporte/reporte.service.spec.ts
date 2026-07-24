import * as XLSX from 'xlsx';
import { ReporteService } from './reporte.service';
import { EstadoPunto, PuntoResiduo } from '../puntos/entities/punto-residuo.entity';

describe('ReporteService', () => {
  it('genera un XLSX con una fila por residuo pendiente', () => {
    const service = new ReporteService();
    const puntos: Partial<PuntoResiduo>[] = [
      {
        id: 'p1',
        pointNumber: 7,
        lat: 4.1,
        lng: -74.2,
        dateTime: new Date('2026-07-01T00:00:00.000Z'),
        residuos: [
          { id: 'r1', tipoResiduo: 'ESCOMBROS', quienDispuso: '', dateTime: new Date('2026-07-01T00:00:00.000Z').toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 5, photos: [], recogido: false },
          { id: 'r2', tipoResiduo: 'ORDINARIOS', quienDispuso: '', dateTime: new Date().toISOString(), percibeOlores: false, percibeVectores: false, areaLinealMetros: 1, photos: [], recogido: true },
        ],
      },
    ];

    const buffer = service.generateXlsxReport(puntos as PuntoResiduo[], 'https://ambiental.bogotaneidapp.com');
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Pendientes Recogida']);

    expect(rows).toHaveLength(1); // solo el residuo no recogido
    expect((rows[0] as any)['ID o número del punto crítico']).toBe(7);
    expect((rows[0] as any)['Link público de consulta del punto reportado']).toBe('https://ambiental.bogotaneidapp.com/public/p1');
  });
});
