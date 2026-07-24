import { useState, useEffect } from 'react';
import api from '../services/api';

// URL pública conocida de R2 (fallback si el backend no expone R2_PUBLIC_URL
// o si aún no resolvió en el primer render).
const FALLBACK_PUBLIC_URL = 'https://pub-cabe26a560384a89a7e2a82367fb1813.r2.dev';

// Cache para la URL pública de R2 (se obtiene del backend)
let cachedPublicUrl: string | null = null;
let publicUrlPromise: Promise<string | null> | null = null;

/**
 * Obtiene la URL pública de R2 desde el backend
 */
async function getPublicUrlFromBackend(): Promise<string | null> {
  if (cachedPublicUrl !== null) {
    return cachedPublicUrl;
  }

  if (publicUrlPromise) {
    return publicUrlPromise;
  }

  publicUrlPromise = (async () => {
    try {
      const { data } = await api.get<{ publicUrl: string | null }>('/files/config/public-url');
      // Si el backend no tiene R2_PUBLIC_URL configurado, usar la URL pública conocida
      // para evitar caer en GET /files/{key} (que falla con keys que contienen "/")
      cachedPublicUrl = data.publicUrl || FALLBACK_PUBLIC_URL;
      return cachedPublicUrl;
    } catch (error) {
      console.error('Error obteniendo URL pública de R2:', error);
      // Fallback a la URL conocida
      return FALLBACK_PUBLIC_URL;
    }
  })();

  return publicUrlPromise;
}

/**
 * Extrae la key de una URL firmada de R2
 */
function extractKeyFromSignedUrl(signedUrl: string): string | null {
  try {
    const urlObj = new URL(signedUrl);

    // Formato: https://[bucket].[account-id].r2.cloudflarestorage.com/[key]?[params]
    // O: https://[account-id].r2.cloudflarestorage.com/[bucket]/[key]?[params]

    if (urlObj.hostname.includes('r2.cloudflarestorage.com')) {
      const pathParts = urlObj.pathname.split('/').filter(p => p);

      // La key es el resto de la ruta después del bucket
      // En R2, el formato suele ser /[bucket]/[key] o la key es toda la ruta si el bucket está en el hostname
      if (pathParts.length > 0) {
        // Intentar detectar si el primer segmento es un bucket conocido o si la key empieza por carpetas conocidas
        const firstSegment = pathParts[0];
        const knownFolders = ['photos', 'actas', 'ambiental'];

        if (knownFolders.includes(firstSegment)) {
          // La key empieza directamente con la carpeta
          return pathParts.join('/');
        } else if (pathParts.length > 1) {
          // El primer segmento es probablemente el bucket
          return pathParts.slice(1).join('/');
        }

        // Fallback: toda la ruta
        return pathParts.join('/');
      }
    }
  } catch (e) {
    console.error('Error extrayendo key de URL firmada:', e);
  }
  return null;
}

/**
 * Convierte una URL firmada de R2 a URL pública permanente
 */
async function convertSignedUrlToPublic(signedUrl: string): Promise<string> {
  const key = extractKeyFromSignedUrl(signedUrl);
  if (key) {
    const publicUrl = await getPublicUrlFromBackend();
    if (publicUrl) {
      return `${publicUrl}/${key}`;
    }
  }
  // Si no podemos extraer la key o no hay URL pública, devolver la URL original
  return signedUrl;
}

/**
 * Hook para obtener URLs frescas de archivos almacenados en R2
 * Detecta si el valor es una key (ruta relativa) o una URL completa
 * Si es una key, genera una URL fresca llamando al backend o construyendo URL pública directamente
 * Si es una URL firmada, la convierte a URL pública
 */
