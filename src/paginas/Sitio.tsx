// Datos de un sitio (D-39, D-40), como en la app: primero cómo está ahora (perfil de suelo o
// clima), después el período con su lectura y los gráficos, y la descarga. En la web "Ahora" queda
// en una columna angosta a la izquierda y el período ocupa el resto. La serie es del sitio: si se
// cambia el equipo, sigue. Cada uno ve lo que sus permisos le dejan (D-11).
import { ChevronRight, Cpu, Download, MapPin } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import {
  BateriaCorta,
  FamiliaYCodigo,
  HaceCorto,
  IconoFam,
} from "@/componentes/familia";
import { Grafico, type Serie } from "@/componentes/Grafico";
import {
  ConIcono,
  IconoIndice,
  INDICE,
  type ClaveIndice,
} from "@/componentes/Indice";
import { Barra, Contenido } from "@/componentes/Marco";
import { Medidor } from "@/componentes/Medidor";
import { Receptor } from "@/componentes/Receptor";
import {
  Aviso,
  Boton,
  Cargando,
  FilaDato,
  Segmento,
  Tarjeta,
  Titulo,
} from "@/componentes/ui";
import {
  aguaUtilPerfil,
  estadoHidrico,
  fraseSobreCC,
  horas,
  num,
  referencias,
  resumenClima,
  resumenSuelo,
  UNIDADES,
  unidadesDisponibles,
  ZONAS,
  type Dia,
  type Referencias,
  type Unidad,
} from "@/datos/agro";
import { aliasPropio, familiaDeModelo } from "@/datos/familias";
import {
  fechaHoraArg,
  PERIODOS,
  rango,
  textoIntervalo,
  type Periodo,
} from "@/datos/grafico";
import {
  ESCALA_DPV,
  ESCALA_ROCIO,
  escalaSuelo,
  fraseSuelo,
} from "@/datos/medidor";
import { capasSuelo, unidadDelSitio } from "@/datos/perfil";
import {
  descargarCsv,
  diarioSitio,
  infoSitio,
  serieSitio,
  type InfoSitio,
  type PuntoSerie,
} from "@/datos/series";
import { aguaSitio, type AguaSitio } from "@/datos/sitios";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";

const COLOR_E = ["#2563eb", "#16a34a", "#ea580c"];
const TIERRA = ["#a9875a", "#8f6f45", "#755a36"];
const diaArg = (t: number) => fechaHoraArg(t).slice(0, 10);
const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");

