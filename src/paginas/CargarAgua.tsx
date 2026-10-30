// Cargar un riego o una lluvia (D-51, D-52), como en la app: fecha y hora de ahora, la duración del
// último riego y los lotes que se quieran marcar (el mismo turno puede regar varios; una lluvia,
// todo el campo). La cantidad es opcional y se carga como se sepa. La base calcula los mm de cada
// lote con su sistema de riego; acá solo se muestra la vista previa del lote desde el que se entró.
import { CloudRain, Droplets } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";

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
import { detalleCampo, textoHa, type DetalleCampo } from "@/datos/campos";
import {
  aguaLote,
  armarEvento,
  enviarEvento,
  fechaArgHoy,
  formasPara,
  horaArgAhora,
  leerDuracion,
  leerNumero,
  mm,
  NOMBRE_FORMA,
  NOMBRE_METODO,
  sistemasRiego,
  tasaMmH,
  type FormaCantidad,
  type SistemaRiego,
  type TipoEvento,
} from "@/datos/riego";
import { useConsulta } from "@/datos/useConsulta";

const DIA_MS = 86400e3;
const TIPOS = [
  { valor: "riego", texto: "Riego" },
  { valor: "lluvia", texto: "Lluvia" },
] as const;

/** 150 → "2:30"; 180 → "3". */
const duracionTexto = (min: number) =>
  min % 60
    ? `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`
    : String(min / 60);

export function CargarAgua() {
  const { campo: campoId = "" } = useParams();
  const [q] = useSearchParams();
  const loteId = q.get("lote");
  const c = useConsulta(
    useCallback(async () => {
      const ahora = Date.now();
      const [d, s, w] = await Promise.all([
        detalleCampo(campoId),
        loteId
          ? sistemasRiego(loteId)
          : Promise.resolve({ sistemas: [] as SistemaRiego[], error: null }),
        loteId
          ? aguaLote(
              loteId,
              new Date(ahora - 120 * DIA_MS).toISOString(),
              new Date(ahora + DIA_MS).toISOString(),
            )
          : Promise.resolve({ eventos: [], error: null }),
      ]);
      const ultimo = [...w.eventos]
        .reverse()
        .find((e) => e.kind === "riego" && e.duration_min);
      return {
        campo: d.campo,
        sistema: s.sistemas.find((x) => !x.valid_to) ?? null,
        ultimaDuracion: ultimo?.duration_min ?? null,
        error: d.error ?? s.error ?? w.error,
      };
    }, [campoId, loteId]),
  );
  const k = c.datos?.campo ?? null;
  const lote = k?.plots.find((x) => x.id === loteId) ?? null;
  const tipo: TipoEvento = q.get("tipo") === "lluvia" ? "lluvia" : "riego";
  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          { texto: k?.name ?? "Campo", a: `/campo/${campoId}` },
          ...(lote
            ? [{ texto: lote.name, a: `/campo/${campoId}/lote/${lote.id}` }]
            : []),
          { texto: tipo === "riego" ? "Cargar riego" : "Cargar lluvia" },
        ]}
      />
      <Contenido ancho={1080}>
        <Aviso mensaje={c.error} />
        {c.cargando && !k ? <Cargando /> : null}
        {k && !k.can_edit ? (
          <Aviso
            tipo="aviso"
            mensaje="Solo el dueño y los editores del campo cargan riegos y lluvias."
          />
        ) : null}
        {k && k.can_edit && c.datos ? (
          <Formulario
            campo={k}
            loteId={loteId}
            todos={q.get("todos") === "1"}
            tipoInicial={tipo}
            sistema={c.datos.sistema}
            ultimaDuracion={c.datos.ultimaDuracion}
          />
        ) : null}
      </Contenido>
    </>
  );
}

type Props = {
  campo: DetalleCampo;
  loteId: string | null;
  todos: boolean;
  tipoInicial: TipoEvento;
  sistema: SistemaRiego | null;
  ultimaDuracion: number | null;
};

