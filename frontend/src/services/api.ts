import axios from 'axios';
import { authService } from './auth.service';
import { shouldRetry, backoffDelay } from './lib/retry';

const MAX_RETRIES = 2;

const getApiBaseURL = () => {
  // En desarrollo local: usar proxy nginx
  if (typeof window === 'undefined' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return '/api';
  }
  
  // En producción: usar el mismo dominio con /api (nginx hace proxy al backend)
  // Esto funciona tanto para railway.app como para dominios personalizados como BogotaneidApp.com
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag para evitar múltiples eventos de session-expired simultáneos
let isHandlingSessionExpired = false;

// Interceptor para agregar token JWT (usando authService como single source of truth)
api.interceptors.request.use((config) => {
  const token = authService.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Agregar header para omitir advertencia de ngrok free
  // Esto es necesario porque ngrok free muestra una página de advertencia que bloquea peticiones POST
  if (window.location.hostname.includes('ngrok') || window.location.hostname.includes('ngrok-free')) {
    config.headers['ngrok-skip-browser-warning'] = 'true';
  }
  
  return config;
});

// Interceptor para manejar errores 401
// IMPORTANTE: Solo dispara session-expired si:
// 1. Había un token guardado (sesión activa que expiró)
// 2. No es la ruta de login (401 esperado por credenciales incorrectas)
// 3. No estamos ya manejando una expiración
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Reintento de errores transitorios (cold-start/502/503/504/red) en GET.
    const config = error.config;
    if (config) {
      const attempt = config.__retryCount || 0;
      if (shouldRetry({ method: config.method, status: error.response?.status, attempt, maxRetries: MAX_RETRIES })) {
        config.__retryCount = attempt + 1;
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(attempt)));
        return api(config);
      }
    }

    const requestUrl = error.config?.url || '';
    const isLoginRequest = requestUrl.includes('/auth/login');
    const hadToken = !!authService.getToken();

    if (error.response?.status === 401 && !isLoginRequest && hadToken && !isHandlingSessionExpired) {
      isHandlingSessionExpired = true;
      
      // Token expirado - limpiar sesión
      authService.clearSession();
      
      // Disparar evento UNA sola vez
      const event = new CustomEvent('session-expired');
      window.dispatchEvent(event);
      
      // Reset flag después de un tiempo para permitir nuevos eventos si es necesario
      setTimeout(() => {
        isHandlingSessionExpired = false;
      }, 3000);
    }
    
    return Promise.reject(error);
  }
);

export default api;

