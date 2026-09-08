import { useEffect, useState } from "react";
import { ingestService } from "../../../services/ingestService";
import type { GatewayStatus } from "../../../types/sensor";
import { formatDateTime } from "../../../lib/format";

interface N01HeartbeatCardProps {
  deviceId: string;
}

// Si no llega heartbeat hace más de esto, mostramos "sin contacto"
// aunque la última fila diga ONLINE (puede haberse apagado el gateway).
const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutos

export default function N01HeartbeatCard({
  deviceId,
}: N01HeartbeatCardProps) {
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await ingestService.getGatewayStatus(deviceId);
        if (active) setStatus(data);
      } catch (err) {
        console.error("Error cargando estado del gateway:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    setLoading(true);
    load();

    const interval = setInterval(load, 30000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [deviceId]);

  const lastHeartbeatMs = status
    ? new Date(status.last_heartbeat).getTime()
    : null;

  const isStale =
    !lastHeartbeatMs || Date.now() - lastHeartbeatMs > STALE_AFTER_MS;

  const label = loading
    ? "Cargando..."
    : isStale
      ? "SIN CONTACTO"
      : status?.wifi_status === "ONLINE"
        ? "EN LÍNEA"
        : status?.wifi_status === "LOCAL"
          ? "WIFI SIN INTERNET"
          : "DESCONOCIDO";

  const colorClass = isStale
    ? "bg-slate-100 text-slate-600"
    : status?.wifi_status === "ONLINE"
      ? "bg-green-100 text-green-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Estado del gateway
          </p>

          <p className="mt-1 text-lg font-semibold text-slate-900">
                        {status
              ? formatDateTime(status.last_heartbeat)
              : loading
                ? "Cargando..."
                : "Sin datos de heartbeat"}
          </p>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-sm font-medium ${colorClass}`}
        >
          {label}
        </div>
      </div>

      {status && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MiniStat
            label="Batería"
            value={
              status.battery_pct != null
                ? `${status.battery_pct}%`
                : "-"
            }
          />

          <MiniStat
            label="RSSI"
            value={status.rssi != null ? `${status.rssi} dBm` : "-"}
          />

          <MiniStat
            label="LoRa"
            value={status.lora_ready ? "OK" : "Error"}
          />

          <MiniStat
            label="Lotes pendientes"
            value={String(status.pending_batches ?? 0)}
          />
        </div>
      )}

      {!status && !loading && (
        <p className="mt-3 text-xs text-slate-400">
          Este gateway todavía no envió ningún heartbeat, o el
          firmware instalado es anterior a la versión con soporte de
          heartbeat.
        </p>
      )}
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
}

function MiniStat({ label, value }: MiniStatProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}