// Copiado de sensor-app/src/datos/csv.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Archivo CSV de las lecturas de un sitio (funciones puras, se prueban con jest).
// Formato pensado para análisis (R, Python, planilla): coma como separador, punto decimal,
// una fila por lectura, mV crudos tal como llegaron y los valores calculados al lado.
// Lleva BOM para que la planilla reconozca los acentos.
import { fechaHoraArg } from "./grafico";

export type FilaB01 = {
  timestamp: string;
  sensor_id: string;
  e1_mv: number | null;
  e2_mv: number | null;
  e3_mv: number | null;
  e1_hv: number | null;
  e2_hv: number | null;
  e3_hv: number | null;
  e1_hg: number | null;
  e2_hg: number | null;
  e3_hg: number | null;
  soil_temp: number | null;
  battery_pct: number | null;
  battery_mv: number | null;
  qc_flags: string[] | null;
};

export type FilaC01 = {
  timestamp: string;
  sensor_id: string;
  air_temp: number | null;
  humidity: number | null;
  battery_pct: number | null;
  battery_mv: number | null;
  qc_flags: string[] | null;
};

const BOM = "\uFEFF";

function celda(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = typeof v === "number" ? (Number.isFinite(v) ? String(v) : "") : v;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function linea(valores: (string | number | null | undefined)[]): string {
  return valores.map(celda).join(",");
}

const qc = (f: string[] | null) => (f && f.length ? f.join("|") : "");

export function csvB01(filas: FilaB01[], profundidades: Record<number, number | null> = {}): string {
  const prof = (i: number) => (profundidades[i] != null ? `_${profundidades[i]}cm` : "");
  const encabezado = [
    "fecha_hora_arg",
    "fecha_hora_utc",
    "equipo",
    `e1${prof(1)}_mv`,
    `e2${prof(2)}_mv`,
    `e3${prof(3)}_mv`,
    `e1${prof(1)}_hv_pct`,
    `e2${prof(2)}_hv_pct`,
    `e3${prof(3)}_hv_pct`,
    `e1${prof(1)}_hg_pct`,
    `e2${prof(2)}_hg_pct`,
    `e3${prof(3)}_hg_pct`,
    "temp_suelo_c",
    "bateria_pct",
    "bateria_mv",
    "control_calidad",
  ];
  const cuerpo = filas.map((r) =>
    linea([
      fechaHoraArg(r.timestamp),
      new Date(r.timestamp).toISOString(),
      r.sensor_id,
      r.e1_mv,
      r.e2_mv,
      r.e3_mv,
      r.e1_hv,
      r.e2_hv,
      r.e3_hv,
      r.e1_hg,
      r.e2_hg,
      r.e3_hg,
      r.soil_temp,
      r.battery_pct,
      r.battery_mv,
      qc(r.qc_flags),
    ]),
  );
  return BOM + [encabezado.join(","), ...cuerpo].join("\r\n") + "\r\n";
}

export function csvC01(filas: FilaC01[]): string {
  const encabezado = ["fecha_hora_arg", "fecha_hora_utc", "equipo", "temp_aire_c", "humedad_rel_pct", "bateria_pct", "bateria_mv", "control_calidad"];
  const cuerpo = filas.map((r) =>
    linea([fechaHoraArg(r.timestamp), new Date(r.timestamp).toISOString(), r.sensor_id, r.air_temp, r.humidity, r.battery_pct, r.battery_mv, qc(r.qc_flags)]),
  );
  return BOM + [encabezado.join(","), ...cuerpo].join("\r\n") + "\r\n";
}

/** "almendro-inicio_2026-09-01_2026-10-04.csv": sin acentos ni espacios. */
export function nombreArchivo(sitio: string, desde: number, hasta: number): string {
  const limpio =
    sitio
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "sitio";
  const dia = (t: number) => fechaHoraArg(t).slice(0, 10);
  return `${limpio}_${dia(desde)}_${dia(hasta)}.csv`;
}
