// Cargar la calibración de un electrodo desde la web (D-41, D-47), como en la app pero sin
// Bluetooth: un punto (el mV sale de las lecturas del equipo a esa hora o se escribe a mano; la
// humedad medida en % grav o % vol) con vista previa de cómo queda la curva antes de guardar, y las
// propiedades del suelo (densidad, textura, materia orgánica), que quedan en el historial.
import { Check, Search } from "lucide-react";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { Barra, Contenido } from "@/componentes/Marco";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Segmento,
  Tarjeta,
  Titulo,
} from "@/componentes/ui";
import {
  agregarPunto,
  fichaCalibracion,
  guardarSuelo,
  leerHora,
  leerNumero,
  momentoArg,
  TEXTO_ESTADO_CURVA,
  TEXTO_MODELO,
  TEXTURAS,
  vistaPrevia,
  type Curva,
  type DatosPunto,
  type MvDado,
  type VistaPrevia,
} from "@/datos/calibracion";
import { fechaArgHoy, horaArgAhora } from "@/datos/riego";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";

const coma = (v: number | null | undefined, d = 1) =>
  v == null ? "—" : v.toLocaleString("es-AR", { maximumFractionDigits: d });
const chip = (activo: boolean) =>
  `h-8 rounded-full border px-3 text-[13px] ${activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white text-texto-2 hover:text-tinta"}`;

/** Cabecera común: sitio, electrodo y permiso. */
function useElectrodo() {
  const { id = "" } = useParams();
  const [q] = useSearchParams();
  const e = Number(q.get("e") ?? "1");
  const c = useConsulta(useCallback(() => fichaCalibracion(id), [id]));
  const ficha = c.datos?.ficha ?? null;
  const electrodo = ficha?.electrodes.find((x) => x.index === e) ?? null;
  return { id, e, c, ficha, electrodo };
}

function Marco({
  titulo,
  id,
  nombre,
  e,
  profundidad,
  children,
}: {
  titulo: string;
  id: string;
  nombre: string | undefined;
  e: number;
  profundidad: number | null | undefined;
  children: ReactNode;
}) {
  return (
    <>
      <Barra
        migas={[
          { texto: nombre ?? "Sitio", a: `/sitio/${id}` },
          { texto: "Calibración", a: `/sitio/${id}/calibracion` },
          { texto: titulo },
        ]}
      />
      <Contenido ancho={1000}>
        <Titulo
          titulo={`${titulo} · ${profundidad != null ? `${coma(profundidad, 0)} cm` : `E${e}`}`}
          datos={nombre}
        />
        {children}
      </Contenido>
    </>
  );
}

// ------------------------------------------------------------------ punto

type Metodo = "gravimetrico" | "otro_sensor" | "otro";

