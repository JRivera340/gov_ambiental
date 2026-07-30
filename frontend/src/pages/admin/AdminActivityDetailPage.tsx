import React from 'react';
import { PuntoDetailView } from '../shared/PuntoDetailView';

// /admin/actividad/:id — portada de /admin/actividad/:id del hub. El
// contenido real vive en PuntoDetailView, compartido con VALIDADOR_AMBIENTAL
// (ver pages/validador/ValidadorActivityDetailPage.tsx) porque el hub
// también usa un solo componente para ambos roles.
export const AdminActivityDetailPage: React.FC = () => <PuntoDetailView backHref="/admin" />;
