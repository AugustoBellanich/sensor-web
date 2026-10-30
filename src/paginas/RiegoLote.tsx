// Sistema de riego de un lote (D-50), como en la app: cómo se riega y después solo los datos de ese
// sistema, todos opcionales. Muestra cuánto aplica por hora para que se vea si algo está mal
// cargado. Misma fecha que la versión vigente = corrección; fecha posterior = cambio de sistema
// (los riegos anteriores se siguen calculando con el sistema de entonces).
import { Save } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";

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
import { detalleCampo, type DetalleCampo } from "@/datos/campos";
import { fechaHoraArg } from "@/datos/grafico";
import {
  avisoTasa,
  CAMPOS_POR_METODO,
  DATOS_CAMPO,
  EFICIENCIA_DEFECTO,
  fechaArgHoy,
  guardarSistema,
  leerNumero,
  METODOS,
  mm,
  NOMBRE_FUENTE,
  NOMBRE_METODO,
  sistemasRiego,
  tasaMmH,
  type CampoSistema,
  type FuenteAgua,
  type MetodoRiego,
  type SistemaRiego,
} from "@/datos/riego";
import { useConsulta } from "@/datos/useConsulta";

const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const VACIO: Record<CampoSistema, string> = {
  emitter_flow_lph: "",
  emitter_spacing_m: "",
  laterals_per_row: "",
  emitters_per_plant: "",
  application_rate_mmh: "",
  delivery_flow_lps: "",
  irrigated_area_ha: "",
};
const aTexto = (v: number | null | undefined) =>
  v == null ? "" : String(v).replace(".", ",");
const textos = (s: SistemaRiego): Record<CampoSistema, string> =>
  Object.fromEntries(
    (Object.keys(VACIO) as CampoSistema[]).map((k) => [k, aTexto(s[k])]),
  ) as Record<CampoSistema, string>;

export function RiegoLote() {
  const { campo: campoId = "", id: loteId = "" } = useParams();
  const c = useConsulta(
    useCallback(async () => {
      const [d, s] = await Promise.all([
        detalleCampo(campoId),
        sistemasRiego(loteId),
      ]);
      return {
        campo: d.campo,
        sistemas: s.sistemas,
        error: d.error ?? s.error,
      };
    }, [campoId, loteId]),
  );
  const k = c.datos?.campo ?? null;
  const lote = k?.plots.find((p) => p.id === loteId) ?? null;
  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          { texto: k?.name ?? "Campo", a: `/campo/${campoId}` },
          {
            texto: lote?.name ?? "Lote",
            a: `/campo/${campoId}/lote/${loteId}`,
          },
          { texto: "Sistema de riego" },
        ]}
      />
      <Contenido ancho={1080}>
        <Aviso mensaje={c.error} />
        {c.cargando && !k ? <Cargando /> : null}
        {k && !k.can_edit ? (
          <Aviso
            tipo="aviso"
            mensaje="Solo el dueño y los editores del campo cambian el sistema de riego."
          />
        ) : null}
        {k && k.can_edit && lote && c.datos ? (
          <Formulario
            key={c.datos.sistemas.length}
            loteId={loteId}
            campo={k}
            historial={c.datos.sistemas}
          />
        ) : null}
      </Contenido>
    </>
  );
}

