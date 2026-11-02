// Dato de ahora en los mapas (D-96): qué variable mostrar en la marca de cada sitio y su valor, solo
// si la lectura es reciente. Mismo criterio que la app (sensor-app/src/datos/datoAhora.ts).
import { num } from "./agro";
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

/**
 * Hasta cuántos minutos de vieja se muestra una lectura. El sensor manda cada 15 min y el receptor
 * sube cada 30: una lectura al día tiene menos de ~1 h; con 2 h se tolera una subida perdida.
 */
export const RECIENTE_MIN = 120;

export type Variable = "ninguno" | "temp_aire" | "hum_aire" | "temp_suelo" | "hum_suelo";
export type Capa = "1" | "2" | "3";

export const VARIABLES: { valor: Variable; texto: string }[] = [
  { valor: "ninguno", texto: "Sin dato" },
  { valor: "temp_aire", texto: "T aire" },
  { valor: "hum_aire", texto: "HR aire" },
  { valor: "temp_suelo", texto: "T suelo" },
  { valor: "hum_suelo", texto: "Humedad suelo" },
];

export type DatoAhora = {
  site_id: string;
  device_id: string;
  device_type: string;
  reading_at: string;
  air_temp: number | null;
  humidity: number | null;
  soil_temp: number | null;
  e1_hv: number | null;
  e2_hv: number | null;
  e3_hv: number | null;
  e1_depth: number | null;
  e2_depth: number | null;
  e3_depth: number | null;
};

export async function datosAhora(): Promise<{ datos: Map<string, DatoAhora>; error: string | null }> {
  const { data, error } = await supabase.rpc("map_now", { p_max_minutes: RECIENTE_MIN });
  const datos = new Map<string, DatoAhora>();
  for (const d of (data ?? []) as DatoAhora[]) datos.set(d.site_id, d);
  return { datos, error: error ? mensajeBase(error.message) : null };
}

/** Lo que va en la marca ("23,6°", "52 %"), o null si el sitio no mide eso o la lectura es vieja. */
export function etiquetaDato(d: DatoAhora | undefined, variable: Variable, capa: Capa, ahora = Date.now()): string | null {
  if (!d || variable === "ninguno") return null;
  if (ahora - new Date(d.reading_at).getTime() > RECIENTE_MIN * 60_000) return null;
  const v =
    variable === "temp_aire"
      ? d.air_temp
      : variable === "hum_aire"
        ? d.humidity
        : variable === "temp_suelo"
          ? d.soil_temp
          : d[`e${capa}_hv`];
  if (v == null || !Number.isFinite(v)) return null;
  return variable === "temp_aire" || variable === "temp_suelo" ? `${num(v)}°` : `${Math.round(v)} %`;
}

/** Nombre de cada capa del suelo: la profundidad más común entre los sitios, o arriba/medio/abajo. */
export function nombresCapas(datos: Iterable<DatoAhora>): Record<Capa, string> {
  const nombres: Record<Capa, string> = { "1": "Arriba", "2": "Medio", "3": "Abajo" };
  for (const c of ["1", "2", "3"] as Capa[]) {
    const cuenta = new Map<number, number>();
    for (const d of datos) {
      const p = d[`e${c}_depth`];
      if (p != null) cuenta.set(p, (cuenta.get(p) ?? 0) + 1);
    }
    const masComun = [...cuenta.entries()].sort((a, b) => b[1] - a[1])[0];
    if (masComun) nombres[c] = `${Math.round(masComun[0])} cm`;
  }
  return nombres;
}
