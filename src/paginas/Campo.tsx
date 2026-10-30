// Un campo, como en la app: mapa satelital con el perímetro, los lotes y los sitios; al lado, cómo
// está la red del campo, los lotes (con el agua útil de ahora) y los sitios, y quiénes tienen acceso.
// Dibujar lotes, ubicar sitios, cargar lluvias y dar permisos se hace en la app.
import {
  ChevronRight,
  CloudRain,
  Droplets,
  MapPin,
  Spline,
  Users,
} from "lucide-react";
import { useCallback } from "react";
import { Link, useParams } from "react-router";

import { IconoEstado } from "@/componentes/EstadoEquipo";
import { FamiliaYCodigo, HaceCorto, IconoFam } from "@/componentes/familia";
import {
  MapaCampo,
  type PoligonoMapa,
  type PuntoMapa,
} from "@/componentes/MapaCampo";
import { Barra, Contenido } from "@/componentes/Marco";
import { PasarA } from "@/componentes/PasarA";
import { Aviso, Cargando, Dato, Tarjeta, Titulo } from "@/componentes/ui";
import {
  anillo,
  detalleCampo,
  miembrosCampo,
  NOMBRE_METODO,
  textoHa,
  type Lote,
  type SitioCampo,
} from "@/datos/campos";
import { familiaDeModelo } from "@/datos/familias";
import { ahoraSitio } from "@/datos/perfil";
import { fraseResumen, nivel, ordenar, resumen, saludRed } from "@/datos/salud";
import { infoSitio, type InfoSitio } from "@/datos/series";
import { useConsulta } from "@/datos/useConsulta";
import { useSesion } from "@/sesion/SesionContexto";

const ROL = { owner: "Dueño", editor: "Editor", viewer: "Solo ver" } as const;

/** Dato corto para la marca del mapa: agua útil, si no la temperatura. */
export function datoCorto(i: InfoSitio): string | null {
  const a = ahoraSitio(i);
  if (a.agua != null) return `${Math.round(a.agua)} %`;
  if (a.temp != null) return `${a.temp.toFixed(1).replace(".", ",")} °C`;
  return null;
}

/** Agua útil promedio de los sitios de suelo de un lote (null si no hay). */
export function aguaDelLote(
  lote: string,
  sitios: SitioCampo[],
  info: Map<string, InfoSitio>,
): number | null {
  const v = sitios
    .filter((s) => s.plot_id === lote)
    .map((s) => (info.get(s.id) ? ahoraSitio(info.get(s.id)!).agua : null))
    .filter((x): x is number => x != null);
  return v.length ? v.reduce((a, x) => a + x, 0) / v.length : null;
}

