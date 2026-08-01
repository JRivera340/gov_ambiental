import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../store/authStore';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { accessToken, user } = await authService.login({ email, password });
      login(accessToken, user);
      const dashboard = user.role === 'ADMIN'
        ? '/admin'
        : user.role === 'VALIDADOR_AMBIENTAL'
          ? '/validador/residuos'
          : '/gestor-ambiental/dashboard';
      navigate(dashboard, { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-neutral-100 p-8 space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-black text-institutional-black">Gestión Ambiental</h1>
          <p className="text-sm text-neutral-400 mt-1">Iniciar sesión</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-neutral-700 mb-1.5">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="admin@ejemplo.local"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-neutral-700 mb-1.5">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-field"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3">
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-xs text-neutral-400 text-center">
          Usuarios de prueba creados por <code>npm run seed</code> — ver README.
        </p>
      </div>
    </div>
  );
};
