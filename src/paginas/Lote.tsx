// Un lote, como en la app: sus sitios con el agua útil de ahora, los riegos y lluvias cargados, y
// a un costado la forma vigente, el cultivo, el riego del lote y la copa. Desde acá se cargan riegos y
// lluvias, se cambia el sistema de riego y se anula un evento mal cargado; redibujar y editar el
// cultivo siguen en la app.
import { Ban, CloudRain, Droplets, Spline, Sprout } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useParams } from "react-router";

import { MapaCampo } from "@/componentes/MapaCampo";
import { Barra, Contenido } from "@/componentes/Marco";
import {
  Aviso,
  Boton,
  Cargando,
  Dato,
  FilaDato,
  Segmento,
  Tarjeta,
  Titulo,
} from "@/componentes/ui";
import {
  aguaLote,
  anillo,
  detalleCampo,
  historialLote,
  medicionesCopa,
  mm,
  NOMBRE_ACTIVIDAD,
  NOMBRE_CUBIERTA,
  NOMBRE_METODO,
  sistemasRiego,
  textoDuracion,
  textoHa,
} from "@/datos/campos";
import { familiaDeModelo } from "@/datos/familias";
import { fechaHoraArg } from "@/datos/grafico";
import { anularEvento } from "@/datos/riego";
import { infoSitio, type InfoSitio } from "@/datos/series";
import { useConsulta } from "@/datos/useConsulta";
import { cultivoDe, datoCorto, FilaSitio } from "@/paginas/Campo";

const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const fechaHora = (t: string) => `${fecha(t)} ${fechaHoraArg(t).slice(11, 16)}`;
const dia = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const coma = (v: number | null | undefined, d = 1) =>
  v == null ? "—" : v.toLocaleString("es-AR", { maximumFractionDigits: d });

const PERIODOS = [
  { valor: "30", texto: "30 días" },
  { valor: "90", texto: "90 días" },
  { valor: "365", texto: "Un año" },
] as const;

