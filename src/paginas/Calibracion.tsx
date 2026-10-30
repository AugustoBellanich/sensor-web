// Calibración de un sitio (D-41), como en la app pero solo para ver: por electrodo, la curva con sus
// puntos, los niveles PMP, CC y SAT y el suelo. Cada número dice de dónde salió. Cargar puntos,
// suelo o niveles se hace en la app, en el campo.
import { FlaskConical, Layers, Spline } from "lucide-react";
import { useCallback, useState } from "react";
import { useParams } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { CurvaCalibracion } from "@/componentes/CurvaCalibracion";
import { Barra, Contenido } from "@/componentes/Marco";
import { Aviso, Cargando, FilaDato, Segmento, Tarjeta, Titulo } from "@/componentes/ui";
import {
  fichaCalibracion,
  TEXTO_ESTADO_CURVA,
  TEXTO_ESTADO_VALOR,
  TEXTO_METODO,
  TEXTO_MODELO,
  TEXTO_NIVEL,
  TEXTO_ORIGEN,
  type ElectrodoCal,
} from "@/datos/calibracion";
import { fechaHoraArg } from "@/datos/grafico";
import { infoSitio } from "@/datos/series";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";

const COLOR_E = ["#2563eb", "#16a34a", "#ea580c"];
const fecha = (t: string) => fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const coma = (v: number | null | undefined, d = 1) => (v == null ? "—" : v.toLocaleString("es-AR", { maximumFractionDigits: d }));

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
          ...(info?.establishment_id ? [{ texto: info.establishment_name ?? "Campo", a: `/campo/${info.establishment_id}` }] : []),
          { texto: ficha?.name ?? "Sitio", a: `/sitio/${id}` },
          { texto: "Calibración" },
        ]}
      />
      <Contenido ancho={1320}>
        <Aviso mensaje={c.error} />
        {c.cargando && !ficha ? <Cargando texto="Leyendo la calibración…" /> : null}
        {!c.cargando && !ficha && !c.error ? <Aviso tipo="aviso" mensaje="No tenés acceso a este sitio o no existe." /> : null}
        {ficha ? (
          <>
            <Titulo
              titulo={`Calibración · ${ficha.name}`}
              datos={
                <>
                  <span>{ficha.device_id ?? "Sin equipo ahora"}</span>
                  <span className="text-texto-3">Se carga y se corrige desde la app, en el campo.</span>
                </>
              }
              acciones={
                <Segmento
                  etiqueta="Electrodo"
                  opciones={ficha.electrodes.map((x) => ({ valor: String(x.index) as "1" | "2" | "3", texto: x.depth != null ? `${coma(x.depth, 0)} cm` : `E${x.index}` }))}
                  valor={elegido}
                  alCambiar={setElegido}
                />
              }
            />
            {e ? <Electrodo e={e} /> : null}
          </>
        ) : null}
      </Contenido>
    </>
  );
}

