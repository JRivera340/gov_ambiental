import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { activityService } from '../../../services/activity.service';
import { useAuthStore } from '../../../store/authStore';
import { Loading } from '../../../components/Loading';
import type { Activity } from '../../../types';
import { BitacoraEventoForm } from '../components/BitacoraEventoForm';
import { getEstadoActor } from '../lib/bitacoraActores';

// Página completa de la bitácora de actores de un punto — se abre en pestaña
// nueva desde el botón "Bitácora de actores" del detalle del punto (gestor y
// admin/validador). Antes era un modal; se convirtió en página propia para
// poder "revisar" o "editar" un actor en otra pestaña (ver BitacoraActorPage).
export const BitacoraPuntoPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const canAdd = user?.role === 'GESTOR_AMBIENTAL' || user?.role === 'ADMIN';

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const a = await activityService.getById(id);
      setActivity(a);
    } catch {
      setActivity(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (loading) return <Loading />;
  if (!activity) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <p className="text-sm font-bold text-neutral-500">No se encontró el punto.</p>
      </div>
    );
  }

  const actores = activity.bitacoraActores || [];

  return (
    <div className="min-h-screen bg-neutral-50 pb-16">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button onClick={() => window.close()} className="text-neutral-400 hover:text-neutral-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-base font-black text-neutral-900">Bitácora de Actores</h1>
              <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                Punto {activity.pointNumber ? `#${activity.pointNumber}` : ''} · {activity.barrio}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
          <h2 className="text-sm font-black text-neutral-900 mb-3">Actores asociados al punto</h2>
          {actores.length === 0 ? (
            <div className="py-10 text-center border-2 border-dashed border-neutral-100 rounded-2xl">
              <p className="text-sm font-bold text-neutral-400">No hay actores registrados</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="grid grid-cols-[1.6fr_0.7fr_1fr_1.2fr_0.6fr] gap-2 px-3 py-2 bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                <span>Actor</span>
                <span>Eventos</span>
                <span>Último evento</span>
                <span>Estado</span>
                <span></span>
              </div>
              {actores.map((actor) => {
                const ultimo = actor.eventos.reduce((mas, e) => (new Date(e.fecha) > new Date(mas.fecha) ? e : mas), actor.eventos[0]);
                const estadoInfo = getEstadoActor(actor.estado);
                return (
                  <div key={actor.id} className="grid grid-cols-[1.6fr_0.7fr_1fr_1.2fr_0.6fr] gap-2 px-3 py-2.5 items-center border-t border-slate-100">
                    <span className="text-sm font-bold text-slate-800 truncate">{actor.nombre}</span>
                    <span className="text-sm font-bold text-slate-600">{actor.eventos.length}</span>
                    <span className="text-xs text-neutral-500 font-bold">
                      {format(new Date(ultimo.fecha), "d MMM yyyy", { locale: es })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: estadoInfo.color }} />
                      <span className="text-xs font-bold text-neutral-700">{estadoInfo.label}</span>
                    </span>
                    <button
                      onClick={() => window.open(`/gestor-ambiental/bitacora/${id}/actor/${actor.id}`, '_blank')}
                      className="text-[10px] font-black text-slate-600 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg uppercase tracking-wider hover:bg-slate-50 transition-colors"
                    >
                      Ver
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {canAdd && (
          <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-5">
            {mostrarForm ? (
              <BitacoraEventoForm
                puntoId={activity.id}
                helpText="Si el actor ya existe en este punto (misma cédula/NIT o mismo nombre), este evento se suma a su historial en vez de crear un actor duplicado."
                onCancel={() => setMostrarForm(false)}
                onSubmit={async (payload) => {
                  try {
                    const updated = await activityService.agregarBitacora(activity.id, payload);
                    setActivity(updated);
                    showToast('Actor y evento registrados', 'success');
                    setMostrarForm(false);
                  } catch (err: any) {
                    showToast(err?.response?.data?.message || 'Error al agregar a la bitácora', 'error');
                    throw err;
                  }
                }}
              />
            ) : (
              <button
                onClick={() => setMostrarForm(true)}
                className="w-full py-3 rounded-2xl text-sm font-black text-white bg-slate-700 hover:bg-slate-800 shadow-lg shadow-slate-700/20 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Agregar actor / evento
              </button>
            )}
          </div>
        )}
      </main>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-xl shadow-xl border z-50 text-xs font-bold ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};
