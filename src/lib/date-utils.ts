import { format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Formatea una fecha de radicación al formato extendido en español:
 * Ej: "Sábado, 1 de agosto de 2026 a las 21:50"
 */
export const formatRadicationDate = (dateString: string | Date): string => {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  // EEEE: Día de la semana completo
  // d: Número de día
  // MMMM: Nombre del mes completo
  // yyyy: Año de 4 dígitos
  const formatted = format(date, "EEEE, d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es });
  
  // Capitalizar la primera letra (nombre del día de la semana)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};
