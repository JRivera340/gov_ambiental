// Aviso entre pestañas de que un punto dejó de existir.
//
// El panel admin abre el detalle de un punto con window.open (pestaña nueva),
// así que el borrado ocurre en otro árbol React: el dashboard original no se
// entera y sigue mostrando el punto en el mapa y en los KPIs hasta que alguien
// refresca a mano. BroadcastChannel avisa a las demás pestañas del mismo
// origen; el evento `storage` cubre navegadores donde no está disponible.

const CANAL = 'gov-ambiental-puntos';
const EVENTO_ELIMINADO = 'punto-eliminado';
const STORAGE_KEY = 'gov_ambiental_punto_eliminado';

type Mensaje = { tipo: typeof EVENTO_ELIMINADO; puntoId: string };

function abrirCanal(): BroadcastChannel | null {
  try {
    return typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CANAL) : null;
  } catch {
    return null;
  }
}

export function notificarPuntoEliminado(puntoId: string): void {
  const canal = abrirCanal();
  if (canal) {
    canal.postMessage({ tipo: EVENTO_ELIMINADO, puntoId } as Mensaje);
    canal.close();
  }
  try {
    // El valor incluye un nonce para que dos borrados seguidos del mismo punto
    // sigan disparando el evento `storage` (que solo salta si el valor cambia).
    localStorage.setItem(STORAGE_KEY, `${puntoId}|${Date.now()}`);
  } catch {
    // Modo privado o storage bloqueado: el BroadcastChannel ya hizo su parte.
  }
}

export function suscribirsePuntosEliminados(onEliminado: (puntoId: string) => void): () => void {
  const canal = abrirCanal();
  const alMensaje = (e: MessageEvent<Mensaje>) => {
    if (e.data?.tipo === EVENTO_ELIMINADO && e.data.puntoId) onEliminado(e.data.puntoId);
  };
  canal?.addEventListener('message', alMensaje);

  const alStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY || !e.newValue) return;
    const [puntoId] = e.newValue.split('|');
    if (puntoId) onEliminado(puntoId);
  };
  window.addEventListener('storage', alStorage);

  return () => {
    canal?.removeEventListener('message', alMensaje);
    canal?.close();
    window.removeEventListener('storage', alStorage);
  };
}
