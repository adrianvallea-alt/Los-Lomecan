// Paleta de colores premium para perfiles
export const COLORS = [
  { id: 'silver',     hex: '#A1A1AA', label: 'Plata' },
  { id: 'red',        hex: '#EF4444', label: 'Rojo' },
  { id: 'orange',     hex: '#F97316', label: 'Naranja' },
  { id: 'amber',      hex: '#F59E0B', label: 'Ámbar' },
  { id: 'yellow',     hex: '#EAB308', label: 'Amarillo' },
  { id: 'lime',       hex: '#84CC16', label: 'Lima' },
  { id: 'green',      hex: '#22C55E', label: 'Verde' },
  { id: 'emerald',    hex: '#10B981', label: 'Esmeralda' },
  { id: 'teal',       hex: '#14B8A6', label: 'Turquesa' },
  { id: 'cyan',       hex: '#06B6D4', label: 'Cian' },
  { id: 'sky',        hex: '#0EA5E9', label: 'Cielo' },
  { id: 'blue',       hex: '#3B82F6', label: 'Azul' },
  { id: 'indigo',     hex: '#6366F1', label: 'Índigo' },
  { id: 'violet',     hex: '#8B5CF6', label: 'Violeta' },
  { id: 'purple',     hex: '#A855F7', label: 'Púrpura' },
  { id: 'fuchsia',    hex: '#D946EF', label: 'Fucsia' },
  { id: 'pink',       hex: '#EC4899', label: 'Rosa' },
  { id: 'rose',       hex: '#F43F5E', label: 'Rosado' },
  { id: 'pastelPink', hex: '#FFD1DC', label: 'Pastel Rosa' },
  { id: 'mint',       hex: '#C1E1C1', label: 'Menta' },
  { id: 'babyBlue',   hex: '#CFE2F3', label: 'Bebé Azul' },
  { id: 'peach',      hex: '#FDE2E4', label: 'Melocotón' },
  { id: 'lavender',   hex: '#E6E6FA', label: 'Lavanda' },
  { id: 'cream',      hex: '#FFFACD', label: 'Crema' },
];

/**
 * Obtiene el color hexadecimal a partir del identificador de color.
 * @param {string} colorId - El id del color (ej: 'blue', 'mint').
 * @returns {string} El valor hexadecimal del color, o '#A1A1AA' por defecto.
 */
export const getColorHex = (colorId) => {
  const found = COLORS.find(c => c.id === colorId);
  return found ? found.hex : '#A1A1AA'; // Plata como fallback
};