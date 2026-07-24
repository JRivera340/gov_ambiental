import React from 'react';
import type { ActivityStatus } from '../types';
import { AppIcon, type IconName } from './AppIcon';
import { Badge } from './ui/badge';

interface Props {
  status: ActivityStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<ActivityStatus, { label: string; variant: 'borrador' | 'enviada' | 'aprobada' | 'rechazada' | 'publicada' | 'warning'; icon: IconName }> = {
  BORRADOR: { label: 'Borrador', variant: 'borrador', icon: 'regresar' },
  ENVIADA: { label: 'Enviada', variant: 'enviada', icon: 'enviar' },
  APROBADA: { label: 'Aprobada', variant: 'aprobada', icon: 'aprobar' },
  RECHAZADA: { label: 'Rechazada', variant: 'rechazada', icon: 'rechazar' },
  PUBLICADA: { label: 'Publicada', variant: 'publicada', icon: 'mapa' },
};

export const StatusBadge: React.FC<Props> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <Badge variant={config.variant} className={size === 'sm' ? 'text-xs px-2 py-0.5' : ''}>
      <AppIcon name={config.icon} className={iconSize} aria-hidden="true" />
      {config.label}
    </Badge>
  );
};