export function Sitio() {
  const { id = "" } = useParams();
  const c = useConsulta(useCallback(() => infoSitio(id), [id]));
  const info = c.datos?.info ?? null;
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const primero = info
    ? ([info.b01?.first, info.c01?.first].filter(Boolean).sort()[0] ?? null)
    : null;
  const conSuelo = !!info?.b01;

  const cargarPeriodo = useCallback(async () => {
    const r = rango(periodo, Date.now(), primero);
    if (!r)
      return {
        b01: [] as PuntoSerie[],
        c01: [] as PuntoSerie[],
        dias: [] as Dia[],
        agua: [] as AguaSitio[],
        error: null,
        r: null,
      };
    const [s, d, w] = await Promise.all([
      serieSitio(id, r.desde, r.hasta, r.intervalo),
      diarioSitio(id, diaArg(r.desde), diaArg(r.hasta)),
      conSuelo
        ? aguaSitio(id, r.desde, r.hasta)
        : Promise.resolve({ eventos: [] as AguaSitio[], error: null }),
    ]);
    return {
      b01: s.b01,
      c01: s.c01,
      dias: d.dias,
      agua: w.eventos,
      error: s.error ?? d.error ?? w.error,
      r,
    };
  }, [id, periodo, primero, conSuelo]);
  const s = useConsulta(cargarPeriodo);
  const r = s.datos?.r ?? null;
  const hayDatos = !!(info?.b01 || info?.c01);
  const d = info?.device ?? null;
  const familia = d ? familiaDeModelo(d.type) : null;
  const ultimo = info?.last_b01 ?? info?.last_c01 ?? null;
  const hoy =
    (s.datos?.dias ?? []).find(
      (x) => x.family === "C01" && r && x.dia === diaArg(r.hasta),
    ) ?? null;

  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          ...(info?.establishment_id
            ? [
                {
                  texto: info.establishment_name ?? "Campo",
                  a: `/campo/${info.establishment_id}`,
                },
              ]
            : []),
          ...(info?.plot_name ? [{ texto: info.plot_name }] : []),
          { texto: info?.name ?? "Sitio" },
        ]}
      >
        {d ? (
          <Link
            to={`/equipo/${d.id}`}
            className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta"
          >
            <Cpu size={15} strokeWidth={1.9} aria-hidden />
            Equipo
          </Link>
        ) : null}
        {info && hayDatos ? <Descarga info={info} r={r} /> : null}
      </Barra>
      <Contenido>
        <Aviso mensaje={c.error ?? s.error} />
        {c.cargando && !info ? <Cargando texto="Leyendo el sitio…" /> : null}
        {!c.cargando && !info && !c.error ? (
          <Aviso
            tipo="aviso"
            mensaje="No tenés acceso a este sitio o no existe."
          />
        ) : null}
        {info ? (
          <Titulo
            icono={
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-linea bg-white">
                <IconoFam familia={familia} tamano={20} />
              </span>
            }
            titulo={info.name}
            datos={
              <>
                {d ? (
                  <FamiliaYCodigo
                    familia={familia}
                    codigo={
                      aliasPropio(d.alias, d.id)
                        ? `${d.id} · ${aliasPropio(d.alias, d.id)}`
                        : d.id
                    }
                  />
                ) : (
                  <span>Sin equipo</span>
                )}
                {info.plot_name || info.establishment_name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin
                      size={14}
                      strokeWidth={1.9}
                      className="text-texto-3"
                      aria-hidden
                    />
                    {info.plot_name ?? info.establishment_name}
                  </span>
                ) : null}
                {ultimo ? <HaceCorto fecha={ultimo.t} /> : null}
                {ultimo &&
                "battery_pct" in ultimo &&
                ultimo.battery_pct != null ? (
                  <BateriaCorta pct={ultimo.battery_pct} />
                ) : null}
              </>
            }
          />
        ) : null}
        {info && !hayDatos && d?.type === "N01" ? <Receptor id={d.id} /> : null}
        {info && !hayDatos && d?.type !== "N01" ? (
          <Tarjeta>
            <p className="text-[13px] text-texto-2">
              Este sitio todavía no tiene datos.
            </p>
          </Tarjeta>
        ) : null}
        {info && hayDatos ? (
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex min-w-[290px] flex-[0_1_340px] flex-col gap-4 lg:sticky lg:top-[84px]">
              {info.b01 ? <PerfilSuelo info={info} /> : null}
              {info.c01 ? <ClimaAhora info={info} hoy={hoy} /> : null}
              <ElSitio info={info} />
            </div>
            <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <Segmento
                  etiqueta="Período"
                  opciones={PERIODOS}
                  valor={periodo}
                  alCambiar={setPeriodo}
                />
                {r ? (
                  <span className="text-xs text-texto-3">
                    Promedios cada {textoIntervalo(r.intervalo)}
                  </span>
                ) : null}
              </div>
              {r && s.datos ? (
                <>
                  <Periodo
                    dias={s.datos.dias}
                    suelo={conSuelo}
                    agua={s.datos.agua}
                  />
                  {info.b01 ? (
                    <Suelo
                      info={info}
                      serie={s.datos.b01}
                      agua={s.datos.agua}
                      desde={r.desde}
                      hasta={r.hasta}
                      intervalo={r.intervalo}
                    />
                  ) : null}
                  {info.c01 ? (
                    <Aire
                      serie={s.datos.c01}
                      desde={r.desde}
                      hasta={r.hasta}
                      intervalo={r.intervalo}
                    />
                  ) : null}
                  <Tarjeta>
                    <Grafico
                      titulo="Batería"
                      unidad="%"
                      alto={110}
                      tiempos={(conSuelo ? s.datos.b01 : s.datos.c01).map((p) =>
                        Date.parse(p.t),
                      )}
                      series={[
                        {
                          nombre: "Batería",
                          color: "#64748b",
                          valores: (conSuelo ? s.datos.b01 : s.datos.c01).map(
                            (p) => p.battery_pct,
                          ),
                        },
                      ]}
                      desde={r.desde}
                      hasta={r.hasta}
                      intervaloS={r.intervalo}
                    />
                  </Tarjeta>
                </>
              ) : (
                <Tarjeta>
                  <Cargando texto="Leyendo el período…" />
                </Tarjeta>
              )}
            </div>
          </div>
        ) : null}
      </Contenido>
    </>
  );
}

