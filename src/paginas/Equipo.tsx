// Ficha de un equipo, como en la app: su estado (lo calcula la base, network_health), dónde estuvo,
// el nombre y quién tiene acceso (dueño o admin comparten). Bluetooth, la tarjeta SD y la
// calibración se hacen desde la app, en el campo.
import { Battery, CalendarClock, Clock, Gauge, MapPin, RadioTower, UserRound } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { FraseEstado } from "@/componentes/EstadoEquipo";
import { FamiliaYCodigo, IconoFam } from "@/componentes/familia";
import { Barra, Contenido } from "@/componentes/Marco";
import { Aviso, Boton, Cargando, Estado, FilaDato, Tarjeta, Titulo } from "@/componentes/ui";
import { historialEquipo } from "@/datos/campos";
import { compartir, estadoEquipos, miembros, quitarAcceso, renombrarEquipo } from "@/datos/equipos";
import { duracion, hace } from "@/datos/estado";
import { aliasPropio, familiaDeModelo, tituloEquipo } from "@/datos/familias";
import { fechaHoraArg } from "@/datos/grafico";
import { detalleCausa, nivel, saludRed, TEXTO_ESTADO } from "@/datos/salud";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";
import { useSesion } from "@/sesion/SesionContexto";

const ROL = { owner: "Dueño", editor: "Editor", viewer: "Solo ver" } as const;
const fecha = (t: string) => fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");

export function Equipo() {
  const { id = "" } = useParams();
  const { esAdmin, sesion } = useSesion();
  const c = useConsulta(
    useCallback(async () => {
      const [e, h, p] = await Promise.all([estadoEquipos(), saludRed(), historialEquipo(id)]);
      return { e: e.equipos.find((x) => x.id === id) ?? null, s: h.equipos.find((x) => x.device_id === id) ?? null, pasos: p.pasos, error: e.error ?? h.error ?? p.error };
    }, [id]),
  );
  const e = c.datos?.e ?? null;
  const s = c.datos?.s ?? null;
  const familia = e ? familiaDeModelo(e.type) : null;
  const puedeEditar = esAdmin || e?.my_role === "owner" || e?.my_role === "editor";
  const puedeCompartir = esAdmin || e?.my_role === "owner";

  return (
    <>
      <Barra migas={[{ texto: "Equipos", a: "/" }, { texto: e ? tituloEquipo(e) : id }]}>
        {e?.site_id ? (
          <Link to={`/sitio/${e.site_id}`} className="inline-flex h-[34px] items-center rounded-lg border border-tinta bg-tinta px-3 text-[13px] font-medium text-white no-underline hover:bg-[#1e293b]">
            Ver datos
          </Link>
        ) : null}
      </Barra>
      <Contenido ancho={1200}>
        <Aviso mensaje={c.error} />
        {c.cargando && !e ? <Cargando texto="Leyendo el equipo…" /> : null}
        {!c.cargando && !e && !c.error ? <Aviso tipo="aviso" mensaje="No tenés acceso a este equipo o no existe." /> : null}
        {e ? (
          <>
            <Titulo
              icono={
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-linea bg-white">
                  <IconoFam familia={familia} tamano={20} />
                </span>
              }
              titulo={tituloEquipo(e)}
              datos={
                <>
                  <FamiliaYCodigo familia={familia} codigo={e.id} />
                  {e.site_name ? (
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={14} strokeWidth={1.9} className="text-texto-3" aria-hidden />
                      {[e.site_name, e.plot_name, e.establishment_name].filter(Boolean).join(", ")}
                    </span>
                  ) : null}
                </>
              }
            />
            {e.activity === "retired" ? <Aviso tipo="aviso" mensaje="Equipo retirado: no carga datos ni se puede ubicar en un sitio. Sus datos quedan." /> : null}
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
                {s && e.activity !== "retired" ? (
                  <Tarjeta titulo="Estado">
                    <div className="mb-2 flex flex-col gap-1.5">
                      {s.causes.length ? (
                        s.causes.map((k) => (
                          <div key={k.code} className="flex flex-col gap-0.5">
                            <FraseEstado s={{ ...s, causes: [k] }} />
                            {detalleCausa(k) ? <span className="pl-3 text-xs text-texto-3">{detalleCausa(k)}</span> : null}
                          </div>
                        ))
                      ) : (
                        <Estado tipo={nivel(s) === "gris" ? "gris" : "ok"}>{TEXTO_ESTADO[s.state] ?? s.state}</Estado>
                      )}
                    </div>
                    <FilaDato icono={Clock} etiqueta="Último dato">
                      {s.last_reading_at ? hace(s.last_reading_at) : "Sin datos"}
                    </FilaDato>
                    {s.completeness_24h != null ? (
                      <FilaDato icono={Gauge} etiqueta={<ConAyuda que="lecturas en 24 h" texto={AYUDA.lecturas24h}>Lecturas en 24 h</ConAyuda>}>
                        {Math.round(s.completeness_24h * 100)} % de las esperadas
                      </FilaDato>
                    ) : null}
                    {s.gateway_id ? (
                      <FilaDato icono={RadioTower} etiqueta="Recibe">
                        {s.gateway_id}
                      </FilaDato>
                    ) : null}
                    {s.clock_offset_s != null ? (
                      <FilaDato icono={CalendarClock} etiqueta="Reloj del equipo">
                        {Math.abs(s.clock_offset_s) < 60 ? "En hora" : `Corrido ${duracion(Math.abs(s.clock_offset_s))}`}
                      </FilaDato>
                    ) : null}
                    {e.type !== "N01" ? (
                      <FilaDato icono={Battery} etiqueta="Batería">
                        {[s.battery_pct != null ? `${s.battery_pct} %` : null, s.battery_mv != null ? `${(s.battery_mv / 1000).toFixed(2).replace(".", ",")} V` : null].filter(Boolean).join(" · ") || "Sin dato"}
                      </FilaDato>
                    ) : null}
                  </Tarjeta>
                ) : null}
                <Tarjeta titulo="Dónde estuvo">
                  {c.datos?.pasos.length ? (
                    c.datos.pasos.map((p) => (
                      <FilaDato key={`${p.site_id}-${p.start_at}`} icono={MapPin} etiqueta={[p.site_name, p.establishment_name].filter(Boolean).join(", ")}>
                        {p.end_at ? `${fecha(p.start_at)} a ${fecha(p.end_at)}` : `desde ${fecha(p.start_at)}`}
                      </FilaDato>
                    ))
                  ) : (
                    <p className="text-[13px] text-texto-2">Todavía no estuvo en ningún sitio.</p>
                  )}
                </Tarjeta>
              </div>
              <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-4">
                {puedeEditar ? <Nombre id={e.id} actual={aliasPropio(e.alias, e.id)} alCambiar={c.actualizar} /> : null}
                {puedeCompartir ? <Accesos id={e.id} miId={sesion?.user.id ?? ""} /> : null}
                {e.my_role && !puedeCompartir ? (
                  <Tarjeta titulo="Tu acceso">
                    <p className="text-[13px] text-texto-2">{ROL[e.my_role]}</p>
                  </Tarjeta>
                ) : null}
              </div>
            </div>
            <p className="text-xs text-texto-3">Conectar por Bluetooth, bajar la tarjeta SD y calibrar se hacen desde la app, en el campo.</p>
          </>
        ) : null}
      </Contenido>
    </>
  );
}

