import type { ReadingB01 } from "../types/sensor";

/*
 * ============================================================
 * MÉTRICAS DE TEMPERATURA DE SUELO (B01)
 * ------------------------------------------------------------
 * El B01 reporta una sola temperatura de suelo (no una por
 * electrodo), así que acá el enfoque es distinto al de
 * agroMetrics.ts (que trabaja con temperatura de aire del C01):
 * resumen diario (Tmáx/Tmín/Tmedia) y un promedio reciente
 * "estabilizado" de los últimos días.
 * ============================================================
 */

export interface DailySoilTempSummary {
  dateKey: string;
  date: Date;
  tmax: number;
  tmin: number;
  tavg: number;
  readingsCount: number;
}

const localDateKey = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const computeSoilDailySummaries = (
  readings: ReadingB01[],
): DailySoilTempSummary[] => {
  const byDay = new Map<
    string,
    { date: Date; tmax: number; tmin: number; sum: number; count: number }
  >();

  for (const reading of readings) {
    if (typeof reading.soil_temp !== "number" || !reading.timestamp) {
      continue;
    }

    const time = new Date(reading.timestamp).getTime();

    if (!Number.isFinite(time)) {
      continue;
    }

    const date = new Date(time);
    const key = localDateKey(date);

    const existing = byDay.get(key);

    if (!existing) {
      byDay.set(key, {
        date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
        tmax: reading.soil_temp,
        tmin: reading.soil_temp,
        sum: reading.soil_temp,
        count: 1,
      });
      continue;
    }

    existing.tmax = Math.max(existing.tmax, reading.soil_temp);
    existing.tmin = Math.min(existing.tmin, reading.soil_temp);
    existing.sum += reading.soil_temp;
    existing.count += 1;
  }

  return Array.from(byDay.entries())
    .map(([dateKey, value]) => ({
      dateKey,
      date: value.date,
      tmax: value.tmax,
      tmin: value.tmin,
      tavg: value.sum / value.count,
      readingsCount: value.count,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

/*
 * =========================================================
 * PROMEDIO RECIENTE
 * =========================================================
 * El criterio agronómico habitual pide una temperatura
 * "estabilizada" unos días seguidos, no una sola lectura
 * puntual. Acá se promedia la Tmedia diaria de los últimos N
 * días disponibles (3 por defecto) dentro del período elegido.
 */

export const computeRecentAvgSoilTemp = (
  dailySummaries: DailySoilTempSummary[],
  days: number = 3,
): { avg: number; daysUsed: number } | null => {
  if (dailySummaries.length === 0) {
    return null;
  }

  const recent = dailySummaries.slice(-days);
  const avg =
    recent.reduce((sum, day) => sum + day.tavg, 0) / recent.length;

  return { avg, daysUsed: recent.length };
};