export function PuntoCalibracion() {
  const { id, e, c, ficha, electrodo } = useElectrodo();
  const navegar = useNavigate();
  const [origen, setOrigen] = useState<"lecturas" | "manual">("lecturas");
  const [mvManual, setMvManual] = useState("");
  const [fecha, setFecha] = useState(fechaArgHoy());
  const [hora, setHora] = useState(horaArgAhora());
  const [tipo, setTipo] = useState<"hg" | "hv">("hg");
  const [humedad, setHumedad] = useState("");
  const [metodo, setMetodo] = useState<Metodo>("gravimetrico");
  const [detalle, setDetalle] = useState("");
  const [submuestras, setSubmuestras] = useState("");
  const [notas, setNotas] = useState("");
  const [vista, setVista] = useState<VistaPrevia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  const h = leerHora(hora);
  const valor = leerNumero(humedad);
  const mvEscrito = leerNumero(mvManual);
  const valorInvalido = valor != null && (valor <= 0 || valor >= 100);
  const mvInvalido = mvEscrito != null && (mvEscrito <= 0 || mvEscrito > 3300);
  const mv: MvDado | undefined | null =
    origen === "lecturas"
      ? undefined
      : mvEscrito != null && !mvInvalido
        ? { valor: mvEscrito, origen: "manual" }
        : null;
  const datos: DatosPunto | null =
    fecha && h && mv !== null && valor != null && !valorInvalido
      ? {
          sitio: id,
          electrodo: e,
          momento: momentoArg(fecha, h),
          humedad: valor,
          tipo,
          mv,
        }
      : null;
  const cambiar =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setVista(null);
    };

  async function revisar(ev: FormEvent) {
    ev.preventDefault();
    if (!datos) return;
    setTrabajando(true);
    setError(null);
    const r = await vistaPrevia(datos);
    setTrabajando(false);
    if (r.error) setError(r.error);
    else setVista(r.vista);
  }
  async function guardar() {
    if (!datos) return;
    setTrabajando(true);
    setError(null);
    const sub = leerNumero(submuestras);
    const r = await agregarPunto({
      ...datos,
      metodo,
      detalle: detalle.trim(),
      submuestras: sub != null && sub > 0 ? Math.round(sub) : null,
      notas: notas.trim(),
    });
    setTrabajando(false);
    if (!r.ok) return setError(r.mensaje);
    navegar(`/sitio/${id}/calibracion`);
  }

  return (
    <Marco
      titulo="Punto de calibración"
      id={id}
      nombre={ficha?.name}
      e={e}
      profundidad={electrodo?.depth}
    >
      <Aviso mensaje={c.error} />
      {c.cargando && !ficha ? <Cargando /> : null}
      {ficha && !ficha.can_edit ? (
        <Aviso
          tipo="aviso"
          mensaje="Solo el dueño y los editores del campo cargan la calibración."
        />
      ) : null}
      {ficha?.can_edit ? (
        <form onSubmit={revisar} className="flex flex-wrap items-start gap-4">
          <div className="flex min-w-0 flex-[3_1_480px] flex-col gap-4">
            <Tarjeta
              titulo={
                <ConAyuda
                  que="lectura del sensor"
                  texto={
                    origen === "lecturas"
                      ? AYUDA.muestraBase
                      : AYUDA.muestraManual
                  }
                >
                  Lectura del sensor
                </ConAyuda>
              }
              derecha={
                <Segmento
                  etiqueta="De dónde sale el mV"
                  opciones={
                    [
                      { valor: "lecturas", texto: "De las lecturas" },
                      { valor: "manual", texto: "Escribir mV" },
                    ] as const
                  }
                  valor={origen}
                  alCambiar={cambiar(setOrigen)}
                />
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Fecha de la muestra"
                  type="date"
                  value={fecha}
                  max={fechaArgHoy()}
                  onChange={(ev) => cambiar(setFecha)(ev.target.value)}
                />
                <Campo
                  etiqueta="Hora (Argentina)"
                  type="time"
                  value={hora}
                  onChange={(ev) => cambiar(setHora)(ev.target.value)}
                />
                {origen === "manual" ? (
                  <Campo
                    etiqueta="mV del electrodo"
                    inputMode="decimal"
                    value={mvManual}
                    onChange={(ev) => cambiar(setMvManual)(ev.target.value)}
                    placeholder="Ej.: 1960"
                    ayuda={
                      mvInvalido
                        ? "Tiene que estar entre 1 y 3300 mV."
                        : undefined
                    }
                  />
                ) : null}
              </div>
            </Tarjeta>
            <Tarjeta
              titulo="Humedad medida"
              derecha={
                <Segmento
                  etiqueta="Tipo"
                  opciones={
                    [
                      { valor: "hg", texto: "% gravimétrica" },
                      { valor: "hv", texto: "% volumétrica" },
                    ] as const
                  }
                  valor={tipo}
                  alCambiar={cambiar(setTipo)}
                />
              }
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta={
                    tipo === "hg"
                      ? "Humedad (% en peso de suelo seco)"
                      : "Humedad (% en volumen)"
                  }
                  inputMode="decimal"
                  value={humedad}
                  onChange={(ev) => cambiar(setHumedad)(ev.target.value)}
                  placeholder="Ej.: 18,4"
                  ayuda={
                    valorInvalido
                      ? "Tiene que estar entre 0 y 100."
                      : tipo === "hg"
                        ? AYUDA.porcentajeVol
                        : undefined
                  }
                />
              </div>
            </Tarjeta>
            <Tarjeta titulo="Método">
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    ["gravimetrico", "Gravimétrico"],
                    ["otro_sensor", "Otro sensor"],
                    ["otro", "Otro"],
                  ] as const
                ).map(([v, t]) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={metodo === v}
                    onClick={() => setMetodo(v)}
                    className={chip(metodo === v)}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta={
                    metodo === "otro_sensor"
                      ? "Qué sensor (marca, modelo)"
                      : "Detalle (opcional)"
                  }
                  value={detalle}
                  onChange={(ev) => setDetalle(ev.target.value)}
                  placeholder={
                    metodo === "gravimetrico"
                      ? "Ej.: 105 °C, 24 h"
                      : metodo === "otro_sensor"
                        ? "Ej.: TDR portátil"
                        : ""
                  }
                />
                <Campo
                  etiqueta="Submuestras (opcional)"
                  inputMode="numeric"
                  value={submuestras}
                  onChange={(ev) => setSubmuestras(ev.target.value)}
                  placeholder="Ej.: 3"
                />
                <Campo
                  etiqueta="Notas (opcional)"
                  value={notas}
                  onChange={(ev) => setNotas(ev.target.value)}
                  placeholder="Ej.: a 20 cm de la sonda, después de riego"
                  className="sm:col-span-2"
                />
              </div>
            </Tarjeta>
          </div>
          <div className="flex min-w-0 flex-[2_1_300px] flex-col gap-4 lg:sticky lg:top-[84px]">
            {vista ? (
              <Previa v={vista} tipo={tipo} />
            ) : (
              <Tarjeta titulo="Vista previa">
                <p className="text-[13px] text-texto-2">
                  Con «Revisar», la base busca el mV y muestra cómo queda la
                  curva antes de guardar.
                </p>
              </Tarjeta>
            )}
            <Aviso mensaje={error} />
            <div className="flex flex-wrap gap-2">
              {vista ? (
                <>
                  <Boton
                    type="button"
                    icono={Check}
                    cargando={trabajando}
                    onClick={guardar}
                  >
                    Guardar el punto
                  </Boton>
                  <Boton
                    type="button"
                    variante="secundario"
                    onClick={() => setVista(null)}
                  >
                    Corregir
                  </Boton>
                </>
              ) : (
                <Boton
                  type="submit"
                  icono={Search}
                  cargando={trabajando}
                  disabled={!datos}
                >
                  Revisar
                </Boton>
              )}
            </div>
          </div>
        </form>
      ) : null}
    </Marco>
  );
}

