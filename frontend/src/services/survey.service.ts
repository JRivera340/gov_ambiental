import axios from 'axios';
import { CATEGORY_MAPPING, SUBCATEGORY_MAPPING } from '../config/areasCatalog';

const API_URL = import.meta.env.VITE_SURVEYS_API_URL || 'https://backendencuestas-production-d973.up.railway.app';
const SURVEY_TIMEOUT = 15000;

export interface SurveyQuestion {
  id: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'MULTISELECT' | 'RADIO' | 'CHECKBOX' | 'DATE' | 'TEXTAREA' | 'FILE' | 'LOCATION' | 'SECTION_HEADER' | 'ENTITY_SELECT' | 'boolean';
  name?: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
  config?: any;
  order?: number;
}

export interface SurveySchema {
  id: string;
  title: string;
  description?: string;
  questions: SurveyQuestion[];
  // Roles que pueden ver/llenar el formulario. null/ausente = visible para todos.
  visibleRoles?: string[] | null;
}

// Los mapeos de área viven en el catálogo único (config/areasCatalog); se
// re-exportan aquí por compatibilidad con los consumidores existentes.
export { CATEGORY_MAPPING, SUBCATEGORY_MAPPING };

export const surveyService = {
  getSurvey: async (category: string, subCategory: string): Promise<SurveySchema | null> => {
    const mappedCategory = CATEGORY_MAPPING[category] || category;
    const mappedSubcategory = SUBCATEGORY_MAPPING[subCategory] || subCategory;

    const url = `${API_URL}/surveys`;

    try {
      const response = await axios.get(url, {
        timeout: SURVEY_TIMEOUT,
        params: {
          categoryName: mappedCategory,
          subcategoryName: mappedSubcategory,
          status: 'ACTIVE', // Solo traer la encuesta activa
          _t: Date.now(),
        },
      });
      return Array.isArray(response.data) ? response.data[0] : response.data;
    } catch (error: any) {
      console.error('[SurveyService] Error al consultar el formulario:', error?.message);
      return null;
    }
  },

  // Trae todas las encuestas con sus preguntas (sin filtrar por estado), para
  // poder resolver los nombres técnicos/labels de las preguntas a partir de las
  // claves (UUID) guardadas en operativoData de las actividades. Incluye
  // encuestas inactivas para resolver respuestas históricas.
  getAllSurveys: async (): Promise<SurveySchema[]> => {
    try {
      const response = await axios.get(`${API_URL}/surveys`, {
        timeout: SURVEY_TIMEOUT,
        params: { _t: Date.now() },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error('[SurveyService] Error al cargar todas las encuestas:', error);
      return [];
    }
  },

  getCategories: async (): Promise<any[]> => {
    try {
      const response = await axios.get(`${API_URL}/categories`, {
        timeout: SURVEY_TIMEOUT,
      });
      return response.data;
    } catch (error) {
      console.error('[SurveyService] Error al cargar categorías:', error);
      return [];
    }
  },

  getSubcategories: async (categoryName: string): Promise<any[]> => {
    try {
      const mappedCategory = CATEGORY_MAPPING[categoryName] || categoryName;
      const response = await axios.get(`${API_URL}/subcategories`, {
        timeout: SURVEY_TIMEOUT,
        params: { categoryName: mappedCategory },
      });
      return response.data;
    } catch (error) {
      console.error('[SurveyService] Error al cargar subcategorías:', error);
      return [];
    }
  }
};
