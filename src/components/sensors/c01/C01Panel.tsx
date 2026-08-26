import {
  Clock3,
  CalendarDays,
} from "lucide-react";

import type { ReadingC01 } from "../../../types/sensor";

import C01EnvironmentalChart from "./C01EnvironmentalChart";

interface C01PanelProps {
  readings: ReadingC01[];
  latestReading: ReadingC01 | null;
  periodLabel: string;
}

export default function C01Panel({
  readings,
  latestReading,
  periodLabel,
}: C01PanelProps) {
  const formatLongDate = (
    isoString: string
  ) => {
    return new Date(
      isoString
    ).toLocaleString("es-AR", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  return (
    <div className="space-y-6 w-full text-left">
      {latestReading && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock3
                size={18}
                className="text-blue-600"
              />

              <h3 className="text-sm font-bold text-slate-800">
                Última medición disponible
              </h3>
            </div>

            <span className="text-xs text-slate-500">
              {formatLongDate(
                latestReading.timestamp
              )}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-sm font-bold text-red-600">
                Temperatura del aire
              </p>

              <p className="text-lg font-bold text-slate-800 mt-1">
                {latestReading.air_temp !==
                null
                  ? latestReading.air_temp.toFixed(
                      1
                    )
                  : "N/D"}

                <span className="text-xs font-normal text-slate-500 ml-1">
                  °C
                </span>
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-sm font-bold text-blue-600">
                Humedad relativa
              </p>

              <p className="text-lg font-bold text-slate-800 mt-1">
                {latestReading.humidity !==
                null
                  ? latestReading.humidity.toFixed(
                      1
                    )
                  : "N/D"}

                <span className="text-xs font-normal text-slate-500 ml-1">
                  %
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <CalendarDays
            size={18}
            className="text-blue-600"
          />

          <h3 className="text-sm font-bold text-slate-800">
            Histórico de mediciones
          </h3>
        </div>

        <p className="text-xs text-slate-500">
          Representación gráfica de la evolución ambiental.
        </p>
      </div>

      <C01EnvironmentalChart
        data={readings}
        periodLabel={periodLabel}
      />
    </div>
  );
}