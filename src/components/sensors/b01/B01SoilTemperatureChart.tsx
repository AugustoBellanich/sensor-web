import type { ReadingB01 } from "../../../types/sensor";

import InteractiveLineChart from "../../charts/InteractiveLineChart";

interface B01SoilTemperatureChartProps {
  data: ReadingB01[];
  periodLabel: string;
}

export default function B01SoilTemperatureChart({
  data,
  periodLabel,
}: B01SoilTemperatureChartProps) {
  const tooltipFormatter = (
    value: any,
    name: any
  ): [any, any] => {
    if (
      typeof value !== "number"
    ) {
      return [
        value,
        name,
      ];
    }

    return [
      `${value.toFixed(1)} °C`,
      "Temperatura del suelo",
    ];
  };

  return (
    <InteractiveLineChart
      data={data}
      title="Temperatura del suelo"
      periodLabel={periodLabel}
      height="22rem"
      series={[
        {
          key: "soil_temp",
          name: "Temperatura del suelo",
          stroke: "#dc2626",
          unit: "°C",
          decimals: 1,
        },
      ]}
      tooltipFormatter={
        tooltipFormatter
      }
    />
  );
}