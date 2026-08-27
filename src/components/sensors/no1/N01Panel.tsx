import { useEffect, useState } from "react";
import { ingestService } from "../../../services/ingestService";
import type { IngestLog } from "../../../types/sensor";
import N01UploadChart from "./N01UploadChart";
import N01SensorChart from "./N01SensorChart";

interface N01PanelProps {
  deviceId: string;
  from: string;
  to: string;
}

export default function N01Panel({
  deviceId,
  from,
  to,
}: N01PanelProps) {
  const [logs, setLogs] = useState<IngestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // CARGAR LOGS
  // ============================================================

  const loadLogs = async () => {
    try {
      setError(null);

      const data = await ingestService.getLogs(
        deviceId,
        from,
        to
      );

      setLogs(data);
    } catch (err: any) {
      console.error("Error cargando logs del N01:", err);

      setError(
        err?.message || "No se pudieron cargar los logs"
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CARGA INICIAL + CAMBIO DE PERÍODO + REFRESCO AUTOMÁTICO
  // ============================================================

  useEffect(() => {
    setLoading(true);

    loadLogs();

    // Actualización automática cada 30 segundos
    const interval = setInterval(() => {
      loadLogs();
    }, 30000);

    return () => clearInterval(interval);

  }, [deviceId, from, to]);

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  const totalRequests = logs.length;

  const successfulRequests = logs.filter(
    (log) => log.request_status === "success"
  ).length;

  const failedRequests = logs.filter(
    (log) => log.request_status === "error"
  ).length;

  const readingsReceived = logs.reduce(
    (sum, log) =>
      sum + (log.readings_received ?? 0),
    0
  );

  const readingsInserted = logs.reduce(
    (sum, log) =>
      sum + (log.readings_inserted ?? 0),
    0
  );

  const readingsDuplicate = logs.reduce(
    (sum, log) =>
      sum + (log.readings_duplicate ?? 0),
    0
  );

  const lastLog = logs[0];

  // ============================================================
  // RENDER - LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <div className="flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />

          <p className="text-sm text-slate-500">
            Cargando información del N01...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER - ERROR
  // ============================================================

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-700">
          Error al cargar N01
        </p>

        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>

        <button
          onClick={() => {
            setLoading(true);
            loadLogs();
          }}
          className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-4">

      {/* ======================================================
          ENCABEZADO
      ====================================================== */}

      <div className="flex items-center justify-between">

        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Gateway N01
          </h2>

          <p className="text-sm text-slate-500">
            {deviceId}
          </p>
        </div>

        <button
          onClick={() => {
            setLoading(true);
            loadLogs();
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Actualizar
        </button>

      </div>

      {/* ======================================================
          ÚLTIMA ACTIVIDAD
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm text-slate-500">
              Última comunicación
            </p>

            <p className="mt-1 text-lg font-semibold text-slate-900">

              {lastLog
                ? new Date(
                    lastLog.received_at
                  ).toLocaleString("es-AR")
                : "Sin registros"}

            </p>

          </div>

          <div
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              lastLog?.request_status === "success"
                ? "bg-green-100 text-green-700"
                : lastLog
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >

            {lastLog?.request_status === "success"
              ? "OK"
              : lastLog
                ? "ERROR"
                : "SIN DATOS"}

          </div>

        </div>

      </div>

      {/* ======================================================
          GRÁFICOS
      ====================================================== */}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

        <N01UploadChart logs={logs} />

        <N01SensorChart logs={logs} />

      </div>

      {/* ======================================================
          RESUMEN
      ====================================================== */}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">

        <StatCard
          label="Requests"
          value={totalRequests}
        />

        <StatCard
          label="Exitosos"
          value={successfulRequests}
        />

        <StatCard
          label="Errores"
          value={failedRequests}
        />

        <StatCard
          label="Recibidas"
          value={readingsReceived}
        />

        <StatCard
          label="Insertadas"
          value={readingsInserted}
        />

      </div>

      {/* ======================================================
          DUPLICADOS
      ====================================================== */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between">

          <div>

            <p className="text-sm font-medium text-slate-900">
              Lecturas duplicadas
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Datos recibidos que ya existían en la base
            </p>

          </div>

          <span className="text-2xl font-semibold text-slate-900">
            {readingsDuplicate}
          </span>

        </div>

      </div>

      {/* ======================================================
          ÚLTIMOS LOGS
      ====================================================== */}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="border-b border-slate-200 px-5 py-4">

          <h3 className="font-semibold text-slate-900">
            Últimas ingestas
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Requests recibidos por el gateway durante el período seleccionado.
          </p>

        </div>

        {logs.length === 0 ? (

          <div className="p-8 text-center">

            <p className="text-sm font-medium text-slate-500">
              No hay registros de ingesta.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              No se encontraron comunicaciones del N01 durante el período seleccionado.
            </p>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="min-w-full text-sm">

              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">

                <tr>

                  <th className="px-4 py-3">
                    Fecha
                  </th>

                  <th className="px-4 py-3">
                    Estado
                  </th>

                  <th className="px-4 py-3">
                    Recibidas
                  </th>

                  <th className="px-4 py-3">
                    Insertadas
                  </th>

                  <th className="px-4 py-3">
                    Duplicadas
                  </th>

                  <th className="px-4 py-3">
                    Sensores
                  </th>

                  <th className="px-4 py-3">
                    Procesamiento
                  </th>

                  <th className="px-4 py-3">
                    Demora
                  </th>

                  <th className="px-4 py-3">
                    HTTP
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-slate-200">

                {logs.map((log) => (

                  <tr
                    key={log.id}
                    className="hover:bg-slate-50 transition-colors"
                  >

                    {/* FECHA */}

                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">

                      {new Date(
                        log.received_at
                      ).toLocaleString("es-AR")}

                    </td>

                    {/* ESTADO */}

                    <td className="px-4 py-3">

                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          log.request_status === "success"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >

                        {log.request_status || "desconocido"}

                      </span>

                    </td>

                    {/* RECIBIDAS */}

                    <td className="px-4 py-3 text-slate-700">
                      {log.readings_received ?? 0}
                    </td>

                    {/* INSERTADAS */}

                    <td className="px-4 py-3 text-slate-700">
                      {log.readings_inserted ?? 0}
                    </td>

                    {/* DUPLICADAS */}

                    <td className="px-4 py-3 text-slate-700">
                      {log.readings_duplicate ?? 0}
                    </td>

                    {/* SENSORES */}

                    <td className="px-4 py-3 text-slate-700">
                      {log.sensors_count ?? 0}
                    </td>

                    {/* PROCESAMIENTO */}

                    <td className="px-4 py-3 text-slate-700">

                      {log.processing_ms != null
                        ? `${log.processing_ms} ms`
                        : "-"}

                    </td>

                    {/* DEMORA */}

                    <td className="px-4 py-3 text-slate-700">

                      {log.upload_delay_seconds != null
                        ? `${log.upload_delay_seconds} s`
                        : "-"}

                    </td>

                    {/* HTTP */}

                    <td className="px-4 py-3 text-slate-700">

                      {log.http_status ?? "-"}

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* ======================================================
          ERROR DEL ÚLTIMO REQUEST
      ====================================================== */}

      {lastLog?.error_message && (

        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">

          <p className="text-sm font-semibold text-red-700">
            Error de la última ingesta
          </p>

          <p className="mt-1 text-sm text-red-600">
            {lastLog.error_message}
          </p>

        </div>

      )}

    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({
  label,
  value,
}: StatCardProps) {

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-semibold text-slate-900">
        {value}
      </p>

    </div>
  );
}
