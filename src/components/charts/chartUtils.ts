import { useEffect, useState } from "react";

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

/*
 * =========================================================
 * useIsMobile
 * =========================================================
 * Hook puramente de lectura de viewport. No cambia layout
 * por sí solo: cada componente decide qué props ajustar
 * cuando isMobile === true. En desktop (isMobile === false)
 * el comportamiento de los componentes que lo consumen
 * queda exactamente igual que antes.
 *
 * breakpoint por defecto: 640px (equivalente al "sm" de
 * Tailwind), pensado para teléfonos, no para tablets.
 */
export const useIsMobile = (breakpoint = 640): boolean => {
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.innerWidth < breakpoint
      : false
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia(
      `(max-width: ${breakpoint - 1}px)`
    );

    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [breakpoint]);

  return isMobile;
};