function Descarga({
  info,
  r,
}: {
  info: InfoSitio;
  r: { desde: number; hasta: number } | null;
}) {
  const [bajando, setBajando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      {mensaje ? <span className="text-xs text-texto-3">{mensaje}</span> : null}
      <Boton
        variante="secundario"
        icono={Download}
        cargando={bajando}
        disabled={!r}
        onClick={async () => {
          if (!r) return;
          setBajando(true);
          setMensaje(null);
          const res = await descargarCsv(info, r.desde, r.hasta);
          setBajando(false);
          setMensaje(
            res.ok
              ? `${res.filas?.toLocaleString("es-AR")} lecturas`
              : (res.mensaje ?? "No se pudo armar el archivo."),
          );
        }}
      >
        Descargar CSV
      </Boton>
    </span>
  );
}

function ElSitio({ info }: { info: InfoSitio }) {
  const datos = [info.b01, info.c01].filter(
    (x): x is NonNullable<typeof x> => !!x,
  );
  const n = datos.reduce((a, x) => a + x.n, 0);
  const desde = datos.map((x) => x.first).sort()[0];
  const textura = info.electrodes.find((e) => e.texture)?.texture;
  return (
    <Tarjeta titulo="El sitio">
      {info.device ? (
        <FilaDato icono={INDICE.equipo.icono} etiqueta="Equipo desde">
          {fecha(info.device.since)}
        </FilaDato>
      ) : null}
      {n ? (
        <FilaDato icono={INDICE.lecturas.icono} etiqueta="Lecturas">
          {n.toLocaleString("es-AR")}
        </FilaDato>
      ) : null}
      {desde ? (
        <FilaDato icono={INDICE.desde.icono} etiqueta="Datos desde">
          {fecha(desde)}
        </FilaDato>
      ) : null}
      {info.b01 ? (
        <FilaDato icono={INDICE.suelo.icono} etiqueta="Suelo">
          {textura
            ? `${textura}${info.electrodes.some((e) => e.calibrated) ? " (calibrado)" : ""}`
            : info.electrodes.some((e) => e.calibrated)
              ? "Calibrado"
              : "Sin calibración"}
        </FilaDato>
      ) : null}
      {info.b01 ? (
        <Link
          to={`/sitio/${info.id}/calibracion`}
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-acento-oscuro no-underline hover:underline"
        >
          Ver la calibración
          <ChevronRight size={14} aria-hidden />
        </Link>
      ) : null}
    </Tarjeta>
  );
}

// ------------------------------------------------------------------ suelo

