// Cliente de Supabase (SensorDB) para la web. Solo la URL y la clave publicable: son públicas por
// diseño, la seguridad la ponen las reglas de la base (RLS). Las pantallas no importan este
// archivo: usan los módulos de src/datos/.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** Falta la configuración: la web muestra un aviso en lugar de romperse. */
export const configurada = !!url && !!clave;

/** URL de la base a la que apunta la web. */
export const URL_BASE = url ?? "";

export const supabase = createClient(url ?? "http://localhost", clave ?? "sin-clave", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});
