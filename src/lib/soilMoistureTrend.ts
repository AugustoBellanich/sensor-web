import type { ReadingB01 } from "../types/sensor";
import type { SoilVariable } from "./soilReferences";

/*
 * ============================================================
 * TENDENCIA DE HUMEDAD (últimas 6 horas)
 * ------------------------------------------------------------
 * Compara el valor actual de cada electrodo contra el valor
 * más cercano a "hace 6 horas" dentro de las lecturas ya
 * cargadas (las del período elegido en el dashboard). Si no
 * hay una lectura razonablemente cercana a ese horario (por
 * ejemplo, porque el período elegido no llega a cubrir 6
 * horas de historia, o el sensor estuvo offline en ese tramo),
 * no se calcula tendencia — mejor no mostrar nada a mostrar un
 * dato engañoso.
 *
 * "wetting"/"drying" tienen en cuenta que en mV la escala viene
 * invertida (más mV = más seco), a diferencia de hv/hg donde
 * más valor = más húmedo.
 * ============================================================
 */

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
/** Margen de búsqueda alrededor de "hace 6 horas" para tolerar huecos de muestreo. */
const LOOKUP_TOLERANCE_MS = 2 * 60 * 60 * 1000;

/*
 * Cambio mínimo para considerarlo una tendencia real y no ruido
 * del sensor: en hv/hg (puntos porcentuales) y en mV.
 */
const NEUTRAL_THRESHOLD: Record<SoilVariable, number> = {
  hv: 0.3,
  hg: 0.3,
  mv: 5,
};

export interface MoistureTrend {
  direction: "wetting" | "drying" | "stable";
  /** Diferencia en la escala cruda de la variable (actual - pasado). */
  delta: number;
  pastTimestamp: string;
}

const findClosestReading = (
  readings: ReadingB01[],
  targetTime: number,
  toleranceMs: number,
): ReadingB01 | null => {
  let best: { reading: ReadingB01; diff: number } | null = null;

  for (const r of readings) {
    const t = new Date(r.timestamp).getTime();

    if (!Number.isFinite(t)) {
      continue;
    }

    const diff = Math.abs(t - targetTime);

    if (!best || diff < best.diff) {
      best = { reading: r, diff };
    }
  }

  return best && best.diff <= toleranceMs ? best.reading : null;
};

export const computeMoistureTrend = (
  readings: ReadingB01[],
  electrodeIndex: number,
  variable: SoilVariable,
  currentValue: number | null | undefined,
  currentTimestamp: string | null | undefined,
): MoistureTrend | null => {
  if (
    typeof currentValue !== "number" ||
    !Number.isFinite(currentValue) ||
    !currentTimestamp
  ) {
    return null;
  }

  const currentTime = new Date(currentTimestamp).getTime();

  if (!Number.isFinite(currentTime)) {
    return null;
  }

  const targetTime = currentTime - SIX_HOURS_MS;
  const pastReading = findClosestReading(
    readings,
    targetTime,
    LOOKUP_TOLERANCE_MS,
  );

  if (!pastReading) {
    return null;
  }

  const key = `e${electrodeIndex}_${variable}` as keyof ReadingB01;
  const pastValue = pastReading[key];

  if (typeof pastValue !== "number" || !Number.isFinite(pastValue)) {
    return null;
  }

  const rawDelta = currentValue - pastValue;
  const wettingDelta = variable === "mv" ? -rawDelta : rawDelta;
  const threshold = NEUTRAL_THRESHOLD[variable];

  let direction: MoistureTrend["direction"] = "stable";

  if (wettingDelta > threshold) {
    direction = "wetting";
  } else if (wettingDelta < -threshold) {
    direction = "drying";
  }

  return {
    direction,
    delta: rawDelta,
    pastTimestamp: pastReading.timestamp,
  };
};