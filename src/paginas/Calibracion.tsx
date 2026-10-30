// Calibración de un sitio (D-41), como en la app: por electrodo, la curva con sus puntos, los niveles
// PMP, CC y SAT y el suelo. Cada número dice de dónde salió. El dueño y los editores del campo
// agregan puntos (CargaCalibracion.tsx), cargan el suelo, cambian o estiman los niveles y
// desactivan puntos. Lo que necesita el equipo conectado (mV en vivo por Bluetooth) sigue en la app.
import { FlaskConical, Layers, Plus, Sparkles, Spline } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { CurvaCalibracion } from "@/componentes/CurvaCalibracion";
import { Barra, Contenido } from "@/componentes/Marco";
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
  estimarNiveles,
  fichaCalibracion,
  guardarNivel,
  leerNumero,
  TEXTO_ESTADO_CURVA,
  TEXTO_ESTADO_VALOR,
  TEXTO_METODO,
  TEXTO_MODELO,
  TEXTO_NIVEL,
  TEXTO_ORIGEN,
  type ElectrodoCal,
  type Estimacion,
  type Nivel,
  type OrigenNivel,
  type Punto,
} from "@/datos/calibracion";
import { fechaHoraArg } from "@/datos/grafico";
import { infoSitio } from "@/datos/series";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";

const COLOR_E = ["#2563eb", "#16a34a", "#ea580c"];
const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const coma = (v: number | null | undefined, d = 1) =>
  v == null ? "—" : v.toLocaleString("es-AR", { maximumFractionDigits: d });

export function Calibracion() {
  const { id = "" } = useParams();
  const c = useConsulta(
    useCallback(async () => {
      const [f, i] = await Promise.all([fichaCalibracion(id), infoSitio(id)]);
      return { ficha: f.ficha, info: i.info, error: f.error ?? i.error };
    }, [id]),
  );
  const ficha = c.datos?.ficha ?? null;
  const info = c.datos?.info ?? null;
  const [elegido, setElegido] = useState<"1" | "2" | "3">("1");
  const e = ficha?.electrodes.find((x) => String(x.index) === elegido) ?? null;

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
                  etiqueta="Electrodo"
                  opciones={ficha.electrodes.map((x) => ({
                    valor: String(x.index) as "1" | "2" | "3",
                    texto:
                      x.depth != null
                        ? `${coma(x.depth, 0)} cm`
                        : `E${x.index}`,
                  }))}
                  valor={elegido}
                  alCambiar={setElegido}
                />
              }
            />
            {e ? (
              <Electrodo
                e={e}
                sitio={id}
                puedeEditar={ficha.can_edit}
                alCambiar={c.actualizar}
              />
            ) : null}
          </>
        ) : null}
      </Contenido>
    </>
  );
}

