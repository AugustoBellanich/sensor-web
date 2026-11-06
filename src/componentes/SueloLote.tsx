// Suelo de un lote (D-106): el perfil de cada sitio, uno al lado del otro, sin promediar. Sirve para
// ver si los sitios se parecen y caracterizan el lote, o si el lote tiene suelos distintos.
import { useCallback } from "react";
import { Link } from "react-router";

import { Tarjeta } from "@/componentes/ui";
import { numeroSuelo, sueloLote, textoCapa, type Capa } from "@/datos/suelo";
import { useConsulta } from "@/datos/useConsulta";

function resumen(c: Capa): string {
  return [
    c.texture_class,
    c.bulk_density != null ? `${numeroSuelo(c.bulk_density, 2)} g/cm³` : null,
    c.organic_matter_pct != null ? `MO ${numeroSuelo(c.organic_matter_pct, 1)} %` : null,
    c.ph != null ? `pH ${numeroSuelo(c.ph, 1)}` : null,
    c.ec_ds_m != null ? `CE ${numeroSuelo(c.ec_ds_m, 2)} dS/m` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function SueloLote({ lote }: { lote: string }) {
  const c = useConsulta(useCallback(() => sueloLote(lote), [lote]));
  const sitios = c.datos?.sitios ?? [];
  if (c.error || !sitios.length) return null;
  const conPerfil = sitios.filter((s) => s.description);
  return (
    <Tarjeta titulo="Suelo">
      {conPerfil.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {sitios.map((s) => (
            <div key={s.site_id} className="flex flex-col gap-1.5 rounded-lg border border-separador p-3 text-[13px]">
              <Link to={`/sitio/${s.site_id}/suelo`} className="font-medium text-tinta no-underline hover:underline">
                {s.name}
              </Link>
              {s.description ? (
                <>
                  {s.description.layers.map((x, i) => (
                    <span key={x.id ?? i} className="flex flex-col">
                      <span className="text-texto-2">{textoCapa(x)}</span>
                      <span className="text-xs text-texto-3">{resumen(x) || "Sin datos"}</span>
                    </span>
                  ))}
                  <span className="text-xs text-texto-3">
                    Sondas:{" "}
                    {s.depths.map((d) => (d != null ? `${numeroSuelo(d, 0)}` : "—")).join(" · ")} cm
                  </span>
                </>
              ) : (
                <span className="text-xs text-texto-3">Sin perfil descripto.</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-texto-2">
          Ningún sitio del lote tiene el perfil descripto. El suelo se carga en cada sitio (Suelo del sitio).
        </p>
      )}
    </Tarjeta>
  );
}
