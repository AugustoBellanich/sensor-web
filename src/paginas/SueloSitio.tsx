// Suelo del sitio (D-106): el perfil observado en la excavación del sensor, por capas, y lo que toma
// cada sonda. Arriba el esquema del perfil con las sondas a su profundidad; al lado, los datos de
// cada capa con su método. El dueño y los editores del campo describen el perfil (o lo corrigen) y,
// si lo vuelven a describir, el anterior queda en el historial. La profundidad de las sondas se carga
// en la calibración (D-109).
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

import { ConAyuda } from "@/componentes/Ayuda";
import { Barra, Contenido } from "@/componentes/Marco";
import { PerfilSuelo } from "@/componentes/PerfilSuelo";
import { Aviso, Boton, Cargando, Tarjeta, Titulo } from "@/componentes/ui";
import { TEXTURAS } from "@/datos/calibracion";
import { fechaArgHoy } from "@/datos/riego";
import { infoSitio } from "@/datos/series";
import { COLOR_SONDA, humedadDeSondas } from "@/datos/sondas";
import { AYUDA } from "@/datos/textos";
import { claseUSDA, colorCapa, fracciones } from "@/datos/textura";
import {
  activarDescripcion,
  aFormulario,
  capaVacia,
  GRUPOS,
  guardarDescripcion,
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
  type SueloSitio as Suelo,
} from "@/datos/suelo";
import { useConsulta } from "@/datos/useConsulta";

const COLOR_E = COLOR_SONDA;

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
                <Tarjeta
                  titulo={
                    <ConAyuda que="perfil y sondas" texto={AYUDA.perfilSondas}>
                      Perfil y sondas
                    </ConAyuda>
                  }
                >
                  <PerfilSuelo
                    capas={vigente?.layers ?? []}
                    sondas={suelo.electrodes}
                    humedad={humedadDeSondas(info?.last_b01)}
                  />
                  <Sondas suelo={suelo} />
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

// ------------------------------------------------------------------ sondas

// Debajo del esquema, solo lo que el dibujo no muestra (criterios 1, 3 y 10 de docs/estilo.md): las
// sondas sin profundidad (con el enlace a la calibración, donde se carga, D-109) y lo medido junto a
// una sonda, que tiene prioridad sobre la capa. La explicación va en el ⓘ del título.
function Sondas({ suelo }: { suelo: Suelo }) {
  const sinProfundidad = suelo.electrodes.filter((s) => s.depth == null);
  const medidos = suelo.electrodes.flatMap((s) =>
    [
      s.bulk_density?.origen === "sonda"
        ? `densidad ${numeroSuelo(s.bulk_density.value, 2)} g/cm³`
        : null,
      s.texture_class?.origen === "sonda" ? s.texture_class.value : null,
    ]
      .filter(Boolean)
      .map((t) => ({ s: s.index, t: t as string })),
  );
  if (!sinProfundidad.length && !medidos.length) return null;
  return (
    <div className="mt-3 flex flex-col gap-1.5 border-t border-separador pt-3 text-[13px]">
      {sinProfundidad.length ? (
        <Link
          to={`/sitio/${suelo.site_id}/calibracion`}
          className="text-acento-oscuro no-underline hover:underline"
        >
          Sin profundidad: {sinProfundidad.map((s) => `S${s.index}`).join(", ")}{" "}
          · cargar en Calibración
        </Link>
      ) : null}
      {medidos.map((m) => (
        <span key={`${m.s}${m.t}`} className="text-texto-2">
          <span className="font-semibold" style={{ color: COLOR_E[m.s - 1] }}>
            S{m.s}
          </span>{" "}
          {m.t} (junto a la sonda)
        </span>
      ))}
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
                    style={{ background: colorCapa(c, i).color }}
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

/** Clase del triángulo USDA con los % escritos en el formulario (null si no alcanzan). */
function claseCalculada(c: CapaFormulario): string | null {
  const n = (t: string | undefined) => {
    const x = (t ?? "").trim().replace(",", ".");
    return x && Number.isFinite(Number(x)) ? Number(x) : null;
  };
  const f = fracciones(n(c.sand_pct), n(c.silt_pct), n(c.clay_pct));
  return f ? claseUSDA(f) : null;
}

function AyudaClase({
  capa,
  calculada,
}: {
  capa: CapaFormulario;
  calculada: string | null;
}) {
  const clase = capa.texture_class ?? "";
  let texto: string;
  let alerta = false;
  if (calculada && clase && clase !== calculada) {
    texto = `Con estos porcentajes la clase es ${calculada} (triángulo USDA).`;
    alerta = true;
  } else if (calculada) {
    texto = "Clase calculada con el triángulo USDA.";
  } else {
    texto =
      "Sin porcentajes, elegí la clase y el método (al tacto o sedimentación en frasco).";
  }
  return (
    <p
      className={`text-[11.5px] sm:col-span-2 sm:col-start-2 ${alerta ? "text-[#b45309]" : "text-texto-3"}`}
    >
      {texto}
    </p>
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
  const poner = (clave: keyof CapaFormulario, v: string) => {
    const nueva = { ...capa, [clave]: v };
    // Con arena, limo y arcilla la clase sale del triángulo: se completa sola si estaba vacía o si
    // era la calculada antes (una clase elegida a mano distinta se respeta y se avisa).
    if (clave === "sand_pct" || clave === "silt_pct" || clave === "clay_pct") {
      const antes = claseCalculada(capa);
      const ahora = claseCalculada(nueva);
      if (ahora && (!capa.texture_class || capa.texture_class === antes))
        nueva.texture_class = ahora;
    }
    alCambiar(nueva);
  };
  const calculada = claseCalculada(capa);
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
                      {v.clave === "texture_class" ? (
                        <select
                          aria-label={v.etiqueta}
                          value={capa.texture_class ?? ""}
                          onChange={(e) => poner(v.clave, e.target.value)}
                          className={ENTRADA}
                        >
                          <option value="">—</option>
                          {capa.texture_class &&
                          !(TEXTURAS as readonly string[]).includes(
                            capa.texture_class,
                          ) ? (
                            <option value={capa.texture_class}>
                              {capa.texture_class}
                            </option>
                          ) : null}
                          {TEXTURAS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          aria-label={v.etiqueta}
                          inputMode={v.texto ? undefined : "decimal"}
                          value={capa[v.clave] ?? ""}
                          onChange={(e) => poner(v.clave, e.target.value)}
                          className={ENTRADA}
                        />
                      )}
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
                {r.titulo === "Textura" ? (
                  <AyudaClase capa={capa} calculada={calculada} />
                ) : null}
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