export function BarraAgua({ pct }: { pct: number }) {
  return (
    <span className="inline-flex items-center gap-2 text-[13px]">
      <span aria-hidden className="relative h-1 w-10 rounded-full bg-linea">
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[#10b981]"
          style={{ width: `${Math.min(100, Math.max(0, pct)) * 0.8}%` }}
        />
      </span>
      <span className="font-semibold text-[#047857]">{Math.round(pct)} %</span>
    </span>
  );
}

export function cultivoDe(l: Lote): string {
  const a = l.activity;
  if (!a) return "Sin cultivo";
  return [a.crop_name ?? a.crop ?? "Cultivo", a.variety]
    .filter(Boolean)
    .join(" ");
}

export function FilaSitio({
  s,
  info,
}: {
  s: SitioCampo;
  info: InfoSitio | undefined;
}) {
  const familia = s.device ? familiaDeModelo(s.device.type) : null;
  const mide = s.device && (s.device.type === "B01" || s.device.type === "C01");
  const a = info ? ahoraSitio(info) : null;
  const destino = mide
    ? `/sitio/${s.id}`
    : s.device
      ? `/equipo/${s.device.id}`
      : null;
  const cuerpo = (
    <>
      <IconoFam familia={familia} />
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className="truncate text-[13.5px] font-medium text-tinta">
          {s.name}
        </span>
        {s.device ? (
          <FamiliaYCodigo familia={familia} codigo={s.device.id} />
        ) : (
          <span className="text-xs text-texto-3">Sin equipo</span>
        )}
      </span>
      {a?.agua != null ? <BarraAgua pct={a.agua} /> : null}
      {a?.t ? <HaceCorto fecha={a.t} /> : null}
      {destino ? (
        <ChevronRight
          size={15}
          className="shrink-0 text-[#94a3b8]"
          aria-hidden
        />
      ) : null}
    </>
  );
  const clase =
    "flex items-center gap-2.5 border-t border-separador py-2.5 first:border-t-0";
  return destino ? (
    <Link
      to={destino}
      className={`${clase} text-inherit no-underline hover:bg-[#fafbfc]`}
    >
      {cuerpo}
    </Link>
  ) : (
    <div className={clase}>{cuerpo}</div>
  );
}

export function Campo() {
  const { id = "" } = useParams();
  const { esAdmin } = useSesion();
  const c = useConsulta(
    useCallback(async () => {
      const [d, h, m] = await Promise.all([
        detalleCampo(id),
        saludRed(id),
        miembrosCampo(id),
      ]);
      const conDatos = (d.campo?.sites ?? [])
        .filter(
          (s) =>
            s.device && (s.device.type === "B01" || s.device.type === "C01"),
        )
        .slice(0, 40);
      const infos = await Promise.all(conDatos.map((s) => infoSitio(s.id)));
      const info = new Map<string, InfoSitio>();
      infos.forEach((r, k) => r.info && info.set(conDatos[k].id, r.info));
      return {
        campo: d.campo,
        salud: h.equipos,
        miembros: m.miembros,
        info,
        error: d.error ?? h.error,
      };
    }, [id]),
  );
  const k = c.datos?.campo ?? null;
  const salud = c.datos?.salud ?? [];
  const info = c.datos?.info ?? new Map<string, InfoSitio>();
  const atencion = ordenar(salud).filter(
    (e) => nivel(e) === "aviso" || nivel(e) === "grave",
  );

  const poligonos: PoligonoMapa[] = k
    ? [
        ...(k.boundary
          ? [{ id: "perimetro", puntos: anillo(k.boundary), perimetro: true }]
          : []),
        ...k.plots
          .filter((l) => l.boundary)
          .map((l) => ({
            id: l.id,
            puntos: anillo(l.boundary),
            nombre: l.name,
            a: `/campo/${k.id}/lote/${l.id}`,
          })),
      ]
    : [];
  const puntos: PuntoMapa[] = (k?.sites ?? [])
    .filter((s) => s.lat != null && s.lng != null)
    .map((s) => ({
      id: s.id,
      lat: s.lat!,
      lng: s.lng!,
      familia: s.device ? familiaDeModelo(s.device.type) : null,
      dato: info.get(s.id) ? datoCorto(info.get(s.id)!) : null,
      nombre: s.name,
      a:
        s.device && (s.device.type === "B01" || s.device.type === "C01")
          ? `/sitio/${s.id}`
          : undefined,
    }));
  const area = k?.area_ha ?? null;

  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          { texto: k?.name ?? "Campo" },
        ]}
      >
        {k?.can_edit && k.plots.length ? (
          <>
            <Link
              to={`/campo/${k.id}/agua?tipo=lluvia&todos=1`}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta"
            >
              <CloudRain size={15} strokeWidth={1.9} aria-hidden />
              Cargar lluvia
            </Link>
            <Link
              to={`/campo/${k.id}/agua?tipo=riego`}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-tinta bg-tinta px-3 text-[13px] font-medium text-white no-underline hover:bg-[#1e293b]"
            >
              <Droplets size={15} strokeWidth={1.9} aria-hidden />
              Cargar riego
            </Link>
          </>
        ) : null}
      </Barra>
      <Contenido>
        <Aviso mensaje={c.error} />
        {c.cargando && !k ? <Cargando texto="Leyendo el campo…" /> : null}
        {!c.cargando && !k && !c.error ? (
          <Aviso
            tipo="aviso"
            mensaje="No tenés acceso a este campo o no existe."
          />
        ) : null}
        {k ? (
          <>
            <Titulo
              titulo={k.name}
              datos={
                <>
                  {k.province ? (
                    <Dato icono={MapPin}>
                      {[k.department, k.province].filter(Boolean).join(", ")}
                    </Dato>
                  ) : null}
                  {area != null ? (
                    <Dato icono={Spline}>Perímetro: {textoHa(area)}</Dato>
                  ) : null}
                  {c.datos?.miembros.length ? (
                    <Dato icono={Users}>
                      {c.datos.miembros.length === 1
                        ? "1 persona"
                        : `${c.datos.miembros.length} personas`}
                    </Dato>
                  ) : null}
                </>
              }
            />
            {k.description ? (
              <p className="-mt-1 text-[13px] text-texto-2">{k.description}</p>
            ) : null}
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-[3_1_540px]">
                {poligonos.length || puntos.length ? (
                  <MapaCampo
                    poligonos={poligonos}
                    puntos={puntos}
                    alto={540}
                    etiqueta={`Mapa de ${k.name}`}
                  />
                ) : (
                  <Tarjeta>
                    <p className="text-[13px] text-texto-2">
                      Este campo todavía no tiene perímetro, lotes ni sitios
                      ubicados. Se dibujan desde la app.
                    </p>
                  </Tarjeta>
                )}
              </div>
              <div className="flex min-w-0 flex-[2_1_330px] flex-col gap-4">
                <Tarjeta titulo="Red del campo">
                  <p className="text-[13px] text-texto-2">
                    <span className="font-medium text-tinta">
                      {fraseResumen(resumen(salud))}.
                    </span>
                  </p>
                  {atencion.length ? (
                    <div className="mt-2 flex flex-col">
                      {atencion.map((e) => (
                        <Link
                          key={e.device_id}
                          to={`/equipo/${e.device_id}`}
                          className="flex items-center gap-2.5 border-t border-separador py-2 text-inherit no-underline first:border-t-0 hover:bg-[#fafbfc]"
                        >
                          <IconoFam familia={familiaDeModelo(e.type)} />
                          <span className="min-w-0 flex-1 truncate text-[13px] text-tinta">
                            {e.alias && e.alias !== e.device_id
                              ? e.alias
                              : (e.site_name ?? e.device_id)}
                          </span>
                          <IconoEstado s={e} />
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </Tarjeta>
                <Tarjeta titulo={`Lotes (${k.plots.length})`}>
                  {k.plots.length ? (
                    k.plots.map((l) => {
                      const agua = aguaDelLote(l.id, k.sites, info);
                      const n = k.sites.filter(
                        (s) => s.plot_id === l.id,
                      ).length;
                      return (
                        <Link
                          key={l.id}
                          to={`/campo/${k.id}/lote/${l.id}`}
                          className="flex items-center gap-2.5 border-t border-separador py-2.5 text-inherit no-underline first:border-t-0 hover:bg-[#fafbfc]"
                        >
                          <Spline
                            size={16}
                            strokeWidth={1.9}
                            className="shrink-0 text-tinta"
                            aria-hidden
                          />
                          <span className="flex min-w-0 flex-1 flex-col gap-px">
                            <span className="truncate text-[13.5px] font-medium text-tinta">
                              {l.name}
                            </span>
                            <span className="truncate text-xs text-texto-3">
                              {[
                                cultivoDe(l),
                                textoHa(l.area_ha),
                                l.irrigation_method
                                  ? NOMBRE_METODO[l.irrigation_method]
                                  : null,
                                n === 1 ? "1 sitio" : `${n} sitios`,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          </span>
                          {agua != null ? <BarraAgua pct={agua} /> : null}
                          <ChevronRight
                            size={15}
                            className="shrink-0 text-[#94a3b8]"
                            aria-hidden
                          />
                        </Link>
                      );
                    })
                  ) : (
                    <p className="text-[13px] text-texto-2">
                      Sin lotes. Se dibujan desde la app.
                    </p>
                  )}
                </Tarjeta>
                <Tarjeta titulo={`Sitios (${k.sites.length})`}>
                  {k.sites.length ? (
                    k.sites.map((s) => (
                      <FilaSitio key={s.id} s={s} info={info.get(s.id)} />
                    ))
                  ) : (
                    <p className="text-[13px] text-texto-2">Sin sitios.</p>
                  )}
                </Tarjeta>
                {c.datos?.miembros.length ? (
                  <Tarjeta titulo="Personas">
                    {c.datos.miembros.map((m) => (
                      <div
                        key={m.user_id}
                        className="flex items-center gap-2.5 border-t border-separador py-2 text-[13px] first:border-t-0"
                      >
                        <span className="min-w-0 flex-1 truncate text-tinta">
                          {m.full_name ?? m.email}
                        </span>
                        <span className="text-texto-3">{ROL[m.role]}</span>
                      </div>
                    ))}
                  </Tarjeta>
                ) : null}
                {esAdmin ? (
                  <PasarA
                    tipo="campo"
                    id={k.id}
                    nombre={k.name}
                    alTerminar={c.actualizar}
                  />
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </Contenido>
    </>
  );
}
