// Copa del lote (D-55), como en la app: primero se carga lo que se sabe (medido con cinta, jalón,
// dron, satélite u otra app). Si no se sabe, una estimación rápida: cuánto del interfilar cubre la
// copa y su altura comparada con una persona. Abajo, las mediciones cargadas (se anulan con motivo).
import { Ban, Ruler, Save, Sparkles } from "lucide-react";
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
import { detalleCampo } from "@/datos/campos";
import {
  ALTURAS,
  anularCopa,
  armarManual,
  cargarCopa,
  estimarCopa,
  FRACCIONES,
  medicionesCopa,
  NOMBRE_ORIGEN,
  PERSONA_M,
  textoPersonas,
  type MedicionCopa,
  type OrigenCopa,
} from "@/datos/copa";
import { fechaHoraArg } from "@/datos/grafico";
import { fechaArgHoy } from "@/datos/riego";
import { useConsulta } from "@/datos/useConsulta";

const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const coma = (v: number | null | undefined, d = 1) =>
  v == null ? "—" : v.toLocaleString("es-AR", { maximumFractionDigits: d });
const MODOS = [
  { valor: "manual", texto: "Lo medí" },
  { valor: "estimado", texto: "Estimarlo" },
] as const;

export function CopaLote() {
  const { campo: campoId = "", id: loteId = "" } = useParams();
  const c = useConsulta(
    useCallback(async () => {
      const [d, m] = await Promise.all([
        detalleCampo(campoId),
        medicionesCopa(loteId),
      ]);
      return {
        campo: d.campo,
        mediciones: m.mediciones,
        error: d.error ?? m.error,
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
          { texto: "Copa" },
        ]}
      />
      <Contenido ancho={1080}>
        <Aviso mensaje={c.error} />
        {c.cargando && !k ? <Cargando /> : null}
        {lote ? (
          <>
            <Titulo
              titulo={`Copa · ${lote.name}`}
              datos="Altura y ancho de la copa: sirven para estimar cuánta agua consume el cultivo."
            />
            <div className="flex flex-wrap items-start gap-4">
              {k?.can_edit ? (
                <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
                  <Formulario
                    loteId={loteId}
                    entreHileras={lote.activity?.row_spacing_m ?? null}
                    alGuardar={c.actualizar}
                  />
                </div>
              ) : null}
              <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
                <Mediciones
                  lista={c.datos?.mediciones ?? []}
                  puedeAnular={!!k?.can_edit}
                  alCambiar={c.actualizar}
                />
              </div>
            </div>
          </>
        ) : null}
      </Contenido>
    </>
  );
}

function Formulario({
  loteId,
  entreHileras,
  alGuardar,
}: {
  loteId: string;
  entreHileras: number | null;
  alGuardar: () => void;
}) {
  const navegar = useNavigate();
  const [modo, setModo] = useState<"manual" | "estimado">("manual");
  const [dia, setDia] = useState(fechaArgHoy());
  const [origen, setOrigen] = useState<OrigenCopa | null>(null);
  const [altura, setAltura] = useState("");
  const [anchoHilera, setAnchoHilera] = useState("");
  const [anchoTransversal, setAnchoTransversal] = useState("");
  const [cobertura, setCobertura] = useState("");
  const [arboles, setArboles] = useState("");
  const [notas, setNotas] = useState("");
  const [fraccion, setFraccion] = useState<(typeof FRACCIONES)[number] | null>(
    null,
  );
  const [personas, setPersonas] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bien, setBien] = useState(false);
  const [guardando, setGuardando] = useState(false);

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    setBien(false);
    const r =
      modo === "manual"
        ? armarManual({
            fecha: dia,
            origen,
            altura,
            anchoHilera,
            anchoTransversal,
            cobertura,
            arboles,
            notas,
          })
        : estimarCopa(fraccion, personas, entreHileras, dia);
    if (!r.ok) return setError(r.mensaje);
    setGuardando(true);
    const g = await cargarCopa(loteId, r.datos);
    setGuardando(false);
    if (!g.ok) return setError(g.mensaje);
    setBien(true);
    setAltura("");
    setAnchoHilera("");
    setAnchoTransversal("");
    setCobertura("");
    setArboles("");
    setNotas("");
    setFraccion(null);
    setPersonas(null);
    alGuardar();
  }

  const chip = (activo: boolean) =>
    `h-8 rounded-full border px-3 text-[13px] ${activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white text-texto-2 hover:text-tinta"}`;
  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <Tarjeta
        titulo="Nueva medición"
        derecha={
          <Segmento
            etiqueta="Cómo"
            opciones={MODOS}
            valor={modo}
            alCambiar={setModo}
          />
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Fecha"
            type="date"
            value={dia}
            max={fechaArgHoy()}
            onChange={(e) => setDia(e.target.value)}
          />
        </div>
        {modo === "manual" ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-wider text-texto uppercase">
                Cómo se midió (opcional)
              </span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(NOMBRE_ORIGEN) as OrigenCopa[]).map((o) => (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={origen === o}
                    onClick={() => setOrigen(origen === o ? null : o)}
                    className={chip(origen === o)}
                  >
                    {NOMBRE_ORIGEN[o]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                etiqueta="Altura (m)"
                icono={Ruler}
                inputMode="decimal"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
              />
              <Campo
                etiqueta="Cobertura (%)"
                inputMode="decimal"
                value={cobertura}
                onChange={(e) => setCobertura(e.target.value)}
                ayuda="Fracción del suelo sombreada al mediodía, si la sabés."
              />
              <Campo
                etiqueta="Ancho a lo largo de la hilera (m)"
                inputMode="decimal"
                value={anchoHilera}
                onChange={(e) => setAnchoHilera(e.target.value)}
              />
              <Campo
                etiqueta="Ancho entre hileras (m)"
                inputMode="decimal"
                value={anchoTransversal}
                onChange={(e) => setAnchoTransversal(e.target.value)}
                ayuda="Con este y el interfilar se calcula la cobertura si no la cargás."
              />
              <Campo
                etiqueta="Árboles medidos"
                inputMode="numeric"
                value={arboles}
                onChange={(e) => setArboles(e.target.value)}
                ayuda="Si es un promedio de varios."
              />
              <Campo
                etiqueta="Notas (opcional)"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-wider text-texto uppercase">
                ¿Cuánto del espacio entre hileras cubre la copa?
              </span>
              <div className="flex flex-wrap gap-2">
                {FRACCIONES.map((f) => (
                  <button
                    key={f.clave}
                    type="button"
                    aria-pressed={fraccion?.clave === f.clave}
                    onClick={() =>
                      setFraccion(fraccion?.clave === f.clave ? null : f)
                    }
                    className={chip(fraccion?.clave === f.clave)}
                  >
                    {f.texto}
                  </button>
                ))}
              </div>
              <span className="text-xs text-texto-3">
                {entreHileras
                  ? `Con ${coma(entreHileras)} m entre hileras${fraccion ? `: ≈ ${coma(fraccion.valor * entreHileras)} m de ancho` : ""}.`
                  : "Sin el marco de plantación cargado se guarda solo la fracción."}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold tracking-wider text-texto uppercase">
                ¿Qué tan alta es, comparada con una persona?
              </span>
              <div className="flex flex-wrap gap-2">
                {ALTURAS.map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-pressed={personas === n}
                    onClick={() => setPersonas(personas === n ? null : n)}
                    className={chip(personas === n)}
                  >
                    {textoPersonas(n)}
                  </button>
                ))}
              </div>
              {personas != null ? (
                <span className="text-xs text-texto-3">
                  ≈ {coma(personas * PERSONA_M)} m (persona de {coma(PERSONA_M)}{" "}
                  m).
                </span>
              ) : null}
            </div>
          </div>
        )}
      </Tarjeta>
      <Aviso mensaje={error} />
      {bien ? <Aviso tipo="bien" mensaje="Medición guardada." /> : null}
      <div className="flex gap-2">
        <Boton
          type="submit"
          icono={modo === "manual" ? Save : Sparkles}
          cargando={guardando}
        >
          Guardar
        </Boton>
        <Boton type="button" variante="secundario" onClick={() => navegar(-1)}>
          Volver al lote
        </Boton>
      </div>
    </form>
  );
}

