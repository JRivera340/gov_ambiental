// Política de reintentos para errores transitorios del backend (cold-starts de
// Railway, 502/503/504 de gateway, cortes de red). Solo GET (idempotentes).
// Lógica pura → testeable directo.

export interface RetryDecision {
  method?: string;
  status?: number; // undefined = error de red (sin respuesta del servidor)
  attempt: number; // reintentos ya realizados
  maxRetries: number;
}

// Error transitorio del backend: sin respuesta (red/timeout) o gateway 502/503/504.
// NO incluye 401/400/500 (fallos reales que reintentar no arregla).
export function isTransientError(status?: number): boolean {
  return status === undefined || status === 502 || status === 503 || status === 504;
}

export function shouldRetry({ method, status, attempt, maxRetries }: RetryDecision): boolean {
  if (attempt >= maxRetries) return false;
  const m = (method || 'get').toLowerCase();
  if (m !== 'get') return false; // no reintentar mutaciones (POST/PATCH/DELETE)
  return isTransientError(status);
}

// Backoff exponencial suave: 400ms, 800ms, 1600ms... (tope 4s).
export function backoffDelay(attempt: number): number {
  return Math.min(4000, 400 * Math.pow(2, attempt));
}
