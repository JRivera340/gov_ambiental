import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersService } from '../../services/users.service';
import { Toast } from '../../components/Toast';
import { Loading } from '../../components/Loading';
import type { User } from '../../types';

const ROLES: Array<{ value: User['role']; label: string }> = [
  { value: 'ADMIN', label: 'Administrador' },
  { value: 'GESTOR_AMBIENTAL', label: 'Gestor Ambiental' },
  { value: 'VALIDADOR_AMBIENTAL', label: 'Validador Ambiental' },
];

const emptyForm = { name: '', lastname: '', email: '', password: '', role: 'GESTOR_AMBIENTAL' as User['role'] };

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await usersService.getAll());
    } catch (e: any) {
      setToast({ message: e.response?.data?.message || 'Error al cargar usuarios', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditingId(u.id);
    setForm({ name: u.name, lastname: u.lastname, email: u.email, password: '', role: u.role });
    setShowForm(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const payload: any = { name: form.name, lastname: form.lastname, email: form.email, role: form.role };
        if (form.password) payload.password = form.password;
        await usersService.update(editingId, payload);
        setToast({ message: 'Usuario actualizado', type: 'success' });
      } else {
        await usersService.create(form);
        setToast({ message: 'Usuario creado', type: 'success' });
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      setToast({ message: e.response?.data?.message || 'Error al guardar', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: User) => {
    try {
      if (u.active) await usersService.deactivate(u.id);
      else await usersService.activate(u.id);
      await load();
    } catch (e: any) {
      setToast({ message: e.response?.data?.message || 'Error al cambiar el estado', type: 'error' });
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white shadow-sm border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => navigate('/admin')} className="text-neutral-600 mr-4">←</button>
            <h1 className="text-xl font-bold text-institutional-black">Gestión de Usuarios</h1>
          </div>
          <button onClick={openCreate} className="btn-primary">+ Nuevo usuario</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {showForm && (
          <form onSubmit={onSubmit} className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 space-y-4">
            <h2 className="text-sm font-black text-primary uppercase tracking-wider">
              {editingId ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Nombre</label>
                <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Apellido</label>
                <input required value={form.lastname} onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Correo electrónico</label>
                <input required type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Rol</label>
                <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as User['role'] }))} className="input-field">
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                  Contraseña {editingId && <span className="text-neutral-400 font-normal">(dejar en blanco para no cambiarla)</span>}
                </label>
                <input
                  type="password"
                  required={!editingId}
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="input-field"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs font-bold text-neutral-500 uppercase">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Correo</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium text-neutral-800">{u.name} {u.lastname}</td>
                  <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                  <td className="px-4 py-3 text-neutral-600">{ROLES.find((r) => r.value === u.role)?.label || u.role}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}>
                      {u.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(u)} className="text-primary font-semibold hover:text-primary-dark">Editar</button>
                    <button onClick={() => toggleActive(u)} className={u.active ? 'text-red-600 font-semibold hover:text-red-700' : 'text-emerald-600 font-semibold hover:text-emerald-700'}>
                      {u.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No hay usuarios registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};
