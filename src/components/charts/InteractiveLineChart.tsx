import { useEffect, useMemo, useRef, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
   * ZOOM
   * =========================================================
   */

  const [zoomLeft, setZoomLeft] = useState<number | "dataMin">("dataMin");

  const [zoomRight, setZoomRight] = useState<number | "dataMax">("dataMax");

  /*
   * =========================================================
   * SELECCIÓN
   * =========================================================
   */

  const [selectionStart, setSelectionStart] = useState<number | null>(null);

  const [selectionEnd, setSelectionEnd] = useState<number | null>(null);

  const [isSelecting, setIsSelecting] = useState(false);

  /*
   * =========================================================
   * REFERENCIA AL ÁREA DEL GRÁFICO
   * =========================================================
   */

  const chartContainerRef = useRef<HTMLDivElement | null>(null);

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
   * RESET CUANDO CAMBIA EL RANGO REAL
   * =========================================================
   */

  useEffect(() => {
    setZoomLeft("dataMin");
    setZoomRight("dataMax");

    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  }, [dataMin, dataMax]);

  /*
   * =========================================================
   * DOMINIO VISIBLE
   * =========================================================
   */

  const visibleMin = zoomLeft === "dataMin" ? dataMin : zoomLeft;

  const visibleMax = zoomRight === "dataMax" ? dataMax : zoomRight;

  const visibleTicks = useMemo(() => {
    if (
      chartData.length === 0 ||
      !Number.isFinite(visibleMin) ||
      !Number.isFinite(visibleMax) ||
      visibleMax <= visibleMin
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
     * uno solo tras deduplicar — eso es lo que se veía en
     * mobile. Como el eje es numérico con scale="time",
     * podemos ubicar un tick en cualquier instante, exista
     * o no un dato exacto ahí.
     *
     * En desktop dejamos ~8 etiquetas. En mobile, con menos
     * ancho disponible, bajamos a 4 para que las etiquetas
     * de dos líneas (hora + fecha) no se pisen entre sí.
     */

    const maxTicks = isMobile ? 4 : 8;

    if (maxTicks <= 1) {
      return [visibleMin];
    }

    const step = (visibleMax - visibleMin) / (maxTicks - 1);

    return Array.from({ length: maxTicks }, (_, i) =>
      Math.round(visibleMin + i * step),
    );
  }, [chartData.length, visibleMin, visibleMax, isMobile]);

  /*
   * =========================================================
   * CONVERTIR POSICIÓN X -> TIMESTAMP
   * =========================================================
   */

  const getTimestampFromClientX = (clientX: number): number | null => {
    const container = chartContainerRef.current;

    if (!container) {
      return null;
    }

    const rect = container.getBoundingClientRect();

    if (rect.width <= 0) {
      return null;
    }

    /*
     * Posición horizontal relativa
     * al contenedor.
     */

    let x = clientX - rect.left;

    /*
     * Limitamos la posición al área
     * del contenedor.
     */

    x = Math.max(0, Math.min(x, rect.width));

    /*
     * Convertimos X -> porcentaje.
     */

    const ratio = x / rect.width;

    /*
     * Convertimos porcentaje -> timestamp.
     */

    const timestamp = visibleMin + ratio * (visibleMax - visibleMin);

    if (!Number.isFinite(timestamp)) {
      return null;
    }

    return timestamp;
  };

  const getTimestampFromMouseEvent = (
    event: React.MouseEvent<HTMLDivElement>,
  ): number | null => getTimestampFromClientX(event.clientX);

  const getTimestampFromTouchEvent = (
    event: React.TouchEvent<HTMLDivElement>,
  ): number | null => {
    const touch = event.touches[0] ?? event.changedTouches[0];

    if (!touch) {
      return null;
    }

    return getTimestampFromClientX(touch.clientX);
  };

  /*
   * =========================================================
   * MOUSE DOWN
   * =========================================================
   */

  const handleSelectionMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    /*
     * Solo botón izquierdo.
     */

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const timestamp = getTimestampFromMouseEvent(event);

    if (timestamp === null) {
      return;
    }

    setSelectionStart(timestamp);
    setSelectionEnd(timestamp);
    setIsSelecting(true);
  };

  /*
   * =========================================================
   * MOUSE MOVE
   * =========================================================
   */

  const handleSelectionMouseMove = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (!isSelecting) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const timestamp = getTimestampFromMouseEvent(event);

    if (timestamp === null) {
      return;
    }

    setSelectionEnd(timestamp);
  };

  /*
   * =========================================================
   * CIERRE DE SELECCIÓN (compartido por mouse y touch)
   * =========================================================
   */

  const finishSelectionAt = (endTimestamp: number | null) => {
    if (!isSelecting) {
      return;
    }

    if (selectionStart === null || endTimestamp === null) {
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
      return;
    }

    const left = Math.min(selectionStart, endTimestamp);

    const right = Math.max(selectionStart, endTimestamp);

    /*
     * Evitamos clics/toques simples.
     *
     * 1 segundo mínimo.
     */

    if (right - left < 1000) {
      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
      return;
    }

    /*
     * Aplicamos zoom.
     */

    setZoomLeft(left);
    setZoomRight(right);

    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  };

  /*
   * =========================================================
   * MOUSE UP
   * =========================================================
   */

  const finishSelection = (event?: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting) {
      return;
    }

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const endTimestamp = event
      ? getTimestampFromMouseEvent(event)
      : selectionEnd;

    finishSelectionAt(endTimestamp);
  };

  /*
   * =========================================================
   * TOUCH START / MOVE / END
   * =========================================================
   * Mismos gestos que con mouse, pero para dedo. No usamos
   * preventDefault en touchstart/touchmove (React los trata
   * como listeners pasivos y tira warning); en cambio, el
   * overlay tiene `touch-action: none` en CSS para evitar
   * que la página haga scroll mientras se arrastra.
   */

  const handleSelectionTouchStart = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    const timestamp = getTimestampFromTouchEvent(event);

    if (timestamp === null) {
      return;
    }

    setSelectionStart(timestamp);
    setSelectionEnd(timestamp);
    setIsSelecting(true);
  };

  const handleSelectionTouchMove = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    if (!isSelecting) {
      return;
    }

    const timestamp = getTimestampFromTouchEvent(event);

    if (timestamp === null) {
      return;
    }

    setSelectionEnd(timestamp);
  };

  const finishTouchSelection = (
    event?: React.TouchEvent<HTMLDivElement>,
  ) => {
    const endTimestamp = event
      ? getTimestampFromTouchEvent(event)
      : selectionEnd;

    finishSelectionAt(endTimestamp);
  };

  /*
   * =========================================================
   * MOUSE UP GLOBAL
   * =========================================================
   */

  useEffect(() => {
    if (!isSelecting) {
      return;
    }

    const handleWindowMouseUp = () => {
      if (selectionStart === null || selectionEnd === null) {
        setIsSelecting(false);
        return;
      }

      const left = Math.min(selectionStart, selectionEnd);

      const right = Math.max(selectionStart, selectionEnd);

      if (right - left >= 1000) {
        setZoomLeft(left);
        setZoomRight(right);
      }

      setSelectionStart(null);
      setSelectionEnd(null);
      setIsSelecting(false);
    };

    window.addEventListener("mouseup", handleWindowMouseUp);
    window.addEventListener("touchend", handleWindowMouseUp);
    window.addEventListener("touchcancel", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mouseup", handleWindowMouseUp);
      window.removeEventListener("touchend", handleWindowMouseUp);
      window.removeEventListener("touchcancel", handleWindowMouseUp);
    };
  }, [isSelecting, selectionStart, selectionEnd]);

  /*
   * =========================================================
   * RESTAURAR ZOOM
   * =========================================================
   */

  const zoomOut = () => {
    setZoomLeft("dataMin");
    setZoomRight("dataMax");

    setSelectionStart(null);
    setSelectionEnd(null);
    setIsSelecting(false);
  };

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
   * SELECCIÓN VISUAL
   * =========================================================
   */

  const selectionLeft =
    selectionStart !== null && selectionEnd !== null
      ? Math.min(selectionStart, selectionEnd)
      : null;

  const selectionRight =
    selectionStart !== null && selectionEnd !== null
      ? Math.max(selectionStart, selectionEnd)
      : null;

  /*
   * Convertimos la selección
   * temporal a porcentaje visual.
   */

  const selectionLeftPercent =
    selectionLeft !== null && visibleMax > visibleMin
      ? ((selectionLeft - visibleMin) / (visibleMax - visibleMin)) * 100
      : null;

  const selectionWidthPercent =
    selectionLeft !== null && selectionRight !== null && visibleMax > visibleMin
      ? ((selectionRight - selectionLeft) / (visibleMax - visibleMin)) * 100
      : null;

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div
      className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative [&_*:focus]:outline-none [&_*:focus-visible]:outline-none [&_svg]:outline-none"
      style={{
        WebkitTapHighlightColor: "transparent",
        WebkitTouchCallout: "none",
      }}
    >
      {/* HEADER */}

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>

          <p className="text-xs text-slate-400 mt-1">
            <span className="font-semibold text-blue-600">{periodLabel}</span>

            {" · Seleccioná y arrastrá sobre el gráfico para ampliar."}
          </p>
        </div>

        {zoomLeft !== "dataMin" && (
          <button
            type="button"
            onClick={zoomOut}
            className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
          >
            Restaurar Zoom
          </button>
        )}
      </div>

      {/* ÁREA DEL GRÁFICO */}

      <div
        ref={chartContainerRef}
        className="relative w-full select-none"
        style={{
          height,
          userSelect: "none",
          WebkitUserSelect: "none",
        }}
      >
        {/* RECHARTS */}

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
              domain={[visibleMin, visibleMax]}
              ticks={visibleTicks}
              tick={<CustomXAxisTick />}
              minTickGap={40}
              height={45}
              allowDataOverflow
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

            {/* TOOLTIP */}

            <Tooltip
              labelFormatter={(label) => formatChartDate(Number(label))}
              formatter={formatTooltip}
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
                hide={hiddenSeries[item.key] ?? item.hidden ?? false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* =================================================
            OVERLAY DE SELECCIÓN
            ================================================= */}

        <div
          className="absolute left-0 right-0 z-10"
          style={{
            top: "46px",
            bottom: "65px",
            cursor: isSelecting ? "col-resize" : "crosshair",
            userSelect: "none",
            WebkitUserSelect: "none",
            WebkitTapHighlightColor: "transparent",
            // Evita que el navegador haga scroll de la página al
            // arrastrar el dedo sobre el gráfico para seleccionar.
            touchAction: "none",
            background: "transparent",
          }}
          onMouseDown={handleSelectionMouseDown}
          onMouseMove={handleSelectionMouseMove}
          onMouseUp={finishSelection}
          onTouchStart={handleSelectionTouchStart}
          onTouchMove={handleSelectionTouchMove}
          onTouchEnd={finishTouchSelection}
        >
          {/* SELECCIÓN VISUAL */}

          {selectionLeftPercent !== null &&
            selectionWidthPercent !== null &&
            selectionWidthPercent > 0 && (
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: `${selectionLeftPercent}%`,
                  width: `${selectionWidthPercent}%`,
                  background: "rgba(59, 130, 246, 0.18)",
                  borderLeft: "1px solid rgba(37, 99, 235, 0.7)",
                  borderRight: "1px solid rgba(37, 99, 235, 0.7)",
                  pointerEvents: "none",
                }}
              />
            )}
        </div>
      </div>
    </div>
  );
}