import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import type { IngestLog } from "../../../types/sensor";

interface Props {
  logs: IngestLog[];
}

export default function N01SensorChart({ logs }: Props) {
  const chartData = logs.map((log) => ({
    time: new Date(log.received_at).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    }),

    sensores: log.sensors_count ?? 0,

    demora:
      log.upload_delay_seconds != null
        ? log.upload_delay_seconds
        : null,

    procesamiento:
      log.processing_ms != null
        ? log.processing_ms
        : null,
  }));

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800">
          Sensores y comunicación
        </h3>

        <p className="text-xs text-slate-500 mt-1">
          Sensores incluidos, demora de subida y tiempo de procesamiento.
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-slate-400">
          No hay registros de comunicación para este período.
        </div>
      ) : (
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 10,
                right: 20,
                left: 0,
                bottom: 5,
              }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="time"
                tick={{
                  fontSize: 10,
                }}
                stroke="#94a3b8"
              />

              <YAxis
                allowDecimals={false}
                tick={{
                  fontSize: 10,
                }}
                stroke="#94a3b8"
              />

              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  fontSize: "12px",
                }}
              />

              <Legend
                wrapperStyle={{
                  fontSize: "11px",
                }}
              />

              <Line
                type="monotone"
                dataKey="sensores"
                name="Sensores"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              <Line
                type="monotone"
                dataKey="demora"
                name="Demora subida (s)"
                stroke="#ea580c"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />

              <Line
                type="monotone"
                dataKey="procesamiento"
                name="Procesamiento (ms)"
                stroke="#0891b2"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}