function Previa({ v, tipo }: { v: VistaPrevia; tipo: "hg" | "hv" }) {
  const fuente =
    v.mv_source === "manual"
      ? `escrito a mano · ${v.device_id}`
      : `promedio de ${v.readings} lecturas · ${v.device_id}`;
  return (
    <Tarjeta titulo="Vista previa">
      <div className="grid grid-cols-2 gap-3 border-b border-separador pb-3">
        <Dato
          titulo="Lectura del sensor"
          valor={`${coma(v.mv, 0)} mV`}
          nota={fuente}
        />
        <Dato
          titulo="Humedad"
          valor={`${coma(v.theta_v)} % vol`}
          nota={
            tipo === "hg" && v.bulk_density != null
              ? `con densidad ${coma(v.bulk_density, 2)} g/cm³`
              : undefined
          }
        />
        {v.soil_temp != null ? (
          <Dato
            titulo="Temperatura del suelo"
            valor={`${coma(v.soil_temp)} °C`}
          />
        ) : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ResumenCurva titulo="Curva actual" c={v.antes} />
        <ResumenCurva titulo="Con el punto nuevo" c={v.despues} />
      </div>
    </Tarjeta>
  );
}

function ResumenCurva({ titulo, c }: { titulo: string; c: Curva | null }) {
  const estado = TEXTO_ESTADO_CURVA[c?.status ?? "insuficiente"];
  return (
    <div className="flex flex-col gap-0.5 text-xs text-texto-3">
      <span>{titulo}</span>
      <span
        className="text-[14px] font-semibold"
        style={{ color: estado.color }}
      >
        {estado.titulo}
      </span>
      {c?.model ? (
        <>
          <span>
            {TEXTO_MODELO[c.model]} · {c.n} puntos
          </span>
          <span>
            {coma(c.hv_min)} – {coma(c.hv_max)} % vol
          </span>
          <span>
            {c.rmse_cv != null
              ? `error ± ${coma(c.rmse_cv)} %`
              : "error sin estimar"}
          </span>
        </>
      ) : (
        <span>{c ? `${c.n} punto${c.n === 1 ? "" : "s"}` : "sin puntos"}</span>
      )}
    </div>
  );
}

function Dato({
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

// ------------------------------------------------------------------ suelo

type MetodoDensidad = "cilindro" | "laboratorio" | "otro";
type MetodoTextura = "laboratorio" | "tacto" | "otro";

export function SueloElectrodo() {
  const { id, e, c, ficha, electrodo } = useElectrodo();
  const navegar = useNavigate();
  const [fecha, setFecha] = useState(fechaArgHoy());
  const [profundidad, setProfundidad] = useState("");
  const [densidad, setDensidad] = useState("");
  const [metodoDensidad, setMetodoDensidad] =
    useState<MetodoDensidad>("cilindro");
  const [forma, setForma] = useState<"clase" | "fracciones">("clase");
  const [textura, setTextura] = useState<string | null>(null);
  const [arena, setArena] = useState("");
  const [limo, setLimo] = useState("");
  const [arcilla, setArcilla] = useState("");
  const [metodoTextura, setMetodoTextura] = useState<MetodoTextura>("tacto");
  const [mo, setMo] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const rho = leerNumero(densidad);
  const fr = {
    arena: leerNumero(arena),
    limo: leerNumero(limo),
    arcilla: leerNumero(arcilla),
  };
  const suma =
    fr.arena != null && fr.limo != null && fr.arcilla != null
      ? fr.arena + fr.limo + fr.arcilla
      : null;
  const densidadInvalida = rho != null && (rho < 0.5 || rho > 2.2);
  const sumaInvalida =
    forma === "fracciones" && suma != null && Math.abs(suma - 100) > 2;
  const fraccionesIncompletas =
    forma === "fracciones" &&
    [fr.arena, fr.limo, fr.arcilla].some((v) => v == null) &&
    [arena, limo, arcilla].some((t) => t.trim());
  const hayTextura =
    forma === "clase" ? textura != null : suma != null && !sumaInvalida;
  const algo = rho != null || hayTextura || leerNumero(mo) != null;
  const valido =
    !!fecha &&
    algo &&
    !densidadInvalida &&
    !sumaInvalida &&
    !fraccionesIncompletas;

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!valido) return;
    setGuardando(true);
    setError(null);
    const r = await guardarSuelo({
      sitio: id,
      electrodo: e,
      fecha,
      profundidad: leerNumero(profundidad),
      densidad: rho,
      textura: forma === "clase" ? textura : null,
      arena: forma === "fracciones" ? fr.arena : null,
      limo: forma === "fracciones" ? fr.limo : null,
      arcilla: forma === "fracciones" ? fr.arcilla : null,
      mo: leerNumero(mo),
      metodoDensidad: rho != null ? metodoDensidad : null,
      metodoTextura: hayTextura ? metodoTextura : null,
      notas: notas.trim(),
    });
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    navegar(`/sitio/${id}/calibracion`);
  }

  return (
    <Marco
      titulo="Suelo"
      id={id}
      nombre={ficha?.name}
      e={e}
      profundidad={electrodo?.depth}
    >
      <Aviso mensaje={c.error} />
      {c.cargando && !ficha ? <Cargando /> : null}
      {ficha && !ficha.can_edit ? (
        <Aviso
          tipo="aviso"
          mensaje="Solo el dueño y los editores del campo cargan el suelo."
        />
      ) : null}
      {ficha?.can_edit ? (
        <form onSubmit={guardar} className="flex flex-col gap-4">
          <p className="text-[13px] text-texto-2">
            <ConAyuda que="muestras" texto={AYUDA.muestrasSuelo}>
              Lo que no tengas, dejalo vacío. Se guarda como un registro nuevo y
              queda el historial.
            </ConAyuda>
          </p>
          <Tarjeta titulo="Muestreo">
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Fecha del muestreo"
                type="date"
                value={fecha}
                max={fechaArgHoy()}
                onChange={(ev) => setFecha(ev.target.value)}
              />
              <Campo
                etiqueta="Profundidad (cm, opcional)"
                inputMode="numeric"
                value={profundidad}
                onChange={(ev) => setProfundidad(ev.target.value)}
                placeholder="La del electrodo"
              />
            </div>
          </Tarjeta>
          <Tarjeta
            titulo={
              <ConAyuda que="densidad aparente" texto={AYUDA.densidad}>
                Densidad aparente
              </ConAyuda>
            }
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="g/cm³"
                inputMode="decimal"
                value={densidad}
                onChange={(ev) => setDensidad(ev.target.value)}
                placeholder="Ej.: 1,35"
                ayuda={
                  densidadInvalida
                    ? "Fuera de lo esperable (0,5 a 2,2 g/cm³)."
                    : undefined
                }
              />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-wider text-texto uppercase">
                  Método
                </span>
                <Segmento
                  etiqueta="Método de densidad"
                  opciones={
                    [
                      { valor: "cilindro", texto: "Cilindro" },
                      { valor: "laboratorio", texto: "Laboratorio" },
                      { valor: "otro", texto: "Otro" },
                    ] as const
                  }
                  valor={metodoDensidad}
                  alCambiar={setMetodoDensidad}
                />
              </div>
            </div>
          </Tarjeta>
          <Tarjeta
            titulo="Textura"
            derecha={
              <Segmento
                etiqueta="Forma"
                opciones={
                  [
                    { valor: "clase", texto: "Clase textural" },
                    { valor: "fracciones", texto: "Arena, limo, arcilla" },
                  ] as const
                }
                valor={forma}
                alCambiar={setForma}
              />
            }
          >
            {forma === "clase" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {TEXTURAS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={textura === t}
                      onClick={() => setTextura(textura === t ? null : t)}
                      className={chip(textura === t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-texto-3">
                  Para estimar PMP, CC y SAT hacen falta arena y arcilla (%).
                </p>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <Campo
                    etiqueta="Arena %"
                    inputMode="decimal"
                    value={arena}
                    onChange={(ev) => setArena(ev.target.value)}
                  />
                  <Campo
                    etiqueta="Limo %"
                    inputMode="decimal"
                    value={limo}
                    onChange={(ev) => setLimo(ev.target.value)}
                  />
                  <Campo
                    etiqueta="Arcilla %"
                    inputMode="decimal"
                    value={arcilla}
                    onChange={(ev) => setArcilla(ev.target.value)}
                  />
                </div>
                {sumaInvalida ? (
                  <p className="mt-2 text-xs text-error">
                    Suman {coma(suma)} %: tienen que sumar 100.
                  </p>
                ) : null}
                {fraccionesIncompletas ? (
                  <p className="mt-2 text-xs text-error">Faltan fracciones.</p>
                ) : null}
              </>
            )}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold tracking-wider text-texto uppercase">
                  Cómo se determinó
                </span>
                <Segmento
                  etiqueta="Método de textura"
                  opciones={
                    [
                      { valor: "tacto", texto: "Al tacto" },
                      { valor: "laboratorio", texto: "Laboratorio" },
                      { valor: "otro", texto: "Otro" },
                    ] as const
                  }
                  valor={metodoTextura}
                  alCambiar={setMetodoTextura}
                />
              </div>
              <Campo
                etiqueta="Materia orgánica (%, opcional)"
                inputMode="decimal"
                value={mo}
                onChange={(ev) => setMo(ev.target.value)}
                placeholder="Ej.: 1,8"
              />
            </div>
          </Tarjeta>
          <Tarjeta titulo="Notas">
            <Campo
              etiqueta="Notas (opcional)"
              value={notas}
              onChange={(ev) => setNotas(ev.target.value)}
              placeholder="Ej.: 3 cilindros de 100 cm³"
            />
          </Tarjeta>
          <Aviso mensaje={error} />
          <div className="flex gap-2">
            <Boton
              type="submit"
              icono={Check}
              cargando={guardando}
              disabled={!valido}
            >
              Guardar
            </Boton>
            <Boton
              type="button"
              variante="secundario"
              onClick={() => navegar(-1)}
            >
              Cancelar
            </Boton>
          </div>
        </form>
      ) : null}
    </Marco>
  );
}
