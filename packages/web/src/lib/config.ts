/**
 * Configuración centralizada del frontend.
 * Los valores se toman de variables de entorno cuando están disponibles.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