function PerfilSuelo({ info }: { info: InfoSitio }) {
  const ult = info.last_b01;
  const capas = useMemo(() => capasSuelo(info), [info]);
  const unidad = unidadDelSitio(info);
  const u = UNIDADES[unidad];
  const perfil = aguaUtilPerfil(capas);
  const sobreCC = fraseSobreCC(perfil.sobreCC);
  if (!ult) return null;
  return (
    <Tarjeta
      titulo={
        <ConAyuda que="PMP, CC y SAT" texto={AYUDA.zonasSuelo}>
          Ahora
        </ConAyuda>
      }
      derecha={<HaceCorto fecha={ult.t} />}
    >
      <div className="mb-1 flex items-end justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs text-texto-3">
            <ConAyuda que="agua útil del perfil" texto={AYUDA.aguaUtil}>
              <ConIcono que="aguaUtil">Agua útil del perfil</ConIcono>
            </ConAyuda>
          </span>
          {perfil.pct != null ? (
            <span className="text-[28px] leading-tight font-semibold text-[#047857]">
              {Math.round(perfil.pct)} %
            </span>
          ) : (
            <span className="text-base font-semibold text-tinta">
              Sin calibración
            </span>
          )}
          {sobreCC ? (
            <span className="text-[11.5px] text-[#0369a1]">{sobreCC}</span>
          ) : null}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-texto-3">Temp. del suelo</span>
          <span className="inline-flex items-center gap-1 text-[22px] font-semibold text-tinta">
            <IconoIndice que="tempSuelo" tamano={16} />
            {num(ult.soil_temp)} °C
          </span>
        </div>
      </div>
      {capas.map((k, n) => (
        <div
          key={k.i}
          className="flex items-center gap-3 border-t border-separador py-2.5 first:border-t-0"
        >
          <span
            className="flex h-[34px] w-[34px] shrink-0 flex-col items-center justify-center rounded-lg text-xs leading-tight font-semibold text-white"
            style={{ background: TIERRA[n] }}
            title={`Electrodo ${k.i}`}
          >
            {k.profundidad ?? `E${k.i}`}
            {k.profundidad != null ? (
              <span className="text-[9.5px] font-normal">cm</span>
            ) : null}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className="text-[15px] font-semibold"
              style={{ color: colorValor(k.valor, k.refs) }}
            >
              {num(k.valor, u.decimales)} {u.simbolo}
            </span>
            {k.refs && k.valor != null ? (
              <Medidor
                escala={escalaSuelo(k.refs, k.valor)}
                valor={k.valor}
                nombre={`Electrodo ${k.i}`}
                oracion={fraseSuelo(k.valor, k.refs)}
              />
            ) : (
              <span className="text-xs text-texto-3">
                {unidad === "mv" ? `${num(k.mv, 0)} mV` : "Sin calibración"}
              </span>
            )}
          </div>
        </div>
      ))}
    </Tarjeta>
  );
}

/** Color del valor según su zona hídrica (el mismo de la app). */
function colorValor(v: number | null, r: Referencias | null): string {
  const est = r ? estadoHidrico(v, r) : null;
  return est ? ZONAS[est.zona].color : "#0f172a";
}

