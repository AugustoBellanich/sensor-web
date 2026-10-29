// Copiado de sensor-app/src/datos/estado.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Estado de un equipo a partir de su último dato (funciones puras, se prueban con jest).

export type Semaforo = "al-dia" | "atrasado" | "sin-datos";

// Cuánto puede pasar sin datos antes de marcarlo atrasado. Los módulos mandan por LoRa cada
// 15–60 min según configuración; el N01 manda su latido cada 10 min (sin conexión a los 30,
// igual que network_health). El estado completo lo da la base (datos/salud.ts).
export const UMBRAL_MODULO_MS = 6 * 60 * 60 * 1000;
export const UMBRAL_GATEWAY_MS = 30 * 60 * 1000;

export function semaforo(ultimo: string | null, tipo: string, ahora: Date = new Date()): Semaforo {
  if (!ultimo) return "sin-datos";
  const t = new Date(ultimo).getTime();
  if (Number.isNaN(t)) return "sin-datos";
  const umbral = tipo === "N01" ? UMBRAL_GATEWAY_MS : UMBRAL_MODULO_MS;
  return ahora.getTime() - t > umbral ? "atrasado" : "al-dia";
}

/** "hace 5 min", "hace 3 h", "hace 2 días", "nunca". */
export function hace(fecha: string | null, ahora: Date = new Date()): string {
  if (!fecha) return "nunca";
  const t = new Date(fecha).getTime();
  if (Number.isNaN(t)) return "nunca";
  const s = Math.max(0, Math.round((ahora.getTime() - t) / 1000));
  if (s < 60) return "recién";
  const min = Math.round(s / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 60) return `hace ${d} días`;
  const meses = Math.round(d / 30);
  return `hace ${meses} meses`;
}

/** Cuánto hace, corto para listas: "< 1 h", "3 h", "25 d", "1 m", "2 a"; null si no hay fecha. */
export function haceCorto(fecha: string | null, ahora: Date = new Date()): string | null {
  if (!fecha) return null;
  const t = new Date(fecha).getTime();
  if (Number.isNaN(t)) return null;
  const h = Math.max(0, (ahora.getTime() - t) / 3600e3);
  if (h < 1) return "< 1 h";
  if (h < 24) return `${Math.floor(h)} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} d`;
  if (d < 365) return `${Math.floor(d / 30)} m`;
  return `${Math.floor(d / 365)} a`;
}

/** Menos de una hora: el dato está fresco (reloj verde). */
export const esReciente = (fecha: string | null, ahora: Date = new Date()): boolean =>
  !!fecha && ahora.getTime() - new Date(fecha).getTime() < 3600e3;

/** Id de equipo como lo guarda la base: "b01-a1b2c3 " → "B01-A1B2C3". */
export function normalizarId(id: string): string {
  return id.trim().toUpperCase().replace(/\s+/g, "");
}

export const idValido = (id: string): boolean => /^[A-Z][0-9]{2}-[0-9A-Z]{6}$/.test(normalizarId(id));

/** Modelo a partir del id ("B01-A1B2C3" → "B01"). */
export const modeloDeId = (id: string): string => normalizarId(id).split("-")[0] ?? "";

/** Señal WiFi del gateway en palabras (RSSI en dBm). */
export function calidadWifi(rssi: number | null | undefined): string | null {
  if (rssi == null) return null;
  if (rssi >= -60) return "buena";
  if (rssi >= -70) return "aceptable";
  if (rssi >= -80) return "débil";
  return "muy débil";
}

/** Segundos a "3 d 4 h", "2 h 10 min", "45 min". */
export function duracion(s: number | null | undefined): string {
  if (s == null || !Number.isFinite(s) || s < 0) return "—";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min`;
  return `${Math.round(s)} s`;
}
