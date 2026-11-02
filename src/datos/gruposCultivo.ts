// Grupo del cultivo de un lote (para su ícono, componentes/IconoCultivo.tsx): el de la lista de la
// base (D-54, tabla crops), o el que corresponde a su actividad si el cultivo no está en la lista.
// Igual en la app (sensor-app/src/datos/gruposCultivo.ts).
import { useEffect, useState } from "react";

import { listasCultivos, type Lote } from "./campos";

/** Grupo del cultivo de un lote: el de la lista de la base, o el que corresponde a su actividad. */
export function grupoDeLote(l: Pick<Lote, "activity">, grupoPorCodigo: Map<string, string>): string | null {
  const a = l.activity;
  if (!a) return null;
  if (a.crop_code === "forestal" || a.crop_code === "monte_nativo" || a.activity_type === "forest") return "Forestal";
  const g = a.crop_code ? grupoPorCodigo.get(a.crop_code) : undefined;
  if (g) return g;
  if (a.activity_type === "pasture") return "Forrajes";
  return "Otros";
}

let cacheGrupos: Map<string, string> | null = null;

/** Grupo de cada código de cultivo (de la lista de la base; se lee una vez por sesión). */
export function useGruposCultivo(): Map<string, string> {
  const [grupos, setGrupos] = useState<Map<string, string>>(cacheGrupos ?? new Map());
  useEffect(() => {
    if (cacheGrupos) return;
    let vigente = true;
    void listasCultivos().then(({ cultivos }) => {
      cacheGrupos = new Map(cultivos.map((c) => [c.code, c.group_name]));
      if (vigente) setGrupos(cacheGrupos);
    });
    return () => {
      vigente = false;
    };
  }, []);
  return grupos;
}