function Formulario({
  loteId,
  campo,
  historial,
}: {
  loteId: string;
  campo: DetalleCampo;
  historial: SistemaRiego[];
}) {
  const navegar = useNavigate();
  const lote = campo.plots.find((p) => p.id === loteId)!;
  const vigente = historial.find((s) => !s.valid_to) ?? null;
  const [metodo, setMetodo] = useState<MetodoRiego | null>(
    vigente?.method ?? null,
  );
  const [fuente, setFuente] = useState<FuenteAgua | null>(
    vigente?.water_source ?? null,
  );
  const [valores, setValores] = useState<Record<CampoSistema, string>>(
    vigente ? textos(vigente) : VACIO,
  );
  const [medidor, setMedidor] = useState<"si" | "no">(
    vigente?.has_flowmeter ? "si" : "no",
  );
  const [eficiencia, setEficiencia] = useState(
    vigente?.application_efficiency != null
      ? String(Math.round(vigente.application_efficiency * 100))
      : "",
  );
  const [notas, setNotas] = useState(vigente?.notes ?? "");
  const [desde, setDesde] = useState(vigente?.valid_from ?? fechaArgHoy());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function llenar(s: SistemaRiego) {
    setMetodo(s.method);
    setFuente(s.water_source);
    setValores(textos(s));
    setMedidor(s.has_flowmeter ? "si" : "no");
    setEficiencia(
      s.application_efficiency != null
        ? String(Math.round(s.application_efficiency * 100))
        : "",
    );
    setNotas(s.notes ?? "");
    if (vigente) setDesde(fechaArgHoy());
  }

  const n = (k: CampoSistema) => leerNumero(valores[k]);
  const visibles = metodo ? CAMPOS_POR_METODO[metodo] : [];
  const sistema: SistemaRiego | null = metodo
    ? {
        method: metodo,
        water_source: fuente,
        emitter_flow_lph: visibles.includes("emitter_flow_lph")
          ? n("emitter_flow_lph")
          : null,
        emitter_spacing_m: visibles.includes("emitter_spacing_m")
          ? n("emitter_spacing_m")
          : null,
        laterals_per_row: visibles.includes("laterals_per_row")
          ? n("laterals_per_row")
          : null,
        emitters_per_plant: visibles.includes("emitters_per_plant")
          ? n("emitters_per_plant")
          : null,
        application_rate_mmh: visibles.includes("application_rate_mmh")
          ? n("application_rate_mmh")
          : null,
        delivery_flow_lps: visibles.includes("delivery_flow_lps")
          ? n("delivery_flow_lps")
          : null,
        irrigated_area_ha: visibles.includes("irrigated_area_ha")
          ? n("irrigated_area_ha")
          : null,
        application_efficiency:
          leerNumero(eficiencia) != null ? leerNumero(eficiencia)! / 100 : null,
        has_flowmeter: medidor === "si",
        notes: notas.trim() || null,
      }
    : null;
  const a = lote.activity;
  const tasa = sistema
    ? tasaMmH(
        sistema,
        a?.row_spacing_m ?? null,
        a?.plant_spacing_m ?? null,
        lote.area_ha ?? null,
      )
    : null;
  const aviso = metodo ? avisoTasa(metodo, tasa) : null;
  const faltaMarco =
    (metodo === "goteo" ||
      metodo === "goteo_subterraneo" ||
      metodo === "microaspersion") &&
    !a?.row_spacing_m;
  const otros = campo.plots.filter(
    (p) => p.id !== loteId && p.irrigation_method,
  );
  const esCorreccion = !!vigente && desde === vigente.valid_from;

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!sistema) return setError("Elegí cómo se riega el lote.");
    if (!desde) return setError("Poné desde cuándo se riega así.");
    for (const k of visibles)
      if (valores[k].trim() && n(k) == null)
        return setError(`Revisá «${DATOS_CAMPO[k].etiqueta}».`);
    const ef = leerNumero(eficiencia);
    if (eficiencia.trim() && (ef == null || ef <= 0 || ef > 100))
      return setError("La eficiencia va de 1 a 100 %.");
    setError(null);
    setGuardando(true);
    const r = await guardarSistema(loteId, sistema, desde);
    setGuardando(false);
    if (r.ok) navegar(`/campo/${campo.id}/lote/${loteId}`);
    else setError(r.mensaje);
  }

  return (
    <>
      <Titulo
        titulo={`Sistema de riego · ${lote.name}`}
        datos={
          <span>
            {vigente
              ? `Vigente desde el ${fecha(vigente.valid_from!)}: ${NOMBRE_METODO[vigente.method]}`
              : "Sin sistema cargado"}
          </span>
        }
      />
      <form onSubmit={guardar} className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <Tarjeta titulo="Método de riego">
            <div className="flex flex-wrap gap-2">
              {METODOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetodo(m)}
                  aria-pressed={metodo === m}
                  className={`h-8 rounded-full border px-3 text-[13px] transition-colors ${metodo === m ? "border-tinta bg-tinta text-white" : "border-linea bg-white text-texto-2 hover:text-tinta"}`}
                >
                  {NOMBRE_METODO[m]}
                </button>
              ))}
            </div>
            {otros.length ? (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-3">
                Copiar de otro lote:
                {otros.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="font-medium text-acento-oscuro hover:underline"
                    onClick={async () => {
                      const s = await sistemasRiego(p.id);
                      const x = s.sistemas.find((y) => !y.valid_to);
                      if (x) llenar(x);
                    }}
                  >
                    {p.name} ({NOMBRE_METODO[p.irrigation_method!]})
                  </button>
                ))}
              </p>
            ) : null}
          </Tarjeta>
          {metodo && metodo !== "secano" ? (
            <Tarjeta titulo="Datos del sistema (opcionales)">
              <p className="mb-4 text-[13px] text-texto-2">
                Se carga una vez; en cada riego, solo la fecha y la duración.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {visibles.map((k) => (
                  <Campo
                    key={k}
                    etiqueta={DATOS_CAMPO[k].etiqueta}
                    inputMode="decimal"
                    value={valores[k]}
                    onChange={(e) =>
                      setValores((v) => ({ ...v, [k]: e.target.value }))
                    }
                    ayuda={DATOS_CAMPO[k].ayuda}
                  />
                ))}
                <Campo
                  etiqueta="Eficiencia de aplicación (%, opcional)"
                  inputMode="decimal"
                  value={eficiencia}
                  onChange={(e) => setEficiencia(e.target.value)}
                  ayuda={`Vacío = ${EFICIENCIA_DEFECTO[metodo] != null ? `${Math.round(EFICIENCIA_DEFECTO[metodo]! * 100)} %, valor típico de ${NOMBRE_METODO[metodo].toLowerCase()}` : "sin estimar el agua neta"}.`}
                />
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-bold tracking-wider text-texto uppercase">
                    Caudalímetro
                  </span>
                  <Segmento
                    etiqueta="Caudalímetro"
                    opciones={
                      [
                        { valor: "si", texto: "Sí" },
                        { valor: "no", texto: "No" },
                      ] as const
                    }
                    valor={medidor}
                    alCambiar={setMedidor}
                  />
                </div>
              </div>
              {faltaMarco ? (
                <div className="mt-3">
                  <Aviso
                    tipo="aviso"
                    mensaje="Para calcular los mm falta el marco de plantación: cargalo en el cultivo del lote (distancia entre hileras y entre plantas)."
                  />
                </div>
              ) : null}
            </Tarjeta>
          ) : null}
          {metodo ? (
            <Tarjeta titulo="Fuente y vigencia">
              <div className="mb-4 flex flex-col gap-2">
                <span className="text-xs font-bold tracking-wider text-texto uppercase">
                  Fuente del agua (opcional)
                </span>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(NOMBRE_FUENTE) as FuenteAgua[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFuente(f === fuente ? null : f)}
                      aria-pressed={fuente === f}
                      className={`h-8 rounded-full border px-3 text-[13px] ${fuente === f ? "border-tinta bg-tinta text-white" : "border-linea bg-white text-texto-2 hover:text-tinta"}`}
                    >
                      {NOMBRE_FUENTE[f]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Notas (opcional)"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej.: turno cada 15 días"
                />
                <Campo
                  etiqueta="Desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                  ayuda={
                    vigente
                      ? esCorreccion
                        ? `Misma fecha que el sistema actual: se corrigen sus datos y se recalculan los riegos desde el ${fecha(vigente.valid_from!)}.`
                        : "Los riegos anteriores no cambian; el sistema actual queda en el historial."
                      : "Desde cuándo se riega así."
                  }
                />
              </div>
            </Tarjeta>
          ) : null}
          <Aviso mensaje={error} />
          <div className="flex gap-2">
            <Boton
              type="submit"
              icono={Save}
              cargando={guardando}
              disabled={!metodo}
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
        </div>
        <div className="flex min-w-0 flex-[2_1_300px] flex-col gap-4 lg:sticky lg:top-[84px]">
          <Tarjeta titulo="Resultado">
            <p className="text-[22px] font-semibold text-tinta">
              {tasa != null ? `≈ ${mm(tasa)} mm por hora` : "—"}
            </p>
            <p className="text-[13px] text-texto-2">
              {tasa != null
                ? `Unos ${mm(tasa * 10, 0)} m³ por hectárea en cada hora de riego.`
                : "Sin estos datos, los riegos quedan en horas."}
            </p>
            {aviso ? (
              <div className="mt-3">
                <Aviso tipo="aviso" mensaje={aviso} />
              </div>
            ) : null}
          </Tarjeta>
          {historial.some((s) => s.valid_to) ? (
            <Tarjeta titulo="Sistemas anteriores">
              {historial
                .filter((s) => s.valid_to)
                .map((s) => (
                  <p
                    key={s.id}
                    className="border-t border-separador py-2 text-[13px] text-texto-2 first:border-t-0"
                  >
                    {fecha(s.valid_from!)} a {fecha(s.valid_to!)} ·{" "}
                    {NOMBRE_METODO[s.method]}
                  </p>
                ))}
            </Tarjeta>
          ) : null}
        </div>
      </form>
    </>
  );
}
