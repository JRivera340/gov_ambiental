import { useAuthStore } from '../store/authStore';
import { irAlLoginDelHub } from '../config/hub';

// Único punto de salida del módulo. Antes cada pantalla resolvía el logout a
// su manera (dos navegaban a `/`, otra iba al home del hub), y ninguna cerraba
// la sesión del lado del hub — ver el comentario en config/hub.ts.
export function cerrarSesion(): void {
  useAuthStore.getState().logout();
  irAlLoginDelHub();
}