function Formulario({
  campo,
  loteId,
  todos,
  tipoInicial,
  sistema,
  ultimaDuracion,
}: Props) {
  const navegar = useNavigate();
  const lote = campo.plots.find((x) => x.id === loteId) ?? null;
  const [tipo, setTipo] = useState<TipoEvento>(tipoInicial);
  const [lotes, setLotes] = useState<string[]>(
    todos || !loteId ? campo.plots.map((x) => x.id) : [loteId],
  );
  const [fecha, setFecha] = useState(fechaArgHoy());
  const [hora, setHora] = useState(horaArgAhora());
  const [forma, setForma] = useState<FormaCantidad>(
    formasPara(tipoInicial, sistema?.method ?? null)[0],
  );
  const [duracion, setDuracion] = useState(
    ultimaDuracion ? duracionTexto(ultimaDuracion) : "",
  );
  const [medidorDesde, setMedidorDesde] = useState("");
  const [medidorHasta, setMedidorHasta] = useState("");
  const [volumen, setVolumen] = useState("");
  const [lamina, setLamina] = useState("");
  const [caudal, setCaudal] = useState("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const formas = formasPara(tipo, sistema?.method ?? null);
  const pide = {
    duracion:
      forma === "horas" ||
      forma === "caudal_y_horas" ||
      (tipo === "riego" && forma !== "sin_cantidad"),
    medidor: forma === "caudalimetro",
    volumen: forma === "volumen",
    lamina: forma === "lamina",
    caudal: forma === "caudal_y_horas",
  };
  const area = sistema?.irrigated_area_ha ?? lote?.area_ha ?? null;
  const min = leerDuracion(duracion);
  const a = lote?.activity;
  const tasa = sistema
    ? tasaMmH(
        sistema,
        a?.row_spacing_m ?? null,
        a?.plant_spacing_m ?? null,
        lote?.area_ha ?? null,
      )
    : null;
  const previa = (() => {
    const v = leerNumero;
    if (forma === "horas")
      return tasa != null && min ? tasa * (min / 60) : null;
    if (forma === "lamina") return v(lamina);
    if (!area) return null;
    const m2 = area * 10000;
    if (forma === "caudalimetro") {
      const x = v(medidorDesde);
      const y = v(medidorHasta);
      return x != null && y != null && y >= x ? ((y - x) * 1000) / m2 : null;
    }
    if (forma === "volumen")
      return v(volumen) != null ? (v(volumen)! * 1000) / m2 : null;
    if (forma === "caudal_y_horas")
      return v(caudal) != null && min ? (v(caudal)! * min * 60) / m2 : null;
    return null;
  })();

  function cambiarTipo(t: TipoEvento) {
    setTipo(t);
    setForma(formasPara(t, sistema?.method ?? null)[0]);
  }

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    setError(null);
    if (!lotes.length) return setError("Elegí al menos un lote.");
    const r = armarEvento({
      tipo,
      fecha,
      hora,
      forma,
      duracion: pide.duracion ? duracion : "",
      medidorDesde,
      medidorHasta,
      volumen,
      lamina,
      caudal,
      notas,
    });
    if (!r.ok) return setError(r.mensaje);
    setGuardando(true);
    const e = await enviarEvento(lotes, r.evento);
    setGuardando(false);
    if (!e.ok)
      return setError(
        e.sinRed
          ? "No hay conexión con la base. Lo escrito sigue acá: probá de nuevo en un momento."
          : e.mensaje,
      );
    navegar(lote ? `/campo/${campo.id}/lote/${lote.id}` : `/campo/${campo.id}`);
  }

  const todosElegidos = lotes.length === campo.plots.length;
  return (
    <>
      <Titulo
        titulo={tipo === "riego" ? "Cargar riego" : "Cargar lluvia"}
        datos={
          <span>{lote ? `${lote.name} · ${campo.name}` : campo.name}</span>
        }
        acciones={
          <Segmento
            etiqueta="Tipo"
            opciones={TIPOS}
            valor={tipo}
            alCambiar={cambiarTipo}
          />
        }
      />
      <form onSubmit={guardar} className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
          <Tarjeta titulo="Cuándo">
            <div className="grid grid-cols-2 gap-4">
              <Campo
                etiqueta="Fecha"
                type="date"
                value={fecha}
                max={fechaArgHoy()}
                onChange={(e) => setFecha(e.target.value)}
              />
              <Campo
                etiqueta={tipo === "riego" ? "Empezó a las" : "Hora"}
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </div>
          </Tarjeta>
          <Tarjeta
            titulo={tipo === "riego" ? "Cantidad de riego" : "Precipitación"}
          >
            <div className="mb-4 overflow-x-auto">
              <Segmento
                etiqueta="Forma"
                opciones={formas.map((f) => ({
                  valor: f,
                  texto:
                    f === "lamina" && tipo === "lluvia"
                      ? "Milímetros (pluviómetro)"
                      : NOMBRE_FORMA[f],
                }))}
                valor={forma}
                alCambiar={setForma}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {pide.duracion ? (
                <Campo
                  etiqueta={
                    forma === "horas" || forma === "caudal_y_horas"
                      ? "Duración (horas)"
                      : "Duración (horas, opcional)"
                  }
                  value={duracion}
                  onChange={(e) => setDuracion(e.target.value)}
                  placeholder="Ej.: 3 o 2:30"
                  ayuda={
                    ultimaDuracion && duracion === duracionTexto(ultimaDuracion)
                      ? "La del último riego de este lote."
                      : undefined
                  }
                />
              ) : null}
              {pide.medidor ? (
                <>
                  <Campo
                    etiqueta="Medidor al empezar (m³)"
                    inputMode="decimal"
                    value={medidorDesde}
                    onChange={(e) => setMedidorDesde(e.target.value)}
                  />
                  <Campo
                    etiqueta="Al terminar (m³)"
                    inputMode="decimal"
                    value={medidorHasta}
                    onChange={(e) => setMedidorHasta(e.target.value)}
                  />
                </>
              ) : null}
              {pide.volumen ? (
                <Campo
                  etiqueta="Volumen (m³)"
                  inputMode="decimal"
                  value={volumen}
                  onChange={(e) => setVolumen(e.target.value)}
                />
              ) : null}
              {pide.lamina ? (
                <Campo
                  etiqueta="Milímetros"
                  inputMode="decimal"
                  value={lamina}
                  onChange={(e) => setLamina(e.target.value)}
                />
              ) : null}
              {pide.caudal ? (
                <Campo
                  etiqueta="Caudal (L/s)"
                  inputMode="decimal"
                  value={caudal}
                  onChange={(e) => setCaudal(e.target.value)}
                />
              ) : null}
            </div>
            {forma === "sin_cantidad" ? (
              <p className="text-[13px] text-texto-2">
                Queda registrado igual: explica la subida de humedad en el
                gráfico.
              </p>
            ) : null}
            {tipo === "riego" && forma === "horas" && lote && tasa == null ? (
              <div className="mt-3">
                <Aviso
                  tipo="aviso"
                  mensaje={
                    sistema
                      ? "El sistema de riego del lote no alcanza para pasar las horas a mm: se guarda la duración."
                      : "Este lote no tiene cargado el sistema de riego: se guarda la duración y los mm se calculan cuando lo cargues."
                  }
                />
              </div>
            ) : null}
            {previa != null && lote ? (
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-fondo px-3 py-2 text-[14px] font-medium text-tinta">
                {tipo === "riego" ? (
                  <Droplets size={17} className="text-[#0369a1]" aria-hidden />
                ) : (
                  <CloudRain size={17} className="text-[#4338ca]" aria-hidden />
                )}
                ≈ {mm(previa)} mm
                {lotes.length > 1 ? ` en ${lote.name}` : ""}
              </p>
            ) : null}
          </Tarjeta>
          <Tarjeta titulo="Notas">
            <Campo
              etiqueta="Notas (opcional)"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={
                tipo === "riego"
                  ? "Ej.: turno de la mañana"
                  : "Ej.: con granizo"
              }
            />
          </Tarjeta>
          <Aviso mensaje={error} />
          <div className="flex gap-2">
            <Boton
              type="submit"
              icono={tipo === "riego" ? Droplets : CloudRain}
              cargando={guardando}
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
        {campo.plots.length > 1 ? (
          <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
            <Tarjeta
              titulo={tipo === "riego" ? "Lotes regados" : "Lotes"}
              derecha={
                <button
                  type="button"
                  className="text-[13px] font-medium text-acento-oscuro hover:underline"
                  onClick={() =>
                    setLotes(
                      todosElegidos && loteId
                        ? [loteId]
                        : campo.plots.map((x) => x.id),
                    )
                  }
                >
                  {todosElegidos && loteId ? "Solo este" : "Todo el campo"}
                </button>
              }
            >
              {campo.plots.map((x) => (
                <label
                  key={x.id}
                  className="flex cursor-pointer items-center gap-3 border-t border-separador py-2 text-[13px] first:border-t-0"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#0369a1]"
                    checked={lotes.includes(x.id)}
                    onChange={(e) =>
                      setLotes((l) =>
                        e.target.checked
                          ? [...l, x.id]
                          : l.filter((y) => y !== x.id),
                      )
                    }
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-tinta">{x.name}</span>
                    <span className="text-xs text-texto-3">
                      {[
                        textoHa(x.area_ha),
                        x.irrigation_method
                          ? NOMBRE_METODO[x.irrigation_method]
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </label>
              ))}
              {tipo === "riego" && lotes.length > 1 ? (
                <p className="mt-2 text-xs text-texto-3">
                  Se carga un riego en cada lote; los mm de cada uno salen de su
                  propio sistema de riego.
                </p>
              ) : null}
            </Tarjeta>
          </div>
        ) : null}
      </form>
    </>
  );
}
