import { useMemo } from "react";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import type { ReadingC01 } from "../../../types/sensor";
import { computeDailySummaries } from "../../../lib/agroMetrics";
import { useIsMobile } from "../../charts/chartUtils";

interface C01DailyExtremesChartProps {
  data: ReadingC01[];
  periodLabel: string;
}

const formatDayTick = (date: Date): string =>
  date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
  });

const formatDayFull = (date: Date): string =>
  date.toLocaleDateString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

export default function C01DailyExtremesChart({
  data,
  periodLabel,
}: C01DailyExtremesChartProps) {
  const isMobile = useIsMobile();

  const chartData = useMemo(() => {
    return computeDailySummaries(data).map((day) => ({
      dateKey: day.dateKey,
      label: formatDayTick(day.date),
      fullLabel: formatDayFull(day.date),
      tmax: Number(day.tmax.toFixed(1)),
      tmin: Number(day.tmin.toFixed(1)),
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-800">
            Temperatura diaria (máxima / mínima)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            <span className="font-semibold text-blue-600">{periodLabel}</span>
          </p>
        </div>

        <div className="flex items-center justify-center text-sm text-slate-400 h-64">
          No hay mediciones para el período seleccionado.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">
          Temperatura diaria (máxima / mínima)
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          <span className="font-semibold text-blue-600">{periodLabel}</span>
          {chartData.length > 1 &&
            ` · ${chartData.length} jornadas con datos`}
        </p>
      </div>

      <div style={{ height: isMobile ? "18rem" : "22rem" }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{
              top: 10,
              right: isMobile ? 8 : 15,
              left: 0,
              bottom: 10,
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e2e8f0"
              vertical={false}
            />

            <XAxis
              dataKey="label"
              stroke="#64748b"
              fontSize={isMobile ? 10 : 11}
              minTickGap={isMobile ? 12 : 20}
            />

            <YAxis
              stroke="#64748b"
              fontSize={isMobile ? 10 : 11}
              width={isMobile ? 32 : undefined}
              tickFormatter={(value) =>
                typeof value === "number" ? value.toFixed(0) : value
              }
              unit="°"
            />

            <Tooltip
              labelFormatter={(_label, payload) =>
                payload?.[0]?.payload?.fullLabel ?? _label
              }
              formatter={(value: any, name: any) => [
                typeof value === "number" ? `${value.toFixed(1)} °C` : value,
                name,
              ]}
              cursor={{ stroke: "#94a3b8", strokeWidth: 1, strokeDasharray: "4 4" }}
            />

            <Legend
              verticalAlign="top"
              height={32}
              iconSize={isMobile ? 8 : 10}
              wrapperStyle={
                isMobile ? { fontSize: 11 } : undefined
              }
            />

            <Line
              type="monotone"
              dataKey="tmax"
              name="Máxima"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              isAnimationActive={false}
            />

            <Line
              type="monotone"
              dataKey="tmin"
              name="Mínima"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}