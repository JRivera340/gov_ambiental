import { describe, it, expect } from 'vitest';
import { shouldRetry, backoffDelay, isTransientError } from './retry';

const base = { method: 'get', attempt: 0, maxRetries: 2 };

describe('isTransientError', () => {
  it('transitorios: sin respuesta (red) y 502/503/504', () => {
    expect(isTransientError(undefined)).toBe(true);
    expect(isTransientError(502)).toBe(true);
    expect(isTransientError(503)).toBe(true);
    expect(isTransientError(504)).toBe(true);
  });

  it('NO transitorios: 400/401/403/404/500', () => {
    for (const s of [400, 401, 403, 404, 500]) expect(isTransientError(s)).toBe(false);
  });
});

describe('shouldRetry', () => {
  it('reintenta GET con 502/503/504', () => {
    expect(shouldRetry({ ...base, status: 502 })).toBe(true);
    expect(shouldRetry({ ...base, status: 503 })).toBe(true);
    expect(shouldRetry({ ...base, status: 504 })).toBe(true);
  });

  it('reintenta GET sin respuesta (error de red)', () => {
    expect(shouldRetry({ ...base, status: undefined })).toBe(true);
  });

  it('NO reintenta errores no transitorios (401/404/400/500)', () => {
    for (const status of [400, 401, 403, 404, 500]) {
      expect(shouldRetry({ ...base, status })).toBe(false);
    }
  });

  it('NO reintenta mutaciones (POST/PATCH/DELETE) aunque sean 502', () => {
    expect(shouldRetry({ ...base, method: 'post', status: 502 })).toBe(false);
    expect(shouldRetry({ ...base, method: 'patch', status: 503 })).toBe(false);
    expect(shouldRetry({ ...base, method: 'delete', status: undefined })).toBe(false);
  });

  it('respeta el tope de reintentos', () => {
    expect(shouldRetry({ ...base, status: 502, attempt: 2, maxRetries: 2 })).toBe(false);
    expect(shouldRetry({ ...base, status: 502, attempt: 1, maxRetries: 2 })).toBe(true);
  });
});

describe('backoffDelay', () => {
  it('crece exponencial con tope de 4s', () => {
    expect(backoffDelay(0)).toBe(400);
    expect(backoffDelay(1)).toBe(800);
    expect(backoffDelay(2)).toBe(1600);
    expect(backoffDelay(10)).toBe(4000);
  });
});
