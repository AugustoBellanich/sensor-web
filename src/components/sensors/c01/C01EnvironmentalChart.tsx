import type { ReadingC01 } from "../../../types/sensor";

import InteractiveLineChart from "../../charts/InteractiveLineChart";

interface C01EnvironmentalChartProps {
  data: ReadingC01[];
  periodLabel: string;
}

export default function C01EnvironmentalChart({
  data,
  periodLabel,
}: C01EnvironmentalChartProps) {
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

    const unit =
      String(name).includes(
        "Humedad"
      )
        ? "%"
        : "°C";

    return [
      `${value.toFixed(
        1
      )} ${unit}`,
      name,
    ];
  };

  return (
    <InteractiveLineChart
      data={data}
      title="Variables ambientales"
      periodLabel={periodLabel}
      height="24rem"
      dualAxis
      series={[
        {
          key: "air_temp",
          name: "Temperatura del aire",
          stroke: "#dc2626",
          axisId: "left",
          unit: "°C",
          decimals: 1,
        },
        {
          key: "humidity",
          name: "Humedad relativa",
          stroke: "#2563eb",
          axisId: "right",
          unit: "%",
          decimals: 1,
        },
      ]}
      tooltipFormatter={
        tooltipFormatter
      }
    />
  );
}