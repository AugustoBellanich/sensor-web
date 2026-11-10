// Calibración de un sitio (D-41), como en la app: por electrodo, la curva con sus puntos, la sonda
// (profundidad y referencia de banco, D-109), los niveles PMP, CC y SAT y el suelo. Cada número dice
// de dónde salió. El dueño y los editores del campo agregan puntos (CargaCalibracion.tsx), cargan
// la profundidad, la referencia y el suelo, cambian o estiman los niveles, y desactivan o borran
// (los propios, en 24 h) puntos. Cada acción bloquea la página mientras la base la procesa. El
// electrodo elegido va en la dirección (?e=). Lo que necesita el equipo conectado (mV en vivo por
// Bluetooth) sigue en la app.
import { FlaskConical, Layers, Plus, Ruler, Sparkles, Spline, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { CurvaCalibracion } from "@/componentes/CurvaCalibracion";
import { Barra, Contenido } from "@/componentes/Marco";
import { Procesando } from "@/componentes/Procesando";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  FilaDato,
  Segmento,
  Tarjeta,
  Titulo,
} from "@/componentes/ui";
import {
  activarPunto,
  borrarDesactivados,
  borrarPunto,
  desactivadosBorrables,
  estimarNiveles,
  fichaCalibracion,
  guardarNivel,
  guardarReferencia,
  leerNumero,
  TEXTO_ESTADO_CURVA,
  TEXTO_ESTADO_VALOR,
  TEXTO_METODO,
  TEXTO_MODELO,
  TEXTO_NIVEL,
  TEXTO_ORIGEN,
  textoAjusteDensidad,
  textoEstandar,
  type ElectrodoCal,
  type Estimacion,
  type Nivel,
  type OrigenNivel,
  type Punto,
} from "@/datos/calibracion";
import { fechaHoraArg } from "@/datos/grafico";
import { fechaArgHoy } from "@/datos/riego";
import {
  guardarProfundidad,
  sueloSitio,
  textoCapa,
  type DatoSonda,
  type SueloDeSonda,
} from "@/datos/suelo";
import { infoSitio } from "@/datos/series";
import { AYUDA } from "@/datos/textos";
import { useAccion } from "@/datos/useAccion";
import { useConsulta } from "@/datos/useConsulta";

const COLOR_E = ["#2563eb", "#16a34a", "#ea580c"];
const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const coma = (v: number | null | undefined, d = 1) =>
  v == null ? "—" : v.toLocaleString("es-AR", { maximumFractionDigits: d });
/** Enlace con la forma del botón principal (agregar un punto, D-109: más visible). */
const ENLACE_PRINCIPAL =
  "inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-tinta bg-tinta px-3 text-[13px] font-medium text-white no-underline hover:bg-[#1e293b]";
const ENLACE_SECUNDARIO =
  "inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta";

type Ejecutar = ReturnType<typeof useAccion>["ejecutar"];
type Cambio = () => Promise<void> | void;

export function Calibracion() {
  const { id = "" } = useParams();
  const c = useConsulta(
    useCallback(async () => {
      const [f, i, s] = await Promise.all([
        fichaCalibracion(id),
        infoSitio(id),
        sueloSitio(id),
      ]);
      // El suelo por capas (D-106) es un agregado: si falla, la calibración se muestra igual.
      return {
        ficha: f.ficha,
        info: i.info,
        suelo: s.suelo,
        error: f.error ?? i.error,
      };
    }, [id]),
  );
  const ficha = c.datos?.ficha ?? null;
  const info = c.datos?.info ?? null;
  const [q, setQ] = useSearchParams();
  const eq = q.get("e");
  const elegido: "1" | "2" | "3" = eq === "2" || eq === "3" ? eq : "1";
  const setElegido = (v: "1" | "2" | "3") => setQ({ e: v }, { replace: true });
  const accion = useAccion();
  const e = ficha?.electrodes.find((x) => String(x.index) === elegido) ?? null;
  const sonda =
    c.datos?.suelo?.electrodes.find((x) => String(x.index) === elegido) ?? null;

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
          { texto: ficha?.name ?? "Sitio", a: `/sitio/${id}` },
          { texto: "Calibración" },
        ]}
      />
      <Contenido ancho={1320}>
        <Aviso mensaje={c.error} />
        {c.cargando && !ficha ? (
          <Cargando texto="Leyendo la calibración…" />
        ) : null}
        {!c.cargando && !ficha && !c.error ? (
          <Aviso
            tipo="aviso"
            mensaje="No tenés acceso a este sitio o no existe."
          />
        ) : null}
        {ficha ? (
          <>
            <Titulo
              titulo={`Calibración · ${ficha.name}`}
              datos={
                <>
                  <span>{ficha.device_id ?? "Sin equipo ahora"}</span>
                  {!ficha.can_edit ? (
                    <span className="text-texto-3">
                      La cargan el dueño y los editores del campo.
                    </span>
                  ) : null}
                </>
              }
              acciones={
                <Segmento
                  etiqueta="Sonda"
                  opciones={ficha.electrodes.map((x) => ({
                    valor: String(x.index) as "1" | "2" | "3",
                    texto:
                      x.depth != null
                        ? `${coma(x.depth, 0)} cm`
                        : `S${x.index}`,
                  }))}
                  valor={elegido}
                  alCambiar={setElegido}
                />
              }
            />
            {e ? (
              <Electrodo
                key={e.index}
                e={e}
                sonda={sonda}
                sitio={id}
                puedeEditar={ficha.can_edit}
                alCambiar={c.actualizar}
                ejecutar={accion.ejecutar}
              />
            ) : null}
          </>
        ) : null}
      </Contenido>
      <Procesando texto={accion.procesando} />
    </>
  );
}

