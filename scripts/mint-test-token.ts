import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { getEnv } from '../src/config/env';

const env = getEnv();

const role = process.argv[2] ?? 'GESTOR_AMBIENTAL';
const payload = {
  sub: '00000000-0000-0000-0000-000000000001',
  email: 'gestor.prueba@ejemplo.com',
  role,
};

const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '8h' });
console.log(token);
