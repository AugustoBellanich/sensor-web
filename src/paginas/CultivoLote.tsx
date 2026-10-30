// Cultivo del lote (D-54), como en la app: cultivo de la lista de la base (o "otro" escrito),
// variedad con sugerencias, marco de plantación (con plantas por hectárea), año de implantación si es
// perenne, cubierta entre hileras, estado fenológico y fechas. Se puede copiar de otro lote.
import { Save, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";

import { Barra, Contenido } from "@/componentes/Marco";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Tarjeta,
  Titulo,
} from "@/componentes/ui";
import {
  borrarActividad,
  detalleCampo,
  guardarActividad,
  listasCultivos,
  NOMBRE_CUBIERTA,
  plantasPorHa,
  tipoDeCultivo,
  type Actividad,
  type Cultivo,
  type DetalleCampo,
  type Lote,
  type Variedad,
} from "@/datos/campos";
import { leerNumero } from "@/datos/riego";
import { useConsulta } from "@/datos/useConsulta";

type Cubierta = NonNullable<Actividad["inter_row_cover"]>;
const numTexto = (v: number | null | undefined) =>
  v == null ? "" : String(v).replace(".", ",");
const sinTilde = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export function CultivoLote() {
  const { campo: campoId = "", id: loteId = "" } = useParams();
  const c = useConsulta(
    useCallback(async () => {
      const [d, l] = await Promise.all([
        detalleCampo(campoId),
        listasCultivos(),
      ]);
      return {
        campo: d.campo,
        cultivos: l.cultivos,
        variedades: l.variedades,
        error: d.error ?? l.error,
      };
    }, [campoId]),
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
          { texto: "Cultivo" },
        ]}
      />
      <Contenido ancho={900}>
        <Aviso mensaje={c.error} />
        {c.cargando && !k ? <Cargando /> : null}
        {k && !k.can_edit ? (
          <Aviso
            tipo="aviso"
            mensaje="Solo el dueño y los editores del campo cargan el cultivo."
          />
        ) : null}
        {k && k.can_edit && lote && c.datos ? (
          <>
            <Titulo titulo={`Cultivo · ${lote.name}`} />
            <Formulario
              campo={k}
              lote={lote}
              cultivos={c.datos.cultivos}
              variedades={c.datos.variedades}
            />
          </>
        ) : null}
      </Contenido>
    </>
  );
}