function Electrodo({
  e,
  sonda,
  sitio,
  puedeEditar,
  alCambiar,
  ejecutar,
}: {
  e: ElectrodoCal;
  sonda: SueloDeSonda | null;
  sitio: string;
  puedeEditar: boolean;
  alCambiar: Cambio;
  ejecutar: Ejecutar;
}) {
  const aPunto = `/sitio/${sitio}/calibracion/punto?e=${e.index}`;
  const curva = e.curva;
  const estado = curva
    ? TEXTO_ESTADO_CURVA[curva.status]
    : TEXTO_ESTADO_CURVA.insuficiente;
  const activos = e.puntos.filter((p) => p.active).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
          <Tarjeta
            titulo={
              <span className="inline-flex items-center gap-1.5">
                <Spline
                  size={15}
                  strokeWidth={1.9}
                  style={{ color: COLOR_E[e.index - 1] }}
                  aria-hidden
                />
                Curva del sensor
              </span>
            }
            derecha={
              <span
                className="rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                style={{ color: estado.color, borderColor: estado.color }}
              >
                {estado.titulo}
              </span>
            }
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13px] text-texto-2">
                {curva?.reason === "pendiente_invertida"
                  ? "Los puntos dan humedad que sube con los mV: revisá si alguno está mal cargado."
                  : estado.detalle}
              </p>
              {puedeEditar ? (
                <Link to={aPunto} className={ENLACE_PRINCIPAL}>
                  <Plus size={15} strokeWidth={1.9} aria-hidden />
                  Agregar un punto de calibración
                </Link>
              ) : null}
            </div>
            {curva?.model ? (
              <div className="mb-3 grid grid-cols-2 gap-3 border-y border-separador py-3 sm:grid-cols-4">
                <Celda titulo="Modelo" valor={TEXTO_MODELO[curva.model]} />
                <Celda titulo="Puntos" valor={String(curva.n)} />
                <Celda
                  titulo="Rango validado"
                  valor={`${coma(curva.hv_min)} – ${coma(curva.hv_max)} %`}
                  nota={`${coma(curva.mv_min, 0)} – ${coma(curva.mv_max, 0)} mV`}
                />
                <Celda
                  titulo="Error"
                  valor={
                    curva.rmse_cv != null
                      ? `± ${coma(curva.rmse_cv)} %`
                      : "sin estimar"
                  }
                  nota={
                    curva.rmse_cv != null
                      ? `validación dejando un punto afuera · ajuste ± ${coma(curva.rmse_fit)} %`
                      : "hacen falta 3 puntos"
                  }
                />
              </div>
            ) : null}
            {e.estandar && curva?.model?.startsWith("estandar") ? (
              <p className="mb-2 text-xs text-texto-3">
                {textoEstandar(e.estandar)}, con N = (mV aire − mV) / (mV aire − mV agua)
                {e.referencia?.mv_air != null && e.referencia?.mv_water != null
                  ? " y la referencia de banco de esta sonda."
                  : ` y referencias nominales (${coma(e.estandar.mv_air, 0)} y ${coma(e.estandar.mv_water, 0)} mV): cargá la de la sonda para afinarla.`}
              </p>
            ) : null}
            <CurvaCalibracion e={e} color={COLOR_E[e.index - 1]} />
            {e.puntos.length ? (
              <p className="mt-2 text-xs text-texto-3">
                ● punto medido · ○ desactivado · ◯ blanco: punto de la
                calibración anterior · línea cortada: extrapolado (fuera del
                rango medido, con más error; más clara lejos del rango, muy
                incierta).
              </p>
            ) : null}
            {curva?.candidates && curva.candidates.length > 1 ? (
              <p className="mt-1 text-xs text-texto-3">
                Modelos probados:{" "}
                {curva.candidates
                  .map(
                    (k) =>
                      `${TEXTO_MODELO[k.model]} ± ${coma(k.rmse_cv ?? k.rmse_fit)} %`,
                  )
                  .join(" · ")}
                {curva.fitted_at
                  ? ` · ajustada el ${fecha(curva.fitted_at)}`
                  : ""}
              </p>
            ) : null}
          </Tarjeta>
        </div>
        <div className="flex min-w-0 flex-[2_1_330px] flex-col gap-4">
          <Sonda e={e} sonda={sonda} sitio={sitio} puedeEditar={puedeEditar} alCambiar={alCambiar} ejecutar={ejecutar} />
          <Tarjeta
            titulo={
              <ConAyuda que="PMP, CC y SAT" texto={AYUDA.zonasSuelo}>
                Niveles del suelo
              </ConAyuda>
            }
          >
            <Niveles
              e={e}
              sitio={sitio}
              puedeEditar={puedeEditar}
              alCambiar={alCambiar}
              ejecutar={ejecutar}
            />
          </Tarjeta>
          <Tarjeta
            titulo={
              <span className="inline-flex items-center gap-1.5">
                <Layers
                  size={15}
                  strokeWidth={1.9}
                  className="text-[#8f6f45]"
                  aria-hidden
                />
                Suelo
              </span>
            }
            derecha={
              e.suelo ? (
                <span className="text-xs text-texto-3">
                  {fecha(e.suelo.measured_at)}
                </span>
              ) : null
            }
          >
            {sonda &&
            (sonda.capa ||
              sonda.bulk_density ||
              sonda.texture_class ||
              sonda.sand_pct ||
              sonda.depth != null) ? (
              <SueloEfectivo sonda={sonda} />
            ) : e.suelo ? (
              <SueloEfectivo
                sonda={{
                  index: e.index,
                  depth: e.suelo.depth_cm ?? e.depth,
                  capa: null,
                  bulk_density:
                    e.densidad != null
                      ? { value: e.densidad, origen: "sonda" }
                      : undefined,
                  texture_class: e.suelo.texture_class
                    ? { value: e.suelo.texture_class, origen: "sonda" }
                    : undefined,
                  sand_pct:
                    e.suelo.sand_pct != null
                      ? { value: e.suelo.sand_pct, origen: "sonda" }
                      : undefined,
                  silt_pct:
                    e.suelo.silt_pct != null
                      ? { value: e.suelo.silt_pct, origen: "sonda" }
                      : undefined,
                  clay_pct:
                    e.suelo.clay_pct != null
                      ? { value: e.suelo.clay_pct, origen: "sonda" }
                      : undefined,
                  organic_matter_pct:
                    e.suelo.organic_matter_pct != null
                      ? { value: e.suelo.organic_matter_pct, origen: "sonda" }
                      : undefined,
                }}
              />
            ) : (
              <p className="text-[13px] text-texto-2">
                Sin datos del suelo. Describí el perfil del sitio (capas) o
                cargá lo medido junto a esta sonda.
              </p>
            )}
            <Link
              to={`/sitio/${sitio}/suelo`}
              className="mt-2 inline-flex items-center text-[13px] font-medium text-acento-oscuro no-underline hover:underline"
            >
              Suelo del sitio (capas)
            </Link>
            {puedeEditar ? (
              <div className="mt-3">
                <Link
                  to={`/sitio/${sitio}/calibracion/suelo?e=${e.index}`}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta"
                >
                  <Layers size={15} strokeWidth={1.9} aria-hidden />
                  Cargar medición junto a la sonda
                </Link>
              </div>
            ) : null}
          </Tarjeta>
        </div>
      </div>

      <Tarjeta
        sinRelleno
        titulo={
          <span className="inline-flex items-center gap-1.5">
            <FlaskConical
              size={15}
              strokeWidth={1.9}
              className="text-texto-3"
              aria-hidden
            />
            Puntos ({activos} {activos === 1 ? "activo" : "activos"})
          </span>
        }
        derecha={
          puedeEditar ? (
            <span className="inline-flex items-center gap-2">
              <BorrarDesactivados sitio={sitio} e={e} alCambiar={alCambiar} ejecutar={ejecutar} />
              <Link to={aPunto} className={ENLACE_SECUNDARIO}>
                <Plus size={15} strokeWidth={1.9} aria-hidden />
                Agregar
              </Link>
            </span>
          ) : null
        }
      >
        {!e.puntos.length ? (
          <p className="px-[18px] pb-4 text-[13px] text-texto-2">
            Todavía no hay puntos.
          </p>
        ) : null}
        {e.puntos.length ? (
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px] [&_td]:whitespace-nowrap">
              <thead>
                <tr className="border-y border-separador text-left text-xs text-texto-3">
                  <th className="px-[18px] py-2 font-normal">Muestra</th>
                  <th className="py-2 text-right font-normal">mV</th>
                  <th className="py-2 text-right font-normal">Medida</th>
                  <th className="py-2 text-right font-normal">Curva</th>
                  <th className="py-2 pl-5 font-normal">Método</th>
                  <th className="py-2 font-normal">Equipo</th>
                  <th className="py-2 pr-4 font-normal">Notas</th>
                  {puedeEditar ? <th className="py-2 pr-[18px]" /> : null}
                </tr>
              </thead>
              <tbody>
                {e.puntos.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-t border-separador first:border-t-0 ${p.active ? "" : "text-texto-3"}`}
                  >
                    <td className="px-[18px] py-2 whitespace-nowrap">
                      {fecha(p.sampled_at)}
                      {!p.active ? (
                        <span className="ml-1.5 rounded bg-fondo px-1.5 py-0.5 text-[11px]">
                          desactivado
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 text-right">{coma(p.mv, 0)}</td>
                    <td className="py-2 text-right font-medium">
                      {coma(p.theta_v)} %
                    </td>
                    <td className="py-2 text-right text-texto-3">
                      {p.estimado != null ? `${coma(p.estimado)} %` : "—"}
                    </td>
                    <td className="py-2 pl-5">{TEXTO_METODO[p.method]}</td>
                    <td className="py-2 font-mono text-xs">{p.device_id}</td>
                    <td
                      className="max-w-[280px] truncate py-2 pr-4 text-texto-3"
                      title={[p.notes, p.deactivated_reason, p.created_by_name]
                        .filter(Boolean)
                        .join(" · ")}
                    >
                      {[p.deactivated_reason, p.notes, p.created_by_name]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    {puedeEditar ? (
                      <td className="py-2 pr-[18px] text-right">
                        <AccionesPunto p={p} alCambiar={alCambiar} ejecutar={ejecutar} />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Tarjeta>
    </div>
  );
}

function Celda({
  titulo,
  valor,
  nota,
}: {
  titulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-xs text-texto-3">{titulo}</span>
      <span className="text-[15px] font-semibold text-tinta">{valor}</span>
      {nota ? <span className="text-[11.5px] text-texto-3">{nota}</span> : null}
    </div>
  );
}

const ORIGENES: { valor: Exclude<OrigenNivel, "legado">; texto: string }[] = [
  { valor: "laboratorio", texto: "Laboratorio" },
  { valor: "muestra", texto: "Muestra de campo" },
  { valor: "datos", texto: "De los datos" },
  { valor: "textura", texto: "Por textura" },
  { valor: "otro", texto: "Otro" },
];

/** Niveles PMP, CC y SAT del electrodo; quien edita los cambia uno por uno o los estima por textura. */
function Niveles({
  e,
  sitio,
  puedeEditar,
  alCambiar,
  ejecutar,
}: {
  e: ElectrodoCal;
  sitio: string;
  puedeEditar: boolean;
  alCambiar: Cambio;
  ejecutar: Ejecutar;
}) {
  const [editando, setEditando] = useState<Nivel["level"] | null>(null);
  const [estimacion, setEstimacion] = useState<Estimacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <p className="mb-1 text-xs text-texto-3">
        Son del suelo, en % vol. El mV de cada uno sale de la curva del sensor.
      </p>
      <Aviso mensaje={error} />
      {(["sat", "cc", "pmp"] as const).map((l) => {
        const n = e.niveles.find((x) => x.level === l);
        return (
          <div
            key={l}
            className="border-t border-separador py-2.5 first:border-t-0"
          >
            <div className="flex items-start gap-3">
              <span className="w-10 shrink-0 text-[13px] font-bold text-[#047857]">
                {TEXTO_NIVEL[l].corto}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] text-texto-2">
                  {TEXTO_NIVEL[l].largo}
                </span>
                {n ? (
                  <span className="text-xs text-texto-3">
                    {TEXTO_ORIGEN[n.origin]} ·{" "}
                    {n.mv != null
                      ? `≈ ${coma(n.mv, 0)} mV (${TEXTO_ESTADO_VALOR[n.estado]})`
                      : `sin mV: ${TEXTO_ESTADO_VALOR[n.estado]}`}
                  </span>
                ) : null}
              </span>
              <span className="text-right text-[15px] font-semibold text-tinta">
                {n ? (
                  `${coma(n.theta_v)} %`
                ) : (
                  <span className="text-[13px] font-normal text-texto-3">
                    Sin cargar
                  </span>
                )}
                {n?.theta_g != null ? (
                  <span className="block text-[11.5px] font-normal text-texto-3">
                    {coma(n.theta_g)} % grav
                  </span>
                ) : null}
              </span>
              {puedeEditar && editando !== l ? (
                <button
                  type="button"
                  onClick={() => setEditando(l)}
                  className="text-xs font-medium text-acento-oscuro hover:underline"
                >
                  Cambiar
                </button>
              ) : null}
            </div>
            {editando === l ? (
              <EditarNivel
                inicial={n?.theta_v ?? null}
                alCancelar={() => setEditando(null)}
                alGuardar={(valor, origen) =>
                  ejecutar("Guardando el nivel…", async () => {
                    setError(null);
                    const r = await guardarNivel(sitio, e.index, l, valor, origen);
                    if (!r.ok) return setError(r.mensaje);
                    await alCambiar();
                    setEditando(null);
                  })
                }
              />
            ) : null}
          </div>
        );
      })}
      {puedeEditar ? (
        estimacion ? (
          <div className="mt-2 flex flex-col gap-2 rounded-lg bg-fondo p-3 text-[13px]">
            <span className="text-tinta">
              Por textura (Saxton y Rawls 2006): PMP {coma(estimacion.pmp)} % ·
              CC {coma(estimacion.cc)} % · SAT {coma(estimacion.sat)} %
            </span>
            <span className="text-xs text-texto-3">
              {textoAjusteDensidad(estimacion)
                ? `${textoAjusteDensidad(estimacion)} `
                : ""}
              Saturación{" "}
              {estimacion.sat_origen === "densidad"
                ? "por la densidad (1 − ρb/2,65)"
                : "por textura"}
              .
              {estimacion.om_supuesta
                ? " Sin materia orgánica cargada: se supuso 2,5 %."
                : ""}{" "}
              Es una estimación: si hay datos de laboratorio o de campo, valen
              más.
            </span>
            <div className="flex gap-2">
              <Boton
                onClick={() =>
                  ejecutar("Guardando PMP, CC y SAT…", async () => {
                    setError(null);
                    for (const l of ["pmp", "cc", "sat"] as const) {
                      const r = await guardarNivel(sitio, e.index, l, Math.round(estimacion[l] * 10) / 10, "textura");
                      if (!r.ok) return setError(r.mensaje);
                    }
                    await alCambiar();
                    setEstimacion(null);
                  })
                }
              >
                Guardar valores estimados
              </Boton>
              <Boton variante="texto" onClick={() => setEstimacion(null)}>
                Cancelar
              </Boton>
            </div>
          </div>
        ) : (
          <div className="mt-2">
            <Boton
              variante="secundario"
              icono={Sparkles}
              onClick={() =>
                ejecutar("Estimando por textura…", async () => {
                  setError(null);
                  const r = await estimarNiveles(sitio, e.index);
                  if (r.error) setError(r.error);
                  else setEstimacion(r.estimacion);
                })
              }
            >
              Estimar por textura
            </Boton>
          </div>
        )
      ) : null}
    </>
  );
}

function EditarNivel({
  inicial,
  alGuardar,
  alCancelar,
}: {
  inicial: number | null;
  alGuardar: (
    valor: number,
    origen: Exclude<OrigenNivel, "legado">,
  ) => Promise<unknown>;
  alCancelar: () => void;
}) {
  const [valor, setValor] = useState(
    inicial != null ? String(inicial).replace(".", ",") : "",
  );
  const [origen, setOrigen] =
    useState<Exclude<OrigenNivel, "legado">>("laboratorio");
  const n = leerNumero(valor);
  return (
    <form
      className="mt-2 flex flex-col gap-3 rounded-lg bg-fondo p-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        if (n != null) void alGuardar(n, origen);
      }}
    >
      <Campo
        etiqueta="Humedad (% vol)"
        inputMode="decimal"
        value={valor}
        onChange={(ev) => setValor(ev.target.value)}
        placeholder="Ej.: 28,5"
      />
      <div className="flex flex-wrap gap-1.5">
        {ORIGENES.map((o) => (
          <button
            key={o.valor}
            type="button"
            aria-pressed={origen === o.valor}
            onClick={() => setOrigen(o.valor)}
            className={`h-7 rounded-full border px-2.5 text-xs ${origen === o.valor ? "border-tinta bg-tinta text-white" : "border-linea bg-white text-texto-2"}`}
          >
            {o.texto}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Boton
          type="submit"
          disabled={n == null || n <= 0 || n >= 100}
        >
          Guardar
        </Boton>
        <Boton type="button" variante="texto" onClick={alCancelar}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}

/** Desactivar un punto (con motivo), reactivarlo o, si es propio y de las últimas 24 h, borrarlo
 * (D-109); la base reajusta la curva. Mientras procesa, la página queda bloqueada. */
function AccionesPunto({ p, alCambiar, ejecutar }: { p: Punto; alCambiar: Cambio; ejecutar: Ejecutar }) {
  const [modo, setModo] = useState<"ver" | "desactivar" | "borrar">("ver");
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hacer = (texto: string, f: () => Promise<{ ok: boolean; mensaje?: string }>) =>
    ejecutar(texto, async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.mensaje ?? null);
      await alCambiar();
      setModo("ver");
    });
  const enlace = "text-xs font-medium hover:underline";
  return (
    <span className="inline-flex flex-col items-end gap-1">
      {modo === "ver" ? (
        <span className="inline-flex items-center gap-3">
          {p.active ? (
            <button type="button" onClick={() => setModo("desactivar")} className={`${enlace} text-texto-2 hover:text-tinta`}>
              Desactivar
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void hacer("Reactivando el punto…", () => activarPunto(p.id, true, null))}
              className={`${enlace} text-acento-oscuro`}
            >
              Reactivar
            </button>
          )}
          {p.can_delete ? (
            <button
              type="button"
              onClick={() => setModo("borrar")}
              className={`${enlace} inline-flex items-center gap-1 text-error`}
              title={p.active ? "Se puede borrar hasta 24 h después de cargarlo" : "Ya no entra en la curva: se puede borrar"}
            >
              <Trash2 size={13} aria-hidden />
              Borrar
            </button>
          ) : null}
        </span>
      ) : null}
      {modo === "desactivar" ? (
        <form
          className="inline-flex items-center gap-1.5"
          onSubmit={(ev) => {
            ev.preventDefault();
            void hacer("Desactivando el punto y reajustando la curva…", () => activarPunto(p.id, false, motivo));
          }}
        >
          <input
            autoFocus
            value={motivo}
            onChange={(ev) => setMotivo(ev.target.value)}
            placeholder="Motivo"
            aria-label="Motivo"
            className="h-7 w-[180px] rounded-md border border-linea px-2 text-xs outline-none focus:ring-2 focus:ring-acento-oscuro"
          />
          <Boton type="submit" variante="secundario" disabled={!motivo.trim()}>
            Desactivar
          </Boton>
          <Boton type="button" variante="texto" onClick={() => setModo("ver")}>
            Cancelar
          </Boton>
        </form>
      ) : null}
      {modo === "borrar" ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="text-xs text-texto-2">Se borra definitivamente.</span>
          <Boton
            type="button"
            variante="secundario"
            icono={Trash2}
            onClick={() => void hacer("Borrando el punto y reajustando la curva…", () => borrarPunto(p.id))}
          >
            Borrar
          </Boton>
          <Boton type="button" variante="texto" onClick={() => setModo("ver")}>
            Cancelar
          </Boton>
        </span>
      ) : null}
      {error ? <span className="max-w-[320px] whitespace-normal text-xs text-error">{error}</span> : null}
    </span>
  );
}

/** Borra de una vez los puntos desactivados de la sonda (D-116), con confirmación. */
function BorrarDesactivados({ sitio, e, alCambiar, ejecutar }: { sitio: string; e: ElectrodoCal; alCambiar: Cambio; ejecutar: Ejecutar }) {
  const [confirmar, setConfirmar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const n = desactivadosBorrables(e);
  if (!n) return null;
  if (!confirmar)
    return (
      <button
        type="button"
        onClick={() => setConfirmar(true)}
        className="inline-flex h-[34px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-error hover:bg-fondo"
      >
        <Trash2 size={14} aria-hidden />
        Borrar desactivados ({n})
      </button>
    );
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      <span className="text-xs text-texto-2">
        {n === 1 ? "Se borra el punto desactivado." : `Se borran los ${n} desactivados.`} La curva no cambia.
      </span>
      <Boton
        type="button"
        variante="secundario"
        icono={Trash2}
        onClick={() =>
          void ejecutar("Borrando los puntos desactivados…", async () => {
            setError(null);
            const r = await borrarDesactivados(sitio, e.index);
            if (!r.ok) return setError(r.mensaje ?? null);
            setConfirmar(false);
            await alCambiar();
          })
        }
      >
        Borrar
      </Boton>
      <Boton type="button" variante="texto" onClick={() => setConfirmar(false)}>
        Cancelar
      </Boton>
      {error ? <span className="w-full text-right text-xs text-error">{error}</span> : null}
    </span>
  );
}

/** Profundidad de la sonda (donde quedó el electrodo al instalar) y su referencia de banco: mV al
 * aire y en agua, que acotan la curva y avisan si un punto cae afuera (D-109). */
function Sonda({
  e,
  sonda,
  sitio,
  puedeEditar,
  alCambiar,
  ejecutar,
}: {
  e: ElectrodoCal;
  sonda: SueloDeSonda | null;
  sitio: string;
  puedeEditar: boolean;
  alCambiar: Cambio;
  ejecutar: Ejecutar;
}) {
  const [editando, setEditando] = useState<"profundidad" | "referencia" | null>(null);
  const [cm, setCm] = useState(e.depth != null ? String(e.depth).replace(".", ",") : "");
  const [aire, setAire] = useState(e.referencia?.mv_air != null ? String(e.referencia.mv_air) : "");
  const [agua, setAgua] = useState(e.referencia?.mv_water != null ? String(e.referencia.mv_water) : "");
  const [notas, setNotas] = useState(e.referencia?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const profundidad = leerNumero(cm);
  const mvAire = leerNumero(aire);
  const mvAgua = leerNumero(agua);
  const profundidadInvalida = cm.trim() !== "" && (profundidad == null || profundidad < 1 || profundidad > 300);
  const mvMal = (v: number | null, t: string) => t.trim() !== "" && (v == null || v <= 0 || v > 3300);
  const referenciaInvalida = mvMal(mvAire, aire) || mvMal(mvAgua, agua) || (mvAire != null && mvAgua != null && mvAgua >= mvAire);
  const ref = e.referencia;
  const guardar = (texto: string, f: () => Promise<{ ok: boolean; mensaje?: string }>) =>
    ejecutar(texto, async () => {
      setError(null);
      const r = await f();
      if (!r.ok) return setError(r.mensaje ?? null);
      await alCambiar();
      setEditando(null);
    });
  return (
    <Tarjeta
      titulo={
        <span className="inline-flex items-center gap-1.5">
          <Ruler size={15} strokeWidth={1.9} className="text-texto-3" aria-hidden />
          Sonda S{e.index}
        </span>
      }
    >
      <FilaDato etiqueta="Profundidad">
        {e.depth != null ? `${coma(e.depth, 0)} cm` : "Sin cargar"}
        {sonda?.capa ? (
          <span className="block text-[11.5px] font-normal text-texto-3">capa del perfil {textoCapa(sonda.capa)}</span>
        ) : null}
      </FilaDato>
      <FilaDato
        etiqueta={
          <ConAyuda que="referencia de banco" texto={AYUDA_REFERENCIA}>
            Al aire / en agua
          </ConAyuda>
        }
      >
        {ref ? `${ref.mv_air != null ? coma(ref.mv_air, 0) : "—"} / ${ref.mv_water != null ? coma(ref.mv_water, 0) : "—"} mV` : "Sin cargar"}
        {ref ? <span className="block text-[11.5px] font-normal text-texto-3">medido el {fecha(ref.measured_at)}</span> : null}
      </FilaDato>
      <Aviso mensaje={error} />
      {puedeEditar && editando === null ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Boton variante="secundario" onClick={() => setEditando("profundidad")}>
            Cambiar la profundidad
          </Boton>
          {e.device_id ? (
            <Boton variante="secundario" onClick={() => setEditando("referencia")}>
              {ref ? "Cambiar la referencia" : "Cargar la referencia"}
            </Boton>
          ) : null}
        </div>
      ) : null}
      {editando === "profundidad" ? (
        <form
          className="mt-3 flex flex-col gap-3 rounded-lg bg-fondo p-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (profundidad != null && !profundidadInvalida)
              void guardar("Guardando la profundidad…", () => guardarProfundidad(sitio, e.index, profundidad, fechaArgHoy()));
          }}
        >
          <Campo
            etiqueta="Profundidad de la sonda (cm)"
            inputMode="decimal"
            value={cm}
            onChange={(ev) => setCm(ev.target.value)}
            placeholder="Ej.: 20"
            ayuda={profundidadInvalida ? "Entre 1 y 300 cm." : "Donde quedó la sonda al instalar. Con ella toma los datos de su capa del perfil."}
          />
          <div className="flex gap-2">
            <Boton type="submit" disabled={profundidad == null || profundidadInvalida}>
              Guardar
            </Boton>
            <Boton type="button" variante="texto" onClick={() => setEditando(null)}>
              Cancelar
            </Boton>
          </div>
        </form>
      ) : null}
      {editando === "referencia" && e.device_id ? (
        <form
          className="mt-3 flex flex-col gap-3 rounded-lg bg-fondo p-3"
          onSubmit={(ev) => {
            ev.preventDefault();
            if (!referenciaInvalida && (mvAire != null || mvAgua != null))
              void guardar("Guardando la referencia y reajustando la curva…", () =>
                guardarReferencia(e.device_id as string, e.index, mvAire, mvAgua, fechaArgHoy(), notas.trim()),
              );
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Al aire (mV)" inputMode="decimal" value={aire} onChange={(ev) => setAire(ev.target.value)} placeholder="Ej.: 1520" />
            <Campo etiqueta="En agua (mV)" inputMode="decimal" value={agua} onChange={(ev) => setAgua(ev.target.value)} placeholder="Ej.: 640" />
          </div>
          {referenciaInvalida ? <span className="text-xs text-error">Entre 1 y 3300 mV; en agua, menos que al aire.</span> : null}
          <Campo etiqueta="Notas (opcional)" value={notas} onChange={(ev) => setNotas(ev.target.value)} placeholder="Ej.: banco, agua de red" />
          <div className="flex flex-wrap gap-2">
            <Boton type="submit" disabled={referenciaInvalida || (mvAire == null && mvAgua == null)}>
              Guardar
            </Boton>
            {ref ? (
              <Boton
                type="button"
                variante="secundario"
                onClick={() =>
                  void guardar("Quitando la referencia…", () => guardarReferencia(e.device_id as string, e.index, null, null, fechaArgHoy(), ""))
                }
              >
                Quitar
              </Boton>
            ) : null}
            <Boton type="button" variante="texto" onClick={() => setEditando(null)}>
              Cancelar
            </Boton>
          </div>
        </form>
      ) : null}
    </Tarjeta>
  );
}

const AYUDA_REFERENCIA =
  "mV de la sonda medidos en banco, limpia y seca al aire, y sumergida en agua hasta la marca. Acotan la curva del sensor (la asíntota húmeda de la exponencial) y avisan si un punto cae fuera de ese rango.";

/** Suelo que usa la sonda, dato por dato, con su origen (D-106): medido junto a la sonda o de su capa. */
function SueloEfectivo({ sonda }: { sonda: SueloDeSonda }) {
  const de = (d: DatoSonda<unknown> | undefined) =>
    d ? (
      <span className="block text-[11.5px] font-normal text-texto-3">
        {d.origen === "sonda"
          ? "medido junto a la sonda"
          : sonda.capa
            ? `de la capa ${textoCapa(sonda.capa)}`
            : "de la capa"}
      </span>
    ) : null;
  const fr = [sonda.sand_pct, sonda.silt_pct, sonda.clay_pct];
  return (
    <>
      <FilaDato etiqueta="Profundidad">
        {sonda.depth != null ? `${coma(sonda.depth, 0)} cm` : "—"}
      </FilaDato>
      <FilaDato
        etiqueta={
          <ConAyuda que="densidad aparente" texto={AYUDA.densidad}>
            Densidad aparente
          </ConAyuda>
        }
      >
        {sonda.bulk_density
          ? `${coma(sonda.bulk_density.value, 2)} g/cm³`
          : "—"}
        {de(sonda.bulk_density)}
      </FilaDato>
      <FilaDato etiqueta="Textura">
        {sonda.texture_class?.value ?? "—"}
        {de(sonda.texture_class)}
      </FilaDato>
      {fr.some(Boolean) ? (
        <FilaDato etiqueta="Arena · limo · arcilla">
          {fr.map((x) => (x ? coma(x.value, 0) : "—")).join(" · ")} %
          {de(sonda.sand_pct ?? sonda.clay_pct)}
        </FilaDato>
      ) : null}
      <FilaDato etiqueta="Materia orgánica">
        {sonda.organic_matter_pct
          ? `${coma(sonda.organic_matter_pct.value)} %`
          : "—"}
        {de(sonda.organic_matter_pct)}
      </FilaDato>
    </>
  );
}
