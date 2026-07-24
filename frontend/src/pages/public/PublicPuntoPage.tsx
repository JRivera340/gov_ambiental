import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

interface ResiduoPublico {
  tipoResiduo: string;
  areaLinealMetros: number;
  percibeOlores: boolean;
  percibeVectores: boolean;
  observaciones: string;
  recogido: boolean;
  dateTime: string;
}

interface PuntoPublico {
  id: string;
  pointNumber: number | null;
  lat: number;
  lng: number;
  barrio: string | null;
  dateTime: string;
  operativoCategoria: string | null;
  operativoSubtipo: string | null;
  status: string | null;
  residuos: ResiduoPublico[];
}

function getTipoLabel(tipo: string) {
  const t = (tipo || '').toUpperCase();
  if (t.includes('ESCOMBRO')) return 'Escombro';
  if (t.includes('ORDINARIO')) return 'Ordinario';
  if (t.includes('VOLUMINOSO')) return 'Voluminoso';
  return tipo || 'Desconocido';
}

function formatDate(dt: string) {
  if (!dt) return 'No registrada';
  try {
    const d = new Date(dt);
    return d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return dt;
  }
}

function getDaysSince(dt: string) {
  if (!dt) return 0;
  const diff = Date.now() - new Date(dt).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function getAlarmColor(days: number) {
  if (days >= 3) return { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B', label: 'Crítico' };
  if (days === 2) return { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', label: 'Vencido' };
  return { bg: '#D1FAE5', border: '#10B981', text: '#065F46', label: 'Normal' };
}

export default function PublicPuntoPage() {
  const { id } = useParams<{ id: string }>();
  const [punto, setPunto] = useState<PuntoPublico | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    axios
      .get(`/api/sorver/public/actividad/${id}`)
      .then((r) => setPunto(r.data))
      .catch(() => setError('No se encontró el punto o hubo un error al cargarlo.'))
      .finally(() => setLoading(false));
  }, [id]);

  const pendientes = punto?.residuos.filter((r) => !r.recogido) ?? [];

  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)', padding: '24px 32px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ color: '#93C5FD', fontSize: 13, margin: '0 0 4px', fontWeight: 500 }}>
            Alcaldía Local de Santa Fe · Sistema de Gestión de Espacio Público
          </p>
          <h1 style={{ color: 'white', fontSize: 22, fontWeight: 700, margin: 0 }}>
            Consulta Pública de Punto Crítico
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 16px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 64, color: '#6B7280' }}>
            <div style={{ fontSize: 16 }}>Cargando información del punto…</div>
          </div>
        )}

        {error && (
          <div style={{ background: '#FEE2E2', border: '1px solid #EF4444', borderRadius: 12, padding: 24, color: '#991B1B', textAlign: 'center' }}>
            {error}
          </div>
        )}

        {punto && (
          <>
            {/* Card principal */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 1px 8px rgba(0,0,0,0.08)', padding: 28, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 12,
                  background: 'linear-gradient(135deg, #2563EB, #1E40AF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 800, fontSize: 20, flexShrink: 0,
                }}>
                  {punto.pointNumber ?? '?'}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                    Punto Crítico #{punto.pointNumber ?? 'Sin número'}
                  </h2>
                  <p style={{ margin: '2px 0 0', fontSize: 13, color: '#6B7280' }}>
                    {punto.barrio ? `Barrio ${punto.barrio}` : 'Barrio no especificado'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Fecha de reporte', value: formatDate(punto.dateTime) },
                  { label: 'Estado', value: punto.status ?? 'N/A' },
                  { label: 'Latitud', value: punto.lat?.toFixed(6) ?? 'N/A' },
                  { label: 'Longitud', value: punto.lng?.toFixed(6) ?? 'N/A' },
                ].map((item) => (
                  <div key={item.label} style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{item.label}</p>
                    <p style={{ margin: '4px 0 0', fontSize: 14, color: '#111827', fontWeight: 600 }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <a
                href={`https://www.google.com/maps?q=${punto.lat},${punto.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16,
                  background: '#EFF6FF', color: '#2563EB', borderRadius: 8,
                  padding: '8px 14px', fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  border: '1px solid #BFDBFE',
                }}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Ver en Google Maps
              </a>
            </div>

            {/* Residuos pendientes */}
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#374151', margin: '0 0 12px' }}>
              Residuos pendientes por recoger ({pendientes.length})
            </h3>

            {pendientes.length === 0 ? (
              <div style={{ background: '#D1FAE5', borderRadius: 12, padding: 20, color: '#065F46', fontWeight: 600, textAlign: 'center' }}>
                ✓ Todos los residuos de este punto han sido recogidos
              </div>
            ) : (
              pendientes.map((r, i) => {
                const days = getDaysSince(r.dateTime);
                const alarm = getAlarmColor(days);
                return (
                  <div key={i} style={{
                    background: 'white', borderRadius: 14, padding: 20, marginBottom: 12,
                    boxShadow: '0 1px 6px rgba(0,0,0,0.06)',
                    borderLeft: `4px solid ${alarm.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                        {getTipoLabel(r.tipoResiduo)}
                      </span>
                      <span style={{
                        background: alarm.bg, color: alarm.text, border: `1px solid ${alarm.border}`,
                        borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700,
                      }}>
                        {alarm.label} · {days} día{days !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Área estimada', value: r.areaLinealMetros ? `${r.areaLinealMetros} m²` : 'N/A' },
                        { label: 'Olores', value: r.percibeOlores ? 'Sí' : 'No' },
                        { label: 'Vectores', value: r.percibeVectores ? 'Sí' : 'No' },
                      ].map((d) => (
                        <div key={d.label} style={{ background: '#F9FAFB', borderRadius: 8, padding: '8px 10px' }}>
                          <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontWeight: 600, textTransform: 'uppercase' }}>{d.label}</p>
                          <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: '#374151' }}>{d.value}</p>
                        </div>
                      ))}
                    </div>
                    {r.observaciones && (
                      <p style={{ margin: '10px 0 0', fontSize: 13, color: '#6B7280', fontStyle: 'italic' }}>
                        "{r.observaciones}"
                      </p>
                    )}
                    <p style={{ margin: '8px 0 0', fontSize: 11, color: '#9CA3AF' }}>
                      Reportado: {formatDate(r.dateTime)}
                    </p>
                  </div>
                );
              })
            )}
          </>
        )}

        <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginTop: 32 }}>
          Sistema de Seguimiento Territorial · Alcaldía Local de Santa Fe
        </p>
      </div>
    </div>
  );
}
