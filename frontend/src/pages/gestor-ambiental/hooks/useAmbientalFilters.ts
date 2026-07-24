import { usePersistentState } from './usePersistentState';
import { type SidebarTab } from '../lib/constants';
import { getStartOfMonthDate, getEndOfMonthDate } from '../lib/dates';

// Filtros del dashboard ambiental, persistidos en localStorage. Estado puro sin
// dependencias; las listas derivadas que los consumen viven en el hook raíz.
export function useAmbientalFilters() {
  const [genFilterTipo, setGenFilterTipo] = usePersistentState<string>('gad_tipo', '');
  const [genFilterEstado, setGenFilterEstado] = usePersistentState<string>('gad_estado', '');
  const [genFilterDesde, setGenFilterDesde] = usePersistentState<string>('gad_desde', getStartOfMonthDate());
  const [genFilterHasta, setGenFilterHasta] = usePersistentState<string>('gad_hasta', getEndOfMonthDate());
  const [genFilterSubtipo, setGenFilterSubtipo] = usePersistentState<string>('gad_subtipo', '');
  const [selectedMonth, setSelectedMonth] = usePersistentState<string>('gad_month', new Date().getMonth().toString());
  const [sidebarTab, setSidebarTab] = usePersistentState<SidebarTab>('gad_tab', 'puntos-criticos');
  const [showFilters, setShowFilters] = usePersistentState<boolean>('gad_showFil', false);
  const [emergencyFilter, setEmergencyFilter] = usePersistentState<boolean>('gad_emerg', false);
  const [globalBarrio, setGlobalBarrio] = usePersistentState<string>('gad_barrio', '');
  const [listSearchNumber, setListSearchNumber] = usePersistentState<string>('gad_searchNr', '');
  const [mapaEstadoRecoleccionFilter, setMapaEstadoRecoleccionFilter] =
    usePersistentState<'ALL' | 'RECOGIDOS' | 'NO_RECOGIDOS'>('gad_mapRecColor', 'ALL');

  return {
    genFilterTipo, setGenFilterTipo,
    genFilterEstado, setGenFilterEstado,
    genFilterDesde, setGenFilterDesde,
    genFilterHasta, setGenFilterHasta,
    genFilterSubtipo, setGenFilterSubtipo,
    selectedMonth, setSelectedMonth,
    sidebarTab, setSidebarTab,
    showFilters, setShowFilters,
    emergencyFilter, setEmergencyFilter,
    globalBarrio, setGlobalBarrio,
    listSearchNumber, setListSearchNumber,
    mapaEstadoRecoleccionFilter, setMapaEstadoRecoleccionFilter,
  };
}
