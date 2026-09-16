import type { ReadingC01 } from "../types/sensor";

/*
 * ============================================================
 * MÉTRICAS AGRONÓMICAS DERIVADAS (temperatura del aire)
 * ------------------------------------------------------------
 * Todo lo que hay acá se calcula a partir de lecturas crudas
 * de temperatura (y opcionalmente humedad). Son aproximaciones
 * de uso agronómico estándar, pensadas para dar contexto sobre
 * el período que el usuario eligió en el dashboard — no
 * reemplazan una estación agrometeorológica oficial (que mide
 * además a 5 cm del suelo, dato que este sensor no releva).
 *
 * Fuentes de los criterios usados:
 * - Horas de frío: modelo Weinberger (horas con temperatura
 *   entre 0°C y 7.2°C), el más usado en fruticultura.
 * - Heladas: INTA / SMN — "helada meteorológica" es toda
 *   temperatura de abrigo (1.5 m) ≤ 0°C; "helada
 *   agrometeorológica" es temperatura de abrigo por debajo de
 *   los 3°C (asociada a valores cercanos a 0°C a nivel del
 *   suelo, donde ocurre el daño real al cultivo).
 * - Grados-día de crecimiento (GDD): método estándar
 *   (Tmax+Tmin)/2 - Tbase, con Tbase configurable porque varía
 *   mucho según el cultivo.
 * - "Horas de calor" no tiene un modelo único tan
 *   estandarizado como las horas de frío; acá se implementa
 *   como horas acumuladas por encima de un umbral de estrés
 *   térmico configurable.
 * ============================================================
 */

export interface DailyTempSummary {
  /** Clave YYYY-MM-DD en huso horario local */
  dateKey: string;
  /** Fecha de esa jornada (medianoche local) */
  date: Date;
  tmax: number;
  tmin: number;
  tmaxTime: number;
  tminTime: number;
  avgHumidity: number | null;
  readingsCount: number;
}

export interface AgroThresholds {
  /** Límite inferior de horas de frío (modelo Weinberger). Default 0°C. */
  chillingLower: number;
  /** Límite superior de horas de frío (modelo Weinberger). Default 7.2°C. */
  chillingUpper: number;
  /** Umbral desde el cual se cuenta como "hora de calor". Default 30°C. */
  heatThreshold: number;
  /** Temperatura base para grados-día de crecimiento. Default 10°C. */
  gddBase: number;
  /** Umbral de helada meteorológica (abrigo, 1.5 m). Default 0°C. */
  frostMeteorological: number;
  /** Umbral de helada agrometeorológica (abrigo, 1.5 m). Default 3°C. */
  frostAgro: number;
  /**
   * Brecha máxima entre dos lecturas consecutivas (en horas) que se
   * integra como continua. Si el sensor estuvo offline y hay un salto
   * más grande, ese tramo no se cuenta como horas de frío/calor para
   * no inflar el acumulado con datos faltantes.
   */
  maxGapHours: number;
}

export const DEFAULT_AGRO_THRESHOLDS: AgroThresholds = {
  chillingLower: 0,
  chillingUpper: 7.2,
  heatThreshold: 30,
  gddBase: 10,
  frostMeteorological: 0,
  frostAgro: 3,
  maxGapHours: 3,
};

const HOUR_MS = 60 * 60 * 1000;

const localDateKey = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/*
 * =========================================================
 * RESÚMENES DIARIOS (Tmax / Tmin / humedad media)
 * =========================================================
 */

