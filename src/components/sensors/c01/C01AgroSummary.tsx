import { useMemo, useState } from "react";
import { Snowflake, Flame, Sprout, CloudSnow, Info } from "lucide-react";

import type { ReadingC01 } from "../../../types/sensor";

import {
  DEFAULT_AGRO_THRESHOLDS,
  computeDailySummaries,
  computeChillingHours,
  computeHeatHours,
  computeGDD,
  computeFrostEvents,
  formatHoursDecimal,
} from "../../../lib/agroMetrics";

interface C01AgroSummaryProps {
  readings: ReadingC01[];
  periodLabel: string;
}

const formatDayLabel = (date: Date): string =>
  date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export default function C01AgroSummary({
  readings,
  periodLabel,
}: C01AgroSummaryProps) {
  /*
   * Únicos dos parámetros que tiene sentido dejar en manos del
   * usuario: el umbral de estrés térmico (varía mucho según
   * cultivo/hacienda) y la temperatura base de grados-día
   * (varía según especie). Las heladas y las horas de frío
   * usan criterios estándar fijos (INTA / modelo Weinberger).
   */

  const [heatThreshold, setHeatThreshold] = useState(
    DEFAULT_AGRO_THRESHOLDS.heatThreshold,
  );

  const [gddBase, setGddBase] = useState(DEFAULT_AGRO_THRESHOLDS.gddBase);

  const thresholds = useMemo(
    () => ({
      ...DEFAULT_AGRO_THRESHOLDS,
      heatThreshold,
      gddBase,
    }),
    [heatThreshold, gddBase],
  );

  const dailySummaries = useMemo(
    () => computeDailySummaries(readings),
    [readings],
  );

  const chillingHours = useMemo(
    () => computeChillingHours(readings, thresholds),
    [readings, thresholds],
  );

  const heatHours = useMemo(
    () => computeHeatHours(readings, thresholds),
    [readings, thresholds],
  );

  const gdd = useMemo(
    () => computeGDD(dailySummaries, thresholds.gddBase),
    [dailySummaries, thresholds.gddBase],
  );

  const frost = useMemo(
    () => computeFrostEvents(dailySummaries, thresholds),
    [dailySummaries, thresholds],
  );

  if (readings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Resumen agronómico del período
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            <span className="font-semibold text-blue-600">{periodLabel}</span>
            {" · Calculado sobre "}
            {dailySummaries.length}{" "}
            {dailySummaries.length === 1 ? "jornada" : "jornadas"} con datos.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Umbral calor (°C)
            </label>
            <input
              type="number"
              step={0.5}
              value={heatThreshold}
              onChange={(e) =>
                setHeatThreshold(
                  Number.isFinite(Number(e.target.value))
                    ? Number(e.target.value)
                    : heatThreshold,
                )
              }
              className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">
              Tbase grados-día (°C)
            </label>
            <input
              type="number"
              step={0.5}
              value={gddBase}
              onChange={(e) =>
                setGddBase(
                  Number.isFinite(Number(e.target.value))
                    ? Number(e.target.value)
                    : gddBase,
                )
              }
              className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* HORAS DE FRÍO */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <Snowflake size={14} className="text-sky-600" />
            <p className="text-xs font-bold text-sky-600">Horas de frío</p>
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {formatHoursDecimal(chillingHours)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Entre {thresholds.chillingLower}°C y {thresholds.chillingUpper}°C
            (modelo Weinberger)
          </p>
        </div>

        {/* HORAS DE CALOR */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <Flame size={14} className="text-orange-600" />
            <p className="text-xs font-bold text-orange-600">Horas de calor</p>
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {formatHoursDecimal(heatHours)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Por encima de {thresholds.heatThreshold}°C
          </p>
        </div>

        {/* GRADOS-DÍA */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <Sprout size={14} className="text-emerald-600" />
            <p className="text-xs font-bold text-emerald-600">
              Grados-día acumulados
            </p>
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {gdd.accumulated.toFixed(1)}
            <span className="text-xs font-normal text-slate-500 ml-1">
              GDD
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Base {thresholds.gddBase}°C · (Tmáx+Tmín)/2 − Tbase
          </p>
        </div>

        {/* HELADAS */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <CloudSnow size={14} className="text-indigo-600" />
            <p className="text-xs font-bold text-indigo-600">Heladas</p>
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {frost.agro.length}
            <span className="text-xs font-normal text-slate-500 ml-1">
              agrometeorológicas
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {frost.meteorological.length} meteorológicas (≤ 0°C) · agro
            {" "}
            &lt; {thresholds.frostAgro}°C
          </p>
        </div>
      </div>

      {frost.agro.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500 mr-1">
            Días con helada agrometeorológica:
          </span>
          {frost.agro.map((day) => (
            <span
              key={day.dateKey}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"
              title={`Tmín ${day.tmin.toFixed(1)}°C`}
            >
              {formatDayLabel(day.date)} · {day.tmin.toFixed(1)}°C
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-start gap-1.5 text-[11px] text-slate-400">
        <Info size={13} className="mt-0.5 flex-shrink-0" />
        <p>
          Estimaciones sobre temperatura de abrigo (altura del sensor), sin
          medición a nivel de suelo. La helada agrometeorológica es un
          indicador de riesgo, no una medición directa del daño al cultivo.
        </p>
      </div>
    </div>
  );
}