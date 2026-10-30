// Mapa general, como la pestaña Mapa de la app: todos los sitios que el usuario puede ver, como
// nodos del color de su familia, con un filtro por tipo de equipo. Tocar un sitio muestra su
// tarjeta con lo de ahora y el enlace a sus datos.
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { HaceCorto, IconoFam } from "@/componentes/familia";
import { MapaRed } from "@/componentes/MapaRed";
import { Barra, Contenido } from "@/componentes/Marco";
import { Aviso, Cargando } from "@/componentes/ui";
import { num } from "@/datos/agro";
import { familiaDeModelo, FAMILIAS, ORDEN_FAMILIAS, type Familia } from "@/datos/familias";
import { ahoraSitio } from "@/datos/perfil";
import { infoSitio } from "@/datos/series";
import { sitiosVisibles, type SitioVisible } from "@/datos/sitios";
import { useConsulta } from "@/datos/useConsulta";

export function Mapa() {
  const c = useConsulta(sitiosVisibles);
  const [filtro, setFiltro] = useState<Familia | "todos">("todos");
  const [elegido, setElegido] = useState<string | null>(null);
  const sitios = useMemo(() => c.datos?.sitios ?? [], [c.datos]);
  const presentes = ORDEN_FAMILIAS.filter((f) => sitios.some((s) => s.device_type && familiaDeModelo(s.device_type) === f));
  const visibles = sitios.filter((s) => filtro === "todos" || (s.device_type && familiaDeModelo(s.device_type) === filtro));
  const sitio = visibles.find((s) => s.site_id === elegido) ?? null;

  return (
    <>
      <Barra migas={[{ texto: "Mapa" }]}>
        <div role="radiogroup" aria-label="Qué miden" className="flex flex-wrap gap-1">
          {(["todos", ...presentes] as const).map((f) => {
            const activo = filtro === f;
            const n = f === "todos" ? sitios.length : sitios.filter((s) => s.device_type && familiaDeModelo(s.device_type) === f).length;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setFiltro(f)}
                className={`inline-flex h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] ${activo ? "bg-tinta text-white" : "text-texto-2 hover:bg-fondo"}`}
              >
                {f !== "todos" && !activo ? <IconoFam familia={f} tamano={14} /> : null}
                {f === "todos" ? "Todos" : FAMILIAS[f].corto}
                <span className={activo ? "text-white/70" : "text-texto-3"}>{n}</span>
              </button>
            );
          })}
        </div>
      </Barra>
      <Contenido ancho={1600}>
        <Aviso mensaje={c.error} />
        {c.cargando ? <Cargando texto="Leyendo los sitios…" /> : null}
        {!c.cargando && !sitios.length && !c.error ? <p className="text-[13px] text-texto-2">Todavía no ves ningún sitio. Vinculá un equipo o pedí acceso a un campo desde la app.</p> : null}
        {sitios.length ? (
          <div className="relative h-[calc(100vh-140px)] min-h-[420px] overflow-hidden rounded-xl border border-linea bg-noche">
            <MapaRed sitios={visibles} elegido={elegido} alElegir={setElegido} />
            {sitio ? <TarjetaSitio sitio={sitio} /> : null}
          </div>
        ) : null}
      </Contenido>
    </>
  );
}

function TarjetaSitio({ sitio }: { sitio: SitioVisible }) {
  const familia = sitio.device_type ? familiaDeModelo(sitio.device_type) : null;
  const mide = sitio.device_type === "B01" || sitio.device_type === "C01";
  const c = useConsulta(useMemo(() => () => (mide ? infoSitio(sitio.site_id) : Promise.resolve({ info: null, error: null })), [sitio.site_id, mide]));
  const a = c.datos?.info ? ahoraSitio(c.datos.info) : null;
  const linea =
    a?.agua != null
      ? `Agua útil al ${Math.round(a.agua)} %`
      : a?.temp != null
        ? `${num(a.temp)} °C${a.humedad != null ? `, ${num(a.humedad, 0)} % de humedad` : ""}`
        : familia === "gateway"
          ? "Receptor"
          : c.cargando
            ? "Leyendo…"
            : "Sin datos de ahora";
  const destino = mide ? `/sitio/${sitio.site_id}` : sitio.device_id ? `/equipo/${sitio.device_id}` : null;
  return (
    <div className="absolute right-3 bottom-3 z-[500] flex w-[300px] max-w-[calc(100%-24px)] items-center gap-3 rounded-[10px] bg-white px-3.5 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.3)]">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-fondo">
        <IconoFam familia={familia} tamano={18} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        {destino ? (
          <Link to={destino} className="truncate text-sm font-semibold text-tinta no-underline hover:underline">
            {sitio.site_name}
          </Link>
        ) : (
          <span className="truncate text-sm font-semibold text-tinta">{sitio.site_name}</span>
        )}
        <span className="truncate text-xs text-texto-2">{[linea, sitio.plot_name ?? sitio.establishment_name].filter(Boolean).join(" · ")}</span>
      </span>
      {a?.t ? <HaceCorto fecha={a.t} /> : null}
    </div>
  );
}
