import { useMemo, useState } from "react";

import type {
  ReadingB01,
  DeviceElectrode,
} from "../../../types/sensor";

import type { B01Variable } from "./B01Panel";

import InteractiveLineChart from "../../charts/InteractiveLineChart";
import { getElectrodeReferences } from "../../../lib/soilReferences";

interface B01SoilMoistureChartProps {
  data: ReadingB01[];
  electrodes: DeviceElectrode[];
  b01VarType: B01Variable;
  periodLabel: string;
}

const ELECTRODE_COLORS: Record<number, string> = {
  1: "#2563eb",
  2: "#16a34a",
  3: "#ea580c",
};

export default function B01SoilMoistureChart({
  data,
  electrodes,
  b01VarType,
  periodLabel,
}: B01SoilMoistureChartProps) {
  const [showReferences, setShowReferences] = useState(true);

  const getUnit = () => {
    switch (b01VarType) {
      case "mv":
        return "mV";
      case "hg":
        return "%";
      case "hv":
      default:
        return "%";
    }
  };

  const getDecimals = () => {
    return b01VarType === "mv" ? 0 : 1;
  };

  const getName = () => {
    switch (b01VarType) {
      case "mv":
        return "Milivoltios";
      case "hg":
        return "Humedad gravimétrica";
      case "hv":
      default:
        return "Humedad volumétrica";
    }
  };

  const unit = getUnit();
  const decimals = getDecimals();
  const variableName = getName();

  const series = [1, 2, 3].map((index) => {
    const electrode = electrodes.find(
      (el) => el.electrode_index === index,
    );

    return {
      key: `e${index}_${b01VarType}`,
      name: electrode?.depth != null
        ? `E${index} · ${electrode.depth} cm`
        : `Electrodo ${index}`,
      stroke: ELECTRODE_COLORS[index],
      unit,
      decimals,
    };
  });

  /*
   * =========================================================
   * LÍNEAS DE REFERENCIA (PMP / CC por electrodo)
   * =========================================================
   * Se calculan con los puntos de calibración de cada electrodo
   * (device_electrodes.points_json) para la variable que se
   * está graficando. Dejamos afuera SAT a propósito: PMP y CC
   * son los dos umbrales que de verdad importan para decidir
   * si hay que regar o no; agregar un tercero por electrodo
   * satura el gráfico con 3 electrodos a la vez.
   */

  const referenceLines = useMemo(() => {
    if (!showReferences) {
      return [];
    }

    return [1, 2, 3].flatMap((index) => {
      const electrode = electrodes.find(
        (el) => el.electrode_index === index,
      );

      const refs = getElectrodeReferences(electrode, b01VarType);

      if (!refs) {
        return [];
      }

      const color = ELECTRODE_COLORS[index];

      return [
        {
          y: refs.pmp,
          label: `PMP E${index}`,
          color,
          dash: "2 3",
        },
        {
          y: refs.cc,
          label: `CC E${index}`,
          color,
          dash: "5 3",
        },
      ];
    });
  }, [showReferences, electrodes, b01VarType]);

  const hasAnyReference = [1, 2, 3].some((index) =>
    getElectrodeReferences(
      electrodes.find((el) => el.electrode_index === index),
      b01VarType,
    ),
  );

  return (
    <div className="space-y-2">
      {hasAnyReference && (
        <div className="flex items-center justify-end px-1">
          <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showReferences}
              onChange={(e) => setShowReferences(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Mostrar referencias de suelo (PMP / CC)
          </label>
        </div>
      )}

      <InteractiveLineChart
        data={data}
        title={`${variableName} del suelo`}
        periodLabel={periodLabel}
        height="22rem"
        series={series}
        referenceLines={referenceLines}
        tooltipFormatter={(
          value: any,
          name: any
        ): [any, any] => {
          if (typeof value !== "number") {
            return [value, name];
          }

          return [
            `${value.toFixed(decimals)} ${unit}`,
            name,
          ];
        }}
      />
    </div>
  );
}