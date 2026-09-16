import type { DeviceElectrode } from "../types/sensor";

/*
 * ============================================================
 * REFERENCIAS DE SUELO POR ELECTRODO (PMP / CC / SAT)
 * ------------------------------------------------------------
 * Cada electrodo tiene, en `device_electrodes.points_json`, tres
 * puntos de calibración fijos:
 *
 * - PMP (Punto de Marchitez Permanente): por debajo de este
 *   valor la planta ya no puede extraer agua del suelo —
 *   estrés hídrico.
 * - CC (Capacidad de Campo): el suelo retiene toda el agua que
 *   puede sin drenar. Entre PMP y CC está el "agua disponible"
 *   para el cultivo — la zona de manejo normal.
 * - SAT (Saturación): todos los poros del suelo están llenos de
 *   agua; por encima de CC el excedente drena o genera riesgo
 *   de anegamiento.
 *
 * Estos tres puntos están calibrados para cada una de las tres
 * variables que reporta el sensor (hv, hg, mv). Para milivoltios
 * la escala viene invertida (más mV = suelo más seco), así que
 * las funciones de acá están escritas para no asumir un sentido
 * fijo: comparan contra los valores reales de cada punto, no
 * contra un orden esperado.
 * ============================================================
 */

export type SoilVariable = "hv" | "hg" | "mv";

export interface ElectrodePoint {
  id: string;
  type: string;
  mv: number;
  hv: number;
  hg: number;
  isFixed?: boolean;
  labelShort?: string;
  description?: string;
}

export interface ElectrodeReferences {
  pmp: number;
  cc: number;
  sat: number;
}

const findPoint = (
  points: ElectrodePoint[],
  type: string,
): ElectrodePoint | undefined =>
  points.find((p) => (p?.type || "").toUpperCase() === type);

/** Extrae PMP/CC/SAT del points_json de un electrodo para una variable dada. */
export const getElectrodeReferences = (
  electrode: DeviceElectrode | null | undefined,
  variable: SoilVariable,
): ElectrodeReferences | null => {
  if (!electrode || !Array.isArray(electrode.points_json)) {
    return null;
  }

  const points = electrode.points_json as ElectrodePoint[];

  const pmpPoint = findPoint(points, "PMP");
  const ccPoint = findPoint(points, "CC");
  const satPoint = findPoint(points, "SAT");

  if (!pmpPoint || !ccPoint || !satPoint) {
    return null;
  }

  const pmp = pmpPoint[variable];
  const cc = ccPoint[variable];
  const sat = satPoint[variable];

  if (
    typeof pmp !== "number" ||
    typeof cc !== "number" ||
    typeof sat !== "number" ||
    !Number.isFinite(pmp) ||
    !Number.isFinite(cc) ||
    !Number.isFinite(sat) ||
    sat === pmp
  ) {
    return null;
  }

  return { pmp, cc, sat };
};

/*
 * =========================================================
 * ESTADO HÍDRICO ACTUAL
 * =========================================================
 */

export interface WaterStatus {
  /**
   * Posición normalizada del valor actual dentro del rango
   * PMP(0) -> SAT(1). Puede caer fuera de [0,1] si el valor
   * excede el rango calibrado (por debajo de PMP o por encima
   * de SAT).
   */
  fraction: number;
  /** Posición (0-1) del punto CC dentro del rango PMP-SAT. */
  ccFraction: number;
  /** % de agua útil disponible: 0% = PMP, 100% = CC. Puede ser negativo o > 100. */
  availableWaterPercent: number;
  zone: "stress" | "available" | "excess";
  label: string;
  textColorClass: string;
  barColorClass: string;
}

export const computeWaterStatus = (
  value: number | null | undefined,
  refs: ElectrodeReferences,
): WaterStatus | null => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  const { pmp, cc, sat } = refs;

  const fraction = (value - pmp) / (sat - pmp);
  const ccFraction = (cc - pmp) / (sat - pmp);
  const availableWaterPercent =
    cc !== pmp ? ((value - pmp) / (cc - pmp)) * 100 : NaN;

  // La escala puede venir "al derecho" (hv/hg: PMP < CC < SAT) o
  // invertida (mv: PMP > CC > SAT). Comparamos contra los valores
  // reales de cada punto para que el criterio valga en los dos casos.
  const increasing = sat > pmp;

  const belowPmp = increasing ? value < pmp : value > pmp;
  const aboveSat = increasing ? value > sat : value < sat;
  const aboveCc = increasing ? value > cc : value < cc;

  if (belowPmp) {
    return {
      fraction,
      ccFraction,
      availableWaterPercent,
      zone: "stress",
      label: "Estrés hídrico (bajo punto de marchitez)",
      textColorClass: "text-red-600",
      barColorClass: "bg-red-500",
    };
  }

  if (aboveSat) {
    return {
      fraction,
      ccFraction,
      availableWaterPercent,
      zone: "excess",
      label: "Por encima de saturación",
      textColorClass: "text-indigo-600",
      barColorClass: "bg-indigo-500",
    };
  }

  if (aboveCc) {
    return {
      fraction,
      ccFraction,
      availableWaterPercent,
      zone: "excess",
      label: "Exceso hídrico (sobre capacidad de campo)",
      textColorClass: "text-blue-600",
      barColorClass: "bg-blue-500",
    };
  }

  return {
    fraction,
    ccFraction,
    availableWaterPercent,
    zone: "available",
    label: "Agua disponible",
    textColorClass: "text-emerald-600",
    barColorClass: "bg-emerald-500",
  };
};