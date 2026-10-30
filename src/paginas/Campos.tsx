// Campos, como la pestaña de la app: cada campo con sus números (lotes, sitios, equipos,
// superficie) y su provincia. Desde acá se crea un campo; el perímetro y los lotes se dibujan en la app.
import { ChevronRight, MapPin, Plus } from "lucide-react";
import { Link } from "react-router";

import { Barra, Contenido } from "@/componentes/Marco";
import { Aviso, Cargando, Titulo } from "@/componentes/ui";
import { misCampos, textoHa, type Campo } from "@/datos/campos";
import { useConsulta } from "@/datos/useConsulta";

const ROL = { owner: "Dueño", editor: "Editor", viewer: "Solo ver" } as const;

export function Campos() {
  const c = useConsulta(misCampos);
  const campos = c.datos?.campos ?? [];
  return (
    <>
      <Barra migas={[{ texto: "Campos" }]}>
        <Link
          to="/campos/nuevo"
          className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-tinta bg-tinta px-3 text-[13px] font-medium text-white no-underline hover:bg-[#1e293b]"
        >
          <Plus size={15} strokeWidth={1.9} aria-hidden />
          Nuevo campo
        </Link>
      </Barra>
      <Contenido>
        <Titulo
          titulo="Campos"
          datos="Tus campos con sus lotes, sitios y equipos."
        />
        <Aviso mensaje={c.error} />
        {c.cargando ? <Cargando texto="Leyendo los campos…" /> : null}
        {!c.cargando && !campos.length && !c.error ? (
          <p className="text-[13px] text-texto-2">
            Todavía no tenés campos. Creá uno con "Nuevo campo"; si alguien te
            suma al suyo, aparece acá.
          </p>
        ) : null}
        <div className="flex flex-wrap gap-3.5">
          {campos.map((k) => (
            <TarjetaCampo key={k.id} k={k} />
          ))}
        </div>
      </Contenido>
    </>
  );
}

function TarjetaCampo({ k }: { k: Campo }) {
  const lugar = [k.department, k.province].filter(Boolean).join(", ");
  const n = (v: number, uno: string, varios: string) =>
    `${v} ${v === 1 ? uno : varios}`;
  return (
    <Link
      to={`/campo/${k.id}`}
      className="flex min-w-0 flex-[1_1_300px] flex-col gap-3 rounded-xl border border-linea bg-white px-[18px] py-4 text-inherit no-underline transition-colors hover:border-[#cbd5e1] lg:max-w-[420px]"
    >
      <span className="flex items-start justify-between gap-2.5">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold text-tinta">
            {k.name}
          </span>
          {lugar ? (
            <span className="inline-flex items-center gap-1 text-[12.5px] text-texto-3">
              <MapPin size={13} strokeWidth={1.9} aria-hidden />
              {lugar}
            </span>
          ) : null}
        </span>
        <ChevronRight
          size={16}
          className="mt-0.5 shrink-0 text-[#94a3b8]"
          aria-hidden
        />
      </span>
      <span className="flex flex-wrap gap-x-3.5 gap-y-1 text-[12.5px] text-texto-2">
        <span>{n(k.plots, "lote", "lotes")}</span>
        <span>{n(k.sites, "sitio", "sitios")}</span>
        <span>{n(k.devices, "equipo", "equipos")}</span>
        {k.area_ha != null || k.plots_area_ha != null ? (
          <span>{textoHa(k.area_ha ?? k.plots_area_ha)}</span>
        ) : null}
      </span>
      {k.my_role ? (
        <span className="border-t border-separador pt-2.5 text-xs text-texto-3">
          Tu acceso: {ROL[k.my_role]}
        </span>
      ) : null}
    </Link>
  );
}