function Electrodo({ e }: { e: ElectrodoCal }) {
  const curva = e.curva;
  const estado = curva ? TEXTO_ESTADO_CURVA[curva.status] : TEXTO_ESTADO_CURVA.insuficiente;
  const activos = e.puntos.filter((p) => p.active).length;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[3_1_560px] flex-col gap-4">
          <Tarjeta
            titulo={
              <span className="inline-flex items-center gap-1.5">
                <Spline size={15} strokeWidth={1.9} style={{ color: COLOR_E[e.index - 1] }} aria-hidden />
                Curva del sensor
              </span>
            }
            derecha={
              <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold" style={{ color: estado.color, borderColor: estado.color }}>
                {estado.titulo}
              </span>
            }
          >
            <p className="mb-3 text-[13px] text-texto-2">
              {curva?.reason === "pendiente_invertida" ? "Los puntos dan humedad que sube con los mV: revisá si alguno está mal cargado." : estado.detalle}
            </p>
            {curva?.model ? (
              <div className="mb-3 grid grid-cols-2 gap-3 border-y border-separador py-3 sm:grid-cols-4">
                <Celda titulo="Modelo" valor={TEXTO_MODELO[curva.model]} />
                <Celda titulo="Puntos" valor={String(curva.n)} />
                <Celda titulo="Rango validado" valor={`${coma(curva.hv_min)} – ${coma(curva.hv_max)} %`} nota={`${coma(curva.mv_min, 0)} – ${coma(curva.mv_max, 0)} mV`} />
                <Celda
                  titulo="Error"
                  valor={curva.rmse_cv != null ? `± ${coma(curva.rmse_cv)} %` : "sin estimar"}
                  nota={curva.rmse_cv != null ? `validación dejando un punto afuera · ajuste ± ${coma(curva.rmse_fit)} %` : "hacen falta 3 puntos"}
                />
              </div>
            ) : null}
            <CurvaCalibracion e={e} color={COLOR_E[e.index - 1]} />
            <p className="mt-2 text-xs text-texto-3">
              ● punto medido · ○ desactivado · ◯ blanco: punto de la calibración anterior · línea cortada: extrapolado (fuera del rango medido, con más error). Más allá no se calcula humedad: se
              muestra el mV.
            </p>
            {curva?.candidates && curva.candidates.length > 1 ? (
              <p className="mt-1 text-xs text-texto-3">
                Modelos probados: {curva.candidates.map((k) => `${TEXTO_MODELO[k.model]} ± ${coma(k.rmse_cv ?? k.rmse_fit)} %`).join(" · ")}
                {curva.fitted_at ? ` · ajustada el ${fecha(curva.fitted_at)}` : ""}
              </p>
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
            <p className="mb-1 text-xs text-texto-3">Son del suelo, en % vol. El mV de cada uno sale de la curva del sensor.</p>
            {(["sat", "cc", "pmp"] as const).map((l) => {
              const n = e.niveles.find((x) => x.level === l);
              return (
                <div key={l} className="flex items-start gap-3 border-t border-separador py-2.5 first:border-t-0">
                  <span className="w-10 shrink-0 text-[13px] font-bold text-[#047857]">{TEXTO_NIVEL[l].corto}</span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[13px] text-texto-2">{TEXTO_NIVEL[l].largo}</span>
                    {n ? (
                      <span className="text-xs text-texto-3">
                        {TEXTO_ORIGEN[n.origin]} · {n.mv != null ? `≈ ${coma(n.mv, 0)} mV (${TEXTO_ESTADO_VALOR[n.estado]})` : `sin mV: ${TEXTO_ESTADO_VALOR[n.estado]}`}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right text-[15px] font-semibold text-tinta">
                    {n ? `${coma(n.theta_v)} %` : <span className="text-[13px] font-normal text-texto-3">Sin cargar</span>}
                    {n?.theta_g != null ? <span className="block text-[11.5px] font-normal text-texto-3">{coma(n.theta_g)} % grav</span> : null}
                  </span>
                </div>
              );
            })}
          </Tarjeta>
          <Tarjeta
            titulo={
              <span className="inline-flex items-center gap-1.5">
                <Layers size={15} strokeWidth={1.9} className="text-[#8f6f45]" aria-hidden />
                Suelo
              </span>
            }
            derecha={e.suelo ? <span className="text-xs text-texto-3">{fecha(e.suelo.measured_at)}</span> : null}
          >
            {e.suelo ? (
              <>
                <FilaDato etiqueta="Profundidad">{e.suelo.depth_cm != null ? `${coma(e.suelo.depth_cm, 0)} cm` : e.depth != null ? `${coma(e.depth, 0)} cm` : "—"}</FilaDato>
                <FilaDato etiqueta={<ConAyuda que="densidad aparente" texto={AYUDA.densidad}>Densidad aparente</ConAyuda>}>{e.densidad != null ? `${coma(e.densidad, 2)} g/cm³` : "—"}</FilaDato>
                <FilaDato etiqueta="Textura">{e.suelo.texture_class ?? "—"}</FilaDato>
                {e.suelo.sand_pct != null ? (
                  <FilaDato etiqueta="Arena · limo · arcilla">
                    {coma(e.suelo.sand_pct, 0)} · {coma(e.suelo.silt_pct, 0)} · {coma(e.suelo.clay_pct, 0)} %
                  </FilaDato>
                ) : null}
                <FilaDato etiqueta="Materia orgánica">{e.suelo.organic_matter_pct != null ? `${coma(e.suelo.organic_matter_pct)} %` : "—"}</FilaDato>
                {e.historial_suelo.length > 1 ? <p className="mt-1 text-xs text-texto-3">{e.historial_suelo.length} registros guardados; se usa el más reciente.</p> : null}
              </>
            ) : (
              <p className="text-[13px] text-texto-2">Sin datos del suelo. Al instalar: densidad con cilindros y textura, cerca de la sonda en suelo sin remover.</p>
            )}
          </Tarjeta>
        </div>
      </div>

      <Tarjeta
        sinRelleno
        titulo={
          <span className="inline-flex items-center gap-1.5">
            <FlaskConical size={15} strokeWidth={1.9} className="text-texto-3" aria-hidden />
            Puntos ({activos} {activos === 1 ? "activo" : "activos"})
          </span>
        }
      >
        {!e.puntos.length ? <p className="px-[18px] pb-4 text-[13px] text-texto-2">Todavía no hay puntos.</p> : null}
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
                  <th className="py-2 pr-[18px] font-normal">Notas</th>
                </tr>
              </thead>
              <tbody>
                {e.puntos.map((p) => (
                  <tr key={p.id} className={`border-t border-separador first:border-t-0 ${p.active ? "" : "text-texto-3"}`}>
                    <td className="px-[18px] py-2 whitespace-nowrap">
                      {fecha(p.sampled_at)}
                      {!p.active ? <span className="ml-1.5 rounded bg-fondo px-1.5 py-0.5 text-[11px]">desactivado</span> : null}
                    </td>
                    <td className="py-2 text-right">{coma(p.mv, 0)}</td>
                    <td className="py-2 text-right font-medium">{coma(p.theta_v)} %</td>
                    <td className="py-2 text-right text-texto-3">{p.estimado != null ? `${coma(p.estimado)} %` : "—"}</td>
                    <td className="py-2 pl-5">{TEXTO_METODO[p.method]}</td>
                    <td className="py-2 font-mono text-xs">{p.device_id}</td>
                    <td className="max-w-[280px] truncate py-2 pr-[18px] text-texto-3" title={[p.notes, p.deactivated_reason, p.created_by_name].filter(Boolean).join(" · ")}>
                      {[p.deactivated_reason, p.notes, p.created_by_name].filter(Boolean).join(" · ") || "—"}
                    </td>
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

function Celda({ titulo, valor, nota }: { titulo: string; valor: string; nota?: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-xs text-texto-3">{titulo}</span>
      <span className="text-[15px] font-semibold text-tinta">{valor}</span>
      {nota ? <span className="text-[11.5px] text-texto-3">{nota}</span> : null}
    </div>
  );
}

