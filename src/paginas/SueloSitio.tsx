// Suelo del sitio (D-106): el perfil observado en la excavación del sensor, por capas, y lo que toma
// cada sonda. Arriba el esquema del perfil con las sondas a su profundidad; al lado, los datos de
// cada capa con su método. El dueño y los editores del campo describen el perfil (o lo corrigen),
// cargan la profundidad de las sondas y, si lo vuelven a describir, el anterior queda en el historial.
import {
  ExternalLink,
  History,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { Barra, Contenido } from "@/componentes/Marco";
import { Aviso, Boton, Cargando, Tarjeta, Titulo } from "@/componentes/ui";
import { TEXTURAS } from "@/datos/calibracion";
import { fechaArgHoy } from "@/datos/riego";
import { infoSitio } from "@/datos/series";
import {
  activarDescripcion,
  aFormulario,
  capaVacia,
  GRUPOS,
  guardarDescripcion,
  guardarProfundidad,
  numeroSuelo,
  renglonConDatos,
  RENGLONES,
  revisarCapas,
  sueloSitio,
  textoCapa,
  type Capa,
  type CapaFormulario,
  type Descripcion,
  type Grupo,
  type Renglon,
  type SueloDeSonda,
  type SueloSitio as Suelo,
} from "@/datos/suelo";
import { useConsulta } from "@/datos/useConsulta";

const COLOR_E = ["#2563eb", "#16a34a", "#ea580c"];
const TIERRA = ["#d9bf98", "#c6a47a", "#b38b62", "#a07a55", "#8c6a49"];

const fecha = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

export function SueloSitio() {
  const { id = "" } = useParams();
  const c = useConsulta(
    useCallback(async () => {
      const [s, i] = await Promise.all([sueloSitio(id), infoSitio(id)]);
      return { suelo: s.suelo, info: i.info, error: s.error ?? i.error };
    }, [id]),
  );
  const suelo = c.datos?.suelo ?? null;
  const info = c.datos?.info ?? null;
  const [editando, setEditando] = useState<{
    base: Descripcion | null;
    corregir: boolean;
  } | null>(null);
  const vigente =
    suelo?.descriptions.find((d) => d.id === suelo.vigente) ?? null;
  const anteriores =
    suelo?.descriptions.filter((d) => d.id !== suelo.vigente) ?? [];

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
          { texto: suelo?.name ?? "Sitio", a: `/sitio/${id}` },
          { texto: "Suelo" },
        ]}
      />
      <Contenido ancho={1320}>
        <Aviso mensaje={c.error} />
        {c.cargando && !suelo ? <Cargando texto="Leyendo el suelo…" /> : null}
        {!c.cargando && !suelo && !c.error ? (
          <Aviso
            tipo="aviso"
            mensaje="No tenés acceso a este sitio o no existe."
          />
        ) : null}
        {suelo && editando ? (
          <EditorPerfil
            suelo={suelo}
            base={editando.base}
            corregir={editando.corregir}
            alCancelar={() => setEditando(null)}
            alGuardar={() => {
              setEditando(null);
              c.actualizar();
            }}
          />
        ) : null}
        {suelo && !editando ? (
          <>
            <Titulo
              titulo={`Suelo · ${suelo.name}`}
              icono={
                <Layers size={18} className="text-[#8f6f45]" aria-hidden />
              }
              datos={
                vigente ? (
                  <>
                    <span>
                      Perfil descripto el {fecha(vigente.described_at)}
                    </span>
                    {vigente.created_by_name ? (
                      <span className="text-texto-3">
                        por {vigente.created_by_name}
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span>Sin descripción del perfil</span>
                )
              }
              acciones={
                suelo.can_edit ? (
                  <span className="flex gap-2">
                    {vigente ? (
                      <Boton
                        variante="secundario"
                        icono={Pencil}
                        onClick={() =>
                          setEditando({ base: vigente, corregir: true })
                        }
                      >
                        Corregir
                      </Boton>
                    ) : null}
                    <Boton
                      icono={Plus}
                      onClick={() =>
                        setEditando({ base: vigente, corregir: false })
                      }
                    >
                      {vigente ? "Nuevo perfil" : "Describir el perfil"}
                    </Boton>
                  </span>
                ) : null
              }
            />
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-4">
                <Tarjeta titulo="Perfil y sondas">
                  <EsquemaPerfil
                    capas={vigente?.layers ?? []}
                    sondas={suelo.electrodes}
                  />
                  <Sondas suelo={suelo} alCambiar={c.actualizar} />
                </Tarjeta>
              </div>
              <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
                {vigente ? (
                  <TablaCapas d={vigente} />
                ) : (
                  <Tarjeta>
                    <p className="text-[13px] text-texto-2">
                      Este sitio no tiene el perfil descripto. Al instalar el
                      sensor, cargá las capas observadas en la excavación (si el
                      perfil es homogéneo, una sola). Cada sonda toma de su capa
                      la densidad y la textura para la calibración; lo medido
                      junto a una sonda tiene prioridad.
                    </p>
                  </Tarjeta>
                )}
                {anteriores.length ? (
                  <Historial
                    descripciones={anteriores}
                    puedeEditar={suelo.can_edit}
                    alCambiar={c.actualizar}
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

// ------------------------------------------------------------------ esquema del perfil

function EsquemaPerfil({
  capas,
  sondas,
}: {
  capas: Capa[];
  sondas: SueloDeSonda[];
}) {
  const profundidades = sondas
    .map((s) => s.depth)
    .filter((d): d is number => d != null);
  const fondo = Math.max(
    60,
    ...capas.map((c) => c.bottom_cm),
    ...profundidades.map((d) => d + 10),
  );
  const maximo = Math.ceil(fondo / 20) * 20;
  const ALTO = 340;
  const ARRIBA = 14;
  const y = (cm: number) => ARRIBA + (cm / maximo) * (ALTO - ARRIBA - 6);
  const marcas = Array.from({ length: maximo / 20 + 1 }, (_, i) => i * 20);
  return (
    <svg
      viewBox={`0 0 300 ${ALTO}`}
      className="w-full"
      role="img"
      aria-label="Esquema del perfil con sus capas y las sondas"
    >
      {marcas.map((m) => (
        <g key={m}>
          <line x1={34} x2={40} y1={y(m)} y2={y(m)} stroke="#94a3b8" />
          <text
            x={30}
            y={y(m) + 4}
            fontSize={10.5}
            fill="#64748b"
            textAnchor="end"
          >
            {m}
          </text>
        </g>
      ))}
      <text x={6} y={10} fontSize={10} fill="#64748b">
        cm
      </text>
      {capas.length ? (
        capas.map((c, i) => {
          const alto = y(c.bottom_cm) - y(c.top_cm);
          const dato = [
            c.texture_class,
            c.bulk_density != null
              ? `${numeroSuelo(c.bulk_density, 2)} g/cm³`
              : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <g key={c.id ?? i}>
              <rect
                x={42}
                y={y(c.top_cm)}
                width={150}
                height={alto}
                fill={TIERRA[i % TIERRA.length]}
                stroke="#fff"
              />
              {alto > 18 ? (
                <text
                  x={50}
                  y={y(c.top_cm) + 15}
                  fontSize={11.5}
                  fontWeight={600}
                  fill="#3f2d1c"
                >
                  {c.name ? `${c.name} · ` : ""}
                  {textoCapa(c)}
                </text>
              ) : null}
              {alto > 34 && dato ? (
                <text x={50} y={y(c.top_cm) + 30} fontSize={11} fill="#3f2d1c">
                  {dato}
                </text>
              ) : null}
            </g>
          );
        })
      ) : (
        <rect
          x={42}
          y={y(0)}
          width={150}
          height={y(maximo) - y(0)}
          fill="#f1f5f9"
          stroke="#cbd5e1"
          strokeDasharray="4 4"
        />
      )}
      <line
        x1={214}
        x2={214}
        y1={y(0) - 6}
        y2={y(maximo)}
        stroke="#cbd5e1"
        strokeWidth={3}
        strokeLinecap="round"
      />
      {sondas.map((s) =>
        s.depth != null ? (
          <g key={s.index}>
            <line
              x1={192}
              x2={214}
              y1={y(s.depth)}
              y2={y(s.depth)}
              stroke={COLOR_E[s.index - 1]}
              strokeDasharray="2 2"
            />
            <circle
              cx={214}
              cy={y(s.depth)}
              r={5.5}
              fill={COLOR_E[s.index - 1]}
            />
            <text
              x={226}
              y={y(s.depth) + 4}
              fontSize={11.5}
              fontWeight={600}
              fill={COLOR_E[s.index - 1]}
            >
              S{s.index} · {numeroSuelo(s.depth, 0)} cm
            </text>
          </g>
        ) : null,
      )}
    </svg>
  );
}

// ------------------------------------------------------------------ sondas

// La capa ya figura en el renglón de la sonda: solo se aclara lo medido junto a la sonda.
function origen(d: { origen: "sonda" | "capa" } | undefined): string {
  return d?.origen === "sonda" ? " (medida junto a la sonda)" : "";
}

function Sondas({ suelo, alCambiar }: { suelo: Suelo; alCambiar: () => void }) {
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    const nuevos = valores.map((v) =>
      v.trim() ? Number(v.trim().replace(",", ".")) : null,
    );
    if (
      nuevos.some(
        (n) => n != null && (!Number.isFinite(n) || n <= 0 || n > 300),
      )
    ) {
      return setError("Cada profundidad tiene que estar entre 1 y 300 cm.");
    }
    setGuardando(true);
    for (const s of suelo.electrodes) {
      const n = nuevos[s.index - 1];
      if (n == null || n === s.depth) continue;
      const r = await guardarProfundidad(
        suelo.site_id,
        s.index,
        n,
        fechaArgHoy(),
      );
      if (!r.ok) {
        setGuardando(false);
        return setError(r.mensaje);
      }
    }
    setGuardando(false);
    setEditando(false);
    alCambiar();
  }

  return (
    <div className="mt-3 border-t border-separador pt-3">
      <Aviso mensaje={error} />
      <form onSubmit={guardar} className="flex flex-col gap-2">
        {suelo.electrodes.map((s) => (
          <div key={s.index} className="flex items-start gap-2.5">
            <span
              className="mt-0.5 w-7 shrink-0 text-[13px] font-bold"
              style={{ color: COLOR_E[s.index - 1] }}
            >
              S{s.index}
            </span>
            <span className="flex min-w-0 flex-1 flex-col text-[13px]">
              {editando ? (
                <label className="flex items-center gap-2">
                  <input
                    inputMode="decimal"
                    aria-label={`Profundidad de la sonda ${s.index} (cm)`}
                    value={valores[s.index - 1] ?? ""}
                    onChange={(e) =>
                      setValores((v) =>
                        v.map((x, i) =>
                          i === s.index - 1 ? e.target.value : x,
                        ),
                      )
                    }
                    className="h-8 w-20 rounded-lg border border-linea bg-white px-2 text-[13px] outline-none focus:ring-2 focus:ring-acento-oscuro"
                  />
                  cm
                </label>
              ) : (
                <span className="font-medium text-tinta">
                  {s.depth != null
                    ? `${numeroSuelo(s.depth, 0)} cm`
                    : "Sin profundidad"}
                  {s.capa ? (
                    <span className="font-normal text-texto-3">
                      {" "}
                      · capa {textoCapa(s.capa)}
                    </span>
                  ) : null}
                </span>
              )}
              {!editando ? (
                <span className="text-xs text-texto-3">
                  {s.bulk_density
                    ? `Densidad ${numeroSuelo(s.bulk_density.value, 2)} g/cm³${origen(s.bulk_density)}`
                    : "Sin densidad"}
                  {s.texture_class
                    ? ` · ${s.texture_class.value}${origen(s.texture_class)}`
                    : ""}
                </span>
              ) : null}
            </span>
          </div>
        ))}
        {suelo.can_edit ? (
          editando ? (
            <span className="mt-1 flex gap-2">
              <Boton type="submit" cargando={guardando}>
                Guardar
              </Boton>
              <Boton variante="texto" onClick={() => setEditando(false)}>
                Cancelar
              </Boton>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setValores(
                  suelo.electrodes.map((s) =>
                    s.depth != null ? String(s.depth).replace(".", ",") : "",
                  ),
                );
                setEditando(true);
              }}
              className="mt-1 self-start text-xs font-medium text-acento-oscuro hover:underline"
            >
              Cambiar las profundidades
            </button>
          )
        ) : null}
        <p className="text-xs text-texto-3">
          Cada sonda toma los datos de la capa que contiene su profundidad (si
          hay una sola capa, de esa). Lo medido junto a una sonda se carga en la{" "}
          <Link
            to={`/sitio/${suelo.site_id}/calibracion`}
            className="text-acento-oscuro"
          >
            calibración
          </Link>{" "}
          y tiene prioridad sobre la capa.
        </p>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ tabla de capas

function Valor({ r, c }: { r: Renglon; c: Capa }) {
  const partes = r.valores
    .map((v) => {
      const x = c[v.clave];
      if (x == null || x === "") return null;
      const t =
        typeof x === "number" ? numeroSuelo(x, v.decimales ?? 1) : String(x);
      const conUnidad = v.unidad ? `${t} ${v.unidad}` : t;
      return r.valores.length > 1 && v.clave !== "texture_class"
        ? `${v.etiqueta} ${conUnidad}`
        : conUnidad;
    })
    .filter(Boolean);
  if (!partes.length) return <span className="text-texto-3">—</span>;
  const metodo = r.metodo ? c[r.metodo.clave] : null;
  return (
    <span className="flex flex-col">
      <span className="text-tinta">{partes.join(" · ")}</span>
      {metodo ? (
        <span className="text-[11.5px] text-texto-3">{String(metodo)}</span>
      ) : null}
    </span>
  );
}

function TablaCapas({ d }: { d: Descripcion }) {
  const capas = d.layers;
  const grupos = (Object.keys(GRUPOS) as Grupo[])
    .map((g) => ({
      g,
      renglones: RENGLONES.filter(
        (r) => r.grupo === g && renglonConDatos(r, capas),
      ),
    }))
    .filter((x) => x.renglones.length);
  const vacios = RENGLONES.filter((r) => !renglonConDatos(r, capas)).length;
  return (
    <Tarjeta
      titulo={`Capas (${capas.length})`}
      derecha={
        d.report_url ? (
          <a
            href={d.report_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-acento-oscuro no-underline hover:underline"
          >
            Informe <ExternalLink size={13} aria-hidden />
          </a>
        ) : null
      }
      sinRelleno
    >
      {d.notes ? (
        <p className="px-[18px] pt-3 text-[13px] text-texto-2">{d.notes}</p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-[13px]">
          <thead>
            <tr className="border-b border-separador text-left text-xs text-texto-3">
              <th className="w-[30%] px-[18px] py-2 font-medium" />
              {capas.map((c, i) => (
                <th
                  key={c.id ?? i}
                  className="px-3 py-2 font-semibold text-tinta"
                >
                  <span
                    className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm"
                    style={{ background: TIERRA[i % TIERRA.length] }}
                  />
                  {c.name ? `${c.name} · ` : ""}
                  {textoCapa(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grupos.map(({ g, renglones }) => (
              <GrupoFilas key={g} titulo={GRUPOS[g]} columnas={capas.length}>
                {renglones.map((r) => (
                  <tr
                    key={r.titulo}
                    className="border-b border-separador last:border-b-0"
                  >
                    <td className="px-[18px] py-2 align-top text-texto-2">
                      {r.titulo}
                    </td>
                    {capas.map((c, i) => (
                      <td key={c.id ?? i} className="px-3 py-2 align-top">
                        <Valor r={r} c={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </GrupoFilas>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-[18px] py-2.5 text-xs text-texto-3">
        {grupos.length ? "" : "Las capas no tienen datos cargados. "}
        {vacios ? `${vacios} datos sin cargar no se muestran.` : ""}
      </p>
    </Tarjeta>
  );
}

function GrupoFilas({
  titulo,
  columnas,
  children,
}: {
  titulo: string;
  columnas: number;
  children: ReactNode;
}) {
  return (
    <>
      <tr className="bg-fondo">
        <td
          colSpan={columnas + 1}
          className="px-[18px] py-1.5 text-[11px] font-bold tracking-wider text-texto-3 uppercase"
        >
          {titulo}
        </td>
      </tr>
      {children}
    </>
  );
}

// ------------------------------------------------------------------ historial

function Historial({
  descripciones,
  puedeEditar,
  alCambiar,
}: {
  descripciones: Descripcion[];
  puedeEditar: boolean;
  alCambiar: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  return (
    <Tarjeta
      titulo={
        <span className="inline-flex items-center gap-1.5">
          <History size={15} aria-hidden /> Descripciones anteriores
        </span>
      }
    >
      <Aviso mensaje={error} />
      {descripciones.map((d) => (
        <div
          key={d.id}
          className="flex items-start gap-3 border-t border-separador py-2.5 text-[13px] first:border-t-0"
        >
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-tinta">
              {fecha(d.described_at)} ·{" "}
              {d.layers.length === 1 ? "1 capa" : `${d.layers.length} capas`} (
              {d.layers.map((c) => textoCapa(c)).join(", ")})
            </span>
            <span className="text-xs text-texto-3">
              {d.deactivated_reason ?? "Inactiva"}
            </span>
          </span>
          {puedeEditar ? (
            <button
              type="button"
              className="text-xs font-medium text-acento-oscuro hover:underline"
              onClick={async () => {
                setError(null);
                const r = await activarDescripcion(d.id, true);
                if (!r.ok) return setError(r.mensaje);
                alCambiar();
              }}
            >
              Reactivar
            </button>
          ) : null}
        </div>
      ))}
    </Tarjeta>
  );
}

// ------------------------------------------------------------------ editor

const ENTRADA =
  "h-8 w-full min-w-0 rounded-lg border border-linea bg-white px-2 text-[13px] text-tinta outline-none placeholder:text-texto-3 focus:ring-2 focus:ring-acento-oscuro";

function Metodo({
  opciones,
  valor,
  alCambiar,
  etiqueta,
}: {
  opciones: string[];
  valor: string;
  alCambiar: (v: string) => void;
  etiqueta: string;
}) {
  const [otro, setOtro] = useState(!!valor && !opciones.includes(valor));
  if (otro) {
    return (
      <span className="flex gap-1">
        <input
          aria-label={`Método de ${etiqueta}`}
          value={valor}
          placeholder="Método"
          onChange={(e) => alCambiar(e.target.value)}
          className={ENTRADA}
        />
        <button
          type="button"
          title="Elegir de la lista"
          onClick={() => {
            setOtro(false);
            alCambiar("");
          }}
          className="px-1 text-xs text-texto-3 hover:text-tinta"
        >
          ×
        </button>
      </span>
    );
  }
  return (
    <select
      aria-label={`Método de ${etiqueta}`}
      value={valor}
      onChange={(e) => {
        if (e.target.value === "__otro") {
          setOtro(true);
          alCambiar("");
        } else alCambiar(e.target.value);
      }}
      className={`${ENTRADA} ${valor ? "" : "text-texto-3"}`}
    >
      <option value="">Método…</option>
      {opciones.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
      <option value="__otro">Otro…</option>
    </select>
  );
}

function EditorCapa({
  capa,
  n,
  error,
  alCambiar,
  alQuitar,
}: {
  capa: CapaFormulario;
  n: number;
  error: string | null;
  alCambiar: (c: CapaFormulario) => void;
  alQuitar: (() => void) | null;
}) {
  const poner = (clave: keyof CapaFormulario, v: string) =>
    alCambiar({ ...capa, [clave]: v });
  const llenos = (g: Grupo) =>
    RENGLONES.filter((r) => r.grupo === g).filter((r) =>
      r.valores.some((v) => (capa[v.clave] ?? "").trim()),
    ).length;
  return (
    <div className="rounded-xl border border-linea bg-white">
      <div className="flex flex-wrap items-end gap-3 border-b border-separador px-4 py-3">
        <span className="pb-1.5 text-[13px] font-semibold text-tinta">
          Capa {n}
        </span>
        <label className="flex w-24 flex-col gap-1 text-xs text-texto-2">
          Desde (cm)
          <input
            inputMode="decimal"
            value={capa.top_cm ?? ""}
            onChange={(e) => poner("top_cm", e.target.value)}
            className={ENTRADA}
          />
        </label>
        <label className="flex w-24 flex-col gap-1 text-xs text-texto-2">
          Hasta (cm)
          <input
            inputMode="decimal"
            value={capa.bottom_cm ?? ""}
            onChange={(e) => poner("bottom_cm", e.target.value)}
            className={ENTRADA}
          />
        </label>
        <label className="flex min-w-[140px] flex-1 flex-col gap-1 text-xs text-texto-2">
          Nombre (opcional)
          <input
            value={capa.name ?? ""}
            placeholder="Ej.: Ap, superficial"
            onChange={(e) => poner("name", e.target.value)}
            className={ENTRADA}
          />
        </label>
        {alQuitar ? (
          <button
            type="button"
            onClick={alQuitar}
            className="mb-1.5 inline-flex items-center gap-1 text-xs text-texto-3 hover:text-[#b91c1c]"
          >
            <Trash2 size={13} aria-hidden /> Quitar
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="px-4 pt-2 text-[12.5px] text-[#b91c1c]">{error}</p>
      ) : null}
      <datalist id="clases-texturales">
        {TEXTURAS.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      {(Object.keys(GRUPOS) as Grupo[]).map((g) => (
        <details
          key={g}
          open={g === "fisicos" || llenos(g) > 0}
          className="border-b border-separador last:border-b-0"
        >
          <summary className="cursor-pointer px-4 py-2 text-[11px] font-bold tracking-wider text-texto-3 uppercase select-none">
            {GRUPOS[g]}
            {llenos(g) ? (
              <span className="ml-1.5 font-normal tracking-normal normal-case">
                · {llenos(g)} cargados
              </span>
            ) : null}
          </summary>
          <div className="flex flex-col gap-2 px-4 pb-3">
            {RENGLONES.filter((r) => r.grupo === g).map((r) => (
              <div
                key={r.titulo}
                className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[150px_1fr_190px]"
              >
                <span className="text-[13px] text-texto-2">{r.titulo}</span>
                <span className="flex flex-wrap gap-1.5">
                  {r.valores.map((v) => (
                    <label
                      key={v.clave}
                      className={`flex min-w-[96px] flex-1 items-center gap-1 text-xs text-texto-3 ${r.valores.length === 1 && !v.texto ? "max-w-[200px]" : ""}`}
                    >
                      {r.valores.length > 1 ? (
                        <span className="shrink-0">{v.etiqueta}</span>
                      ) : null}
                      <input
                        aria-label={v.etiqueta}
                        inputMode={v.texto ? undefined : "decimal"}
                        list={
                          v.clave === "texture_class"
                            ? "clases-texturales"
                            : undefined
                        }
                        value={capa[v.clave] ?? ""}
                        onChange={(e) => poner(v.clave, e.target.value)}
                        className={ENTRADA}
                      />
                      {v.unidad ? (
                        <span className="shrink-0">{v.unidad}</span>
                      ) : null}
                    </label>
                  ))}
                </span>
                {r.metodo ? (
                  <Metodo
                    etiqueta={r.titulo}
                    opciones={r.metodo.opciones}
                    valor={capa[r.metodo.clave] ?? ""}
                    alCambiar={(v) => poner(r.metodo!.clave, v)}
                  />
                ) : (
                  <span />
                )}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

function EditorPerfil({
  suelo,
  base,
  corregir,
  alCancelar,
  alGuardar,
}: {
  suelo: Suelo;
  base: Descripcion | null;
  corregir: boolean;
  alCancelar: () => void;
  alGuardar: () => void;
}) {
  // Corregir parte de la vigente; un perfil nuevo arranca de las mismas capas (se suele repetir la
  // división) pero sin datos de laboratorio, salvo que no haya ninguna.
  const [capas, setCapas] = useState<CapaFormulario[]>(() =>
    base
      ? corregir
        ? base.layers.map(aFormulario)
        : base.layers.map((c) =>
            capaVacia(String(c.top_cm), String(c.bottom_cm)),
          )
      : [capaVacia("0", "")],
  );
  const [fechaPerfil, setFechaPerfil] = useState(
    corregir && base ? base.described_at.slice(0, 10) : fechaArgHoy(),
  );
  const [notas, setNotas] = useState(
    corregir && base ? (base.notes ?? "") : "",
  );
  const [informe, setInforme] = useState(
    corregir && base ? (base.report_url ?? "") : "",
  );
  const [errores, setErrores] = useState<(string | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    const r = revisarCapas(capas);
    setErrores(r.errores);
    if (r.errores.some(Boolean)) return setError("Revisá las capas marcadas.");
    if (informe.trim() && !/^https?:\/\//i.test(informe.trim())) {
      return setError(
        "El enlace al informe tiene que empezar con http:// o https://.",
      );
    }
    setGuardando(true);
    const g = await guardarDescripcion({
      sitio: suelo.site_id,
      fecha: fechaPerfil,
      capas: r.listas,
      notas,
      informe,
      id: corregir && base ? base.id : null,
    });
    setGuardando(false);
    if (!g.ok) return setError(g.mensaje);
    alGuardar();
  }

  return (
    <form
      onSubmit={guardar}
      className="mx-auto flex w-full max-w-[980px] flex-col gap-4"
    >
      <Titulo
        titulo={
          corregir
            ? `Corregir el perfil · ${suelo.name}`
            : `Describir el perfil · ${suelo.name}`
        }
        datos={
          <span>
            {corregir
              ? "Cambia la descripción vigente."
              : base
                ? "Perfil nuevo: la descripción vigente pasa al historial."
                : "Capas observadas en la excavación del sensor; si el perfil es homogéneo, una sola."}
          </span>
        }
      />
      <Tarjeta>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[170px_1fr]">
          <label className="flex flex-col gap-1 text-xs text-texto-2">
            Fecha de la descripción
            <input
              type="date"
              value={fechaPerfil}
              max={fechaArgHoy()}
              onChange={(e) => setFechaPerfil(e.target.value)}
              className={ENTRADA}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-texto-2">
            Enlace al informe del laboratorio (opcional)
            <input
              value={informe}
              placeholder="https://…"
              onChange={(e) => setInforme(e.target.value)}
              className={ENTRADA}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-texto-2 sm:col-span-2">
            Notas (opcional)
            <input
              value={notas}
              placeholder="Ej.: excavación a 30 cm del gotero; capa compactada a 40 cm"
              onChange={(e) => setNotas(e.target.value)}
              className={ENTRADA}
            />
          </label>
        </div>
      </Tarjeta>
      {capas.map((c, i) => (
        <EditorCapa
          key={c.clave}
          capa={c}
          n={i + 1}
          error={errores[i] ?? null}
          alCambiar={(nueva) =>
            setCapas((cs) => cs.map((x) => (x.clave === c.clave ? nueva : x)))
          }
          alQuitar={
            capas.length > 1
              ? () => setCapas((cs) => cs.filter((x) => x.clave !== c.clave))
              : null
          }
        />
      ))}
      <button
        type="button"
        onClick={() =>
          setCapas((cs) => [
            ...cs,
            capaVacia(cs[cs.length - 1]?.bottom_cm ?? "", ""),
          ])
        }
        className="inline-flex h-[34px] items-center gap-1.5 self-start rounded-lg border border-dashed border-linea bg-white px-3 text-[13px] font-medium text-texto-2 hover:bg-fondo hover:text-tinta"
      >
        <Plus size={15} aria-hidden /> Agregar una capa
      </button>
      <Aviso mensaje={error} />
      <span className="flex gap-2">
        <Boton type="submit" cargando={guardando}>
          Guardar
        </Boton>
        <Boton variante="texto" onClick={alCancelar}>
          Cancelar
        </Boton>
      </span>
    </form>
  );
}
