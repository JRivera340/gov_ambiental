/**
 * Parsea la tabla HTML de la descripción de un sector del KMZ a un mapa clave→valor.
 * Robusto: usa DOMParser y cae a regex si falla.
 */
export const parseDescription = (html: string): Record<string, string> => {
  const data: Record<string, string> = {};
  if (!html) return data;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = doc.querySelectorAll('tr');
    rows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim() || '';
        const val = cells[1].textContent?.trim() || '';
        if (key) data[key] = val;
      }
    });
  } catch (e) {
    console.warn('[KMZ Parser] Error parseando HTML con DOMParser, usando fallback regex:', e);
    const regex = /<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>/gi;
    let match;
    const cleanHtml = html.replace(/\s+/g, ' ');
    while ((match = regex.exec(cleanHtml)) !== null) {
      const k = match[1].replace(/<[^>]*>/g, '').trim();
      const v = match[2].replace(/<[^>]*>/g, '').trim();
      if (k) data[k] = v;
    }
  }
  return data;
};
