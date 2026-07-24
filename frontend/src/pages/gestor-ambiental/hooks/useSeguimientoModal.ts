import { useState } from 'react';
import { format } from 'date-fns';
import type { ResiduoEntry } from '../../../types';

// Estado del modal de seguimiento de residuos (marcar recogido / agregar residuo).
// Estado puramente de UI, sin dependencias externas.
export function useSeguimientoModal() {
  const [showSeguimientoModal, setShowSeguimientoModal] = useState(false);
  const [seguimientoAction, setSeguimientoAction] = useState<'MARCAR_RECOGIDO' | 'AGREGAR_RESIDUO' | null>(null);
  const [selectedResiduo, setSelectedResiduo] = useState<ResiduoEntry | null>(null);
  const [selectedResidueDetail, setSelectedResidueDetail] = useState<ResiduoEntry | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [seguimientoPhotos, setSeguimientoPhotos] = useState<string[]>([]);
  const [seguimientoFechaRecogida, setSeguimientoFechaRecogida] = useState<string>(
    format(new Date(), "yyyy-MM-dd'T'HH:mm"),
  );

  return {
    showSeguimientoModal, setShowSeguimientoModal,
    seguimientoAction, setSeguimientoAction,
    selectedResiduo, setSelectedResiduo,
    selectedResidueDetail, setSelectedResidueDetail,
    previewImage, setPreviewImage,
    seguimientoPhotos, setSeguimientoPhotos,
    seguimientoFechaRecogida, setSeguimientoFechaRecogida,
  };
}