function Suelo({
  info,
  serie,
  agua,
  desde,
  hasta,
  intervalo,
}: {
  info: InfoSitio;
  serie: PuntoSerie[];
  agua: AguaSitio[];
  desde: number;
  hasta: number;
  intervalo: number;
}) {
  const disponibles = useMemo(
    () =>
      unidadesDisponibles([
        ...(info.last_b01 ? [info.last_b01] : []),
        ...serie,
      ]),
    [info, serie],
  );
  const [elegida, setElegida] = useState<Unidad | null>(null);
  const unidad =
    elegida && disponibles.includes(elegida) ? elegida : disponibles[0];
  const u = UNIDADES[unidad];
  const tiempos = useMemo(() => serie.map((p) => Date.parse(p.t)), [serie]);
  const humedad: Serie[] = ([1, 2, 3] as const).map((i) => {
    const e = info.electrodes.find((x) => x.index === i);
    const refs = referencias(e, unidad);
    return {
      nombre: e?.depth != null ? `${e.depth} cm` : `E${i}`,
      color: COLOR_E[i - 1],
      valores: serie.map((p) => p[`e${i}_${unidad}`]),
      referencia: refs
        ? {
            desde: refs.pmp,
            hasta: refs.cc,
            color: "#059669",
            lineas: [
              { valor: refs.cc, etiqueta: "CC" },
              { valor: refs.pmp, etiqueta: "PMP" },
              { valor: refs.sat, etiqueta: "SAT" },
            ],
          }
        : null,
    };
  });
  const hayRefs = humedad.some((h) => h.referencia);
  return (
    <>
      <Tarjeta>
        <Grafico
          accion={
            disponibles.length > 1 ? (
              <Segmento
                etiqueta="Unidad"
                opciones={disponibles.map((x) => ({
                  valor: x,
                  texto: UNIDADES[x].corto,
                }))}
                valor={unidad}
                alCambiar={setElegida}
              />
            ) : null
          }
          titulo={
            unidad === "mv" ? "Humedad del suelo (señal)" : "Humedad del suelo"
          }
          unidad={u.simbolo}
          decimales={u.decimales}
          tiempos={tiempos}
          series={humedad}
          aislable
          agua={agua.map((a) => ({
            t: Date.parse(a.started_at),
            mm: a.gross_mm,
            tipo: a.kind,
          }))}
          desde={desde}
          hasta={hasta}
          intervaloS={intervalo}
          alto={260}
          nota={[
            hayRefs
              ? "Tocá una profundidad para verla sola, con su franja de agua útil (entre PMP y CC)."
              : null,
            unidad === "mv" ? "Más mV = suelo más seco." : null,
          ]
            .filter(Boolean)
            .join(" ")}
        />
      </Tarjeta>
      <Tarjeta>
        <Grafico
          titulo="Temperatura del suelo"
          unidad="°C"
          decimales={1}
          tiempos={tiempos}
          series={[
            {
              nombre: "Promedio",
              color: "#dc2626",
              valores: serie.map((p) => p.soil_temp),
            },
          ]}
          banda={{
            nombre: "Mín. y máx.",
            color: "#dc2626",
            min: serie.map((p) => p.soil_temp_min),
            max: serie.map((p) => p.soil_temp_max),
          }}
          desde={desde}
          hasta={hasta}
          intervaloS={intervalo}
          alto={150}
        />
      </Tarjeta>
    </>
  );
}

// ------------------------------------------------------------------ clima

