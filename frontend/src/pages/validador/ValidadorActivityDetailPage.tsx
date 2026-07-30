import React from 'react';
import { PuntoDetailView } from '../shared/PuntoDetailView';

// /validador/actividad/:id — portada de /validador/actividad/:id del hub.
// El hub usa el mismo componente ActivityDetail.tsx para ADMIN y para
// VALIDADOR_AMBIENTAL (parametrizado por role) — la única diferencia es el
// botón "Actualizar punto" (solo ADMIN), que esta vista nunca tuvo. Ver
// pages/admin/AdminActivityDetailPage.tsx, mismo PuntoDetailView.
export const ValidadorActivityDetailPage: React.FC = () => <PuntoDetailView backHref="/validador/residuos" />;
