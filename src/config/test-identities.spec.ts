import { TEST_IDENTITIES } from './test-identities';

describe('TEST_IDENTITIES', () => {
  it('tiene exactamente las 3 identidades usadas por el seed y el minter de tokens', () => {
    expect(Object.keys(TEST_IDENTITIES).sort()).toEqual(['ADMIN', 'GESTOR_AMBIENTAL', 'VALIDADOR_AMBIENTAL']);
  });

  it('cada identidad tiene un id (uuid) y un email unicos', () => {
    const entries = Object.values(TEST_IDENTITIES);
    const ids = entries.map((e) => e.id);
    const emails = entries.map((e) => e.email);
    expect(new Set(ids).size).toBe(entries.length);
    expect(new Set(emails).size).toBe(entries.length);
    for (const id of ids) {
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    }
  });
});
