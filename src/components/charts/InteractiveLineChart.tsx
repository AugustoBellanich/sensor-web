import { useMemo, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

import type { ChartSeries } from "./chartUtils";

import {
  prepareChartData,
  formatChartDate,
  formatChartValue,
  formatXAxisDate,
  useIsMobile,
} from "./chartUtils";

interface InteractiveLineChartProps {
  data?: any[];
  series?: ChartSeries[];
  lines?: ChartSeries[];

  title: string;
  periodLabel: string;

  height?: string;

  dualAxis?: boolean;

  emptyMessage?: string;

  tooltipFormatter?: (value: any, name: any) => [any, any];

  /**
   * Líneas horizontales de referencia (ej: umbrales agronómicos
   * fijos como punto de marchitez o capacidad de campo). Se
   * dibujan sobre el eje "left".
   */
  referenceLines?: {
    y: number;
    label?: string;
    color?: string;
    dash?: string;
  }[];
}

export default function InteractiveTimeChart({
  data = [],
  series = [],
  lines = [],
  title,
  periodLabel,
  height = "24rem",
  dualAxis = false,
  emptyMessage = "No hay mediciones para el período seleccionado.",
  tooltipFormatter,
  referenceLines = [],
}: InteractiveLineChartProps) {
  /*
   * =========================================================
   * RESPONSIVE (solo mobile — desktop no cambia)
   * =========================================================
   */

  const isMobile = useIsMobile();

  /*
   * =========================================================
   * DATOS
   * =========================================================
   */

  const safeData = Array.isArray(data) ? data : [];

  const safeSeries: ChartSeries[] =
    Array.isArray(series) && series.length > 0
      ? series
      : Array.isArray(lines)
        ? lines
        : [];

  /*
   * =========================================================
   * SERIES OCULTAS
   * =========================================================
   */

  const [hiddenSeries, setHiddenSeries] = useState<Record<string, boolean>>({});

  /*
   * =========================================================
   * PREPARAR DATOS
   * =========================================================
   */

  const chartData = useMemo(() => {
    return prepareChartData(safeData);
  }, [safeData]);

  /*
   * =========================================================
   * LÍMITES
   * =========================================================
   */

  const dataMin = chartData.length > 0 ? chartData[0].numericTime : Date.now();

  const dataMax =
    chartData.length > 0
      ? chartData[chartData.length - 1].numericTime
      : Date.now();

  /*
   * =========================================================
   * TICKS DEL EJE X
   * =========================================================
   */

  const visibleTicks = useMemo(() => {
    if (
      chartData.length === 0 ||
      !Number.isFinite(dataMin) ||
      !Number.isFinite(dataMax) ||
      dataMax <= dataMin
    ) {
      return [];
    }

    /*
     * Repartimos los ticks parejo en el TIEMPO (no por
     * índice de datos). Repartir por índice hacía que,
     * si las lecturas no están distribuidas parejo en el
     * período visible (por ejemplo, mucha más densidad de
     * datos en los últimos días), varios ticks cayeran
     * casi en el mismo instante y terminaran colapsando en
     * uno solo tras deduplicar. Como el eje es numérico con
     * scale="time", podemos ubicar un tick en cualquier
     * instante, exista o no un dato exacto ahí.
     *
     * En desktop dejamos ~8 etiquetas. En mobile, con menos
     * ancho disponible, bajamos a 4 para que las etiquetas
     * de dos líneas (hora + fecha) no se pisen entre sí.
     */

    const maxTicks = isMobile ? 4 : 8;

    if (maxTicks <= 1) {
      return [dataMin];
    }

    const step = (dataMax - dataMin) / (maxTicks - 1);

    return Array.from({ length: maxTicks }, (_, i) =>
      Math.round(dataMin + i * step),
    );
  }, [chartData.length, dataMin, dataMax, isMobile]);

  /*
   * =========================================================
   * LEYENDA
   * =========================================================
   */

  const handleLegendClick = (entry: any) => {
    const key = entry?.dataKey;

    if (!key) {
      return;
    }

    setHiddenSeries((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const renderLegendText = (value: string, entry: any) => {
    const key = entry?.dataKey;

    const isActive = !hiddenSeries[key];

    return (
      <span
        className="cursor-pointer select-none"
        style={{
          color: isActive ? "#334155" : "#94a3b8",
          textDecoration: isActive ? "none" : "line-through",
          transition: "all 0.2s ease",
          fontSize: isMobile ? 11 : undefined,
        }}
      >
        {value}
      </span>
    );
  };

  /*
   * =========================================================
   * EJE X
   * =========================================================
   */

  const CustomXAxisTick = ({ x, y, payload }: any) => {
    if (payload?.value === undefined) {
      return null;
    }

    const formatted = formatXAxisDate(Number(payload.value));

    const primaryFontSize = isMobile ? 10 : 11;
    const secondaryFontSize = isMobile ? 9 : 10;
    const secondaryDy = isMobile ? 22 : 26;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={12}
          textAnchor="middle"
          fill="#475569"
          fontSize={primaryFontSize}
          fontWeight="bold"
        >
          {`${formatted.hours}:${formatted.minutes}`}
        </text>

        <text
          x={0}
          y={0}
          dy={secondaryDy}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={secondaryFontSize}
        >
          {`${formatted.day}/${formatted.month}`}
        </text>
      </g>
    );
  };

  /*
   * =========================================================
   * TOOLTIP
   * =========================================================
   */

  const formatTooltip = (value: any, name: any, item: any) => {
    if (tooltipFormatter) {
      return tooltipFormatter(value, name);
    }

    const seriesConfig = safeSeries.find(
      (itemSeries) => itemSeries.key === item?.dataKey,
    );

    return [formatChartValue(value, seriesConfig), name];
  };

  /*
   * =========================================================
   * SIN DATOS
   * =========================================================
   */

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>

          <p className="text-xs text-slate-400 mt-1">
            <span className="font-semibold text-blue-600">{periodLabel}</span>
          </p>
        </div>

        <div
          className="flex items-center justify-center text-sm text-slate-400"
          style={{
            height,
          }}
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative [&_*:focus]:outline-none [&_*:focus-visible]:outline-none [&_svg]:outline-none">
      {/* HEADER */}

      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>

        <p className="text-xs text-slate-400 mt-1">
          <span className="font-semibold text-blue-600">{periodLabel}</span>
        </p>
      </div>

      {/* ÁREA DEL GRÁFICO */}

      <div
        className="relative w-full"
        style={{
          height,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 10,
              right: isMobile ? 8 : 15,
              left: 0,
              bottom: isMobile ? 24 : 20,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />

            {/* EJE X */}

            <XAxis
              dataKey="numericTime"
              type="number"
              scale="time"
              domain={["dataMin", "dataMax"]}
              ticks={visibleTicks}
              tick={<CustomXAxisTick />}
              minTickGap={40}
              height={45}
            />

            {/* EJES Y */}

            {dualAxis ? (
              <>
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#64748b"
                  fontSize={isMobile ? 10 : 11}
                  width={isMobile ? 32 : undefined}
                  tickFormatter={(value) =>
                    typeof value === "number" ? value.toFixed(1) : value
                  }
                />

                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#64748b"
                  fontSize={isMobile ? 10 : 11}
                  width={isMobile ? 32 : undefined}
                  tickFormatter={(value) =>
                    typeof value === "number" ? value.toFixed(1) : value
                  }
                />
              </>
            ) : (
              <YAxis
                yAxisId="left"
                stroke="#64748b"
                fontSize={isMobile ? 10 : 11}
                width={isMobile ? 32 : undefined}
                tickFormatter={(value) =>
                  typeof value === "number" ? value.toFixed(1) : value
                }
              />
            )}

            {/* TOOLTIP + CROSSHAIR */}
            {/*
             * El cursor es la línea vertical que marca, sobre
             * cada serie, el punto exacto donde cruza al pasar
             * el mouse o tocar la pantalla. `activeDot` en cada
             * <Line> es lo que dibuja el punto resaltado sobre
             * la línea en esa posición.
             */}

            <Tooltip
              labelFormatter={(label) => formatChartDate(Number(label))}
              formatter={formatTooltip}
              cursor={{
                stroke: "#94a3b8",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              isAnimationActive={false}
            />

            {/* LEYENDA */}

            {safeSeries.some((item) => Boolean(item.name)) && (
              <Legend
                verticalAlign="top"
                height={36}
                onClick={handleLegendClick}
                formatter={renderLegendText}
                iconSize={isMobile ? 8 : 10}
                wrapperStyle={
                  isMobile
                    ? { fontSize: 11, paddingBottom: 4 }
                    : undefined
                }
              />
            )}

            {/* LÍNEAS DE REFERENCIA */}

            {referenceLines.map((ref, index) => (
              <ReferenceLine
                key={`ref-${index}-${ref.y}`}
                yAxisId="left"
                y={ref.y}
                stroke={ref.color ?? "#94a3b8"}
                strokeDasharray={ref.dash ?? "4 3"}
                strokeWidth={1.25}
                ifOverflow="extendDomain"
                label={
                  ref.label
                    ? {
                        value: ref.label,
                        position: "insideTopRight",
                        fill: ref.color ?? "#94a3b8",
                        fontSize: isMobile ? 9 : 10,
                        fontWeight: 600,
                      }
                    : undefined
                }
              />
            ))}

            {/* SERIES */}

            {safeSeries.map((item) => (
              <Line
                key={item.key}
                yAxisId={dualAxis ? (item.axisId ?? "left") : "left"}
                type="monotone"
                dataKey={item.key}
                name={item.name}
                stroke={item.stroke ?? "#2563eb"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                hide={hiddenSeries[item.key] ?? item.hidden ?? false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}