// Copiado de sensor-app/src/datos/agro.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Lectura agronómica de los datos (funciones puras, se prueban con jest). Los cálculos de
// período (horas de frío, grados-día…) los hace la base (site_daily); acá se interpreta y se
// agrupa lo que llega. Criterios tomados del panel web (sensor-web/src/lib) para que coincidan.

export type Unidad = "hv" | "hg" | "mv";

export const UNIDADES: Record<Unidad, { corto: string; largo: string; simbolo: string; decimales: number }> = {
  hv: { corto: "% vol", largo: "Humedad volumétrica", simbolo: "%", decimales: 1 },
  hg: { corto: "% grav", largo: "Humedad gravimétrica", simbolo: "%", decimales: 1 },
  mv: { corto: "mV", largo: "Señal del sensor", simbolo: "mV", decimales: 0 },
};

export type Punto = { mv: number | null; hv: number | null; hg: number | null };
export type Electrodo = {
  index: number;
  depth: number | null;
  texture: string | null;
  calibrated: boolean;
  pmp: Punto | null;
  cc: Punto | null;
  sat: Punto | null;
};

type ConValores = Partial<Record<`e${1 | 2 | 3}_${Unidad}`, number | null>>;

/** Unidades que tienen datos, en orden de preferencia: volumétrica, gravimétrica, mV. */
export function unidadesDisponibles(filas: ConValores[]): Unidad[] {
  const hay = (u: Unidad) => filas.some((f) => [1, 2, 3].some((i) => f[`e${i as 1 | 2 | 3}_${u}`] != null));
  const lista = (["hv", "hg"] as Unidad[]).filter(hay);
  return [...lista, "mv"];
}

export type Referencias = { pmp: number; cc: number; sat: number };

/** PMP, CC y SAT de un electrodo en una unidad; null si falta alguno. */
export function referencias(e: Electrodo | undefined, u: Unidad): Referencias | null {
  if (!e?.pmp || !e.cc || !e.sat) return null;
  const pmp = e.pmp[u];
  const cc = e.cc[u];
  const sat = e.sat[u];
  if (pmp == null || cc == null || sat == null || sat === pmp) return null;
  return { pmp, cc, sat };
}

export type Zona = "estres" | "disponible" | "exceso" | "saturado";

// Color del valor y del estado de cada zona (tono 700: se lee al sol sobre blanco, D-82).
export const ZONAS: Record<Zona, { texto: string; color: string }> = {
  estres: { texto: "Estrés hídrico", color: "#b91c1c" },
  disponible: { texto: "Agua disponible", color: "#047857" },
  exceso: { texto: "Sobre capacidad de campo", color: "#0369a1" },
  saturado: { texto: "Saturado", color: "#4338ca" },
};

/**
 * Dónde está un valor entre marchitez (PMP), capacidad de campo (CC) y saturación (SAT).
 * Vale para las tres escalas: en mV va al revés (más mV = más seco), por eso se compara contra
 * los puntos y no contra un orden fijo. `aguaUtil`: 0 % en PMP, 100 % en CC.
 */
export function estadoHidrico(valor: number | null | undefined, r: Referencias) {
  if (valor == null || !Number.isFinite(valor)) return null;
  const fraccion = (valor - r.pmp) / (r.sat - r.pmp);
  const ccFraccion = (r.cc - r.pmp) / (r.sat - r.pmp);
  const aguaUtil = r.cc !== r.pmp ? ((valor - r.pmp) / (r.cc - r.pmp)) * 100 : NaN;
  const sube = r.sat > r.pmp;
  const pasa = (a: number, b: number) => (sube ? a > b : a < b);
  let zona: Zona = "disponible";
  if (pasa(r.pmp, valor)) zona = "estres";
  else if (pasa(valor, r.sat)) zona = "saturado";
  else if (pasa(valor, r.cc)) zona = "exceso";
  return { fraccion, ccFraccion, aguaUtil, zona };
}

/** Cambio mínimo para hablar de tendencia y no de ruido del sensor. */
const UMBRAL_TENDENCIA: Record<Unidad, number> = { hv: 0.3, hg: 0.3, mv: 5 };

export type Tendencia = { sentido: "mojando" | "secando" | "estable"; delta: number };

export function tendencia(actual: number | null | undefined, antes: number | null | undefined, u: Unidad): Tendencia | null {
  if (actual == null || antes == null || !Number.isFinite(actual) || !Number.isFinite(antes)) return null;
  const delta = actual - antes;
  const moja = u === "mv" ? -delta : delta;
  const umbral = UMBRAL_TENDENCIA[u];
  return { sentido: moja > umbral ? "mojando" : moja < -umbral ? "secando" : "estable", delta };
}

// ---------------------------------------------------------------- clima

