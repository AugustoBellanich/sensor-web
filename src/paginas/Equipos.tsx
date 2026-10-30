// Equipos (inicio), como la pestaña Equipos de la app: todos los equipos agrupados por campo, con
// el alcance (Míos / Del proyecto / Todos, para admin y staff), el filtro por lo que miden y la
// búsqueda. En la web, al lado de la lista, el equipo elegido: su estado, lo de ahora y los
// enlaces a sus datos y a su ficha (en la app es tocar la fila y entrar).
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  MapPin,
  PlugZap,
  RadioTower,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { FraseEstado, IconoEstado } from "@/componentes/EstadoEquipo";
import {
  BateriaCorta,
  FamiliaYCodigo,
  HaceCorto,
  IconoFam,
} from "@/componentes/familia";
import { Barra, Contenido } from "@/componentes/Marco";
import {
  Aviso,
  Cargando,
  Estado,
  FilaDato,
  Segmento,
  Titulo,
} from "@/componentes/ui";
import { num } from "@/datos/agro";
import { estadoEquipos, type EstadoEquipo } from "@/datos/equipos";
import { hace, UMBRAL_GATEWAY_MS, UMBRAL_MODULO_MS } from "@/datos/estado";
import {
  agruparPorCampo,
  familiaDeModelo,
  FAMILIAS,
  ORDEN_FAMILIAS,
  tituloEquipo,
  type Familia,
} from "@/datos/familias";
import { ahoraSitio } from "@/datos/perfil";
import { nivel, saludRed, type SaludEquipo } from "@/datos/salud";
import { infoSitio, type InfoSitio } from "@/datos/series";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";
import { useSesion } from "@/sesion/SesionContexto";

/** Sitios que se piden de a uno para la columna "Ahora" (con más, la base necesita una lista). */
const MAX_DETALLE = 40;

async function cargar() {
  const [e, h] = await Promise.all([estadoEquipos(), saludRed()]);
  const conDatos = e.equipos
    .filter((x) => x.site_id && (x.type === "B01" || x.type === "C01"))
    .slice(0, MAX_DETALLE);
  const infos = await Promise.all(conDatos.map((x) => infoSitio(x.site_id!)));
  const ahora = new Map<string, InfoSitio>();
  infos.forEach((r, k) => r.info && ahora.set(conDatos[k].id, r.info));
  return {
    equipos: e.equipos,
    salud: new Map(h.equipos.map((x) => [x.device_id, x])),
    ahora,
    error: e.error ?? h.error,
  };
}

type Alcance = "mios" | "proyecto" | "todos";

