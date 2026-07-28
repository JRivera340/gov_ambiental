import { HttpException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { getEnv } from '../config/env';
import { HubUser } from './dto/hub-user.dto';
import { Role } from '../common/enums/role.enum';

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
  private gestoresCache: CacheEntry<HubUser[]> | null = null;

  async findById(id: string, bearerToken: string): Promise<HubUser> {
    const cached = this.userCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const data = await this.fetchFromHub<HubUser>(`/api/users/${id}`, bearerToken);
    this.userCache.set(id, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  // El hub filtra esta lista segun el ROL DE QUIEN LLAMA (a un
  // GESTOR_AMBIENTAL le devuelve solo ambientales, pero a VALIDADOR_AMBIENTAL
  // o ADMIN les devuelve los gestores de TODOS los dominios: IVC, espacio
  // publico, PYBA, deportes). El modulo ambiental no debe recibir esos datos
  // ni por un instante - el filtrado por dominio se hace SIEMPRE aca, nunca
  // en el frontend (ver CLAUDE.md).
  async findGestores(bearerToken: string): Promise<HubUser[]> {
    if (this.gestoresCache && this.gestoresCache.expiresAt > Date.now()) {
      return this.gestoresCache.data;
    }

    const data = await this.fetchFromHub<HubUser[]>('/api/users/gestores/list', bearerToken);
    const soloAmbiental = data.filter((u) => u.role === Role.GESTOR_AMBIENTAL);
    this.gestoresCache = { data: soloAmbiental, expiresAt: Date.now() + CACHE_TTL_MS };
    return soloAmbiental;
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