export function Lote() {
  const { campo = "", id = "" } = useParams();
  const [dias, setDias] = useState<"30" | "90" | "365">("90");
  const c = useConsulta(
    useCallback(async () => {
      const [d, f, r, p] = await Promise.all([
        detalleCampo(campo),
        historialLote(id),
        sistemasRiego(id),
        medicionesCopa(id),
      ]);
      const lote = d.campo?.plots.find((l) => l.id === id) ?? null;
      const sitios = (d.campo?.sites ?? []).filter((s) => s.plot_id === id);
      const conDatos = sitios.filter(
        (s) => s.device && (s.device.type === "B01" || s.device.type === "C01"),
      );
      const infos = await Promise.all(conDatos.map((s) => infoSitio(s.id)));
      const info = new Map<string, InfoSitio>();
      infos.forEach((x, k) => x.info && info.set(conDatos[k].id, x.info));
      return {
        campo: d.campo,
        lote,
        sitios,
        info,
        formas: f.formas,
        sistema: r.sistemas[0] ?? null,
        copa: p.mediciones[0] ?? null,
        error: d.error ?? f.error ?? r.error ?? p.error,
      };
    }, [campo, id]),
  );
  const agua = useConsulta(
    useCallback(() => {
      const hoy = Date.now();
      return aguaLote(
        id,
        dia(hoy - Number(dias) * 86400e3),
        dia(hoy + 86400e3),
      );
    }, [id, dias]),
  );

  const k = c.datos?.campo ?? null;
  const l = c.datos?.lote ?? null;
  const sitios = c.datos?.sitios ?? [];
  const a = l?.activity ?? null;
  const s = c.datos?.sistema ?? null;
  const eventos = (agua.datos?.eventos ?? [])
    .filter((e) => !e.voided_at)
    .sort((x, y) => y.started_at.localeCompare(x.started_at));

  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          { texto: k?.name ?? "Campo", a: `/campo/${campo}` },
          { texto: l?.name ?? "Lote" },
        ]}
      >
        {k?.can_edit && l ? (
          <>
            <Link
              to={`/campo/${campo}/agua?lote=${id}&tipo=lluvia`}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-linea bg-white px-3 text-[13px] font-medium text-texto-2 no-underline hover:bg-fondo hover:text-tinta"
            >
              <CloudRain size={15} strokeWidth={1.9} aria-hidden />
              Cargar lluvia
            </Link>
            <Link
              to={`/campo/${campo}/agua?lote=${id}&tipo=riego`}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-tinta bg-tinta px-3 text-[13px] font-medium text-white no-underline hover:bg-[#1e293b]"
            >
              <Droplets size={15} strokeWidth={1.9} aria-hidden />
              Cargar riego
            </Link>
          </>
        ) : null}
      </Barra>
      <Contenido>
        <Aviso mensaje={c.error ?? agua.error} />
        {c.cargando && !l ? <Cargando texto="Leyendo el lote…" /> : null}
        {!c.cargando && !l && !c.error ? (
          <Aviso
            tipo="aviso"
            mensaje="No tenés acceso a este lote o no existe."
          />
        ) : null}
        {l ? (
          <>
            <Titulo
              titulo={l.name}
              datos={
                <>
                  <Dato icono={Sprout}>{cultivoDe(l)}</Dato>
                  {l.irrigation_method ? (
                    <Dato icono={Droplets}>
                      {NOMBRE_METODO[l.irrigation_method]}
                    </Dato>
                  ) : null}
                  <Dato icono={Spline}>{textoHa(l.area_ha)}</Dato>
                </>
              }
            />
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
                <Tarjeta titulo={`Sitios del lote (${sitios.length})`}>
                  {sitios.length ? (
                    sitios.map((x) => (
                      <FilaSitio
                        key={x.id}
                        s={x}
                        info={c.datos?.info.get(x.id)}
                      />
                    ))
                  ) : (
                    <p className="text-[13px] text-texto-2">
                      Este lote no tiene sitios.
                    </p>
                  )}
                </Tarjeta>
                <Tarjeta
                  titulo="Riegos y lluvias"
                  derecha={
                    <Segmento
                      etiqueta="Período"
                      opciones={PERIODOS}
                      valor={dias}
                      alCambiar={setDias}
                    />
                  }
                >
                  {agua.cargando ? <Cargando /> : null}
                  {!agua.cargando && !eventos.length ? (
                    <p className="text-[13px] text-texto-2">
                      Sin riegos ni lluvias cargados en el período.
                    </p>
                  ) : null}
                  {eventos.map((e) => {
                    const riego = e.kind === "riego";
                    const Icono = riego ? Droplets : CloudRain;
                    return (
                      <div
                        key={e.id}
                        className="grid grid-cols-[92px_minmax(110px,1fr)_minmax(0,1.4fr)_70px_auto] items-center gap-2.5 border-t border-separador py-2 text-[13px] first:border-t-0"
                      >
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${riego ? "text-[#0369a1]" : "text-[#4338ca]"}`}
                        >
                          <Icono size={15} strokeWidth={1.9} aria-hidden />
                          {riego ? "Riego" : "Lluvia"}
                        </span>
                        <span className="text-texto-2">
                          {riego
                            ? fechaHora(e.started_at)
                            : fecha(e.started_at)}
                        </span>
                        <span className="truncate text-texto-3">
                          {[
                            textoDuracion(e.duration_min),
                            e.created_by_name,
                            e.notes,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                        <span className="text-right font-medium text-tinta">
                          {mm(e.gross_mm)}
                        </span>
                        {k?.can_edit ? (
                          <Anular id={e.id} alAnular={agua.actualizar} />
                        ) : null}
                      </div>
                    );
                  })}
                </Tarjeta>
              </div>
              <div className="flex min-w-0 flex-[2_1_330px] flex-col gap-4">
                <Tarjeta titulo="Forma">
                  {l.boundary ? (
                    <MapaCampo
                      alto={260}
                      etiqueta={`Forma de ${l.name}`}
                      poligonos={[{ id: l.id, puntos: anillo(l.boundary) }]}
                      puntos={sitios
                        .filter((x) => x.lat != null && x.lng != null)
                        .map((x) => ({
                          id: x.id,
                          lat: x.lat!,
                          lng: x.lng!,
                          familia: x.device
                            ? familiaDeModelo(x.device.type)
                            : null,
                          dato: c.datos?.info.get(x.id)
                            ? datoCorto(c.datos.info.get(x.id)!)
                            : null,
                          nombre: x.name,
                          a: x.device ? `/sitio/${x.id}` : undefined,
                        }))}
                    />
                  ) : (
                    <p className="text-[13px] text-texto-2">
                      Sin forma dibujada.
                    </p>
                  )}
                  <p className="mt-2 text-xs text-texto-3">
                    {textoHa(l.area_ha)}
                    {l.shape_since
                      ? ` · vigente desde ${fecha(l.shape_since)}`
                      : ""}
                    {(c.datos?.formas.length ?? 0) > 1
                      ? ` · ${c.datos!.formas.length - 1} ${c.datos!.formas.length === 2 ? "forma anterior" : "formas anteriores"}`
                      : ""}
                  </p>
                </Tarjeta>
                <Tarjeta
                  titulo={a ? NOMBRE_ACTIVIDAD[a.activity_type] : "Cultivo"}
                >
                  {a ? (
                    <>
                      <FilaDato etiqueta="Cultivo">
                        {a.crop_name ?? a.crop ?? "—"}
                      </FilaDato>
                      {a.variety ? (
                        <FilaDato etiqueta="Variedad">{a.variety}</FilaDato>
                      ) : null}
                      {a.planted_year ? (
                        <FilaDato etiqueta="Implantación">
                          {a.planted_year}
                        </FilaDato>
                      ) : null}
                      {a.row_spacing_m || a.plant_spacing_m ? (
                        <FilaDato etiqueta="Marco">
                          {coma(a.row_spacing_m)} m entre hileras ×{" "}
                          {coma(a.plant_spacing_m)} m entre plantas
                        </FilaDato>
                      ) : null}
                      {a.inter_row_cover ? (
                        <FilaDato etiqueta="Entre hileras">
                          {NOMBRE_CUBIERTA[a.inter_row_cover]}
                        </FilaDato>
                      ) : null}
                      {a.phenological_stage ? (
                        <FilaDato etiqueta="Estado fenológico">
                          {a.phenological_stage}
                        </FilaDato>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-[13px] text-texto-2">
                      Sin cultivo cargado.
                    </p>
                  )}
                </Tarjeta>
                <Tarjeta
                  titulo="Riego del lote"
                  derecha={
                    k?.can_edit ? (
                      <Link
                        to={`/campo/${campo}/lote/${id}/riego`}
                        className="text-[13px] font-medium text-acento-oscuro no-underline hover:underline"
                      >
                        {s ? "Cambiar" : "Cargar"}
                      </Link>
                    ) : null
                  }
                >
                  {s ? (
                    <>
                      <FilaDato etiqueta="Sistema">
                        {NOMBRE_METODO[s.method]}
                      </FilaDato>
                      {s.application_rate_mmh != null ? (
                        <FilaDato etiqueta="Lámina por hora">
                          {coma(s.application_rate_mmh, 2)} mm/h
                        </FilaDato>
                      ) : null}
                      {s.emitter_flow_lph != null ? (
                        <FilaDato etiqueta="Caudal del emisor">
                          {coma(s.emitter_flow_lph)} l/h
                        </FilaDato>
                      ) : null}
                      {s.application_efficiency != null ? (
                        <FilaDato etiqueta="Eficiencia">
                          {Math.round(s.application_efficiency * 100)} %
                        </FilaDato>
                      ) : null}
                      {s.valid_from ? (
                        <FilaDato etiqueta="Desde">
                          {fecha(s.valid_from)}
                        </FilaDato>
                      ) : null}
                    </>
                  ) : (
                    <p className="text-[13px] text-texto-2">
                      Sin sistema de riego cargado: los riegos en horas no se
                      pueden pasar a mm.
                    </p>
                  )}
                </Tarjeta>
                <Tarjeta titulo="Copa">
                  {c.datos?.copa ? (
                    <p className="text-[13px] text-texto-2">
                      {c.datos.copa.fc != null ? (
                        <span className="font-medium text-tinta">
                          {Math.round(c.datos.copa.fc * 100)} % de cobertura
                        </span>
                      ) : (
                        "Sin cobertura calculada"
                      )}
                      {c.datos.copa.height_m != null
                        ? `, ${coma(c.datos.copa.height_m)} m de alto`
                        : ""}
                      , medida el {fecha(c.datos.copa.measured_on)}.
                    </p>
                  ) : (
                    <p className="text-[13px] text-texto-2">
                      Sin medición de copa.
                    </p>
                  )}
                </Tarjeta>
              </div>
            </div>
          </>
        ) : null}
      </Contenido>
    </>
  );
}

/** Anular un riego o una lluvia mal cargados: queda en el historial con el motivo, sin sumar. */
function Anular({ id, alAnular }: { id: string; alAnular: () => void }) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  if (!abierto)
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Anular"
        aria-label="Anular"
        className="flex h-7 w-7 items-center justify-center rounded-md text-texto-3 hover:bg-fondo hover:text-error"
      >
        <Ban size={14} aria-hidden />
      </button>
    );
  return (
    <form
      className="col-span-full flex flex-wrap items-center gap-2 pb-1"
      onSubmit={async (ev) => {
        ev.preventDefault();
        setTrabajando(true);
        const r = await anularEvento(id, motivo);
        setTrabajando(false);
        if (!r.ok) return setError(r.mensaje);
        setAbierto(false);
        alAnular();
      }}
    >
      <input
        autoFocus
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (ej.: cargado dos veces)"
        aria-label="Motivo"
        className="h-[32px] min-w-[220px] flex-1 rounded-lg border border-linea px-2.5 text-[13px] outline-none focus:ring-2 focus:ring-acento-oscuro"
      />
      <Boton
        type="submit"
        variante="secundario"
        cargando={trabajando}
        disabled={!motivo.trim()}
      >
        Anular
      </Boton>
      <Boton type="button" variante="texto" onClick={() => setAbierto(false)}>
        Cancelar
      </Boton>
      {error ? (
        <span className="w-full text-xs text-error">{error}</span>
      ) : null}
    </form>
  );
}
