import { supabase } from "../lib/supabase";
import type {
  ReadingB01,
  ReadingC01,
} from "../types/sensor";

/*
 * ============================================================
 * PAGINACIÓN
 * ------------------------------------------------------------
 * Supabase/PostgREST devuelve como máximo ~1000 filas por
 * consulta (límite "Max Rows" del proyecto), sin importar
 * cuántas haya en el rango pedido — y no tira error, así que
 * el corte pasaba desapercibido. Con períodos de varios días
 * (sobre todo en B01, que tiene muchas más columnas por
 * timestamp que C01) se llega a esa marca antes de cubrir todo
 * el rango elegido.
 *
 * Esta función pagina con `.range()` en páginas de PAGE_SIZE
 * filas y va acumulando hasta que una página vuelve incompleta
 * (señal de que no hay más datos), sin asumir un límite fijo
 * del lado del cliente.
 */

const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  buildQuery: (rangeFrom: number, rangeTo: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>,
): Promise<T[]> {
  const allRows: T[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await buildQuery(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = data || [];
    allRows.push(...rows);

    if (rows.length < PAGE_SIZE) {
      break;
    }

    offset += PAGE_SIZE;
  }

  return allRows;
}

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
    try {
      return await fetchAllPages<ReadingB01>((rangeFrom, rangeTo) =>
        supabase
          .from("readings_b01")
          .select("*")
          .eq("sensor_id", sensorId)
          .gte("timestamp", from)
          .lte("timestamp", to)
          .order("timestamp", { ascending: true })
          .range(rangeFrom, rangeTo),
      );
    } catch (error: any) {
      console.error("Error al obtener lecturas B01:", error.message);
      throw error;
    }
  },

  // ============================================================
  // C01 - LECTURAS EN UN RANGO DE FECHAS
  // ============================================================

  async getC01Readings(
    sensorId: string,
    from: string,
    to: string
  ): Promise<ReadingC01[]> {
    try {
      return await fetchAllPages<ReadingC01>((rangeFrom, rangeTo) =>
        supabase
          .from("readings_c01")
          .select("*")
          .eq("sensor_id", sensorId)
          .gte("timestamp", from)
          .lte("timestamp", to)
          .order("timestamp", { ascending: true })
          .range(rangeFrom, rangeTo),
      );
    } catch (error: any) {
      console.error("Error al obtener lecturas C01:", error.message);
      throw error;
    }
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