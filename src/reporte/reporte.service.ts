import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PuntoResiduo } from '../puntos/entities/punto-residuo.entity';
import { UMBRAL_EMERGENCIA_DIAS } from '../puntos/lib/emergencia.util';

@Injectable()
export class ReporteService {
  private getTipoResiduoHuman(tipo: string): string {
    const norm = (tipo || '').trim().toUpperCase();
    if (norm.includes('ESCOMBRO')) return 'Escombro';
    if (norm.includes('ORDINARIO')) return 'Ordinario';
    if (norm.includes('VOLUMINOSO')) return 'Voluminoso';
    if (!tipo) return 'Desconocido';
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
  }

  private formatDate(dtStr: string | Date | null): string {
    if (!dtStr) return 'No registrada';
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return 'No registrada';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return 'No registrada';
    }
  }

  public generateXlsxReport(puntos: PuntoResiduo[], frontendUrl: string): Buffer {
    const cleanFrontendUrl = (frontendUrl || 'http://localhost:5173').replace(/\/$/, '');
    const rows: any[] = [];

    puntos.forEach((p) => {
      (p.residuos || []).forEach((r) => {
        if (r.recogido) return;
        const dt = r.dateTime || p.dateTime || null;
        let daysSince = 0;
        if (dt) {
          const diff = new Date().getTime() - new Date(dt).getTime();
          daysSince = Math.floor(diff / (1000 * 60 * 60 * 24));
        }
        if (isNaN(daysSince) || daysSince < 0) daysSince = 0;

        const idCpt = p.pointNumber ?? 'N/A';
        // Umbral unificado con el criterio de emergencia del backend (≥4
        // días, ver src/puntos/lib/emergencia.util.ts) — antes este reporte
        // usaba ≥3 días, inconsistente con el resto del sistema.
        const alarma = daysSince >= UMBRAL_EMERGENCIA_DIAS ? 'Crítico' : daysSince >= 2 ? 'Vencido' : 'Normal';

        rows.push({
          'ID o número del punto crítico': idCpt,
          'Estado de alarma': alarma,
          'Tipo de residuo': this.getTipoResiduoHuman(r.tipoResiduo || 'Desconocido'),
          'Área estimada': r.areaLinealMetros || 0,
          'Olores': r.percibeOlores ? 'Sí' : 'No',
          'Vectores': r.percibeVectores ? 'Sí' : 'No',
          'Observaciones': (r.observaciones || '').trim(),
          'Latitud': p.lat || 0,
          'Longitud': p.lng || 0,
          'Fecha de reporte': this.formatDate(dt),
          'Usuario que registró la foto': r.createdByNombre || 'No registrado',
          'Link público de consulta del punto reportado': `${cleanFrontendUrl}/public/${p.id}`,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pendientes Recogida');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
