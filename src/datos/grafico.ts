// Copiado de sensor-app/src/datos/grafico.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Cuentas de los gráficos (funciones puras, se prueban con jest): escalas, trazos con huecos,
// períodos e intervalos, y fechas en hora argentina.

// Argentina no tiene horario de verano desde 2009: UTC-3 fijo. Se usa siempre esta hora para
// mostrar y para el CSV, esté donde esté el teléfono.
const DESFASE_MS = 3 * 60 * 60 * 1000;

function enArgentina(t: number): Date {
  return new Date(t - DESFASE_MS);
}

const dos = (n: number) => String(n).padStart(2, "0");

/** "2026-09-01 00:10:00" en hora argentina. */
export function fechaHoraArg(t: number | string): string {
  // Una fecha sola ("2026-08-01", columnas date de la base) ya es del calendario argentino.
  if (typeof t === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t} 00:00:00`;
  const d = enArgentina(typeof t === "string" ? new Date(t).getTime() : t);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

/** "01/09 00:10" para el eje y la lectura del gráfico. */
export function etiquetaCorta(t: number, conHora: boolean): string {
  const d = enArgentina(t);
  const dia = `${dos(d.getUTCDate())}/${dos(d.getUTCMonth() + 1)}`;
  return conHora ? `${dia} ${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}` : dia;
}

export function soloHora(t: number): string {
  const d = enArgentina(t);
  return `${dos(d.getUTCHours())}:${dos(d.getUTCMinutes())}`;
}

// ---------------------------------------------------------------- períodos

export type Periodo = "24h" | "7d" | "30d" | "90d" | "todo";

export const PERIODOS: { valor: Periodo; texto: string; ms: number | null }[] = [
  { valor: "24h", texto: "24 h", ms: 24 * 3600e3 },
  { valor: "7d", texto: "7 días", ms: 7 * 24 * 3600e3 },
  { valor: "30d", texto: "30 días", ms: 30 * 24 * 3600e3 },
  { valor: "90d", texto: "90 días", ms: 90 * 24 * 3600e3 },
  { valor: "todo", texto: "Todo", ms: null },
];

// Intervalos posibles para promediar (segundos): de 10 min a 1 semana.
const INTERVALOS = [600, 1800, 3600, 3 * 3600, 6 * 3600, 12 * 3600, 86400, 7 * 86400];

/** El intervalo más corto que deja el gráfico en `maxPuntos` o menos. */
export function elegirIntervalo(ms: number, maxPuntos = 300): number {
  for (const s of INTERVALOS) if (ms / 1000 / s <= maxPuntos) return s;
  return INTERVALOS[INTERVALOS.length - 1];
}

export function textoIntervalo(s: number): string {
  if (s < 3600) return `${s / 60} min`;
  if (s < 86400) return s === 3600 ? "1 hora" : `${s / 3600} horas`;
  return s === 86400 ? "1 día" : `${s / 86400} días`;
}

/**
 * Desde y hasta de un período. "Todo" va desde el primer dato (`primero`) hasta ahora.
 * Devuelve null si no hay desde dónde (todo, sin datos).
 */
export function rango(periodo: Periodo, ahora: number, primero: string | null = null): { desde: number; hasta: number; intervalo: number } | null {
  const p = PERIODOS.find((x) => x.valor === periodo)!;
  let desde: number;
  if (p.ms != null) desde = ahora - p.ms;
  else if (primero) desde = new Date(primero).getTime();
  else return null;
  if (!(ahora > desde)) desde = ahora - 3600e3;
  return { desde, hasta: ahora, intervalo: elegirIntervalo(ahora - desde) };
}

// ---------------------------------------------------------------- escalas

/** Marcas "lindas" del eje (1, 2 o 5 por potencia de 10) que cubren [min, max]. */
export function marcasEje(min: number, max: number, cuantas = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) {
    const d = Math.abs(min) > 0 ? Math.abs(min) * 0.1 : 1;
    min -= d;
    max += d;
  }
  const crudo = (max - min) / cuantas;
  const pot = 10 ** Math.floor(Math.log10(crudo));
  const paso = [1, 2, 5, 10].map((m) => m * pot).find((p) => p >= crudo) ?? 10 * pot;
  const desde = Math.floor(min / paso) * paso;
  const hasta = Math.ceil(max / paso) * paso;
  const marcas: number[] = [];
  for (let v = desde; v <= hasta + paso / 1e6; v += paso) marcas.push(Number(v.toFixed(10)));
  return marcas;
}

/** Mínimo y máximo de varias listas, sin nulos. */
export function extremos(...listas: (number | null)[][]): { min: number; max: number } | null {
  let min = Infinity;
  let max = -Infinity;
  for (const l of listas)
    for (const v of l) {
      if (v == null || !Number.isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
  return min === Infinity ? null : { min, max };
}

/**
 * Trazo SVG ("M x y L x y …") de una serie. Se corta donde falta el valor o donde entre dos
 * puntos pasa más de `huecoMs` (el equipo no mandó datos: no se inventa una línea).
 */
export function trazo(
  tiempos: number[],
  valores: (number | null)[],
  x: (t: number) => number,
  y: (v: number) => number,
  huecoMs: number,
): string {
  let d = "";
  let anterior: number | null = null;
  for (let i = 0; i < tiempos.length; i++) {
    const v = valores[i];
    if (v == null || !Number.isFinite(v)) {
      anterior = null;
      continue;
    }
    const t = tiempos[i];
    const sigue = anterior != null && t - anterior <= huecoMs;
    d += `${sigue ? "L" : "M"}${x(t).toFixed(1)} ${y(v).toFixed(1)} `;
    anterior = t;
  }
  return d.trim();
}

/** Área entre mínimo y máximo (temperatura): un polígono por tramo continuo. */
export function banda(
  tiempos: number[],
  min: (number | null)[],
  max: (number | null)[],
  x: (t: number) => number,
  y: (v: number) => number,
  huecoMs: number,
): string {
  const tramos: number[][] = [];
  let actual: number[] = [];
  let anterior: number | null = null;
  for (let i = 0; i < tiempos.length; i++) {
    const ok = min[i] != null && max[i] != null;
    if (!ok || (anterior != null && tiempos[i] - anterior > huecoMs)) {
      if (actual.length) tramos.push(actual);
      actual = [];
    }
    if (ok) {
      actual.push(i);
      anterior = tiempos[i];
    } else anterior = null;
  }
  if (actual.length) tramos.push(actual);
  return tramos
    .filter((tr) => tr.length > 1)
    .map((tr) => {
      const arriba = tr.map((i) => `${x(tiempos[i]).toFixed(1)} ${y(max[i]!).toFixed(1)}`);
      const abajo = [...tr].reverse().map((i) => `${x(tiempos[i]).toFixed(1)} ${y(min[i]!).toFixed(1)}`);
      return `M${arriba.join(" L")} L${abajo.join(" L")} Z`;
    })
    .join(" ");
}

/** Índice del punto con tiempo más cercano a `t` (los tiempos vienen ordenados). */
export function masCercano(tiempos: number[], t: number): number {
  if (!tiempos.length) return -1;
  let lo = 0;
  let hi = tiempos.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (tiempos[m] <= t) lo = m;
    else hi = m;
  }
  return Math.abs(tiempos[lo] - t) <= Math.abs(tiempos[hi] - t) ? lo : hi;
}

/** Marcas del eje de tiempo: a medianoche si el período es de días, cada tantas horas si no. */
export function marcasTiempo(desde: number, hasta: number, cuantas = 4): number[] {
  const ms = hasta - desde;
  const hora = 3600e3;
  const pasos = [hora, 3 * hora, 6 * hora, 12 * hora, 24 * hora, 2 * 24 * hora, 7 * 24 * hora, 14 * 24 * hora, 30 * 24 * hora];
  const paso = pasos.find((p) => ms / p <= cuantas) ?? pasos[pasos.length - 1];
  // Se cuenta en hora argentina: así los pasos de días caen a la medianoche de acá.
  const primera = Math.ceil((desde - DESFASE_MS) / paso) * paso + DESFASE_MS;
  const marcas: number[] = [];
  for (let t = primera; t <= hasta; t += paso) marcas.push(t);
  return marcas;
}