function Formulario({
  campo,
  lote,
  cultivos,
  variedades,
}: {
  campo: DetalleCampo;
  lote: Lote;
  cultivos: Cultivo[];
  variedades: Variedad[];
}) {
  const navegar = useNavigate();
  const inicial = lote.activity;
  const [codigo, setCodigo] = useState(inicial?.crop_code ?? "");
  const [otro, setOtro] = useState(
    inicial && (!inicial.crop_code || inicial.crop_code === "otro")
      ? (inicial.crop ?? "")
      : "",
  );
  const [variedad, setVariedad] = useState(inicial?.variety ?? "");
  const [entreHileras, setEntreHileras] = useState(
    numTexto(inicial?.row_spacing_m),
  );
  const [entrePlantas, setEntrePlantas] = useState(
    numTexto(inicial?.plant_spacing_m),
  );
  const [anio, setAnio] = useState(
    inicial?.planted_year ? String(inicial.planted_year) : "",
  );
  const [cubierta, setCubierta] = useState<Cubierta | null>(
    inicial?.inter_row_cover ?? null,
  );
  const [estado, setEstado] = useState(inicial?.phenological_stage ?? "");
  const [inicio, setInicio] = useState(inicial?.start_date ?? "");
  const [fin, setFin] = useState(inicial?.end_date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [borrar, setBorrar] = useState(false);

  const cultivo = cultivos.find((x) => x.code === codigo);
  const hileras = leerNumero(entreHileras);
  const plantas = leerNumero(entrePlantas);
  const pl = plantasPorHa(hileras, plantas);
  const otrosLotes = campo.plots.filter((p) => p.id !== lote.id && p.activity);
  const grupos = useMemo(() => {
    const g = new Map<string, Cultivo[]>();
    for (const x of [...cultivos].sort((a, b) => a.sort - b.sort))
      g.set(x.group_name, [...(g.get(x.group_name) ?? []), x]);
    return [...g.entries()];
  }, [cultivos]);
  const sugeridas = useMemo(() => {
    const vistos = new Set<string>();
    const t = sinTilde(variedad);
    const salida: string[] = [];
    const delCampo = campo.plots.flatMap((p) =>
      p.activity?.crop_code === codigo && p.activity.variety
        ? [p.activity.variety]
        : [],
    );
    for (const v of [
      ...delCampo,
      ...variedades.filter((x) => x.crop_code === codigo).map((x) => x.name),
    ]) {
      const n = sinTilde(v);
      if (!n || vistos.has(n) || (t && !n.includes(t)) || n === t) continue;
      vistos.add(n);
      salida.push(v.trim());
      if (salida.length >= 8) break;
    }
    return salida;
  }, [variedad, variedades, codigo, campo.plots]);

  function copiar(p: Lote) {
    const a = p.activity;
    if (!a) return;
    setCodigo(a.crop_code ?? "");
    setOtro(!a.crop_code || a.crop_code === "otro" ? (a.crop ?? "") : "");
    setVariedad(a.variety ?? "");
    setEntreHileras(numTexto(a.row_spacing_m));
    setEntrePlantas(numTexto(a.plant_spacing_m));
    setAnio(a.planted_year ? String(a.planted_year) : "");
    setCubierta(a.inter_row_cover);
    setInicio(a.start_date ?? "");
  }

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!codigo && !otro.trim()) return setError("Elegí el cultivo.");
    if (codigo === "otro" && !otro.trim())
      return setError("Escribí qué cultivo es.");
    if (!inicio)
      return setError(
        "Poné la fecha de inicio (siembra, implantación o inicio de la campaña).",
      );
    if (fin && fin < inicio)
      return setError("La fecha de fin tiene que ser posterior al inicio.");
    if (
      entreHileras.trim() &&
      (hileras == null || hileras <= 0 || hileras > 50)
    )
      return setError("Distancia entre hileras: entre 0 y 50 m.");
    if (
      entrePlantas.trim() &&
      (plantas == null || plantas <= 0 || plantas > 50)
    )
      return setError("Distancia entre plantas: entre 0 y 50 m.");
    const a = anio.trim() ? Number(anio) : null;
    if (
      a != null &&
      (!Number.isInteger(a) || a < 1900 || a > new Date().getFullYear() + 1)
    )
      return setError("Revisá el año de implantación.");
    setError(null);
    setGuardando(true);
    const r = await guardarActividad(lote.id, {
      id: inicial?.id,
      activity_type: tipoDeCultivo(cultivo),
      crop_code: codigo || null,
      crop: codigo === "otro" || !codigo ? otro : null,
      variety: variedad,
      row_spacing_m: hileras,
      plant_spacing_m: plantas,
      planted_year: a,
      inter_row_cover: cubierta,
      phenological_stage: estado,
      start_date: inicio,
      end_date: fin || null,
    });
    setGuardando(false);
    if (r.ok) navegar(`/campo/${campo.id}/lote/${lote.id}`);
    else setError(r.mensaje);
  }

  const chip = (activo: boolean) =>
    `h-8 rounded-full border px-3 text-[13px] ${activo ? "border-tinta bg-tinta text-white" : "border-linea bg-white text-texto-2 hover:text-tinta"}`;
  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      {!inicial && otrosLotes.length ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-texto-3">
          Copiar de otro lote:
          {otrosLotes.map((p) => (
            <button
              key={p.id}
              type="button"
              className="font-medium text-acento-oscuro hover:underline"
              onClick={() => copiar(p)}
            >
              {p.name}
            </button>
          ))}
        </p>
      ) : null}
      <Tarjeta titulo="Cultivo">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="cultivo"
              className="text-xs font-bold tracking-wider text-texto uppercase"
            >
              Cultivo
            </label>
            <select
              id="cultivo"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="h-12 rounded-campo border border-borde bg-superficie px-3 text-[15px] text-tinta"
            >
              <option value="">Elegí un cultivo</option>
              {grupos.map(([g, lista]) => (
                <optgroup key={g} label={g}>
                  {lista.map((x) => (
                    <option key={x.code} value={x.code}>
                      {x.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          {codigo === "otro" || (!codigo && otro) ? (
            <Campo
              etiqueta="¿Qué cultivo?"
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
            />
          ) : null}
          <div className="flex flex-col gap-2">
            <Campo
              etiqueta="Variedad (opcional)"
              value={variedad}
              onChange={(e) => setVariedad(e.target.value)}
            />
            {sugeridas.length && codigo ? (
              <div className="flex flex-wrap gap-1.5">
                {sugeridas.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVariedad(v)}
                    className="rounded-full bg-fondo px-2.5 py-1 text-xs text-texto-2 hover:text-tinta"
                  >
                    {v}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Campo
            etiqueta="Estado fenológico (opcional)"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            placeholder="Ej.: floración"
          />
        </div>
      </Tarjeta>
      <Tarjeta titulo="Marco de plantación">
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            etiqueta="Entre hileras (m)"
            inputMode="decimal"
            value={entreHileras}
            onChange={(e) => setEntreHileras(e.target.value)}
            placeholder="Ej.: 7"
          />
          <Campo
            etiqueta="Entre plantas (m)"
            inputMode="decimal"
            value={entrePlantas}
            onChange={(e) => setEntrePlantas(e.target.value)}
            placeholder="Ej.: 5"
          />
          {cultivo?.perennial || (!cultivo && otro) ? (
            <Campo
              etiqueta="Año de implantación"
              inputMode="numeric"
              value={anio}
              onChange={(e) => setAnio(e.target.value)}
              placeholder="Ej.: 2018"
            />
          ) : null}
        </div>
        {pl ? (
          <p className="mt-2 text-[13px] text-texto-2">
            = {pl.toLocaleString("es-AR")} plantas por hectárea
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-2">
          <span className="text-xs font-bold tracking-wider text-texto uppercase">
            Cobertura entre hileras (opcional)
          </span>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(NOMBRE_CUBIERTA) as Cubierta[]).map((x) => (
              <button
                key={x}
                type="button"
                aria-pressed={cubierta === x}
                onClick={() => setCubierta(cubierta === x ? null : x)}
                className={chip(cubierta === x)}
              >
                {NOMBRE_CUBIERTA[x]}
              </button>
            ))}
          </div>
        </div>
      </Tarjeta>
      <Tarjeta titulo="Fechas">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Inicio"
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            ayuda="Siembra, implantación o inicio de la campaña."
          />
          <Campo
            etiqueta="Fin (opcional)"
            type="date"
            value={fin}
            onChange={(e) => setFin(e.target.value)}
          />
        </div>
      </Tarjeta>
      <Aviso mensaje={error} />
      <div className="flex flex-wrap items-center gap-2">
        <Boton type="submit" icono={Save} cargando={guardando}>
          Guardar
        </Boton>
        <Boton type="button" variante="secundario" onClick={() => navegar(-1)}>
          Cancelar
        </Boton>
        {inicial ? (
          borrar ? (
            <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-texto-2">
              ¿Borrar este cultivo del lote?
              <Boton
                type="button"
                variante="secundario"
                icono={Trash2}
                onClick={async () => {
                  const r = await borrarActividad(inicial.id);
                  if (r.ok) navegar(`/campo/${campo.id}/lote/${lote.id}`);
                  else setError(r.mensaje);
                }}
              >
                Sí, borrar
              </Boton>
            </span>
          ) : (
            <Boton
              type="button"
              variante="texto"
              icono={Trash2}
              className="ml-auto"
              onClick={() => setBorrar(true)}
            >
              Borrar
            </Boton>
          )
        ) : null}
      </div>
    </form>
  );
}
