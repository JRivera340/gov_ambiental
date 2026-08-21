// URL del hub (bogotaneidapp) — este módulo se entra y se sale de ahí, no
// tiene su propio "panel" al que volver. Usado por "Volver al Panel" y por
// el redirect de sesión vencida (ver App.tsx).
export const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://bogotaneidapp.com';

// Salir del módulo ambiental hacia el login real del hub.
//
// El hub y este módulo viven en orígenes distintos, así que cada uno tiene su
// propio sessionStorage: limpiar el de acá no cierra la sesión del hub. Sin
// avisarle, el hub veía su sesión todavía viva, saltaba el login y mandaba al
// dashboard legacy, que reenvía automáticamente el JWT guardado al handoff —
// y si ese token ya venció, el usuario terminaba en la pantalla de error del
// handoff en vez del login. El parámetro `logout=1` le dice al hub que cierre
// también su sesión y muestre el formulario de login.
export const HUB_LOGIN_URL = `${HUB_URL}/login?logout=1`;

// `replace` y no `href`: no queremos que el botón "atrás" del navegador
// devuelva a una pantalla del módulo con la sesión ya limpiada.
export function irAlLoginDelHub(): void {
  window.location.replace(HUB_LOGIN_URL);
}
