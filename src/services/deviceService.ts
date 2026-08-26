import { supabase } from "../lib/supabase";
import type {
  Device,
  DeviceWithStatus,
} from "../types/sensor";

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