import { DivIcon } from 'leaflet';
import { AMBIENTAL_COLOR } from './constants';

export function createPuntoCriticoIcon(color: string, number?: number): DivIcon {
  return new DivIcon({
    className: '',
    html: `
      <div style="position: relative;">
        <div style="
          background: #fff; width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2.5px solid ${color};
        ">
          <div style="
            width: 18px; height: 18px; background-color: ${color};
            mask-image: url('/icons/Residuos.png'); mask-size: contain; mask-repeat: no-repeat; mask-position: center;
            -webkit-mask-image: url('/icons/Residuos.png'); -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; -webkit-mask-position: center;
            pointer-events: none;
          "></div>
        </div>
        ${number ? `
        <div style="
          position: absolute; top: -10px; right: -10px;
          background: ${color}; color: white;
          font-size: 10px; font-weight: 800;
          padding: 2px 5px; border-radius: 8px;
          border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10; min-width: 18px; text-align: center;
        ">
          ${number}
        </div>
        ` : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export function createAmbientalIcon(number?: number): DivIcon {
  return new DivIcon({
    className: '',
    html: `
      <div style="position: relative;">
        <div style="
          background: #fff; width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3); border: 2.5px solid ${AMBIENTAL_COLOR};
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${AMBIENTAL_COLOR}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
            <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
          </svg>
        </div>
        ${number ? `
        <div style="
          position: absolute; top: -10px; right: -10px;
          background: ${AMBIENTAL_COLOR}; color: white;
          font-size: 10px; font-weight: 800;
          padding: 2px 5px; border-radius: 8px;
          border: 1.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          z-index: 10; min-width: 18px; text-align: center;
        ">
          ${number}
        </div>
        ` : ''}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

// @ts-ignore
export const ambientalIcon = createAmbientalIcon();