function ClimaAhora({ info, hoy }: { info: InfoSitio; hoy: Dia | null }) {
  const a = info.last_c01;
  if (!a) return null;
  const aRocio =
    a.dew_point != null && a.air_temp != null ? a.air_temp - a.dew_point : null;
  return (
    <>
      <Tarjeta titulo="Ahora" derecha={<HaceCorto fecha={a.t} />}>
        <div className="grid grid-cols-2 gap-3">
          <Grande
            etiqueta="Temperatura"
            color="#dc2626"
            icono={<IconoIndice que="temperatura" tamano={20} />}
            valor={num(a.air_temp)}
            unidad="°C"
          />
          <Grande
            etiqueta="Humedad"
            color="#2563eb"
            icono={<IconoIndice que="humedad" tamano={20} />}
            valor={num(a.humidity, 0)}
            unidad="%"
          />
        </div>
        {a.dpv != null ? (
          <div className="mt-3.5 flex flex-col gap-1 border-t border-separador pt-3">
            <span className="flex justify-between text-[13px]">
              <span className="font-medium text-tinta">
                <ConAyuda que="DPV" texto={AYUDA.dpv}>
                  <ConIcono que="dpv">DPV</ConIcono>
                </ConAyuda>
              </span>
              <span className="text-tinta">{num(a.dpv, 2)} kPa</span>
            </span>
            <Medidor escala={ESCALA_DPV} valor={a.dpv} nombre="DPV" />
          </div>
        ) : null}
        {aRocio != null ? (
          <div className="mt-3 flex flex-col gap-1 border-t border-separador pt-3">
            <span className="flex justify-between text-[13px]">
              <span className="font-medium text-tinta">
                <ConAyuda que="punto de rocío" texto={AYUDA.rocio}>
                  <ConIcono que="rocio">Distancia al rocío</ConIcono>
                </ConAyuda>
              </span>
              <span className="text-tinta">{num(aRocio)} °C</span>
            </span>
            <Medidor
              escala={ESCALA_ROCIO}
              valor={aRocio}
              nombre="Distancia al rocío"
            />
          </div>
        ) : null}
      </Tarjeta>
      {hoy ? (
        <Tarjeta titulo="Hoy">
          <div className="grid grid-cols-2 gap-3">
            <Celda
              titulo={<ConIcono que="minima">Mínima</ConIcono>}
              valor={`${num(hoy.tmin)} °C`}
            />
            <Celda
              titulo={<ConIcono que="maxima">Máxima</ConIcono>}
              valor={`${num(hoy.tmax)} °C`}
            />
            {hoy.horas_frio ? (
              <Celda
                titulo={
                  <ConAyuda que="horas de frío" texto={AYUDA.horasFrio}>
                    <ConIcono que="horasFrio">Horas de frío</ConIcono>
                  </ConAyuda>
                }
                valor={horas(hoy.horas_frio)}
                nota="≤ 7,2 °C"
              />
            ) : null}
            {hoy.horas_helada ? (
              <Celda
                titulo={
                  <ConAyuda que="horas de helada" texto={AYUDA.horasHelada}>
                    <ConIcono que="horasHelada">Horas de helada</ConIcono>
                  </ConAyuda>
                }
                valor={horas(hoy.horas_helada)}
                nota="≤ 0 °C"
              />
            ) : null}
          </div>
        </Tarjeta>
      ) : null}
    </>
  );
}

function Grande({
  etiqueta,
  color,
  icono,
  valor,
  unidad,
}: {
  etiqueta: string;
  color: string;
  icono: ReactNode;
  valor: string;
  unidad: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs" style={{ color }}>
        {etiqueta}
      </span>
      <span className="flex items-center gap-1.5">
        <span style={{ color }}>{icono}</span>
        <span className="text-[28px] leading-tight font-semibold text-tinta">
          {valor}
          <span className="text-sm font-normal text-texto-2"> {unidad}</span>
        </span>
      </span>
    </div>
  );
}

function Celda({
  titulo,
  valor,
  nota,
}: {
  titulo: ReactNode;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-texto-3">{titulo}</span>
      <span className="text-base font-semibold text-tinta">{valor}</span>
      {nota ? <span className="text-[11.5px] text-texto-3">{nota}</span> : null}
    </div>
  );
}

function Aire({
  serie,
  desde,
  hasta,
  intervalo,
}: {
  serie: PuntoSerie[];
  desde: number;
  hasta: number;
  intervalo: number;
}) {
  const tiempos = useMemo(() => serie.map((p) => Date.parse(p.t)), [serie]);
  const comun = { tiempos, desde, hasta, intervaloS: intervalo };
  return (
    <>
      <Tarjeta>
        <Grafico
          titulo="Temperatura del aire"
          unidad="°C"
          decimales={1}
          series={[
            {
              nombre: "Promedio",
              color: "#dc2626",
              valores: serie.map((p) => p.air_temp),
            },
          ]}
          banda={{
            nombre: "Mín. y máx.",
            color: "#dc2626",
            min: serie.map((p) => p.air_temp_min),
            max: serie.map((p) => p.air_temp_max),
          }}
          alto={220}
          {...comun}
        />
      </Tarjeta>
      <Tarjeta>
        <Grafico
          titulo="Humedad relativa del aire"
          unidad="%"
          series={[
            {
              nombre: "Humedad",
              color: "#2563eb",
              valores: serie.map((p) => p.humidity),
            },
          ]}
          alto={170}
          {...comun}
        />
      </Tarjeta>
    </>
  );
}