export const computeDailySummaries = (
  readings: ReadingC01[],
): DailyTempSummary[] => {
  const byDay = new Map<
    string,
    {
      date: Date;
      tmax: number;
      tmin: number;
      tmaxTime: number;
      tminTime: number;
      humiditySum: number;
      humidityCount: number;
      readingsCount: number;
    }
  >();

  for (const reading of readings) {
    if (typeof reading.air_temp !== "number" || !reading.timestamp) {
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
        tmax: reading.air_temp,
        tmin: reading.air_temp,
        tmaxTime: time,
        tminTime: time,
        humiditySum:
          typeof reading.humidity === "number" ? reading.humidity : 0,
        humidityCount: typeof reading.humidity === "number" ? 1 : 0,
        readingsCount: 1,
      });

      continue;
    }

    existing.readingsCount += 1;

    if (reading.air_temp > existing.tmax) {
      existing.tmax = reading.air_temp;
      existing.tmaxTime = time;
    }

    if (reading.air_temp < existing.tmin) {
      existing.tmin = reading.air_temp;
      existing.tminTime = time;
    }

    if (typeof reading.humidity === "number") {
      existing.humiditySum += reading.humidity;
      existing.humidityCount += 1;
    }
  }

  return Array.from(byDay.entries())
    .map(([dateKey, value]) => ({
      dateKey,
      date: value.date,
      tmax: value.tmax,
      tmin: value.tmin,
      tmaxTime: value.tmaxTime,
      tminTime: value.tminTime,
      avgHumidity:
        value.humidityCount > 0
          ? value.humiditySum / value.humidityCount
          : null,
      readingsCount: value.readingsCount,
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

/*
 * =========================================================
 * INTEGRACIÓN TEMPORAL DENTRO DE UN RANGO DE TEMPERATURA
 * =========================================================
 * Recorre las lecturas ordenadas cronológicamente y, para
 * cada tramo entre dos lecturas consecutivas, aproxima la
 * temperatura del tramo como el promedio de sus dos extremos.
 * Si ese promedio cae dentro de [lower, upper] (o por encima
 * de `aboveThreshold`, según qué se pida), se suma la
 * duración completa del tramo.
 *
 * Es una aproximación —no resuelve el instante exacto en que
 * la recta cruza el umbral— pero es razonable para la
 * frecuencia de muestreo típica de estos sensores (minutos),
 * y es el mismo criterio práctico que usan la mayoría de las
 * planillas agroclimáticas basadas en registros discretos.
 */

const integrateHours = (
  readings: ReadingC01[],
  matches: (avgTemp: number) => boolean,
  maxGapHours: number,
): number => {
  const points = readings
    .filter(
      (r) => typeof r.air_temp === "number" && Boolean(r.timestamp),
    )
    .map((r) => ({
      time: new Date(r.timestamp).getTime(),
      temp: r.air_temp as number,
    }))
    .filter((p) => Number.isFinite(p.time))
    .sort((a, b) => a.time - b.time);

  let totalMs = 0;
  const maxGapMs = maxGapHours * HOUR_MS;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];

    const gapMs = b.time - a.time;

    if (gapMs <= 0 || gapMs > maxGapMs) {
      continue;
    }

    const avgTemp = (a.temp + b.temp) / 2;

    if (matches(avgTemp)) {
      totalMs += gapMs;
    }
  }

  return totalMs / HOUR_MS;
};

/** Horas de frío (modelo Weinberger): temperatura entre chillingLower y chillingUpper. */
export const computeChillingHours = (
  readings: ReadingC01[],
  thresholds: AgroThresholds = DEFAULT_AGRO_THRESHOLDS,
): number =>
  integrateHours(
    readings,
    (t) => t >= thresholds.chillingLower && t <= thresholds.chillingUpper,
    thresholds.maxGapHours,
  );

/** Horas de calor: temperatura por encima del umbral de estrés térmico. */
export const computeHeatHours = (
  readings: ReadingC01[],
  thresholds: AgroThresholds = DEFAULT_AGRO_THRESHOLDS,
): number =>
  integrateHours(
    readings,
    (t) => t >= thresholds.heatThreshold,
    thresholds.maxGapHours,
  );

/*
 * =========================================================
 * GRADOS-DÍA DE CRECIMIENTO (GDD)
 * =========================================================
 * GDD diario = max(0, (Tmax + Tmin) / 2 - Tbase)
 * Se calcula sobre los resúmenes diarios (uno por jornada
 * completa dentro del período).
 */

export interface DailyGDD {
  dateKey: string;
  date: Date;
  gdd: number;
}

export const computeGDD = (
  dailySummaries: DailyTempSummary[],
  gddBase: number = DEFAULT_AGRO_THRESHOLDS.gddBase,
): { daily: DailyGDD[]; accumulated: number } => {
  const daily = dailySummaries.map((day) => ({
    dateKey: day.dateKey,
    date: day.date,
    gdd: Math.max(0, (day.tmax + day.tmin) / 2 - gddBase),
  }));

  const accumulated = daily.reduce((sum, day) => sum + day.gdd, 0);

  return { daily, accumulated };
};

/*
 * =========================================================
 * HELADAS
 * =========================================================
 */

export interface FrostSummary {
  meteorological: DailyTempSummary[];
  agro: DailyTempSummary[];
}

export const computeFrostEvents = (
  dailySummaries: DailyTempSummary[],
  thresholds: AgroThresholds = DEFAULT_AGRO_THRESHOLDS,
): FrostSummary => {
  return {
    meteorological: dailySummaries.filter(
      (day) => day.tmin <= thresholds.frostMeteorological,
    ),
    agro: dailySummaries.filter((day) => day.tmin < thresholds.frostAgro),
  };
};

/*
 * =========================================================
 * FORMATO
 * =========================================================
 */

export const formatHoursDecimal = (hours: number): string => {
  if (!Number.isFinite(hours) || hours <= 0) {
    return "0 h";
  }

  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);

  if (minutes === 0) {
    return `${wholeHours} h`;
  }

  if (wholeHours === 0) {
    return `${minutes} min`;
  }

  return `${wholeHours} h ${minutes} min`;
};