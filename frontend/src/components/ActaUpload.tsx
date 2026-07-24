import { useState, useRef } from 'react';
import { filesService } from '../services/files.service';
import { Toast } from './Toast';

interface ActaUploadProps {
  onUploadSuccess: (url: string) => void;
  existingUrl?: string | null;
  activityId?: string;
  disabled?: boolean;
}

export const ActaUpload = ({ onUploadSuccess, existingUrl, activityId, disabled }: ActaUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar extensión de archivo (más confiable en móviles)
    const fileName = file.name.toLowerCase();
    const isValidExtension = fileName.endsWith('.pdf');
    
    // Validar tipo MIME (algunos móviles pueden reportar incorrectamente)
    // Aceptar si: tiene extensión .pdf O tiene MIME type correcto O no tiene MIME type (común en móviles)
    const isValidMimeType = file.type === 'application/pdf' || file.type === '' || !file.type;
    
    // Aceptar el archivo si tiene extensión .pdf O si tiene MIME type válido
    // Esto maneja casos donde móviles reportan MIME type incorrecto pero la extensión es correcta
    if (!isValidExtension && !isValidMimeType) {
      setError('El archivo debe ser un PDF. Por favor, verifique que el archivo tenga extensión .pdf');
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      setError('El PDF no puede exceder 10MB. Por favor, comprima el archivo o use uno más pequeño');
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Validar que el archivo no esté vacío
    if (file.size === 0) {
      setError('El archivo está vacío. Por favor, seleccione un archivo válido');
      // Limpiar el input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const response = await filesService.uploadActa(file, activityId);
      onUploadSuccess(response.url);
      setSuccess('Acta subida exitosamente');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      // Manejo mejorado de errores
      let errorMessage = 'Error al subir el acta';
      
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'La conexión tardó demasiado. Por favor, verifique su conexión a internet e intente nuevamente';
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMessage = 'Error de conexión. Por favor, verifique su conexión a internet e intente nuevamente';
      } else if (err.response?.status === 413) {
        errorMessage = 'El archivo es demasiado grande. El tamaño máximo permitido es 10MB';
      } else if (err.response?.status === 400) {
        errorMessage = err.response?.data?.message || 'El archivo no es válido. Por favor, verifique que sea un PDF válido';
      } else if (err.response?.status === 500) {
        errorMessage = 'Error del servidor. Por favor, intente nuevamente en unos momentos';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setUploading(false);
      // Limpiar el input para permitir seleccionar el mismo archivo de nuevo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onUploadSuccess('');
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Acta del Operativo (PDF) <span className="text-red-500">*</span>
        <span className="text-xs text-gray-500 ml-2">Mínimo 3 páginas, máximo 10MB</span>
      </label>

      {existingUrl ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <svg
            className="w-5 h-5 text-green-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-green-700 flex-1">Acta subida correctamente</span>
          <a
            href={existingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Ver PDF
          </a>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Eliminar
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileSelect}
            disabled={uploading || disabled}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {uploading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Subiendo acta...
            </div>
          )}
        </div>
      )}

      {error && <Toast message={error} type="error" onClose={() => setError(null)} />}
      {success && <Toast message={success} type="success" onClose={() => setSuccess(null)} />}
    </div>
  );
};
