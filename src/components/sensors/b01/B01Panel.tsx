import { useState } from "react";
import {
  Clock3,
  CalendarDays,
} from "lucide-react";

import type {
  ReadingB01,
  DeviceElectrode,
} from "../../../types/sensor";

import ElectrodeConfiguration from "./ElectrodeConfiguration";
import B01SoilMoistureChart from "./B01SoilMoistureChart";
import B01SoilTemperatureChart from "./B01SoilTemperatureChart";

interface B01PanelProps {
  readings: ReadingB01[];
  latestReading: ReadingB01 | null;
  electrodes: DeviceElectrode[];
  periodLabel: string;
}

export type B01Variable =
  | "hv"
  | "hg"
  | "mv";

export default function B01Panel({
  readings,
  latestReading,
  electrodes,
  periodLabel,
}: B01PanelProps) {
  const [varType, setVarType] =
    useState<B01Variable>("hv");

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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3].map((index) => {
              const key =
                `e${index}_${varType}` as keyof ReadingB01;

              const value =
                latestReading[key];

              const electrode =
                electrodes.find(
                  (el) =>
                    el.electrode_index ===
                    index
                );

              return (
                <div
                  key={index}
                  className="bg-slate-50 border border-slate-100 rounded-xl p-3"
                >
                  <p className="text-xs font-bold text-blue-600">
                    E{index}
                  </p>

                  <p className="text-lg font-bold text-slate-800 mt-1">
                    {typeof value ===
                    "number"
                      ? value.toFixed(
                          varType ===
                            "mv"
                            ? 0
                            : 1
                        )
                      : "N/D"}

                    <span className="text-xs font-normal text-slate-500 ml-1">
                      {varType ===
                      "mv"
                        ? "mV"
                        : "%"}
                    </span>
                  </p>

                  <p className="text-[11px] text-slate-500 mt-1">
                    {electrode?.depth !==
                      null &&
                    electrode?.depth !==
                      undefined
                      ? `${electrode.depth} cm`
                      : "Profundidad N/D"}

                    {electrode?.texture
                      ? ` · ${electrode.texture}`
                      : ""}
                  </p>
                </div>
              );
            })}

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
              <p className="text-xs font-bold text-slate-500">
                Temperatura
              </p>

              <p className="text-lg font-bold text-slate-800 mt-1">
                {latestReading.soil_temp !==
                null
                  ? latestReading.soil_temp.toFixed(
                      1
                    )
                  : "N/D"}

                <span className="text-xs font-normal text-slate-500 ml-1">
                  °C
                </span>
              </p>

              <p className="text-[11px] text-slate-500 mt-1">
                Suelo
              </p>
            </div>
          </div>
        </div>
      )}

      <ElectrodeConfiguration
        electrodes={electrodes}
      />

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays
            size={18}
            className="text-blue-600"
          />

          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Histórico de mediciones
            </h3>

            <p className="text-xs text-slate-400">
              {periodLabel}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setVarType("hv")
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              varType === "hv"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Volumétrica (% HV)
          </button>

          <button
            type="button"
            onClick={() =>
              setVarType("hg")
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              varType === "hg"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Gravimétrica (% HG)
          </button>

          <button
            type="button"
            onClick={() =>
              setVarType("mv")
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              varType === "mv"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            Milivoltios (mV)
          </button>
        </div>
      </div>

      <B01SoilMoistureChart
        data={readings}
        electrodes={electrodes}
        b01VarType={varType}
        periodLabel={periodLabel}
      />

      <B01SoilTemperatureChart
        data={readings}
        periodLabel={periodLabel}
      />
    </div>
  );
}