export interface ChartSeries {
  key: string;
  name: string;
  label?: string;
  unit?: string;
  decimals?: number;
  axisId?: "left" | "right";
  stroke?: string;
  hidden?: boolean;
}

export interface InteractiveChartData {
  numericTime: number;
  [key: string]: any;
}

export interface ChartDomain {
  left: number | "dataMin";
  right: number | "dataMax";
}

export interface ChartTooltipProps {
  value: any;
  name: string;
  series?: ChartSeries;
}

export const formatChartValue = (
  value: any,
  series?: ChartSeries
): string => {
  if (typeof value !== "number") {
    return String(value ?? "N/D");
  }

  const decimals = series?.decimals ?? 1;
  const unit = series?.unit ?? "";

  return `${value.toFixed(decimals)}${
    unit ? ` ${unit}` : ""
  }`;
};

export const formatChartDate = (
  timestamp: number
): string => {
  return new Date(timestamp).toLocaleString(
    "es-AR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    }
  );
};

export const formatXAxisDate = (
  timestamp: number
) => {
  const date = new Date(timestamp);

  const day = date
    .getDate()
    .toString()
    .padStart(2, "0");

  const month = (
    date.getMonth() + 1
  )
    .toString()
    .padStart(2, "0");

  const hours = date
    .getHours()
    .toString()
    .padStart(2, "0");

  const minutes = date
    .getMinutes()
    .toString()
    .padStart(2, "0");

  return {
    day,
    month,
    hours,
    minutes,
  };
};

export const prepareChartData = <
  T extends { timestamp: string }
>(
  data: T[]
): (T & {
  numericTime: number;
})[] => {
  return data
    .filter(
      (item) =>
        item &&
        typeof item.timestamp === "string"
    )
    .map((item) => ({
      ...item,
      numericTime: new Date(
        item.timestamp
      ).getTime(),
    }))
    .filter((item) =>
      Number.isFinite(item.numericTime)
    )
    .sort(
      (a, b) =>
        a.numericTime - b.numericTime
    );
};