export function useFileUrl(keyOrUrl: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  // Obtener la URL pública de R2 una vez al montar el componente
  useEffect(() => {
    getPublicUrlFromBackend().then(setPublicUrl);
  }, []);

  useEffect(() => {
    if (!keyOrUrl) {
      setUrl(null);
      return;
    }

    // Si es una URL completa (empieza con http), verificar si es una URL firmada de R2
    if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
      // Si es una URL firmada de R2 (tiene parámetros de expiración), convertirla a pública
      if (keyOrUrl.includes('r2.cloudflarestorage.com')) {
        // Intentar extraer la key y construir URL pública
        const extractedKey = extractKeyFromSignedUrl(keyOrUrl);
        if (extractedKey && publicUrl) {
          // Construir URL pública directamente
          const publicUrlFinal = `${publicUrl}/${extractedKey}`;
          console.log('[useFileUrl] Convirtiendo URL firmada a pública:', { keyOrUrl, extractedKey, publicUrlFinal });
          setUrl(publicUrlFinal);
          return;
        }
        // Si no se puede extraer la key, intentar convertir usando la función
        convertSignedUrlToPublic(keyOrUrl).then((publicUrlConverted) => {
          setUrl(publicUrlConverted);
        }).catch((error) => {
          console.error('[useFileUrl] Error convirtiendo URL firmada:', error);
          // Fallback: intentar usar la URL original
          setUrl(keyOrUrl);
        });
        return;
      }

      // Si ya es una URL pública de R2 (detecta cualquier .r2.dev), usarla directamente
      if (keyOrUrl.includes('.r2.dev')) {
        setUrl(keyOrUrl);
        return;
      }

      // Si es otra URL (no R2), usarla directamente
      setUrl(keyOrUrl);
      return;
    }

    // Si es una key (ruta relativa), construir la URL pública de R2 directamente.
    // Si publicUrl aún no resolvió (primer render), usar el fallback conocido en vez
    // de llamar a /files/{key} (que falla con keys anidadas y genera 404).
    const base = publicUrl || FALLBACK_PUBLIC_URL;
    setUrl(`${base}/${keyOrUrl}`);
  }, [keyOrUrl, publicUrl]);

  return url;
}

/**
 * Hook para obtener múltiples URLs frescas
 */
export function useFileUrls(keysOrUrls: (string | null | undefined)[]): (string | null)[] {
  const [urls, setUrls] = useState<(string | null)[]>([]);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);

  // Obtener la URL pública de R2 una vez al montar el componente
  useEffect(() => {
    getPublicUrlFromBackend().then(setPublicUrl);
  }, []);

  useEffect(() => {
    if (!keysOrUrls || keysOrUrls.length === 0) {
      setUrls([]);
      return;
    }

    const fetchUrls = async () => {
      const urlPromises = keysOrUrls.map(async (keyOrUrl) => {
        if (!keyOrUrl) return null;

        // Si es una URL completa, verificar si necesita conversión
        if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) {
          // Si es una URL firmada de R2, intentar extraer la key y construir URL pública
          if (keyOrUrl.includes('r2.cloudflarestorage.com')) {
            const extractedKey = extractKeyFromSignedUrl(keyOrUrl);
            if (extractedKey && publicUrl) {
              // Construir URL pública directamente
              const publicUrlFinal = `${publicUrl}/${extractedKey}`;
              console.log('[useFileUrls] Convirtiendo URL firmada a pública:', { keyOrUrl, extractedKey, publicUrlFinal });
              return publicUrlFinal;
            }
            // Si no se puede extraer la key, intentar convertir usando la función
            return await convertSignedUrlToPublic(keyOrUrl);
          }

          // Si ya es una URL pública de R2 (detecta cualquier .r2.dev), usarla directamente
          if (keyOrUrl.includes('.r2.dev')) {
            return keyOrUrl;
          }

          // Si es otra URL, usarla directamente
          return keyOrUrl;
        }

        // Si es una key (ruta relativa), construir la URL pública de R2 directamente.
        // Si publicUrl aún no resolvió, usar el fallback conocido (evita /files/{key} → 404).
        const base = publicUrl || FALLBACK_PUBLIC_URL;
        return `${base}/${keyOrUrl}`;
      });

      const resolvedUrls = await Promise.all(urlPromises);
      setUrls(resolvedUrls);
    };

    fetchUrls();
  }, [keysOrUrls, publicUrl]);

  return urls;
}
