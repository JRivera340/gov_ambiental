// URL del hub (bogotaneidapp) — este módulo se entra y se sale de ahí, no
// tiene su propio "panel" al que volver. Usado por "Volver al Panel" y por
// el redirect de sesión vencida (ver App.tsx).
export const HUB_URL = import.meta.env.VITE_HUB_URL || 'https://bogotaneidapp.com';
