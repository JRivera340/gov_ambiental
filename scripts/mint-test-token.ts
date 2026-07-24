import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { getEnv } from '../src/config/env';
import { TEST_IDENTITIES, type TestRole } from '../src/config/test-identities';

const env = getEnv();

const role = (process.argv[2] as TestRole) ?? 'GESTOR_AMBIENTAL';
const identity = TEST_IDENTITIES[role];
if (!identity) {
  console.error(`Rol desconocido: "${role}". Usar uno de: ${Object.keys(TEST_IDENTITIES).join(', ')}`);
  process.exit(1);
}

const payload = {
  sub: identity.id,
  email: identity.email,
  role,
};

const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
console.log(token);
