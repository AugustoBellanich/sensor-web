// Red (inicio): cómo está la red de un vistazo. Arriba, una frase con cuántos equipos necesitan
// atención; el mapa con todos los sitios y, al lado, lo que requiere atención (una frase por
// causa); abajo, la tabla de sitios con lo de ahora (agua útil, temperatura), el último dato y
// la batería. Todo lo calcula la base (network_health, visible_sites, site_data_info).
import { ChevronRight, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { BateriaCorta, HaceCorto, ICONO_FAMILIA, IconoFamilia } from "@/componentes/familia";
import { MapaRed } from "@/componentes/MapaRed";
import { Aviso, Cargando, Tarjeta } from "@/componentes/ui";
import { num } from "@/datos/agro";
import { aliasPropio, familiaDeModelo, FAMILIAS, ORDEN_FAMILIAS, type Familia } from "@/datos/familias";
import { ahoraSitio } from "@/datos/perfil";
import { fraseCausa, fraseResumen, nivel, ordenar, resumen, saludRed, type SaludEquipo } from "@/datos/salud";
import { infoSitio, type InfoSitio } from "@/datos/series";
import { sitiosVisibles, type SitioVisible } from "@/datos/sitios";
import { useConsulta } from "@/datos/useConsulta";

/** Cuántos sitios se piden de a uno para la columna "Ahora" (con más, la base necesita una lista). */
const MAX_DETALLE = 40;

async function cargarRed() {
  const [s, h] = await Promise.all([sitiosVisibles(), saludRed()]);
  const conDatos = s.sitios.filter((x) => x.device_type === "B01" || x.device_type === "C01").slice(0, MAX_DETALLE);
  const infos = await Promise.all(conDatos.map((x) => infoSitio(x.site_id)));
  const ahora = new Map<string, InfoSitio>();
  infos.forEach((r, k) => r.info && ahora.set(conDatos[k].site_id, r.info));
  return { sitios: s.sitios, salud: h.equipos, ahora, error: s.error ?? h.error };
}

export function Red() {
  const c = useConsulta(cargarRed);
  const [filtro, setFiltro] = useState<Familia | "todos">("todos");
  const [elegido, setElegido] = useState<string | null>(null);

  const sitios = useMemo(() => c.datos?.sitios ?? [], [c.datos]);
  const salud = useMemo(() => c.datos?.salud ?? [], [c.datos]);
  const porEquipo = useMemo(() => new Map(salud.map((e) => [e.device_id, e])), [salud]);
  const r = resumen(salud);
  const atencion = ordenar(salud).filter((e) => {
    const n = nivel(e);
    return n === "aviso" || n === "grave";
  });
  const campos = new Set(sitios.map((s) => s.establishment_id ?? s.establishment_name).filter(Boolean)).size;
  const presentes = ORDEN_FAMILIAS.filter((f) => sitios.some((s) => s.device_type && familiaDeModelo(s.device_type) === f));
  const visibles = sitios.filter((s) => filtro === "todos" || (s.device_type && familiaDeModelo(s.device_type) === filtro));
  const sitioElegido = sitios.find((s) => s.site_id === elegido) ?? null;

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-7 lg:px-10 lg:py-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[30px] font-bold tracking-tight text-tinta">Red</h1>
        <p className="text-[15px] text-texto-2">
          {c.cargando
            ? "Leyendo la red…"
            : `${campos === 1 ? "1 campo" : `${campos} campos`}, ${salud.length === 1 ? "1 equipo" : `${salud.length} equipos`}. ${fraseResumen(r)}.`}
        </p>
      </header>

      <Aviso mensaje={c.error} />
      {c.cargando ? <Cargando texto="Leyendo los sitios y su estado…" /> : null}

      {!c.cargando && sitios.length === 0 && !c.error ? (
        <Tarjeta>
          <p className="text-[15px] text-texto">Todavía no ves ningún sitio. Vinculá un equipo o pedí acceso a un campo desde la app.</p>
        </Tarjeta>
      ) : null}

      {sitios.length ? (
        <section className="flex flex-wrap gap-5">
          <div className="relative min-h-[420px] min-w-0 flex-[2_1_520px] overflow-hidden rounded-tarjeta border border-noche-borde bg-noche">
            <MapaRed sitios={sitios} elegido={elegido} alElegir={setElegido} />
            <div className="pointer-events-none absolute top-3 left-3 z-[500] flex flex-wrap gap-1.5">
              {presentes.map((f) => (
                <span key={f} className="flex h-[30px] items-center gap-1.5 rounded-full border border-noche-borde bg-noche-2/90 px-3 text-[13px] text-noche-texto">
                  <span className="h-2 w-2 rounded-full" style={{ background: FAMILIAS[f].noche }} />
                  {FAMILIAS[f].corto} {sitios.filter((s) => s.device_type && familiaDeModelo(s.device_type) === f).length}
                </span>
              ))}
            </div>
            {sitioElegido ? <TarjetaSitio sitio={sitioElegido} info={c.datos?.ahora.get(sitioElegido.site_id) ?? null} /> : null}
          </div>

          <Tarjeta titulo="Requiere atención" className="flex min-w-0 flex-[1_1_300px] flex-col">
            {atencion.length === 0 ? (
              <p className="text-sm text-texto-2">{salud.length ? "Nada por ahora: todos los equipos están bien." : "Sin equipos todavía."}</p>
            ) : (
              <ul className="-mt-1 flex flex-col">
                {atencion.slice(0, 6).map((e) => (
                  <FilaAtencion key={e.device_id} equipo={e} sitio={sitios.find((s) => s.device_id === e.device_id) ?? null} />
                ))}
              </ul>
            )}
            {atencion.length > 6 ? <p className="mt-3 text-sm text-texto-2">Y {atencion.length - 6} más en la tabla.</p> : null}
          </Tarjeta>
        </section>
      ) : null}

      {sitios.length ? (
        <section className="overflow-hidden rounded-tarjeta border border-borde bg-white shadow-tarjeta">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <h2 className="text-[17px] font-semibold text-tinta">Sitios</h2>
            {presentes.length > 1 ? (
              <div role="radiogroup" aria-label="Filtrar por lo que miden" className="flex flex-wrap gap-1.5">
                {(["todos", ...presentes] as const).map((f) => {
                  const activo = filtro === f;
                  const n = f === "todos" ? sitios.length : sitios.filter((s) => s.device_type && familiaDeModelo(s.device_type) === f).length;
                  const Icono = f === "todos" ? null : ICONO_FAMILIA[f];
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      onClick={() => setFiltro(f)}
                      className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] ${activo ? "bg-tinta font-semibold text-white" : "text-texto-2 hover:bg-superficie"}`}
                    >
                      {Icono ? <Icono size={14} aria-hidden style={{ color: activo ? "#fff" : FAMILIAS[f as Familia].color }} /> : null}
                      {f === "todos" ? "Todos" : FAMILIAS[f].corto}
                      <span className={activo ? "text-white/70" : "text-texto-3"}>{n}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead>
                <tr className="border-y border-borde bg-[#f8fafc] text-left text-[13px] text-texto-2">
                  <th scope="col" className="px-5 py-2.5 font-medium">Sitio</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Ahora</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Último dato</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Batería</th>
                  <th scope="col" className="px-5 py-2.5 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((s) => (
                  <FilaSitio key={s.site_id} sitio={s} salud={s.device_id ? (porEquipo.get(s.device_id) ?? null) : null} info={c.datos?.ahora.get(s.site_id) ?? null} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </main>
  );
}

const ultimoDato = (e: SaludEquipo | null) => (e ? ([e.last_reading_at, e.last_lora_at].filter(Boolean).sort().reverse()[0] ?? null) : null);

function FilaSitio({ sitio: s, salud, info }: { sitio: SitioVisible; salud: SaludEquipo | null; info: InfoSitio | null }) {
  const familia = s.device_type ? familiaDeModelo(s.device_type) : null;
  const a = info ? ahoraSitio(info) : null;
  const causa = salud?.causes[0];
  return (
    <tr className="border-b border-separador last:border-b-0 hover:bg-[#f8fafc]">
      <td className="px-5 py-3">
        <Link to={`/sitio/${s.site_id}`} className="flex items-center gap-3 text-tinta no-underline">
          <span aria-hidden className="h-7 w-1.5 shrink-0 rounded-full" style={{ background: familia ? FAMILIAS[familia].color : "#cbd5e1" }} />
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold">{s.site_name}</span>
            <span className="flex items-center gap-1 text-[13px] text-texto-2">
              <MapPin size={12} className="text-texto-3" aria-hidden />
              {[s.establishment_name, s.plot_name].filter(Boolean).join(", ") || "Campo de otra persona"}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-3 py-3">
        {a?.agua != null ? (
          <span className="flex items-center gap-2.5">
            <BarraAgua agua={a.agua} />
            <span className="font-semibold text-[#047857]">{Math.round(a.agua)} %</span>
            {a.temp != null ? <span className="text-texto-2">{num(a.temp)} °C</span> : null}
          </span>
        ) : a?.humedad != null || a?.temp != null ? (
          <span className="text-texto">
            {a.temp != null ? `${num(a.temp)} °C` : ""}
            {a.humedad != null ? <span className="ml-2 text-texto-2">{num(a.humedad, 0)} % HR</span> : null}
          </span>
        ) : (
          <span className="text-texto-3">{familia === "gateway" ? "Receptor" : "—"}</span>
        )}
      </td>
      <td className="px-3 py-3">
        <HaceCorto fecha={ultimoDato(salud)} />
      </td>
      <td className="px-3 py-3">{s.device_type === "N01" ? <span className="text-[13px] text-texto-2">Enchufado</span> : <BateriaCorta pct={salud?.battery_pct} />}</td>
      <td className="px-5 py-3 text-texto">
        {!s.device_id ? (
          <span className="text-texto-3">Sin equipo</span>
        ) : causa && salud ? (
          fraseCausa(causa, salud.type)
        ) : salud && nivel(salud) === "ok" ? (
          <span className="text-ok">Al día</span>
        ) : (
          <span className="text-texto-2">Sin datos todavía</span>
        )}
        <span className="mt-0.5 block font-mono text-xs text-texto-3">{[aliasPropio(s.device_alias, s.device_id ?? ""), s.device_id].filter(Boolean).join(", ")}</span>
      </td>
    </tr>
  );
}

/** Agua útil del perfil en la escala de la app: CC al 80 % (pista gris, zona en color). */
function BarraAgua({ agua }: { agua: number }) {
  const sobre = agua > 100;
  const bajo = agua < 0;
  return (
    <span aria-hidden className="flex h-1.5 w-24 gap-0.5 overflow-hidden rounded-full">
      <span className="w-[8%]" style={{ background: bajo ? "#dc2626" : "#e2e8f0" }} />
      <span className="w-[72%]" style={{ background: !sobre && !bajo ? "#059669" : "#e2e8f0" }} />
      <span className="w-[20%]" style={{ background: sobre ? "#0284c7" : "#e2e8f0" }} />
    </span>
  );
}

function FilaAtencion({ equipo: e, sitio }: { equipo: SaludEquipo; sitio: SitioVisible | null }) {
  const familia = familiaDeModelo(e.type);
  const nombre = aliasPropio(e.alias, e.device_id) ?? e.site_name ?? e.device_id;
  const contenido = (
    <>
      <IconoFamilia familia={familia} tamano={36} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-tinta">{nombre}</span>
        <span className="text-sm text-texto">{e.causes[0] ? fraseCausa(e.causes[0], e.type) : "Revisá el equipo."}</span>
      </span>
      {sitio ? <ChevronRight size={16} className="mt-1 shrink-0 text-texto-3" aria-hidden /> : null}
    </>
  );
  return (
    <li className="border-t border-separador first:border-t-0">
      {sitio ? (
        <Link to={`/sitio/${sitio.site_id}`} className="flex gap-3 py-3 no-underline">
          {contenido}
        </Link>
      ) : (
        <div className="flex gap-3 py-3">{contenido}</div>
      )}
    </li>
  );
}

function TarjetaSitio({ sitio, info }: { sitio: SitioVisible; info: InfoSitio | null }) {
  const familia = sitio.device_type ? familiaDeModelo(sitio.device_type) : null;
  const a = info ? ahoraSitio(info) : null;
  const linea =
    a?.agua != null
      ? `Agua útil al ${Math.round(a.agua)} %`
      : a?.temp != null
        ? `${num(a.temp)} °C${a.humedad != null ? `, ${num(a.humedad, 0)} % HR` : ""}`
        : familia === "gateway"
          ? "Receptor"
          : "Sin datos de ahora";
  return (
    <div className="absolute right-3 bottom-3 z-[500] flex w-[300px] max-w-[calc(100%-24px)] items-center gap-3 rounded-campo bg-white px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
      <IconoFamilia familia={familia} tamano={40} />
      <span className="flex min-w-0 flex-1 flex-col">
        <Link to={`/sitio/${sitio.site_id}`} className="truncate text-[15px] font-semibold text-tinta no-underline hover:underline">
          {sitio.site_name}
        </Link>
        <span className="text-[13px] text-texto-2">{linea}</span>
      </span>
      {a?.t ? <HaceCorto fecha={a.t} /> : null}
    </div>
  );
}
