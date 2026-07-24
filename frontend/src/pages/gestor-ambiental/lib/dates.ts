// Helpers de fecha del área ambiental. Delegan en la fuente única utils/dateRanges;
// se conservan estos nombres por los consumidores existentes del dashboard ambiental.
export {
  todayStr as getTodayDate,
  lastWeekStr as getLastWeekDate,
  startOfMonthStr as getStartOfMonthDate,
  endOfMonthStr as getEndOfMonthDate,
  monthIndexToRange as getDatesForMonth,
} from '../../../utils/dateRanges';