/** Lectura orientativa del déficit de presión de vapor (kPa). */
export function lecturaDpv(dpv: number | null | undefined): { texto: string; color: string } | null {
  if (dpv == null || !Number.isFinite(dpv)) return null;
  if (dpv < 0.4) return { texto: "Muy bajo: aire casi saturado, riesgo de enfermedades", color: "#2563eb" };
  if (dpv <= 1.2) return { texto: "Adecuado para la transpiración", color: "#059669" };
  if (dpv <= 2) return { texto: "Alto: demanda atmosférica fuerte", color: "#b45309" };
  return { texto: "Muy alto: estrés por demanda de agua", color: "#b91c1c" };
}

/** Inicio de la temporada de frío: 1 de mayo del año en curso (o del anterior antes de mayo). */
export function inicioTemporadaFrio(hoyIso: string): string {
  const [a, m] = hoyIso.split("-").map(Number);
  return `${m >= 5 ? a : a - 1}-05-01`;
}

export type Dia = {
  dia: string;
  family: "B01" | "C01";
  n: number;
  horas_datos: number;
  tmin: number | null;
  tmax: number | null;
  tmed: number | null;
  hum_min: number | null;
  hum_max: number | null;
  hum_med: number | null;
  dpv_med: number | null;
  dpv_max: number | null;
  rocio_min: number | null;
  horas_frio: number | null;
  horas_frio_0_72: number | null;
  horas_helada: number | null;
  horas_calor: number | null;
  gdd: number | null;
};

const suma = (l: (number | null)[]) => l.reduce<number>((a, v) => a + (v ?? 0), 0);

/** Totales de un período a partir de los días (solo aire). */
export function resumenClima(dias: Dia[]) {
  const d = dias.filter((x) => x.family === "C01");
  const tmin = d.map((x) => x.tmin).filter((v): v is number => v != null);
  const tmax = d.map((x) => x.tmax).filter((v): v is number => v != null);
  return {
    dias: d.length,
    frio: suma(d.map((x) => x.horas_frio)),
    frio072: suma(d.map((x) => x.horas_frio_0_72)),
    helada: suma(d.map((x) => x.horas_helada)),
    calor: suma(d.map((x) => x.horas_calor)),
    gdd: suma(d.map((x) => x.gdd)),
    diasHeladaMeteo: d.filter((x) => x.tmin != null && x.tmin <= 0).length,
    diasHeladaAgro: d.filter((x) => x.tmin != null && x.tmin < 3).length,
    tmin: tmin.length ? Math.min(...tmin) : null,
    tmax: tmax.length ? Math.max(...tmax) : null,
    dpvMed: d.length ? suma(d.map((x) => x.dpv_med)) / Math.max(1, d.filter((x) => x.dpv_med != null).length) : null,
  };
}

/** Temperatura de suelo: promedio de los últimos 3 días con datos y amplitud diaria media. */
export function resumenSuelo(dias: Dia[]) {
  const d = dias.filter((x) => x.family === "B01" && x.tmed != null);
  const ult = d.slice(-3);
  const amp = d.filter((x) => x.tmax != null && x.tmin != null).map((x) => x.tmax! - x.tmin!);
  return {
    reciente: ult.length ? suma(ult.map((x) => x.tmed)) / ult.length : null,
    diasReciente: ult.length,
    amplitud: amp.length ? amp.reduce((a, b) => a + b, 0) / amp.length : null,
  };
}

/** Lunes de la semana de una fecha "AAAA-MM-DD". */
function lunes(iso: string): string {
  const f = new Date(`${iso}T12:00:00Z`);
  const dow = (f.getUTCDay() + 6) % 7; // 0 = lunes
  f.setUTCDate(f.getUTCDate() - dow);
  return f.toISOString().slice(0, 10);
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Horas de frío agrupadas por semana (desde el lunes) o por mes. */
export function frioPor(dias: Dia[], por: "semana" | "mes"): { clave: string; etiqueta: string; horas: number; dias: number }[] {
  const grupos = new Map<string, { clave: string; etiqueta: string; horas: number; dias: number }>();
  for (const x of dias) {
    if (x.family !== "C01") continue;
    const clave = por === "semana" ? lunes(x.dia) : x.dia.slice(0, 7);
    const [, m, d] = clave.split("-");
    const etiqueta = por === "semana" ? `${d}/${m}` : MESES[Number(m) - 1];
    const g = grupos.get(clave) ?? { clave, etiqueta, horas: 0, dias: 0 };
    g.horas += x.horas_frio ?? 0;
    g.dias += 1;
    grupos.set(clave, g);
  }
  return [...grupos.values()].sort((a, b) => a.clave.localeCompare(b.clave));
}

/** "5 h 30 min", "45 min", "0 h". */
export function horas(h: number | null | undefined): string {
  if (h == null || !Number.isFinite(h) || h <= 0) return "0 h";
  const ent = Math.floor(h);
  const min = Math.round((h - ent) * 60);
  if (min === 60) return `${ent + 1} h`;
  if (ent === 0) return `${min} min`;
  return min ? `${ent} h ${min} min` : `${ent} h`;
}

/** Número con coma decimal. */
export function num(v: number | null | undefined, dec = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(dec).replace(".", ",");
}
