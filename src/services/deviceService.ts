import { supabase } from "../lib/supabase";
import type {
  Device,
  DeviceWithStatus,
  GatewayStatus,
} from "../types/sensor";

// Heartbeat esperado cada 5 min (ver firmware). Usamos los mismos
// múltiplos que para los sensores (1.5x / 4x) para mantener el
// mismo criterio visual de online/warning/offline en toda la app.
const GATEWAY_HEARTBEAT_MINUTES = 5;

async function resolveGatewayStatus(
  device: Device
): Promise<DeviceWithStatus> {
  const { data: gwStatus, error } = await supabase
    .from("gateway_status")
    .select("*")
    .eq("device_id", device.id)
    .maybeSingle();

  if (error) {
    console.error(
      `Error obteniendo heartbeat de ${device.id}:`,
      error.message
    );
  }

  const status = gwStatus as GatewayStatus | null;

  if (!status?.last_heartbeat) {
    return {
      ...device,
      lastReadingTime: null,
      battery: null,
      status: "offline" as const,
    };
  }

  const lastTime = new Date(status.last_heartbeat);
  const now = new Date();
  const diffMinutes =
    (now.getTime() - lastTime.getTime()) / (1000 * 60);

  let resolvedStatus: "online" | "warning" | "offline";

  if (diffMinutes <= GATEWAY_HEARTBEAT_MINUTES * 1.5) {
    resolvedStatus = "online";
  } else if (diffMinutes <= GATEWAY_HEARTBEAT_MINUTES * 4) {
    resolvedStatus = "warning";
  } else {
    resolvedStatus = "offline";
  }

  return {
    ...device,
    lastReadingTime: status.last_heartbeat,
    battery: status.battery_pct ?? null,
    status: resolvedStatus,
  };
}

export const deviceService = {

  // ============================================================
  // OBTENER DISPOSITIVOS
  // ============================================================

  async getDevices(): Promise<DeviceWithStatus[]> {

    const { data: devices, error } = await supabase
      .from("devices")
      .select("*");

    if (error) {
      console.error(
        "Error al obtener dispositivos:",
        error.message
      );

      throw new Error(error.message);
    }

    if (!devices) {
      return [];
    }

    // ==========================================================
    // CALCULAR ESTADO DE CADA SENSOR
    // ==========================================================

    const devicesWithStatus =
      await Promise.all(

        devices.map(
          async (device: Device) => {

            // --------------------------------------------------
            // GATEWAYS (N01): el estado sale de gateway_status,
            // no de readings_b01/readings_c01 (no generan lecturas
            // propias, solo transportan las de los sensores B01/C01)
            // --------------------------------------------------

            if (device.type === "N01") {
              return await resolveGatewayStatus(device);
            }

            const tableName =
              device.type === "B01"
                ? "readings_b01"
                : "readings_c01";

            // --------------------------------------------------
            // IMPORTANTE:
            //
            // device.id = identificador del sensor registrado
            //
            // readings.sensor_id = sensor que generó el dato
            //
            // readings.device_id = dispositivo que transportó
            //                      / subió el dato
            // --------------------------------------------------

            const { data: lastReading, error: readingError } =
              await supabase
                .from(tableName)
                .select(
                  "timestamp, battery_pct"
                )
                .eq(
                  "sensor_id",
                  device.id
                )
                .order(
                  "timestamp",
                  { ascending: false }
                )
                .limit(1)
                .maybeSingle();

            if (readingError) {
              console.error(
                `Error obteniendo última lectura de ${device.id}:`,
                readingError.message
              );
            }

            // --------------------------------------------------
            // SIN LECTURAS
            // --------------------------------------------------

            if (!lastReading?.timestamp) {

              return {
                ...device,

                lastReadingTime: null,

                battery:
                  lastReading?.battery_pct ??
                  null,

                status: "offline" as const,
              };
            }

            // --------------------------------------------------
            // DIFERENCIA DE TIEMPO
            // --------------------------------------------------

            const lastTime =
              new Date(
                lastReading.timestamp
              );

            const now =
              new Date();

            const diffMinutes =
              (
                now.getTime() -
                lastTime.getTime()
              ) /
              (1000 * 60);

            // --------------------------------------------------
            // INTERVALO CONFIGURADO
            // --------------------------------------------------

            const configIntervalSec =
              device.config?.loraInterval ??
              device.config?.saveInterval ??
              1800;

            const expectedMinutes =
              Number(
                configIntervalSec
              ) / 60;

            // --------------------------------------------------
            // ESTADO
            //
            // ONLINE:
            // hasta 1.5 veces el intervalo esperado
            //
            // WARNING:
            // hasta 4 veces
            //
            // OFFLINE:
            // más de 4 veces
            // --------------------------------------------------

            let status:
              "online" |
              "warning" |
              "offline";

            if (
              diffMinutes <=
              expectedMinutes * 1.5
            ) {

              status = "online";

            } else if (
              diffMinutes <=
              expectedMinutes * 4
            ) {

              status = "warning";

            } else {

              status = "offline";
            }

            return {
              ...device,

              lastReadingTime:
                lastReading.timestamp,

              battery:
                lastReading.battery_pct ??
                null,

              status,
            };
          }
        )
      );

    return devicesWithStatus;
  },
};