// Datos de un sitio (D-39, D-40): cabecera noche con el equipo, el período y la descarga; abajo,
// cómo está ahora (perfil de suelo o clima), los gráficos del período y la lectura agronómica.
// La serie es del sitio: si se cambia el equipo, sigue. Cada uno ve lo que sus permisos dejan (D-11).
import { ArrowLeft, CalendarRange, Database, Download, Droplets, MapPin, Thermometer } from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { HaceCorto, IconoFamilia } from "@/componentes/familia";
import { Grafico, type Serie } from "@/componentes/Grafico";
import { Medidor } from "@/componentes/Medidor";
import { Aviso, Boton, Cargando, Segmento, Tarjeta } from "@/componentes/ui";
import { estadoHidrico, horas, num, referencias, ZONAS, type Referencias, resumenClima, resumenSuelo, UNIDADES, unidadesDisponibles, type Dia, type Unidad } from "@/datos/agro";
import { aliasPropio, familiaDeModelo, FAMILIAS } from "@/datos/familias";
import { fechaHoraArg, PERIODOS, rango, textoIntervalo, type Periodo } from "@/datos/grafico";
import { ESCALA_DPV, ESCALA_ROCIO, escalaSuelo, fraseSuelo } from "@/datos/medidor";
import { aguaPerfil, capasSuelo, unidadDelSitio } from "@/datos/perfil";
import { descargarCsv, diarioSitio, infoSitio, serieSitio, type InfoSitio, type PuntoSerie } from "@/datos/series";
import { aguaSitio, type AguaSitio } from "@/datos/sitios";
import { useConsulta } from "@/datos/useConsulta";

const COLOR_E = ["#2563eb", "#16a34a", "#ea580c"];
const TIERRA = ["#a9875a", "#8f6f45", "#755a36"];
const diaArg = (t: number) => fechaHoraArg(t).slice(0, 10);
const fecha = (t: string) => fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");

