// Copiado de sensor-app/src/datos/csv.ts (misma lógica en app y web, D-83). Cambiar en los dos.
// Archivo CSV de las lecturas de un sitio (funciones puras, se prueban con jest).
// Formato pensado para análisis (R, Python, planilla): coma como separador, punto decimal,
// una fila por lectura, mV crudos tal como llegaron y los valores calculados al lado.
// Lleva BOM para que la planilla reconozca los acentos.
import { fechaHoraArg } from "./grafico";
import type { Celda, Hoja } from "./planilla";

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

export function csvB01(
  filas: FilaB01[],
  profundidades: Record<number, number | null> = {},
): string {
  const prof = (i: number) =>
    profundidades[i] != null ? `_${profundidades[i]}cm` : "";
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
  const encabezado = [
    "fecha_hora_arg",
    "fecha_hora_utc",
    "equipo",
    "temp_aire_c",
    "humedad_rel_pct",
    "bateria_pct",
    "bateria_mv",
    "control_calidad",
  ];
  const cuerpo = filas.map((r) =>
    linea([
      fechaHoraArg(r.timestamp),
      new Date(r.timestamp).toISOString(),
      r.sensor_id,
      r.air_temp,
      r.humidity,
      r.battery_pct,
      r.battery_mv,
      qc(r.qc_flags),
    ]),
  );
  return BOM + [encabezado.join(","), ...cuerpo].join("\r\n") + "\r\n";
}

/** "almendro-inicio_2026-09-01_2026-10-04.csv": sin acentos ni espacios. */
export function nombreArchivo(
  sitio: string,
  desde: number,
  hasta: number,
): string {
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

// ---------------------------------------------------------------- planilla (.xlsx, solo web por ahora)

type DatosSitio = {
  name: string;
  establishment_name: string | null;
  plot_name: string | null;
  device: { id: string } | null;
  electrodes: {
    index: number;
    depth: number | null;
    texture?: string | null;
    calibrated?: boolean;
  }[];
};

/**
 * Hojas de la planilla: "Lecturas" (una fila por lectura, fecha como fecha, mV crudos y los valores
 * calculados al lado) e "Información" (de dónde salen los datos y qué es cada columna).
 */
export function hojasLecturas(
  info: DatosSitio,
  familia: "B01" | "C01",
  b01: FilaB01[],
  c01: FilaC01[],
  profundidades: Record<number, number | null>,
  desde: number,
  hasta: number,
  ahora: Date = new Date(),
): Hoja[] {
  const e = (i: number) =>
    profundidades[i] != null ? `E${i} ${profundidades[i]} cm` : `E${i}`;
  const fecha = (t: string) => new Date(t);
  let lecturas: Hoja;
  if (familia === "B01") {
    lecturas = {
      nombre: "Lecturas",
      columnas: [
        "Fecha y hora (Argentina)",
        "Equipo",
        ...[1, 2, 3].map((i) => `${e(i)} señal (mV)`),
        ...[1, 2, 3].map((i) => `${e(i)} humedad (% vol)`),
        ...[1, 2, 3].map((i) => `${e(i)} humedad (% grav)`),
        "Temperatura del suelo (°C)",
        "Batería (%)",
        "Batería (mV)",
        "Control de calidad",
      ],
      anchos: [18, 12],
      filas: b01.map((r): Celda[] => [
        fecha(r.timestamp),
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
        qc(r.qc_flags) || null,
      ]),
    };
  } else {
    lecturas = {
      nombre: "Lecturas",
      columnas: [
        "Fecha y hora (Argentina)",
        "Equipo",
        "Temperatura del aire (°C)",
        "Humedad relativa (%)",
        "Batería (%)",
        "Batería (mV)",
        "Control de calidad",
      ],
      anchos: [18, 12],
      filas: c01.map((r): Celda[] => [
        fecha(r.timestamp),
        r.sensor_id,
        r.air_temp,
        r.humidity,
        r.battery_pct,
        r.battery_mv,
        qc(r.qc_flags) || null,
      ]),
    };
  }
  const dia = (t: number) =>
    fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
  const textura = info.electrodes.find((x) => x.texture)?.texture ?? null;
  const filasInfo: Celda[][] = [
    ["Sitio", info.name],
    ["Campo", info.establishment_name],
    ["Lote", info.plot_name],
    ["Equipo actual", info.device?.id ?? null],
    ["Período", `${dia(desde)} al ${dia(hasta)}`],
    ["Lecturas", lecturas.filas.length],
    ["Generado", ahora],
    ["Fuente", "PROYECTO SENSOR, Laboratorio AGTECH, INTA EEA Catamarca"],
    [null, null],
    [
      "Horario",
      "Hora de Argentina (UTC−3). Una fila por lectura, sin promediar.",
    ],
  ];
  if (familia === "B01") {
    filasInfo.push(
      ["Profundidades", [1, 2, 3].map((i) => e(i)).join(", ")],
      [
        "Suelo",
        textura
          ? `${textura}${info.electrodes.some((x) => x.calibrated) ? ", calibrado" : ""}`
          : info.electrodes.some((x) => x.calibrated)
            ? "Calibrado"
            : "Sin calibración",
      ],
      [
        "Señal (mV)",
        "Dato crudo del sensor, tal como llegó. Más mV = suelo más seco.",
      ],
      [
        "Humedad (% vol)",
        "Calculada con la calibración del sitio vigente en cada momento. Vacía si no había calibración.",
      ],
      [
        "Humedad (% grav)",
        "Calculada con la densidad aparente cargada en el suelo de cada electrodo.",
      ],
    );
  }
  filasInfo.push([
    "Control de calidad",
    "Marcas de la base sobre la lectura (vacío = sin observaciones).",
  ]);
  return [
    lecturas,
    {
      nombre: "Información",
      columnas: ["Dato", "Valor"],
      anchos: [22, 70],
      filas: filasInfo,
    },
  ];
}