function Mediciones({
  lista,
  puedeAnular,
  alCambiar,
}: {
  lista: MedicionCopa[];
  puedeAnular: boolean;
  alCambiar: () => void;
}) {
  const [anulando, setAnulando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  return (
    <Tarjeta titulo={`Mediciones (${lista.length})`}>
      {!lista.length ? (
        <p className="text-[13px] text-texto-2">Todavía no hay mediciones.</p>
      ) : null}
      {lista.map((m) => (
        <div
          key={m.id}
          className="flex flex-col gap-1 border-t border-separador py-2.5 text-[13px] first:border-t-0"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-tinta">
              {fecha(m.measured_on)}
            </span>
            <span className="text-xs text-texto-3">
              {m.method === "estimado"
                ? "Estimada"
                : m.source
                  ? NOMBRE_ORIGEN[m.source]
                  : "Medida"}
            </span>
            {puedeAnular ? (
              <button
                type="button"
                title="Anular"
                aria-label="Anular"
                onClick={() => {
                  setAnulando(anulando === m.id ? null : m.id);
                  setMotivo("");
                  setError(null);
                }}
                className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-texto-3 hover:bg-fondo hover:text-error"
              >
                <Ban size={14} aria-hidden />
              </button>
            ) : null}
          </div>
          <span className="text-texto-2">
            {[
              m.fc != null ? `${Math.round(m.fc * 100)} % de cobertura` : null,
              m.height_m != null ? `${coma(m.height_m)} m de alto` : null,
              m.width_across_m != null
                ? `${coma(m.width_across_m)} m de ancho`
                : null,
            ]
              .filter(Boolean)
              .join(" · ") || "—"}
          </span>
          {m.notes || m.created_by_name ? (
            <span className="text-xs text-texto-3">
              {[m.notes, m.created_by_name].filter(Boolean).join(" · ")}
            </span>
          ) : null}
          {anulando === m.id ? (
            <form
              className="mt-1 flex flex-wrap items-center gap-2"
              onSubmit={async (ev) => {
                ev.preventDefault();
                const r = await anularCopa(m.id, motivo);
                if (!r.ok) return setError(r.mensaje);
                setAnulando(null);
                alCambiar();
              }}
            >
              <input
                autoFocus
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo"
                aria-label="Motivo"
                className="h-[32px] min-w-[160px] flex-1 rounded-lg border border-linea px-2.5 text-[13px] outline-none focus:ring-2 focus:ring-acento-oscuro"
              />
              <Boton
                type="submit"
                variante="secundario"
                disabled={!motivo.trim()}
              >
                Anular
              </Boton>
              {error ? (
                <span className="w-full text-xs text-error">{error}</span>
              ) : null}
            </form>
          ) : null}
        </div>
      ))}
    </Tarjeta>
  );
}
