// Identidades de prueba compartidas entre el seed y el minter de tokens —
// mismos ids/emails en los dos lados para que "GESTOR_AMBIENTAL" vea en
// /puntos/mine exactamente los puntos que el seed le creó.
export const TEST_IDENTITIES = {
  GESTOR_AMBIENTAL: {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'gestor.prueba@ejemplo.com',
  },
  VALIDADOR_AMBIENTAL: {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'validador.prueba@ejemplo.com',
  },
  ADMIN: {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'admin.prueba@ejemplo.com',
  },
} as const;

export type TestRole = keyof typeof TEST_IDENTITIES;
