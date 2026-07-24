import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { DivIcon } from 'leaflet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Activity } from '../../../../types';
import { INST_RED } from '../../utils/adminConstants';
import { getActivityTipoLabel } from '../../../../utils/activityLabels';

interface ClickableMarkerProps {
  position: [number, number];
  icon: DivIcon;
  activity: Activity;
  index?: number;
  onActivityClick: (activity: Activity) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyMarker = Marker as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnyPopup = Popup as any;

/**
 * Marker de Leaflet con Popup que abre el detalle de una actividad al hacer click.
 */
export const ClickableMarker: React.FC<ClickableMarkerProps> = ({
  position,
  icon,
  activity,
  index,
  onActivityClick,
}) => {
  return (
    <AnyMarker position={position} icon={icon}>
      <AnyPopup closeButton={true} autoClose={true}>
        <div style={{ minWidth: 200, fontFamily: 'inherit' }}>
          <p style={{ fontWeight: 600, color: '#1F2937', marginBottom: 4, fontSize: 13 }}>
            {index !== undefined && (
              <span
                style={{
                  display: 'inline-block',
                  background: '#4B5563',
                  color: 'white',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: 10,
                  marginRight: 6,
                }}
              >
                #{index}
              </span>
            )}
            {getActivityTipoLabel(activity)}
          </p>
          <p style={{ color: '#6B7280', fontSize: 11, marginBottom: 8 }}>
            {format(new Date(activity.dateTime), 'dd/MM/yyyy HH:mm', { locale: es })} · {activity.barrio}
          </p>
          <button
            onClick={() => onActivityClick(activity)}
            style={{
              width: '100%',
              padding: '7px 0',
              background: INST_RED,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Ver Detalles
          </button>
        </div>
      </AnyPopup>
    </AnyMarker>
  );
};
