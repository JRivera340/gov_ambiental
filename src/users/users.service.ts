import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { getEnv } from '../config/env';
import { HubUser } from './dto/hub-user.dto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
// Si el hub no responde, este proxy debe fallar rapido (no colgarse) para que
// el llamador degrade con un valor por defecto en vez de bloquear la pantalla.
const HUB_TIMEOUT_MS = 4_000;

// Proxy hacia el hub (gov-espacio-publico): los usuarios no tienen tabla
// propia en ambiental, se resuelven contra la fuente de verdad. Cache simple
// en memoria para no pegarle al hub en cada render de una lista de puntos.
@Injectable()
export class UsersService {
  private readonly userCache = new Map<string, CacheEntry<HubUser>>();
  private readonly gestoresCache = new Map<string, CacheEntry<HubUser[]>>();

  async findById(id: string, bearerToken: string): Promise<HubUser> {
    const cached = this.userCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const data = await this.fetchFromHub<HubUser>(`/api/users/${id}`, bearerToken);
    this.userCache.set(id, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  async findGestores(callerRole: string, bearerToken: string): Promise<HubUser[]> {
    const cached = this.gestoresCache.get(callerRole);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const data = await this.fetchFromHub<HubUser[]>('/api/users/gestores/list', bearerToken);
    this.gestoresCache.set(callerRole, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  private async fetchFromHub<T>(path: string, bearerToken: string): Promise<T> {
    const env = getEnv();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HUB_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(`${env.HUB_API_URL}${path}`, {
        headers: { Authorization: `Bearer ${bearerToken}` },
        signal: controller.signal,
      });
    } catch (e) {
      // Cubre tanto el abort por timeout como fallas de red (DNS, conexion
      // rechazada) contra el hub - en ambos casos el hub no respondio a
      // tiempo, no hay nada mas que reintentar aqui.
      throw new ServiceUnavailableException('El hub no respondio a tiempo.');
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new HttpException(body || 'Error al consultar el hub', response.status);
    }

    return response.json() as Promise<T>;
  }
}