export function Sitio() {
  const { id = "" } = useParams();
  const c = useConsulta(useCallback(() => infoSitio(id), [id]));
  const info = c.datos?.info ?? null;
  const [periodo, setPeriodo] = useState<Periodo>("7d");
  const primero = info ? ([info.b01?.first, info.c01?.first].filter(Boolean).sort()[0] ?? null) : null;
  const conSuelo = !!info?.b01;

  const cargarPeriodo = useCallback(async () => {
    const r = rango(periodo, Date.now(), primero);
    if (!r) return { b01: [] as PuntoSerie[], c01: [] as PuntoSerie[], dias: [] as Dia[], agua: [] as AguaSitio[], error: null, r: null };
    const [s, d, w] = await Promise.all([
      serieSitio(id, r.desde, r.hasta, r.intervalo),
      diarioSitio(id, diaArg(r.desde), diaArg(r.hasta)),
      conSuelo ? aguaSitio(id, r.desde, r.hasta) : Promise.resolve({ eventos: [] as AguaSitio[], error: null }),
    ]);
    return { b01: s.b01, c01: s.c01, dias: d.dias, agua: w.eventos, error: s.error ?? d.error ?? w.error, r };
  }, [id, periodo, primero, conSuelo]);
  const s = useConsulta(cargarPeriodo);
  const r = s.datos?.r ?? null;
  const hayDatos = !!(info?.b01 || info?.c01);

  return (
    <div className="flex flex-col">
      <Cabecera info={info} cargando={c.cargando} periodo={periodo} alCambiarPeriodo={setPeriodo} rango={r} hayDatos={hayDatos} />
      <main className="relative -mt-14 mx-auto flex w-full max-w-[1400px] flex-col gap-5 px-5 pb-12 lg:px-10">
        <Aviso mensaje={c.error ?? s.error} />
        {!c.cargando && !info && !c.error ? (
          <Tarjeta>
            <p>No tenés acceso a este sitio o no existe.</p>
          </Tarjeta>
        ) : null}
        {info && !hayDatos ? (
          <Tarjeta>
            <p className="text-[15px]">{info.device?.type === "N01" ? "En este sitio hay un receptor: no mide, pasa los datos de los sensores." : "Este sitio todavía no tiene datos."}</p>
          </Tarjeta>
        ) : null}
        {info?.b01 ? (
          <div className="flex flex-wrap items-start gap-5">
            <PerfilSuelo info={info} />
            {r && s.datos ? (
              <Suelo info={info} serie={s.datos.b01} agua={s.datos.agua} desde={r.desde} hasta={r.hasta} intervalo={r.intervalo} />
            ) : (
              <Tarjeta className="min-w-0 flex-[2_1_560px]">
                <Cargando texto="Leyendo el período…" />
              </Tarjeta>
            )}
          </div>
        ) : null}
        {info?.c01 ? (
          <div className="flex flex-wrap items-start gap-5">
            <ClimaAhora info={info} />
            {r && s.datos ? <Aire serie={s.datos.c01} desde={r.desde} hasta={r.hasta} intervalo={r.intervalo} /> : null}
          </div>
        ) : null}
        {r && s.datos && hayDatos ? (
          <div className="flex flex-wrap items-start gap-5">
            <Lectura dias={s.datos.dias} suelo={conSuelo} agua={s.datos.agua} />
            <Tarjeta className="min-w-0 flex-[2_1_560px]">
              <Grafico
                titulo="Batería"
                unidad="%"
                alto={140}
                tiempos={(conSuelo ? s.datos.b01 : s.datos.c01).map((p) => Date.parse(p.t))}
                series={[{ nombre: "Batería", color: "#64748b", valores: (conSuelo ? s.datos.b01 : s.datos.c01).map((p) => p.battery_pct) }]}
                desde={r.desde}
                hasta={r.hasta}
                intervaloS={r.intervalo}
              />
            </Tarjeta>
          </div>
        ) : null}
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ cabecera

function Cabecera({
  info,
  cargando,
  periodo,
  alCambiarPeriodo,
  rango: r,
  hayDatos,
}: {
  info: InfoSitio | null;
  cargando: boolean;
  periodo: Periodo;
  alCambiarPeriodo: (p: Periodo) => void;
  rango: { desde: number; hasta: number; intervalo: number } | null;
  hayDatos: boolean;
}) {
  const [bajando, setBajando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const d = info?.device ?? null;
  const familia = d ? familiaDeModelo(d.type) : null;
  const datos = [info?.b01, info?.c01].filter((x): x is NonNullable<typeof x> => !!x);
  const n = datos.reduce((a, x) => a + x.n, 0);
  const desde = datos.map((x) => x.first).sort()[0];
  const hasta = datos.map((x) => x.last).sort().reverse()[0];
  return (
    <header className="fondo-noche relative overflow-hidden px-5 pt-6 pb-24 text-noche-texto lg:px-10">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <nav aria-label="Ubicación" className="flex flex-wrap items-center gap-2 text-[13px] text-noche-texto-2">
          <Link to="/" className="inline-flex items-center gap-1 text-noche-texto-2 no-underline hover:text-white">
            <ArrowLeft size={14} aria-hidden />
            Red
          </Link>
          {info?.establishment_name ? (
            <>
              <span aria-hidden>/</span>
              <span>{info.establishment_name}</span>
            </>
          ) : null}
          {info?.plot_name ? (
            <>
              <span aria-hidden>/</span>
              <span>{info.plot_name}</span>
            </>
          ) : null}
        </nav>
        {cargando && !info ? <Cargando noche texto="Leyendo el sitio…" /> : null}
        {info ? (
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <IconoFamilia familia={familia} tamano={64} noche />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[13px] font-semibold" style={{ color: familia ? FAMILIAS[familia].noche : "#38bdf8" }}>
                  {familia ? FAMILIAS[familia].nombre : "Sitio sin equipo"}
                </span>
                <h1 className="text-[28px] leading-tight font-bold tracking-tight text-white">{info.name}</h1>
                {d ? <span className="font-mono text-[13px] text-noche-texto-2">{[aliasPropio(d.alias, d.id), d.id].filter(Boolean).join(", ")}</span> : null}
              </div>
            </div>
            {hayDatos ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <Segmento etiqueta="Período" noche opciones={PERIODOS} valor={periodo} alCambiar={alCambiarPeriodo} />
                <Boton
                  variante="noche"
                  icono={Download}
                  cargando={bajando}
                  disabled={!r}
                  onClick={async () => {
                    if (!r) return;
                    setBajando(true);
                    setMensaje(null);
                    const res = await descargarCsv(info, r.desde, r.hasta);
                    setBajando(false);
                    setMensaje(res.ok ? `Archivo con ${res.filas?.toLocaleString("es-AR")} lecturas.` : (res.mensaje ?? "No se pudo armar el archivo."));
                  }}
                >
                  Descargar CSV
                </Boton>
              </div>
            ) : null}
          </div>
        ) : null}
        {info ? (
          <div className="flex flex-wrap gap-x-7 gap-y-2 border-t border-noche-borde pt-4 text-sm">
            <Dato icono={<MapPin size={17} aria-hidden />}>{info.establishment_name ? [info.establishment_name, info.plot_name].filter(Boolean).join(", ") : "Campo de otra persona"}</Dato>
            {n > 0 ? <Dato icono={<Database size={17} aria-hidden />}>{n.toLocaleString("es-AR")} lecturas</Dato> : null}
            {n > 0 ? (
              <Dato icono={<CalendarRange size={17} aria-hidden />}>
                {fecha(desde)} → {fecha(hasta)}
              </Dato>
            ) : null}
            {r ? (
              <span className="text-noche-texto-2">
                Gráficos con promedio cada {textoIntervalo(r.intervalo)}
                {mensaje ? `. ${mensaje}` : ""}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

function Dato({ icono, children }: { icono: ReactNode; children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-noche-texto">
      <span className="text-noche-texto-2">{icono}</span>
      {children}
    </span>
  );
}

// ------------------------------------------------------------------ suelo

function PerfilSuelo({ info }: { info: InfoSitio }) {
  const ult = info.last_b01;
  const capas = useMemo(() => capasSuelo(info), [info]);
  const unidad = unidadDelSitio(info);
  const u = UNIDADES[unidad];
  const agua = aguaPerfil(capas);
  if (!ult) return null;
  return (
    <Tarjeta className="min-w-0 flex-[1_1_360px]" titulo="Último dato" derecha={<HaceCorto fecha={ult.t} />}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          {agua != null ? (
            <>
              <span className="text-[46px] leading-none font-bold tracking-tight text-tinta">
                {Math.round(agua)}
                <span className="text-[22px] font-medium text-texto-2"> %</span>
              </span>
              <span className="text-[13px] text-texto-2">Agua útil del perfil</span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold text-tinta">Sin calibración</span>
              <span className="text-[13px] text-texto-2">Contenido de agua, sin agua útil</span>
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="flex items-center gap-1 text-2xl font-bold text-tinta">
            <Thermometer size={18} className="text-[#ea580c]" aria-hidden />
            {num(ult.soil_temp)}
            <span className="text-[15px] font-medium text-texto-2"> °C</span>
          </span>
          <span className="text-[13px] text-texto-2">Temperatura del suelo</span>
        </div>
      </div>
      <div className="overflow-hidden rounded-campo border border-borde">
        {capas.map((k, n) => (
          <div key={k.i} className={`flex ${n > 0 ? "border-t border-borde" : ""}`}>
            <div className="flex w-16 shrink-0 flex-col items-center justify-center text-white" style={{ background: TIERRA[n] }}>
              {k.profundidad != null ? (
                <b className="text-base">
                  {k.profundidad}
                  <span className="text-xs font-medium"> cm</span>
                </b>
              ) : null}
              <span className="font-mono text-[11px] text-white/85">E{k.i}</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3.5 py-3">
              <span className="text-[22px] font-bold" style={{ color: colorValor(k.valor, k.refs) }}>
                {num(k.valor, u.decimales)}
                <span className="text-sm font-medium"> {u.simbolo}</span>
              </span>
              {k.refs && k.valor != null ? (
                <Medidor escala={escalaSuelo(k.refs, k.valor)} valor={k.valor} nombre={`Electrodo ${k.i}`} oracion={fraseSuelo(k.valor, k.refs)} />
              ) : (
                <span className="text-xs text-texto-2">{unidad === "mv" ? `${num(k.mv, 0)} mV` : "Sin calibración"}</span>
              )}
              {k.textura ? <span className="text-xs text-texto-2">Suelo {k.textura.toLowerCase()}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </Tarjeta>
  );
}

/** Color del valor según su zona hídrica (el mismo de la app). */
function colorValor(v: number | null, r: Referencias | null): string {
  const est = r ? estadoHidrico(v, r) : null;
  return est ? ZONAS[est.zona].color : "#0f172a";
}

function Suelo({ info, serie, agua, desde, hasta, intervalo }: { info: InfoSitio; serie: PuntoSerie[]; agua: AguaSitio[]; desde: number; hasta: number; intervalo: number }) {
  const disponibles = useMemo(() => unidadesDisponibles([...(info.last_b01 ? [info.last_b01] : []), ...serie]), [info, serie]);
  const [elegida, setElegida] = useState<Unidad | null>(null);
  const unidad = elegida && disponibles.includes(elegida) ? elegida : disponibles[0];
  const u = UNIDADES[unidad];
  const tiempos = useMemo(() => serie.map((p) => Date.parse(p.t)), [serie]);
  const humedad: Serie[] = ([1, 2, 3] as const).map((i) => {
    const e = info.electrodes.find((x) => x.index === i);
    const refs = referencias(e, unidad);
    return {
      nombre: e?.depth != null ? `E${i} ${e.depth} cm` : `E${i}`,
      color: COLOR_E[i - 1],
      valores: serie.map((p) => p[`e${i}_${unidad}`]),
      referencia: refs ? { desde: refs.pmp, hasta: refs.cc, color: "#059669", lineas: [{ valor: refs.cc, etiqueta: "CC" }, { valor: refs.pmp, etiqueta: "PMP" }, { valor: refs.sat, etiqueta: "SAT" }] } : null,
    };
  });
  const hayRefs = humedad.some((h) => h.referencia);
  return (
    <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
      <Tarjeta
        titulo="Humedad del suelo"
        derecha={disponibles.length > 1 ? <Segmento chico etiqueta="Unidad" opciones={disponibles.map((x) => ({ valor: x, texto: UNIDADES[x].corto }))} valor={unidad} alCambiar={setElegida} /> : null}
      >
        <Grafico
          titulo={unidad === "mv" ? "Señal de las sondas" : u.largo}
          unidad={u.simbolo}
          decimales={u.decimales}
          tiempos={tiempos}
          series={humedad}
          aislable
          agua={agua.map((a) => ({ t: Date.parse(a.started_at), mm: a.gross_mm, tipo: a.kind }))}
          desde={desde}
          hasta={hasta}
          intervaloS={intervalo}
          alto={300}
          nota={[
            hayRefs ? "Tocá una profundidad para verla sola, con su franja de agua útil (entre PMP y CC)." : null,
            unidad === "mv" ? "Más mV = suelo más seco." : null,
            agua.length ? "Barras de abajo: riegos y lluvias cargados (mm)." : null,
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
          series={[{ nombre: "Promedio", color: "#dc2626", valores: serie.map((p) => p.soil_temp) }]}
          banda={{ nombre: "Mín. y máx.", color: "#dc2626", min: serie.map((p) => p.soil_temp_min), max: serie.map((p) => p.soil_temp_max) }}
          desde={desde}
          hasta={hasta}
          intervaloS={intervalo}
          alto={180}
        />
      </Tarjeta>
    </div>
  );
}

// ------------------------------------------------------------------ clima

function ClimaAhora({ info }: { info: InfoSitio }) {
  const a = info.last_c01;
  if (!a) return null;
  const aRocio = a.dew_point != null && a.air_temp != null ? a.air_temp - a.dew_point : null;
  return (
    <Tarjeta className="min-w-0 flex-[1_1_360px]" titulo="Último dato" derecha={<HaceCorto fecha={a.t} />}>
      <div className="grid grid-cols-2 gap-4">
        <Grande etiqueta="Temperatura" color="#dc2626" icono={<Thermometer size={30} strokeWidth={2.25} aria-hidden />} valor={num(a.air_temp)} unidad="°C" />
        <Grande etiqueta="Humedad" color="#2563eb" icono={<Droplets size={30} strokeWidth={2.25} aria-hidden />} valor={num(a.humidity, 0)} unidad="%" />
      </div>
      {a.dpv != null ? (
        <div className="mt-5 flex flex-col gap-1 border-t border-separador pt-4">
          <span className="flex justify-between text-sm">
            <span className="font-semibold text-tinta">DPV</span>
            <b className="text-tinta">{num(a.dpv, 2)} kPa</b>
          </span>
          <Medidor escala={ESCALA_DPV} valor={a.dpv} nombre="DPV" />
        </div>
      ) : null}
      {aRocio != null ? (
        <div className="mt-4 flex flex-col gap-1 border-t border-separador pt-4">
          <span className="flex justify-between text-sm">
            <span className="font-semibold text-tinta">Distancia al rocío</span>
            <b className="text-tinta">{num(aRocio)} °C</b>
          </span>
          <Medidor escala={ESCALA_ROCIO} valor={aRocio} nombre="Distancia al rocío" />
        </div>
      ) : null}
    </Tarjeta>
  );
}

function Grande({ etiqueta, color, icono, valor, unidad }: { etiqueta: string; color: string; icono: ReactNode; valor: string; unidad: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[13px] font-semibold" style={{ color }}>
        {etiqueta}
      </span>
      <span className="flex items-center gap-1.5">
        <span style={{ color }}>{icono}</span>
        <span className="text-[38px] leading-tight font-bold tracking-tight text-tinta">
          {valor}
          <span className="text-base font-medium tracking-normal text-texto-2"> {unidad}</span>
        </span>
      </span>
    </div>
  );
}

function Aire({ serie, desde, hasta, intervalo }: { serie: PuntoSerie[]; desde: number; hasta: number; intervalo: number }) {
  const tiempos = useMemo(() => serie.map((p) => Date.parse(p.t)), [serie]);
  const comun = { tiempos, desde, hasta, intervaloS: intervalo };
  return (
    <div className="flex min-w-0 flex-[2_1_560px] flex-col gap-5">
      <Tarjeta>
        <Grafico
          titulo="Temperatura del aire"
          unidad="°C"
          decimales={1}
          series={[{ nombre: "Promedio", color: "#dc2626", valores: serie.map((p) => p.air_temp) }]}
          banda={{ nombre: "Mín. y máx.", color: "#dc2626", min: serie.map((p) => p.air_temp_min), max: serie.map((p) => p.air_temp_max) }}
          alto={240}
          {...comun}
        />
      </Tarjeta>
      <Tarjeta>
        <Grafico titulo="Humedad relativa del aire" unidad="%" series={[{ nombre: "Humedad", color: "#2563eb", valores: serie.map((p) => p.humidity) }]} alto={200} {...comun} />
      </Tarjeta>
    </div>
  );
}

// ------------------------------------------------------------------ lectura del período

function Lectura({ dias, suelo, agua }: { dias: Dia[]; suelo: boolean; agua: AguaSitio[] }) {
  const celdas: { titulo: string; valor: string; nota?: string }[] = [];
  if (suelo) {
    const rs = resumenSuelo(dias);
    const riegos = agua.filter((a) => a.kind === "riego");
    const lluvias = agua.filter((a) => a.kind === "lluvia");
    celdas.push({ titulo: "Temp. del suelo reciente", valor: `${num(rs.reciente)} °C`, nota: `Promedio de ${rs.diasReciente} días` });
    celdas.push({ titulo: "Amplitud diaria", valor: `${num(rs.amplitud)} °C`, nota: "Máxima menos mínima, promedio" });
    celdas.push({ titulo: "Riegos cargados", valor: String(riegos.length), nota: riegos.length ? `${Math.round(riegos.reduce((s, a) => s + (a.gross_mm ?? 0), 0))} mm` : undefined });
    celdas.push({ titulo: "Lluvias cargadas", valor: String(lluvias.length), nota: lluvias.length ? `${Math.round(lluvias.reduce((s, a) => s + (a.gross_mm ?? 0), 0))} mm` : undefined });
  } else {
    const rc = resumenClima(dias);
    celdas.push({ titulo: "Mínima y máxima", valor: `${num(rc.tmin)} a ${num(rc.tmax)} °C` });
    celdas.push({ titulo: "Horas de frío", valor: horas(rc.frio), nota: "≤ 7,2 °C" });
    celdas.push({ titulo: "Horas de helada", valor: horas(rc.helada), nota: "≤ 0 °C" });
    celdas.push({ titulo: "Grados-día", valor: num(rc.gdd, 0), nota: "Base 10 °C" });
  }
  return (
    <Tarjeta className="min-w-0 flex-[1_1_360px]" titulo="Lectura del período">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
        {celdas.map((k) => (
          <div key={k.titulo} className="flex flex-col gap-0.5">
            <dt className="text-[13px] text-texto-2">{k.titulo}</dt>
            <dd className="text-[22px] font-bold text-tinta">{k.valor}</dd>
            {k.nota ? <dd className="text-xs text-texto-3">{k.nota}</dd> : null}
          </div>
        ))}
      </dl>
    </Tarjeta>
  );
}
