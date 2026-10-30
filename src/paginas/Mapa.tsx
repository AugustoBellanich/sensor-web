// Mapa general, como la pestaña Mapa de la app: todos los sitios que el usuario puede ver, cada uno
// con el ícono de su familia y el dato de ahora, y el radio de recepción de cada receptor. Filtro por
// tipo de equipo. Tocar un sitio abre su tarjeta a la izquierda, con lo de ahora y los enlaces.
import { ChevronRight, Clock, Cpu, MapPin, RadioTower, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { IconoEstado } from "@/componentes/EstadoEquipo";
import { BateriaCorta, FamiliaYCodigo, IconoFam } from "@/componentes/familia";
import { RADIO_RECEPTOR_M } from "@/componentes/marcas";
import { MapaRed } from "@/componentes/MapaRed";
import { Barra, Contenido } from "@/componentes/Marco";
import { Aviso, Cargando, FilaDato } from "@/componentes/ui";
import { num } from "@/datos/agro";
import { hace } from "@/datos/estado";
import {
  familiaDeModelo,
  FAMILIAS,
  ORDEN_FAMILIAS,
  type Familia,
} from "@/datos/familias";
import { ahoraSitio } from "@/datos/perfil";
import { saludRed, type SaludEquipo } from "@/datos/salud";
import { infoSitio, type InfoSitio } from "@/datos/series";
import { sitiosVisibles, type SitioVisible } from "@/datos/sitios";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";

async function cargar() {
  const [s, h] = await Promise.all([sitiosVisibles(), saludRed()]);
  const conDatos = s.sitios
    .filter((x) => x.device_type === "B01" || x.device_type === "C01")
    .slice(0, 40);
  const infos = await Promise.all(conDatos.map((x) => infoSitio(x.site_id)));
  const info = new Map<string, InfoSitio>();
  infos.forEach((r, k) => r.info && info.set(conDatos[k].site_id, r.info));
  return {
    sitios: s.sitios,
    salud: new Map(h.equipos.map((e) => [e.device_id, e])),
    info,
    error: s.error ?? h.error,
  };
}

/** Dato corto para la marca: agua útil, si no la temperatura. */
function datoCorto(info: InfoSitio | undefined): string | null {
  if (!info) return null;
  const a = ahoraSitio(info);
  if (a.agua != null) return `${Math.round(a.agua)} %`;
  if (a.temp != null) return `${num(a.temp)} °C`;
  return null;
}

export function Mapa() {
  const c = useConsulta(cargar);
  const [filtro, setFiltro] = useState<Familia | "todos">("todos");
  const [elegido, setElegido] = useState<string | null>(null);
  const sitios = useMemo(() => c.datos?.sitios ?? [], [c.datos]);
  const datos = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of sitios) {
      const d = datoCorto(c.datos?.info.get(s.site_id));
      if (d) m.set(s.site_id, d);
    }
    return m;
  }, [sitios, c.datos]);
  const presentes = ORDEN_FAMILIAS.filter((f) =>
    sitios.some((s) => s.device_type && familiaDeModelo(s.device_type) === f),
  );
  const visibles = sitios.filter(
    (s) =>
      filtro === "todos" ||
      (s.device_type && familiaDeModelo(s.device_type) === filtro),
  );
  const sitio = visibles.find((s) => s.site_id === elegido) ?? null;

  return (
    <>
      <Barra migas={[{ texto: "Mapa" }]}>
        <div
          role="radiogroup"
          aria-label="Qué miden"
          className="flex flex-wrap gap-1"
        >
          {(["todos", ...presentes] as const).map((f) => {
            const activo = filtro === f;
            const n =
              f === "todos"
                ? sitios.length
                : sitios.filter(
                    (s) =>
                      s.device_type && familiaDeModelo(s.device_type) === f,
                  ).length;
            return (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => setFiltro(f)}
                className={`inline-flex h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] ${activo ? "bg-tinta text-white" : "text-texto-2 hover:bg-fondo"}`}
              >
                {f !== "todos" && !activo ? (
                  <IconoFam familia={f} tamano={14} />
                ) : null}
                {f === "todos" ? "Todos" : FAMILIAS[f].corto}
                <span className={activo ? "text-white/70" : "text-texto-3"}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </Barra>
      <Contenido ancho={1920}>
        <Aviso mensaje={c.error} />
        {c.cargando ? <Cargando texto="Leyendo los sitios…" /> : null}
        {!c.cargando && !sitios.length && !c.error ? (
          <p className="text-[13px] text-texto-2">
            Todavía no ves ningún sitio. Vinculá un equipo o pedí acceso a un
            campo desde la app.
          </p>
        ) : null}
        {sitios.length ? (
          <div className="relative h-[calc(100vh-190px)] min-h-[460px] overflow-hidden rounded-xl border border-linea bg-noche">
            <MapaRed
              sitios={visibles}
              elegido={elegido}
              alElegir={setElegido}
              datos={datos}
            />
            {sitio ? (
              <TarjetaSitio
                sitio={sitio}
                info={c.datos?.info.get(sitio.site_id)}
                salud={
                  sitio.device_id
                    ? c.datos?.salud.get(sitio.device_id)
                    : undefined
                }
                alCerrar={() => setElegido(null)}
              />
            ) : null}
            <p className="pointer-events-none absolute bottom-2 left-3 z-[500] flex items-center gap-1.5 rounded-md bg-noche/80 px-2 py-1 text-[11px] text-noche-texto">
              <span
                aria-hidden
                className="h-2.5 w-2.5 rounded-full border border-dashed border-[#c4b5fd]"
              />
              Radio de recepción de cada receptor: unos {RADIO_RECEPTOR_M} m
              (depende del sitio)
            </p>
          </div>
        ) : null}
      </Contenido>
    </>
  );
}

function TarjetaSitio({
  sitio,
  info,
  salud,
  alCerrar,
}: {
  sitio: SitioVisible;
  info: InfoSitio | undefined;
  salud: SaludEquipo | undefined;
  alCerrar: () => void;
}) {
  const familia = sitio.device_type ? familiaDeModelo(sitio.device_type) : null;
  const mide = sitio.device_type === "B01" || sitio.device_type === "C01";
  const a = info ? ahoraSitio(info) : null;
  const celdas: { t: string; v: string; c?: string; ayuda?: string }[] = [];
  if (a?.agua != null)
    celdas.push({
      t: "Agua útil",
      v: `${Math.round(a.agua)} %`,
      c: "text-[#047857]",
      ayuda: AYUDA.aguaUtil,
    });
  if (a?.temp != null)
    celdas.push({
      t: info?.last_b01 ? "Temp. del suelo" : "Temperatura",
      v: `${num(a.temp)} °C`,
    });
  if (a?.humedad != null)
    celdas.push({ t: "Humedad", v: `${num(a.humedad, 0)} %` });
  const bateria =
    info?.last_b01?.battery_pct ??
    info?.last_c01?.battery_pct ??
    salud?.battery_pct ??
    null;
  return (
    <div className="absolute top-1/2 left-4 z-[600] flex w-[360px] max-w-[calc(100%-32px)] -translate-y-1/2 flex-col gap-3.5 rounded-xl bg-white p-[18px] shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-fondo">
          <IconoFam familia={familia} tamano={20} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          {sitio.device_id ? (
            <FamiliaYCodigo familia={familia} codigo={sitio.device_id} />
          ) : (
            <span className="text-xs text-texto-3">Sin equipo</span>
          )}
          <span className="truncate text-base font-semibold text-tinta">
            {sitio.site_name}
          </span>
          <span className="inline-flex items-center gap-1 truncate text-xs text-texto-3">
            <MapPin size={12} strokeWidth={1.9} aria-hidden />
            {[sitio.plot_name, sitio.establishment_name]
              .filter(Boolean)
              .join(", ") || "Campo de otra persona"}
          </span>
        </span>
        <button
          type="button"
          onClick={alCerrar}
          aria-label="Cerrar"
          className="flex h-7 w-7 items-center justify-center rounded-md text-texto-3 hover:bg-fondo hover:text-tinta"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      {celdas.length ? (
        <div className="grid grid-cols-2 gap-2.5">
          {celdas.map((k) => (
            <div key={k.t} className="rounded-[9px] bg-fondo px-3 py-2.5">
              <span className="block text-[11.5px] text-texto-3">
                {k.ayuda ? (
                  <ConAyuda que={k.t.toLowerCase()} texto={k.ayuda}>
                    {k.t}
                  </ConAyuda>
                ) : (
                  k.t
                )}
              </span>
              <span className={`text-xl font-semibold ${k.c ?? "text-tinta"}`}>
                {k.v}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div>
        <FilaDato icono={Cpu} etiqueta="Estado">
          <IconoEstado s={salud} />
        </FilaDato>
        <FilaDato icono={Clock} etiqueta="Último dato">
          {a?.t
            ? hace(a.t)
            : salud?.last_reading_at
              ? hace(salud.last_reading_at)
              : "Sin datos"}
        </FilaDato>
        {sitio.device_type === "N01" ? (
          <FilaDato icono={RadioTower} etiqueta="Recibe a">
            unos {RADIO_RECEPTOR_M} m
          </FilaDato>
        ) : bateria != null ? (
          <FilaDato etiqueta="Batería">
            <BateriaCorta pct={bateria} />
          </FilaDato>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {mide ? (
          <Link
            to={`/sitio/${sitio.site_id}`}
            className="inline-flex h-[34px] items-center gap-1 rounded-lg border border-tinta bg-tinta px-3 text-[13px] font-medium text-white no-underline hover:bg-[#1e293b]"
          >
            Ver datos
            <ChevronRight size={15} aria-hidden />
          </Link>
        ) : null}
        {sitio.device_id ? (
          <Link
            to={`/equipo/${sitio.device_id}`}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta"
          >
            Ficha del equipo
          </Link>
        ) : null}
      </div>
    </div>
  );
}
