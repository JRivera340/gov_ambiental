import api from './api';

export interface UploadActaResponse {
  success: boolean;
  key: string;
  url: string;
  message: string;
}

export interface UploadPhotosResponse {
  success: boolean;
  keys: string[];
  urls: string[];
  count: number;
  message: string;
}

export const filesService = {
  /**
   * Sube un acta (PDF) para una actividad
   * @param file Archivo PDF
   * @param activityId ID de la actividad (opcional, para asociar el archivo)
   */
  async uploadActa(file: File, activityId?: string): Promise<UploadActaResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (activityId) {
      formData.append('activityId', activityId);
    }

    // Timeout aumentado para móviles con conexión lenta (5 minutos)
    const { data } = await api.post<UploadActaResponse>('/files/acta', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 5 * 60 * 1000, // 5 minutos en milisegundos
      // Configurar para mostrar progreso en el futuro si es necesario
      onUploadProgress: (progressEvent) => {
        // Se puede usar para mostrar progreso en el futuro
        if (progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // console.log(`Upload Progress: ${percentCompleted}%`);
        }
      },
    });

    return data;
  },

  /**
   * Sube múltiples fotos para una actividad
   * @param files Array de archivos de imagen
   * @param activityId ID de la actividad (opcional, para asociar los archivos)
   */
  async uploadPhotos(files: File[], activityId?: string): Promise<UploadPhotosResponse> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (activityId) {
      formData.append('activityId', activityId);
    }

    const { data } = await api.post<UploadPhotosResponse>('/files/photos', formData, {
      headers: { 'Content-Type': undefined },
      timeout: 5 * 60 * 1000,
    });

    return data;
  },

  /**
   * Obtiene la URL de un archivo
   * @param key Clave del archivo en R2
   */
  async getFileUrl(key: string): Promise<string> {
    const { data } = await api.get<{ url: string }>(`/files/${key}`);
    return data.url;
  },
};
