import type {
  ReadingB01,
  DeviceElectrode,
} from "../../../types/sensor";

import type { B01Variable } from "./B01Panel";

import InteractiveLineChart from "../../charts/InteractiveLineChart";

interface B01SoilMoistureChartProps {
  data: ReadingB01[];
  electrodes: DeviceElectrode[];
  b01VarType: B01Variable;
  periodLabel: string;
}

export default function B01SoilMoistureChart({
  data,
  electrodes,
  b01VarType,
  periodLabel,
}: B01SoilMoistureChartProps) {
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

  const series = [1, 2, 3]
    .map((index) => {
      const electrode = electrodes.find(
        (el) => el.electrode_index === index
      );

      return {
        key: `e${index}_${b01VarType}`,
        name: electrode?.depth != null
          ? `E${index} · ${electrode.depth} cm`
          : `Electrodo ${index}`,
        stroke:
          index === 1
            ? "#2563eb"
            : index === 2
            ? "#16a34a"
            : "#ea580c",
        unit,
        decimals,
      };
    });

  return (
    <InteractiveLineChart
      data={data}
      title={`${variableName} del suelo`}
      periodLabel={periodLabel}
      height="22rem"
      series={series}
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
  );
}