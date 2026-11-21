// Interpretación de la señal LoRa (F36, H17), igual en la app (sensor-app/src/datos/senal.ts, D-83).
// El N01 mide en cada paquete el RSSI (dBm: cuánta señal llega) y el SNR (dB: cuánto sobresale del
// ruido). Con la configuración de PROYECTO SENSOR (SF10, 125 kHz) la radio entiende paquetes hasta un
// SNR de unos -15 dB, así que el margen es SNR + 15. Los niveles se eligen por ese margen; el RSSI
// solo cuenta si no hay SNR. Sin dependencias, para poder probarlo solo.

export type NivelSenal = "buena" | "aceptable" | "debil" | "limite";

export const NIVELES_SENAL: Record<NivelSenal, { nombre: string; explicacion: string; color: string }> = {
  buena: { nombre: "Buena", explicacion: "llega con margen", color: "#15803d" },
  aceptable: { nombre: "Aceptable", explicacion: "llega bien; con lluvia o follaje puede perder alguna", color: "#65a30d" },
  debil: { nombre: "Débil", explicacion: "se pierden lecturas a veces", color: "#d97706" },
  limite: { nombre: "Al límite", explicacion: "se pierden lecturas seguido", color: "#dc2626" },
};

/** Límites de SNR (dB) entre niveles; debajo de SNR_MINIMO la radio ya no entiende el paquete. */
export const SNR_BUENA = 5;
export const SNR_ACEPTABLE = 0;
export const SNR_DEBIL = -10;
export const SNR_MINIMO = -15;

export function nivelSenal(s: { rssi: number | null; snr: number | null }): NivelSenal | null {
  if (s.snr != null && Number.isFinite(s.snr)) {
    if (s.snr >= SNR_BUENA) return "buena";
    if (s.snr >= SNR_ACEPTABLE) return "aceptable";
    if (s.snr >= SNR_DEBIL) return "debil";
    return "limite";
  }
  if (s.rssi != null && Number.isFinite(s.rssi)) {
    // Sin SNR: piso de ruido típico al aire libre (~-117 dBm con 125 kHz).
    if (s.rssi >= -100) return "buena";
    if (s.rssi >= -110) return "aceptable";
    if (s.rssi >= -120) return "debil";
    return "limite";
  }
  return null;
}

/** Mediana de los valores que no son nulos (null si no hay). */
export function mediana(valores: (number | null | undefined)[]): number | null {
  const v = valores.filter((x): x is number => x != null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

const dec = (x: number) => x.toFixed(1).replace(".", ",");

/** "-97 dBm · SNR 7,3 dB" (sin SNR: "-97 dBm"). */
export function numerosSenal(s: { rssi: number; snr: number | null }): string {
  const rssi = `${Math.round(s.rssi)} dBm`;
  return s.snr == null ? rssi : `${rssi} · SNR ${dec(s.snr)} dB`;
}

/** Nota del gráfico del SNR: qué es y qué significa cada franja. */
export const NOTA_GRAFICO_SNR =
  "Cuánto sobresale la señal del ruido, medido por el receptor en cada lectura que llega por radio. " +
  `Debajo de ${SNR_MINIMO} dB el receptor ya no la entiende. Más de ${SNR_BUENA}: buena · ${SNR_ACEPTABLE} a ${SNR_BUENA}: aceptable · ` +
  `${SNR_DEBIL} a ${SNR_ACEPTABLE}: débil · menos de ${SNR_DEBIL}: al límite.`;

/** Recepción del N01 desde su último arranque (latido de N01-FW-1.9.0, F39). */
export type Recepcion = { ok: number; crc: number; danados: number };

export type NivelRecepcion = "normal" | "algunos" | "muchos";

export const NIVELES_RECEPCION: Record<NivelRecepcion, { nombre: string; explicacion: string }> = {
  normal: { nombre: "Normal", explicacion: "casi todo lo que llega se lee bien" },
  algunos: { nombre: "Con algunos errores", explicacion: "se pierde alguna lectura" },
  muchos: { nombre: "Con muchos errores", explicacion: "revisar la señal o el equipo que manda paquetes dañados" },
};

/** Porcentaje de paquetes que llegaron mal (CRC o dañados) y su nivel; null si no hubo paquetes. */
export function nivelRecepcion(r: Recepcion): { malos: number; nivel: NivelRecepcion } | null {
  const total = r.ok + r.crc + r.danados;
  if (!total) return null;
  const malos = ((r.crc + r.danados) / total) * 100;
  return { malos, nivel: malos < 2 ? "normal" : malos < 10 ? "algunos" : "muchos" };
}

/** "1.234 bien · 3 con error de radio · 2 dañados" */
export function detalleRecepcion(r: Recepcion): string {
  const n = (x: number) => x.toLocaleString("es-AR");
  return `${n(r.ok)} bien · ${n(r.crc)} con error de radio · ${n(r.danados)} dañados`;
}

/** Equipo del texto del último paquete dañado ("RSSI -107 SNR 2.50 | C01-336F22,..."): "C01-336F22". */
export function equipoDelDanado(texto: string | null | undefined): string | null {
  if (!texto) return null;
  const cuerpo = texto.includes(" | ") ? texto.slice(texto.indexOf(" | ") + 3) : texto;
  const id = cuerpo.split(",")[0]?.trim();
  return id && /^[A-Z]\d{2}-[0-9A-F]{6}$/i.test(id) ? id.toUpperCase() : null;
}
