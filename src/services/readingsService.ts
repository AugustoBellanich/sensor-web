import { supabase } from "../lib/supabase";
import type {
  ReadingB01,
  ReadingC01,
} from "../types/sensor";

export const readingsService = {
  /**
   * Obtiene lecturas de un SENSOR específico.
   *
   * IMPORTANTE:
   * device_id = gateway/dispositivo que transportó el dato
   * sensor_id = sensor físico que generó el dato
   *
   * Para consultar el histórico de un sensor usamos sensor_id.
   */
  // ============================================================
  // B01 - LECTURAS EN UN RANGO DE FECHAS
  // ============================================================

  async getB01Readings(
    sensorId: string,
    from: string,
    to: string
  ): Promise<ReadingB01[]> {
    const { data, error } = await supabase
      .from("readings_b01")
      .select("*")
      .eq("sensor_id", sensorId)
      .gte("timestamp", from)
      .lte("timestamp", to)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Error al obtener lecturas B01:", error.message);
      throw new Error(error.message);
    }

    return data || [];
  },

  // ============================================================
  // C01 - LECTURAS EN UN RANGO DE FECHAS
  // ============================================================

  async getC01Readings(
    sensorId: string,
    from: string,
    to: string
  ): Promise<ReadingC01[]> {
    const { data, error } = await supabase
      .from("readings_c01")
      .select("*")
      .eq("sensor_id", sensorId)
      .gte("timestamp", from)
      .lte("timestamp", to)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Error al obtener lecturas C01:", error.message);
      throw new Error(error.message);
    }

    return data || [];
  },

  // ============================================================
  // ÚLTIMA LECTURA B01
  // ============================================================

  async getLatestB01Reading(
    sensorId: string
  ): Promise<ReadingB01 | null> {
    const { data, error } = await supabase
      .from("readings_b01")
      .select("*")
      .eq("sensor_id", sensorId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Error al obtener última lectura B01:",
        error.message
      );

      throw new Error(error.message);
    }

    return data || null;
  },

  // ============================================================
  // ÚLTIMA LECTURA C01
  // ============================================================

  async getLatestC01Reading(
    sensorId: string
  ): Promise<ReadingC01 | null> {
    const { data, error } = await supabase
      .from("readings_c01")
      .select("*")
      .eq("sensor_id", sensorId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error(
        "Error al obtener última lectura C01:",
        error.message
      );

      throw new Error(error.message);
    }

    return data || null;
  },
};