function Electrodo({
  e,
  sitio,
  puedeEditar,
  alCambiar,
}: {
  e: ElectrodoCal;
  sitio: string;
  puedeEditar: boolean;
  alCambiar: () => void;
}) {
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
            <p className="mb-3 text-[13px] text-texto-2">
              {curva?.reason === "pendiente_invertida"
                ? "Los puntos dan humedad que sube con los mV: revisá si alguno está mal cargado."
                : estado.detalle}
            </p>
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
            <CurvaCalibracion e={e} color={COLOR_E[e.index - 1]} />
            <p className="mt-2 text-xs text-texto-3">
              ● punto medido · ○ desactivado · ◯ blanco: punto de la calibración
              anterior · línea cortada: extrapolado (fuera del rango medido, con
              más error). Más allá no se calcula humedad: se muestra el mV.
            </p>
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
            {puedeEditar ? (
              <div className="mt-3">
                <Link
                  to={`/sitio/${sitio}/calibracion/punto?e=${e.index}`}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta"
                >
                  <Plus size={15} strokeWidth={1.9} aria-hidden />
                  Agregar un punto
                </Link>
              </div>
            ) : null}
          </Tarjeta>
        </div>
        <div className="flex min-w-0 flex-[2_1_330px] flex-col gap-4">
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
            {e.suelo ? (
              <>
                <FilaDato etiqueta="Profundidad">
                  {e.suelo.depth_cm != null
                    ? `${coma(e.suelo.depth_cm, 0)} cm`
                    : e.depth != null
                      ? `${coma(e.depth, 0)} cm`
                      : "—"}
                </FilaDato>
                <FilaDato
                  etiqueta={
                    <ConAyuda que="densidad aparente" texto={AYUDA.densidad}>
                      Densidad aparente
                    </ConAyuda>
                  }
                >
                  {e.densidad != null ? `${coma(e.densidad, 2)} g/cm³` : "—"}
                </FilaDato>
                <FilaDato etiqueta="Textura">
                  {e.suelo.texture_class ?? "—"}
                </FilaDato>
                {e.suelo.sand_pct != null ? (
                  <FilaDato etiqueta="Arena · limo · arcilla">
                    {coma(e.suelo.sand_pct, 0)} · {coma(e.suelo.silt_pct, 0)} ·{" "}
                    {coma(e.suelo.clay_pct, 0)} %
                  </FilaDato>
                ) : null}
                <FilaDato etiqueta="Materia orgánica">
                  {e.suelo.organic_matter_pct != null
                    ? `${coma(e.suelo.organic_matter_pct)} %`
                    : "—"}
                </FilaDato>
                {e.historial_suelo.length > 1 ? (
                  <p className="mt-1 text-xs text-texto-3">
                    {e.historial_suelo.length} registros guardados; se usa el
                    más reciente.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-[13px] text-texto-2">
                Sin datos del suelo. Al instalar: densidad con cilindros y
                textura, cerca de la sonda en suelo sin remover.
              </p>
            )}
            {puedeEditar ? (
              <div className="mt-3">
                <Link
                  to={`/sitio/${sitio}/calibracion/suelo?e=${e.index}`}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta"
                >
                  <Layers size={15} strokeWidth={1.9} aria-hidden />
                  {e.suelo ? "Actualizar el suelo" : "Cargar el suelo"}
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
                        <ActivarPunto p={p} alCambiar={alCambiar} />
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
}: {
  e: ElectrodoCal;
  sitio: string;
  puedeEditar: boolean;
  alCambiar: () => void;
}) {
  const [editando, setEditando] = useState<Nivel["level"] | null>(null);
  const [estimacion, setEstimacion] = useState<Estimacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
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
                alGuardar={async (valor, origen) => {
                  setError(null);
                  const r = await guardarNivel(
                    sitio,
                    e.index,
                    l,
                    valor,
                    origen,
                  );
                  if (!r.ok) return setError(r.mensaje);
                  setEditando(null);
                  alCambiar();
                }}
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
                cargando={guardando}
                onClick={async () => {
                  setGuardando(true);
                  setError(null);
                  for (const l of ["pmp", "cc", "sat"] as const) {
                    const r = await guardarNivel(
                      sitio,
                      e.index,
                      l,
                      Math.round(estimacion[l] * 10) / 10,
                      "textura",
                    );
                    if (!r.ok) {
                      setGuardando(false);
                      return setError(r.mensaje);
                    }
                  }
                  setGuardando(false);
                  setEstimacion(null);
                  alCambiar();
                }}
              >
                Usar estos valores
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
              onClick={async () => {
                setError(null);
                const r = await estimarNiveles(sitio, e.index);
                if (r.error) setError(r.error);
                else setEstimacion(r.estimacion);
              }}
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
  ) => Promise<void>;
  alCancelar: () => void;
}) {
  const [valor, setValor] = useState(
    inicial != null ? String(inicial).replace(".", ",") : "",
  );
  const [origen, setOrigen] =
    useState<Exclude<OrigenNivel, "legado">>("laboratorio");
  const [guardando, setGuardando] = useState(false);
  const n = leerNumero(valor);
  return (
    <form
      className="mt-2 flex flex-col gap-3 rounded-lg bg-fondo p-3"
      onSubmit={async (ev) => {
        ev.preventDefault();
        if (n == null) return;
        setGuardando(true);
        await alGuardar(n, origen);
        setGuardando(false);
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
          cargando={guardando}
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

/** Desactivar un punto (con motivo) o volver a usarlo; la base reajusta la curva. */
function ActivarPunto({ p, alCambiar }: { p: Punto; alCambiar: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!p.active)
    return (
      <button
        type="button"
        onClick={async () => {
          const r = await activarPunto(p.id, true, null);
          if (!r.ok) setError(r.mensaje);
          else alCambiar();
        }}
        title={error ?? undefined}
        className="text-xs font-medium text-acento-oscuro hover:underline"
      >
        Volver a usar
      </button>
    );
  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-xs text-texto-3 hover:text-error hover:underline"
      >
        Desactivar
      </button>
    );
  return (
    <form
      className="inline-flex items-center gap-1.5"
      onSubmit={async (ev) => {
        ev.preventDefault();
        const r = await activarPunto(p.id, false, motivo);
        if (!r.ok) return setError(r.mensaje);
        setAbierto(false);
        alCambiar();
      }}
    >
      <input
        autoFocus
        value={motivo}
        onChange={(ev) => setMotivo(ev.target.value)}
        placeholder="Motivo"
        aria-label="Motivo"
        title={error ?? undefined}
        className={`h-7 w-[180px] rounded-md border px-2 text-xs outline-none focus:ring-2 focus:ring-acento-oscuro ${error ? "border-error" : "border-linea"}`}
      />
      <button
        type="submit"
        disabled={!motivo.trim()}
        className="text-xs font-medium text-error disabled:opacity-40"
      >
        Desactivar
      </button>
      <button
        type="button"
        onClick={() => setAbierto(false)}
        className="text-xs text-texto-3"
      >
        ✕
      </button>
    </form>
  );
}