function Ahora({ info, tipo }: { info: InfoSitio | undefined; tipo: string }) {
  if (tipo === "N01")
    return <span className="text-[13px] text-texto-3">Receptor</span>;
  if (!info) return <span className="text-[13px] text-texto-3">—</span>;
  const a = ahoraSitio(info);
  if (a.agua != null)
    return (
      <span className="inline-flex items-center gap-2 text-[13px]">
        <span aria-hidden className="relative h-1 w-12 rounded-full bg-linea">
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-[#10b981]"
            style={{ width: `${Math.min(100, Math.max(0, a.agua)) * 0.8}%` }}
          />
        </span>
        <span className="font-semibold text-[#047857]">
          {Math.round(a.agua)} %
        </span>
        {a.temp != null ? (
          <span className="text-texto-2">{num(a.temp)} °C</span>
        ) : null}
      </span>
    );
  return (
    <span className="inline-flex gap-2.5 text-[13px] text-texto">
      {a.temp != null ? <span>{num(a.temp)} °C</span> : null}
      {a.humedad != null ? (
        <span className="text-texto-2">{num(a.humedad, 0)} %</span>
      ) : null}
      {a.temp == null && a.humedad == null ? (
        <span className="text-texto-3">—</span>
      ) : null}
    </span>
  );
}

const COLUMNAS =
  "grid-cols-[minmax(220px,2fr)_minmax(140px,1.3fr)_64px_72px_minmax(150px,1.6fr)]";

export function Equipos() {
  const c = useConsulta(cargar);
  const { esAdmin } = useSesion();
  const [alcance, setAlcance] = useState<Alcance>("mios");
  const [filtro, setFiltro] = useState<Familia | "todos">("todos");
  const [busqueda, setBusqueda] = useState("");
  const [plegados, setPlegados] = useState<Set<string>>(new Set());
  const [elegido, setElegido] = useState<string | null>(null);

  const equipos = useMemo(() => c.datos?.equipos ?? [], [c.datos]);
  const salud = c.datos?.salud;
  const ahora = c.datos?.ahora;
  const verTodos = esAdmin && alcance !== "mios";
  const delAlcance = equipos.filter((e) =>
    e.activity === "retired" && !(esAdmin && alcance === "todos")
      ? false
      : !esAdmin || alcance === "mios"
        ? e.my_role !== null
        : alcance === "proyecto"
          ? e.is_project
          : true,
  );
  const presentes = ORDEN_FAMILIAS.filter((f) =>
    delAlcance.some((e) => familiaDeModelo(e.type) === f),
  );
  const q = busqueda.trim().toLowerCase();
  const visibles = delAlcance.filter(
    (e) =>
      (filtro === "todos" || familiaDeModelo(e.type) === filtro) &&
      (!q ||
        [e.id, e.alias, e.site_name, e.plot_name, e.establishment_name].some(
          (t) => t?.toLowerCase().includes(q),
        )),
  );
  const variasProvincias =
    new Set(visibles.map((e) => e.province).filter(Boolean)).size > 1;
  const grupos = agruparPorCampo(visibles, variasProvincias);
  const campos = new Set(
    delAlcance.map((e) => e.establishment_id).filter(Boolean),
  ).size;
  const conProblema = delAlcance.filter((e) => {
    const s = salud?.get(e.id);
    return s && (nivel(s) === "aviso" || nivel(s) === "grave");
  }).length;
  const actual = visibles.find((e) => e.id === elegido) ?? visibles[0] ?? null;

  const alternar = (clave: string) =>
    setPlegados((p) => {
      const n = new Set(p);
      if (n.has(clave)) n.delete(clave);
      else n.add(clave);
      return n;
    });

  return (
    <>
      <Barra migas={[{ texto: "Equipos" }]} />
      <Contenido>
        <Titulo
          titulo={
            !verTodos
              ? "Mis equipos"
              : alcance === "proyecto"
                ? "Equipos del proyecto"
                : "Todos los equipos"
          }
          datos={
            c.cargando ? (
              "Leyendo los equipos…"
            ) : (
              <span>
                {delAlcance.length === 1
                  ? "1 equipo"
                  : `${delAlcance.length} equipos`}
                {campos
                  ? ` en ${campos === 1 ? "1 campo" : `${campos} campos`}`
                  : ""}
                .{" "}
                {conProblema
                  ? `${conProblema === 1 ? "1 pide" : `${conProblema} piden`} atención.`
                  : "Todos al día."}
              </span>
            )
          }
        />
        <Aviso mensaje={c.error} />
        <div className="flex flex-wrap items-start gap-4">
          <section className="min-w-0 flex-[1_1_640px] overflow-hidden rounded-xl border border-linea bg-white">
            <div className="flex flex-wrap items-center gap-2.5 px-4 py-3">
              {esAdmin ? (
                <>
                  <Segmento
                    etiqueta="Qué equipos"
                    opciones={[
                      { valor: "mios" as const, texto: "Míos" },
                      { valor: "proyecto" as const, texto: "Del proyecto" },
                      { valor: "todos" as const, texto: "Todos" },
                    ]}
                    valor={alcance}
                    alCambiar={setAlcance}
                  />
                  <span aria-hidden className="h-[18px] w-px bg-linea" />
                </>
              ) : null}
              <div
                role="radiogroup"
                aria-label="Qué miden"
                className="flex flex-wrap gap-1"
              >
                {[
                  { f: "todos" as const, n: delAlcance.length },
                  ...presentes.map((f) => ({
                    f,
                    n: delAlcance.filter((e) => familiaDeModelo(e.type) === f)
                      .length,
                  })),
                ].map(({ f, n }) => {
                  const activo = filtro === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      role="radio"
                      aria-checked={activo}
                      onClick={() => setFiltro(f)}
                      className={`inline-flex h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] transition-colors ${activo ? "bg-tinta text-white" : "text-texto-2 hover:bg-fondo"}`}
                    >
                      {f !== "todos" && !activo ? (
                        <IconoFam familia={f} tamano={14} />
                      ) : null}
                      {f === "todos" ? "Todos" : FAMILIAS[f].corto}
                      <span
                        className={activo ? "text-white/70" : "text-texto-3"}
                      >
                        {n}
                      </span>
                    </button>
                  );
                })}
              </div>
              <label className="ml-auto flex h-[30px] w-44 max-w-full items-center gap-1.5 rounded-lg border border-linea bg-white px-2.5 focus-within:border-acento-oscuro">
                <Search size={14} className="text-texto-3" aria-hidden />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar"
                  aria-label="Buscar equipo, sitio o código"
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] text-tinta outline-none placeholder:text-texto-3"
                />
              </label>
            </div>
            {c.cargando ? (
              <div className="border-t border-separador px-4 py-4">
                <Cargando texto="Leyendo los equipos…" />
              </div>
            ) : null}
            {!c.cargando && !visibles.length ? (
              <p className="border-t border-separador px-4 py-4 text-[13px] text-texto-2">
                {delAlcance.length
                  ? "Ningún equipo coincide con el filtro."
                  : "Todavía no tenés equipos. Se vinculan desde la app, con el código que trae cada equipo."}
              </p>
            ) : null}
            {visibles.length ? (
              <div className="relative overflow-x-auto">
                <div className="min-w-[760px]">
                  <div
                    className={`grid ${COLUMNAS} gap-3.5 border-t border-separador px-4 py-2 text-[11.5px] font-medium text-texto-3`}
                  >
                    <span className="pl-[26px]">Equipo</span>
                    <span>Ahora</span>
                    <span>Dato</span>
                    <span>Batería</span>
                    <span>Estado</span>
                  </div>
                  {grupos.map((g) => {
                    const abierto = !plegados.has(g.clave);
                    const sinDatos = g.equipos.filter(
                      (e) =>
                        e.activity !== "retired" &&
                        e.last_reading_at &&
                        Date.now() - Date.parse(e.last_reading_at) >
                          (e.type === "N01"
                            ? UMBRAL_GATEWAY_MS
                            : UMBRAL_MODULO_MS),
                    ).length;
                    return (
                      <div key={g.clave}>
                        <button
                          type="button"
                          aria-expanded={abierto}
                          onClick={() => alternar(g.clave)}
                          className="flex w-full items-center gap-2 border-t border-separador bg-[#fafbfc] px-4 py-2.5 text-left"
                        >
                          {abierto ? (
                            <ChevronDown
                              size={14}
                              className="text-texto-3"
                              aria-hidden
                            />
                          ) : (
                            <ChevronRight
                              size={14}
                              className="text-texto-3"
                              aria-hidden
                            />
                          )}
                          <span className="text-[13px] font-semibold text-tinta">
                            {g.titulo}
                          </span>
                          <span className="text-xs text-texto-3">
                            {g.equipos.length}
                          </span>
                          {sinDatos ? (
                            <span className="ml-auto inline-flex items-center gap-1 text-xs text-aviso">
                              <TriangleAlert size={13} aria-hidden />
                              {sinDatos} sin datos recientes
                            </span>
                          ) : null}
                        </button>
                        {abierto
                          ? g.equipos.map((e) => (
                              <Fila
                                key={e.id}
                                e={e}
                                s={salud?.get(e.id)}
                                info={ahora?.get(e.id)}
                                activo={actual?.id === e.id}
                                alElegir={() => setElegido(e.id)}
                              />
                            ))
                          : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
          {actual ? (
            <Panel
              e={actual}
              s={salud?.get(actual.id)}
              info={ahora?.get(actual.id)}
            />
          ) : null}
        </div>
      </Contenido>
    </>
  );
}

function Fila({
  e,
  s,
  info,
  activo,
  alElegir,
}: {
  e: EstadoEquipo;
  s: SaludEquipo | undefined;
  info: InfoSitio | undefined;
  activo: boolean;
  alElegir: () => void;
}) {
  const familia = familiaDeModelo(e.type);
  const lugar =
    [e.plot_name, e.site_name && e.plot_name ? null : e.site_name]
      .filter(Boolean)
      .join(", ") || (e.site_id ? "Sin lote" : "Sin ubicar");
  return (
    <button
      type="button"
      onClick={alElegir}
      aria-pressed={activo}
      className={`grid w-full ${COLUMNAS} items-center gap-3.5 border-t border-separador px-4 py-2.5 text-left transition-colors ${activo ? "bg-[#f0f9ff]" : "hover:bg-[#fafbfc]"}`}
      style={{
        boxShadow: activo
          ? `inset 2px 0 0 ${FAMILIAS[familia].color}`
          : undefined,
      }}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <IconoFam familia={familia} />
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate text-[13.5px] font-semibold text-tinta">
            {tituloEquipo(e)}
          </span>
          <span className="flex min-w-0 items-center gap-2 text-xs text-texto-3">
            <FamiliaYCodigo familia={familia} codigo={e.id} />
            <span aria-hidden>·</span>
            <span className="truncate">{lugar}</span>
          </span>
        </span>
      </span>
      <Ahora info={info} tipo={e.type} />
      <HaceCorto fecha={e.last_reading_at} />
      {e.type === "N01" ? (
        <span
          className="inline-flex items-center gap-1 text-[12.5px] text-texto-3"
          title="Alimentación externa"
        >
          <PlugZap size={15} strokeWidth={1.8} aria-hidden />
          <span className="sr-only">Alimentación externa</span>
        </span>
      ) : (
        <BateriaCorta pct={e.battery_pct} />
      )}
      <span className="min-w-0">
        <IconoEstado s={s} retirado={e.activity === "retired"} />
      </span>
    </button>
  );
}

const ROL = { owner: "Dueño", editor: "Editor", viewer: "Solo ver" } as const;

function Panel({
  e,
  s,
  info,
}: {
  e: EstadoEquipo;
  s: SaludEquipo | undefined;
  info: InfoSitio | undefined;
}) {
  const familia = familiaDeModelo(e.type);
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
      t: a.agua != null || info?.last_b01 ? "Temp. del suelo" : "Temperatura",
      v: `${num(a.temp)} °C`,
    });
  if (a?.humedad != null)
    celdas.push({ t: "Humedad", v: `${num(a.humedad, 0)} %` });
  return (
    <aside className="flex min-w-[280px] flex-[0_1_330px] flex-col gap-3.5 rounded-xl border border-linea bg-white p-[18px] lg:sticky lg:top-[84px]">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-fondo">
          <IconoFam familia={familia} tamano={18} />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <FamiliaYCodigo familia={familia} codigo={e.id} />
          <span className="truncate text-[15px] font-semibold text-tinta">
            {tituloEquipo(e)}
          </span>
        </span>
      </div>
      {e.activity === "retired" ? (
        <Estado tipo="gris">Equipo retirado: sus datos quedan.</Estado>
      ) : (
        <FraseEstado s={s} />
      )}
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
        <FilaDato icono={MapPin} etiqueta="Sitio">
          {e.site_name
            ? [e.site_name, e.plot_name].filter(Boolean).join(", ")
            : "Sin ubicar"}
        </FilaDato>
        <FilaDato icono={Clock} etiqueta="Último dato">
          {e.last_reading_at ? hace(e.last_reading_at) : "Sin datos"}
        </FilaDato>
        {s?.gateway_id ? (
          <FilaDato icono={RadioTower} etiqueta="Recibe">
            {s.gateway_id}
          </FilaDato>
        ) : null}
        {e.my_role ? (
          <FilaDato icono={Users} etiqueta="Tu acceso">
            {ROL[e.my_role]}
          </FilaDato>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {e.site_id ? (
          <Link
            to={`/sitio/${e.site_id}`}
            className="inline-flex h-[34px] items-center rounded-lg border border-tinta bg-tinta px-3 text-[13px] font-medium text-white no-underline hover:bg-[#1e293b]"
          >
            Ver datos
          </Link>
        ) : null}
        <Link
          to={`/equipo/${e.id}`}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta"
        >
          <Cpu size={15} strokeWidth={1.9} aria-hidden />
          Ficha del equipo
        </Link>
      </div>
    </aside>
  );
}
