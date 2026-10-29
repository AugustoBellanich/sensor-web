// Sitios que ve el usuario (para la red y el mapa) y riegos y lluvias de un sitio. Mismas
// funciones de la base que usa la app (sensor-app/src/datos/campos.ts y riego.ts).
import { mensajeBase } from "./errores";
import { supabase } from "./supabase";

export type SitioVisible = {
  site_id: string;
  site_name: string;
  lat: number;
  lng: number;
  establishment_id: string | null; // null si no soy miembro del campo (D-11)
  establishment_name: string | null;
  province: string | null;
  plot_name: string | null;
  device_id: string | null;
  device_type: string | null;
  device_alias: string | null;
  device_since: string | null;
  is_project: boolean;
};

export async function sitiosVisibles(): Promise<{ sitios: SitioVisible[]; error: string | null }> {
  const { data, error } = await supabase.rpc("visible_sites");
  return { sitios: (data ?? []) as SitioVisible[], error: error ? mensajeBase(error.message) : null };
}

export type TipoEvento = "riego" | "lluvia";

export type AguaSitio = {
  id: string;
  kind: TipoEvento;
  started_at: string;
  duration_min: number | null;
  gross_mm: number | null;
  net_mm: number | null;
  calc: string;
  notes: string | null;
};

export async function aguaSitio(sitio: string, desde: number, hasta: number): Promise<{ eventos: AguaSitio[]; error: string | null }> {
  const { data, error } = await supabase.rpc("site_water", {
    p_site_id: sitio,
    p_from: new Date(desde).toISOString(),
    p_to: new Date(hasta).toISOString(),
  });
  return { eventos: (data ?? []) as AguaSitio[], error: error ? mensajeBase(error.message) : null };
}