function Nombre({ id, actual, alCambiar }: { id: string; actual: string | null; alCambiar: () => void }) {
  const [texto, setTexto] = useState(actual ?? "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    setGuardando(true);
    setError(null);
    const r = await renombrarEquipo(id, texto.trim());
    setGuardando(false);
    if (!r.ok) setError(r.mensaje);
    else alCambiar();
  }
  return (
    <Tarjeta titulo="Nombre del equipo">
      <form onSubmit={guardar} className="flex flex-wrap gap-2">
        <input
          value={texto}
          onChange={(ev) => setTexto(ev.target.value)}
          aria-label="Nombre del equipo"
          placeholder="Opcional: si no tiene, se ve el sitio"
          className="h-[34px] min-w-0 flex-1 rounded-lg border border-linea px-2.5 text-[13px] text-tinta outline-none focus:border-acento-oscuro"
        />
        <Boton type="submit" variante="secundario" cargando={guardando} disabled={texto.trim() === (actual ?? "")}>
          Guardar
        </Boton>
      </form>
      {error ? <p className="mt-2 text-xs text-error">{error}</p> : null}
    </Tarjeta>
  );
}

function Accesos({ id, miId }: { id: string; miId: string }) {
  const c = useConsulta(useCallback(() => miembros(id), [id]));
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<"viewer" | "editor">("viewer");
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "bien"; texto: string } | null>(null);
  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setMensaje(null);
    const r = await compartir(id, correo.trim().toLowerCase(), rol);
    setEnviando(false);
    if (!r.ok) return setMensaje({ tipo: "error", texto: r.mensaje });
    setCorreo("");
    setMensaje({ tipo: "bien", texto: "Listo: ya puede ver el equipo." });
    void c.actualizar();
  }
  return (
    <Tarjeta titulo="Quién tiene acceso">
      {c.cargando ? <Cargando /> : null}
      {(c.datos?.miembros ?? []).map((m) => (
        <div key={m.user_id} className="flex items-center gap-2.5 border-t border-separador py-2 text-[13px] first:border-t-0">
          <UserRound size={15} strokeWidth={1.9} className="text-texto-3" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-tinta">{m.full_name ?? m.email}</span>
            {m.full_name ? <span className="truncate text-xs text-texto-3">{m.email}</span> : null}
          </span>
          <span className="text-texto-3">{ROL[m.role]}</span>
          {m.role !== "owner" && m.user_id !== miId ? (
            <button
              type="button"
              onClick={async () => {
                const r = await quitarAcceso(id, m.user_id);
                if (!r.ok) setMensaje({ tipo: "error", texto: r.mensaje });
                void c.actualizar();
              }}
              className="text-xs text-error hover:underline"
            >
              Quitar
            </button>
          ) : null}
        </div>
      ))}
      <form onSubmit={enviar} className="mt-3 flex flex-wrap gap-2">
        <input
          type="email"
          value={correo}
          onChange={(ev) => setCorreo(ev.target.value)}
          aria-label="Correo de la persona"
          placeholder="Correo de la persona"
          className="h-[34px] min-w-0 flex-[1_1_180px] rounded-lg border border-linea px-2.5 text-[13px] text-tinta outline-none focus:border-acento-oscuro"
        />
        <select
          value={rol}
          onChange={(ev) => setRol(ev.target.value as "viewer" | "editor")}
          aria-label="Qué puede hacer"
          className="h-[34px] rounded-lg border border-linea bg-white px-2 text-[13px] text-tinta"
        >
          <option value="viewer">Solo ver</option>
          <option value="editor">Editor</option>
        </select>
        <Boton type="submit" variante="secundario" cargando={enviando}>
          Compartir
        </Boton>
      </form>
      <p className="mt-2 text-xs text-texto-3">Editor: ve los datos y puede ubicar, calibrar y configurar el equipo. Solo ver: ve el equipo y sus datos.</p>
      {mensaje ? <p className={`mt-1 text-xs ${mensaje.tipo === "error" ? "text-error" : "text-[#047857]"}`}>{mensaje.texto}</p> : null}
    </Tarjeta>
  );
}
