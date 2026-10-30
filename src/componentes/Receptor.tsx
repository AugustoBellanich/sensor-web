// Datos de un receptor (N01), como en la app (ActividadGateway): lo que mandó en su último latido,
// los sensores que pasan por él y sus envíos a la base (ingest_logs) en el período. En la web, el
// estado queda en una columna a la izquierda y la actividad ocupa el resto.
import {
  Activity,
  Battery,
  Clock,
  CloudUpload,
  Copy,
  Cpu,
  MemoryStick,
  RadioTower,
  Timer,
  TriangleAlert,
  Wifi,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";

import { IconoEstado } from "@/componentes/EstadoEquipo";
import { FamiliaYCodigo, HaceCorto } from "@/componentes/familia";
import { Grafico } from "@/componentes/Grafico";
import { Medidor } from "@/componentes/Medidor";
import { Aviso, Cargando, Estado, Segmento, Tarjeta } from "@/componentes/ui";
import { calidadWifi, duracion, hace, semaforo } from "@/datos/estado";
import { aliasPropio, familiaDeModelo } from "@/datos/familias";
import { etiquetaCorta, rango, type Periodo } from "@/datos/grafico";
import { ESCALA_WIFI } from "@/datos/medidor";
import { saludRed, sensoresDe } from "@/datos/salud";
import { actividadGateway, type Envio } from "@/datos/series";
import { useConsulta } from "@/datos/useConsulta";

const PERIODOS_GW = [
  { valor: "24h", texto: "24 h" },
  { valor: "7d", texto: "7 días" },
  { valor: "30d", texto: "30 días" },
] as const;

export function Receptor({ id }: { id: string }) {
  const [periodo, setPeriodo] = useState<Extract<Periodo, "24h" | "7d" | "30d">>("24h");
  const c = useConsulta(
    useCallback(async () => {
      const r = rango(periodo, Date.now())!;
      const [a, s] = await Promise.all([actividadGateway(id, r.desde, r.hasta, r.intervalo), saludRed()]);
      return { ...a, sensores: sensoresDe(id, s.equipos), r, error: a.error ?? s.error };
    }, [id, periodo]),
  );
  const d = c.datos;
  const e = d?.estado ?? null;
  const tiempos = useMemo(() => (d?.horas ?? []).map((h) => Date.parse(h.t)), [d]);
  const t = useMemo(() => {
    const x = { envios: 0, errores: 0, insertadas: 0, duplicadas: 0 };
    for (const h of d?.horas ?? []) {
      x.envios += h.envios;
      x.errores += h.errores;
      x.insertadas += h.insertadas;
      x.duplicadas += h.duplicadas;
    }
    return x;
  }, [d]);
  const sem = e ? semaforo(e.last_heartbeat, "N01") : "sin-datos";

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-[290px] flex-[0_1_340px] flex-col gap-4 lg:sticky lg:top-[84px]">
        <Tarjeta titulo="Ahora" derecha={e ? <HaceCorto fecha={e.last_heartbeat} /> : null}>
          <Aviso mensaje={c.error} />
          {c.cargando && !d ? <Cargando /> : null}
          {e ? (
            <>
              <Estado tipo={sem === "al-dia" ? "ok" : sem === "atrasado" ? "aviso" : "gris"}>Último latido {hace(e.last_heartbeat)}</Estado>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                <Celda icono={Wifi} titulo="WiFi" valor={e.wifi_status ?? "—"} nota={calidadWifi(e.rssi) ? `señal ${calidadWifi(e.rssi)}` : undefined} />
                <Celda icono={RadioTower} titulo="LoRa" valor={e.lora_ready == null ? "—" : e.lora_ready ? "Lista" : "Sin iniciar"} alerta={e.lora_ready === false} />
                <Celda icono={Clock} titulo="Último paquete LoRa" valor={e.last_lora_rx ? hace(e.last_lora_rx) : "—"} />
                <Celda icono={CloudUpload} titulo="Lotes sin subir" valor={e.pending_batches?.toString() ?? "—"} alerta={(e.pending_batches ?? 0) > 3} />
                <Celda
                  icono={Battery}
                  titulo="Batería"
                  valor={e.battery_pct != null ? `${e.battery_pct} %` : "—"}
                  nota={e.battery_mv != null ? `${(e.battery_mv / 1000).toFixed(2).replace(".", ",")} V` : undefined}
                />
                <Celda icono={Timer} titulo="Encendido hace" valor={duracion(e.uptime_s)} />
                <Celda icono={MemoryStick} titulo="Memoria libre" valor={e.free_heap != null ? `${Math.round(e.free_heap / 1024)} KB` : "—"} />
                <Celda icono={Cpu} titulo="Firmware" valor={e.fw_version ?? "—"} />
              </div>
              {e.rssi != null ? (
                <div className="mt-3.5 flex flex-col gap-1 border-t border-separador pt-3">
                  <span className="flex justify-between text-[13px]">
                    <span className="inline-flex items-center gap-1.5 font-medium text-tinta">
                      <Wifi size={14} strokeWidth={1.9} className="text-[#7c3aed]" aria-hidden />
                      Señal WiFi
                    </span>
                    <span className="text-tinta">{e.rssi} dBm</span>
                  </span>
                  <Medidor escala={ESCALA_WIFI} valor={e.rssi} nombre="Señal WiFi" />
                </div>
              ) : null}
            </>
          ) : d ? (
            <p className="text-[13px] text-texto-2">Todavía no mandó su estado.</p>
          ) : null}
        </Tarjeta>
        <Tarjeta titulo={`Sensores que pasan por acá (${d?.sensores.length ?? 0})`}>
          {d && !d.sensores.length ? <p className="text-[13px] text-texto-2">Ningún sensor mandó por este receptor últimamente.</p> : null}
          {(d?.sensores ?? []).map((s) => (
            <div key={s.device_id} className="flex items-center gap-2.5 border-t border-separador py-2 text-[13px] first:border-t-0">
              <span className="min-w-0 flex-1">
                <FamiliaYCodigo familia={familiaDeModelo(s.type)} codigo={aliasPropio(s.alias, s.device_id) ?? s.device_id} />
                {s.site_name ? <span className="block truncate text-xs text-texto-3">{s.site_name}</span> : null}
              </span>
              <span className="text-xs text-texto-3">{s.last_lora_at ? hace(s.last_lora_at) : "—"}</span>
              <IconoEstado s={s} texto={false} />
            </div>
          ))}
        </Tarjeta>
      </div>

      <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <Segmento etiqueta="Período" opciones={PERIODOS_GW} valor={periodo} alCambiar={setPeriodo} />
        </div>
        <section className="flex flex-wrap items-stretch gap-y-2.5 rounded-xl border border-linea bg-white px-1 py-3.5">
          <h2 className="self-center px-3.5 text-[13px] font-semibold text-tinta">Envíos a la base</h2>
          <Numero icono={Activity} titulo="Envíos" valor={t.envios} />
          <Numero icono={TriangleAlert} titulo="Con error" valor={t.errores} alerta={t.errores > 0} />
          <Numero icono={CloudUpload} titulo="Lecturas nuevas" valor={t.insertadas} />
          <Numero icono={Copy} titulo="Repetidas" valor={t.duplicadas} />
        </section>
        {d?.r ? (
          <>
            <Tarjeta>
              <Grafico
                titulo="Lecturas subidas"
                unidad=""
                alto={180}
                tiempos={tiempos}
                desde={d.r.desde}
                hasta={d.r.hasta}
                intervaloS={d.r.intervalo}
                series={[
                  { nombre: "Nuevas", color: "#16a34a", valores: d.horas.map((h) => h.insertadas) },
                  { nombre: "Repetidas", color: "#ea580c", valores: d.horas.map((h) => h.duplicadas) },
                ]}
              />
            </Tarjeta>
            <Tarjeta>
              <Grafico
                titulo="Demora de subida"
                unidad="s"
                alto={150}
                tiempos={tiempos}
                desde={d.r.desde}
                hasta={d.r.hasta}
                intervaloS={d.r.intervalo}
                series={[{ nombre: "Promedio", color: "#7c3aed", valores: d.horas.map((h) => h.demora_prom_s) }]}
                nota="Tiempo entre que el equipo midió y la lectura llegó a la base."
              />
            </Tarjeta>
          </>
        ) : null}
        <Tarjeta titulo="Últimos envíos" sinRelleno>
          {d && !d.envios.length ? <p className="px-[18px] pb-4 text-[13px] text-texto-2">Sin envíos registrados.</p> : null}
          {d?.envios.length ? (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[640px] text-[13px]">
                <thead>
                  <tr className="border-y border-separador text-left text-xs text-texto-3">
                    <th className="px-[18px] py-2 font-normal">Cuándo</th>
                    <th className="py-2 font-normal">Estado</th>
                    <th className="py-2 text-right font-normal">Recibidas</th>
                    <th className="py-2 text-right font-normal">Nuevas</th>
                    <th className="py-2 text-right font-normal">Repetidas</th>
                    <th className="py-2 text-right font-normal">Demora</th>
                    <th className="py-2 pr-[18px] pl-4 font-normal">Sensores</th>
                  </tr>
                </thead>
                <tbody>
                  {d.envios.map((x) => (
                    <FilaEnvio key={x.id} x={x} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Tarjeta>
      </div>
    </div>
  );
}

function Celda({ icono: Icono, titulo, valor, nota, alerta }: { icono: LucideIcon; titulo: string; valor: string; nota?: string; alerta?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="inline-flex items-center gap-1.5 text-xs text-texto-3">
        <Icono size={14} strokeWidth={1.9} className="shrink-0 text-[#7c3aed]" aria-hidden />
        {titulo}
      </span>
      <span className={`truncate text-[15px] font-semibold ${alerta ? "text-aviso" : "text-tinta"}`}>{valor}</span>
      {nota ? <span className="text-[11.5px] text-texto-3">{nota}</span> : null}
    </div>
  );
}

function Numero({ icono: Icono, titulo, valor, alerta }: { icono: LucideIcon; titulo: string; valor: number; alerta?: boolean }) {
  return (
    <div className="flex min-w-[120px] flex-[1_1_120px] flex-col border-l border-separador px-4">
      <span className="inline-flex items-center gap-1.5 text-xs text-texto-3">
        <Icono size={14} strokeWidth={1.9} className={`shrink-0 ${alerta ? "text-error" : "text-[#7c3aed]"}`} aria-hidden />
        {titulo}
      </span>
      <span className={`text-[17px] font-semibold ${alerta ? "text-error" : "text-tinta"}`}>{valor.toLocaleString("es-AR")}</span>
    </div>
  );
}

function FilaEnvio({ x }: { x: Envio }) {
  const ok = x.request_status === "success";
  return (
    <tr className="border-t border-separador first:border-t-0">
      <td className="px-[18px] py-2 whitespace-nowrap text-texto-2">{etiquetaCorta(Date.parse(x.received_at), true)}</td>
      <td className="py-2" title={x.error_message ?? `HTTP ${x.http_status ?? "—"}`}>
        <Estado tipo={ok ? "ok" : "error"}>{ok ? "Bien" : "Error"}</Estado>
      </td>
      <td className="py-2 text-right text-tinta">{x.readings_received ?? 0}</td>
      <td className="py-2 text-right text-tinta">{x.readings_inserted ?? 0}</td>
      <td className="py-2 text-right text-texto-2">{x.readings_duplicate ?? 0}</td>
      <td className="py-2 text-right whitespace-nowrap text-texto-2">{x.upload_delay_seconds != null ? duracion(x.upload_delay_seconds) : "—"}</td>
      <td className="max-w-[260px] truncate py-2 pr-[18px] pl-4 font-mono text-xs text-texto-3">
        {(x.sensor_ids ?? []).map((s, i) => (
          <span key={s}>
            {i ? ", " : ""}
            <Link to={`/equipo/${s}`} className="text-texto-3 no-underline hover:text-tinta hover:underline">
              {s}
            </Link>
          </span>
        ))}
      </td>
    </tr>
  );
}
