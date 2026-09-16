import { useMemo } from "react";
import { Thermometer } from "lucide-react";

import type { ReadingB01 } from "../../../types/sensor";
import {
  computeSoilDailySummaries,
  computeRecentAvgSoilTemp,
} from "../../../lib/soilTempMetrics";

interface B01SoilTempSummaryProps {
  readings: ReadingB01[];
  periodLabel: string;
}

export default function B01SoilTempSummary({
  readings,
  periodLabel,
}: B01SoilTempSummaryProps) {
  const dailySummaries = useMemo(
    () => computeSoilDailySummaries(readings),
    [readings],
  );

  const recentAvg = useMemo(
    () => computeRecentAvgSoilTemp(dailySummaries, 3),
    [dailySummaries],
  );

  const avgAmplitude = useMemo(() => {
    if (dailySummaries.length === 0) return null;
    const sum = dailySummaries.reduce(
      (acc, day) => acc + (day.tmax - day.tmin),
      0,
    );
    return sum / dailySummaries.length;
  }, [dailySummaries]);

  if (readings.length === 0) {
    return null;
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">
          Resumen agronómico · Temperatura de suelo
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          <span className="font-semibold text-blue-600">{periodLabel}</span>
          {" · Calculado sobre "}
          {dailySummaries.length}{" "}
          {dailySummaries.length === 1 ? "jornada" : "jornadas"} con datos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* PROMEDIO RECIENTE */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <Thermometer size={14} className="text-orange-600" />
            <p className="text-xs font-bold text-orange-600">
              Temperatura reciente
            </p>
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {recentAvg ? recentAvg.avg.toFixed(1) : "N/D"}
            <span className="text-xs font-normal text-slate-500 ml-1">°C</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Promedio de los últimos {recentAvg?.daysUsed ?? 0}{" "}
            {recentAvg?.daysUsed === 1 ? "día" : "días"}
          </p>
        </div>

        {/* AMPLITUD TÉRMICA */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5">
            <Thermometer size={14} className="text-indigo-600" />
            <p className="text-xs font-bold text-indigo-600">
              Amplitud térmica diaria
            </p>
          </div>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {avgAmplitude !== null ? avgAmplitude.toFixed(1) : "N/D"}
            <span className="text-xs font-normal text-slate-500 ml-1">
              °C promedio
            </span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {avgAmplitude !== null && avgAmplitude > 3
              ? "Oscilación alta: puede afectar la emergencia"
              : "Tmáx − Tmín de cada jornada"}
          </p>
        </div>
      </div>
    </div>
  );
}