// ------------------------------------------------------------------ durante el período

function Periodo({
  dias,
  suelo,
  agua,
}: {
  dias: Dia[];
  suelo: boolean;
  agua: AguaSitio[];
}) {
  const celdas: {
    que: ClaveIndice;
    titulo: string;
    valor: string;
    nota?: string;
    ayuda?: string;
  }[] = [];
  if (suelo) {
    const rs = resumenSuelo(dias);
    const riegos = agua.filter((a) => a.kind === "riego");
    const lluvias = agua.filter((a) => a.kind === "lluvia");
    const suma = (l: AguaSitio[]) =>
      `${Math.round(l.reduce((s, a) => s + (a.gross_mm ?? 0), 0))} mm`;
    celdas.push({
      que: "riego",
      titulo: "Riegos cargados",
      valor: String(riegos.length),
      nota: riegos.length ? suma(riegos) : undefined,
    });
    celdas.push({
      que: "lluvia",
      titulo: "Lluvias cargadas",
      valor: String(lluvias.length),
      nota: lluvias.length ? suma(lluvias) : undefined,
    });
    celdas.push({
      que: "tempSuelo",
      titulo: "Temp. del suelo",
      valor: `${num(rs.reciente)} °C`,
      nota: `promedio de ${rs.diasReciente} días`,
    });
    celdas.push({
      que: "amplitud",
      titulo: "Amplitud diaria",
      valor: `${num(rs.amplitud)} °C`,
      nota: "máxima menos mínima",
      ayuda: AYUDA.amplitud,
    });
  } else {
    const rc = resumenClima(dias);
    celdas.push({
      que: "temperatura",
      titulo: "Mínima y máxima",
      valor: `${num(rc.tmin)} a ${num(rc.tmax)} °C`,
    });
    celdas.push({
      que: "horasFrio",
      titulo: "Horas de frío",
      valor: horas(rc.frio),
      nota: "≤ 7,2 °C",
      ayuda: AYUDA.horasFrio,
    });
    celdas.push({
      que: "horasHelada",
      titulo: "Horas de helada",
      valor: horas(rc.helada),
      nota: "≤ 0 °C",
      ayuda: AYUDA.horasHelada,
    });
    celdas.push({
      que: "gradosDia",
      titulo: "Grados-día",
      valor: num(rc.gdd, 0),
      nota: "base 10 °C",
      ayuda: AYUDA.gradosDia,
    });
  }
  return (
    <section className="flex flex-wrap items-stretch gap-y-2.5 rounded-xl border border-linea bg-white px-1 py-3.5">
      <h2 className="self-center px-3.5 text-[13px] font-semibold text-tinta">
        {suelo ? (
          "Durante el período"
        ) : (
          <ConAyuda que="lectura del período" texto={AYUDA.resumenClima}>
            Durante el período
          </ConAyuda>
        )}
      </h2>
      {celdas.map((k) => (
        <div
          key={k.titulo}
          className="flex min-w-[120px] flex-[1_1_120px] flex-col border-l border-separador px-4"
        >
          <span className="text-xs text-texto-3">
            {k.ayuda ? (
              <ConAyuda que={k.titulo.toLowerCase()} texto={k.ayuda}>
                <ConIcono que={k.que}>{k.titulo}</ConIcono>
              </ConAyuda>
            ) : (
              <ConIcono que={k.que}>{k.titulo}</ConIcono>
            )}
          </span>
          <span className="text-[17px] font-semibold text-tinta">
            {k.valor}
          </span>
          {k.nota ? (
            <span className="text-[11.5px] text-texto-3">{k.nota}</span>
          ) : null}
        </div>
      ))}
    </section>
  );
}
