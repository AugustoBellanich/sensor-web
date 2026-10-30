// Sitios, como en la app: crear uno marcando el punto en el mapa (el lote se elige solo si el punto
// cae dentro de uno) y, en un sitio, cambiar nombre, lote o ubicación y poner, cambiar o quitar el
// equipo con su fecha (las lecturas desde ese día pasan a este sitio). Abajo, qué equipos estuvieron.
import { Check, Cpu, LogOut, Save } from "lucide-react";
import { useCallback, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";

import { ConAyuda } from "@/componentes/Ayuda";
import { FamiliaYCodigo } from "@/componentes/familia";
import { Barra, Contenido } from "@/componentes/Marco";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Tarjeta,
  Titulo,
} from "@/componentes/ui";
import { UbicadorMapa, type Punto } from "@/componentes/UbicadorMapa";
import {
  anillo,
  crearSitio,
  detalleCampo,
  editarSitio,
  historialSitio,
  loteDelPunto,
  quitarEquipo,
  ubicarEquipo,
  type DetalleCampo,
  type SitioCampo,
} from "@/datos/campos";
import { estadoEquipos } from "@/datos/equipos";
import { aliasPropio, familiaDeModelo } from "@/datos/familias";
import { fechaHoraArg } from "@/datos/grafico";
import { fechaArgHoy } from "@/datos/riego";
import { infoSitio } from "@/datos/series";
import { AYUDA } from "@/datos/textos";
import { useConsulta } from "@/datos/useConsulta";

const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const SIN_LOTE = "";

function referencias(k: DetalleCampo) {
  return [
    ...(k.boundary ? [anillo(k.boundary)] : []),
    ...k.plots.filter((l) => l.boundary).map((l) => anillo(l.boundary)),
  ];
}
const otrosSitios = (k: DetalleCampo, menos?: string) =>
  k.sites
    .filter((s) => s.id !== menos && s.lat != null && s.lng != null)
    .map((s) => ({ lat: s.lat!, lng: s.lng!, nombre: s.name }));

function ElegirLote({
  campo,
  valor,
  alCambiar,
  punto,
}: {
  campo: DetalleCampo;
  valor: string;
  alCambiar: (v: string) => void;
  punto: Punto | null;
}) {
  const dondeCae = punto ? loteDelPunto(campo, punto) : null;
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="lote-sitio"
        className="text-xs font-bold tracking-wider text-texto uppercase"
      >
        Lote
      </label>
      <select
        id="lote-sitio"
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        className="h-12 rounded-campo border border-borde bg-superficie px-3 text-[15px] text-tinta"
      >
        <option value={SIN_LOTE}>Sin lote</option>
        {campo.plots.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      {punto && valor !== SIN_LOTE && valor !== dondeCae ? (
        <Aviso
          tipo="aviso"
          mensaje="El punto no cae dentro de ese lote. Se guarda igual, pero revisá el dibujo o la ubicación."
        />
      ) : null}
    </div>
  );
}

// ------------------------------------------------------------------ nuevo

export function NuevoSitio() {
  const { campo: campoId = "" } = useParams();
  const navegar = useNavigate();
  const c = useConsulta(useCallback(() => detalleCampo(campoId), [campoId]));
  const k = c.datos?.campo ?? null;
  const [punto, setPunto] = useState<Punto | null>(null);
  const [lote, setLote] = useState(SIN_LOTE);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  function marcar(p: Punto) {
    setPunto(p);
    if (k) setLote(loteDelPunto(k, p) ?? SIN_LOTE);
  }
  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!k || !punto) return setError("Marcá el punto en el mapa.");
    setGuardando(true);
    setError(null);
    const r = await crearSitio(k.id, nombre, punto, lote || null, descripcion);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    navegar(`/sitio/${r.id}/gestion`, { replace: true });
  }

  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          { texto: k?.name ?? "Campo", a: `/campo/${campoId}` },
          { texto: "Nuevo sitio" },
        ]}
      />
      <Contenido ancho={1200}>
        <Aviso mensaje={c.error} />
        {c.cargando && !k ? <Cargando /> : null}
        {k && !k.can_edit ? (
          <Aviso
            tipo="aviso"
            mensaje="Solo el dueño y los editores del campo crean sitios."
          />
        ) : null}
        {k && k.can_edit ? (
          <>
            <Titulo
              titulo="Nuevo sitio"
              datos={
                <ConAyuda que="sitio" texto={AYUDA.sitio}>
                  El punto exacto donde va un equipo.
                </ConAyuda>
              }
            />
            <form
              onSubmit={guardar}
              className="flex flex-wrap items-start gap-4"
            >
              <div className="min-w-0 flex-[3_1_520px]">
                <Tarjeta titulo="Dónde va">
                  <UbicadorMapa
                    valor={punto}
                    alCambiar={marcar}
                    referencias={referencias(k)}
                    otros={otrosSitios(k)}
                    alto={460}
                  />
                </Tarjeta>
              </div>
              <div className="flex min-w-0 flex-[2_1_320px] flex-col gap-4">
                <Tarjeta titulo="Datos">
                  <div className="flex flex-col gap-4">
                    <Campo
                      etiqueta="Nombre del sitio"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej.: Sensor fila 12, Estación norte"
                    />
                    <ElegirLote
                      campo={k}
                      valor={lote}
                      alCambiar={setLote}
                      punto={punto}
                    />
                    <Campo
                      etiqueta="Descripción (opcional)"
                      value={descripcion}
                      onChange={(e) => setDescripcion(e.target.value)}
                      placeholder="Referencia para encontrarlo en el campo"
                    />
                  </div>
                </Tarjeta>
                <Aviso mensaje={error} />
                <div className="flex gap-2">
                  <Boton
                    type="submit"
                    icono={Check}
                    cargando={guardando}
                    disabled={!punto || !nombre.trim()}
                  >
                    Crear sitio
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
            </form>
          </>
        ) : null}
      </Contenido>
    </>
  );
}

// ------------------------------------------------------------------ gestión

export function GestionSitio() {
  const { id = "" } = useParams();
  const c = useConsulta(
    useCallback(async () => {
      // El sitio se busca en su campo (establishment_detail trae lote y equipo; solo si soy miembro).
      const i = await infoSitio(id);
      const campoId = i.info?.establishment_id ?? null;
      const [d, h] = await Promise.all([
        campoId
          ? detalleCampo(campoId)
          : Promise.resolve({ campo: null, error: null }),
        historialSitio(id),
      ]);
      return {
        campo: d.campo,
        pasos: h.pasos,
        error: i.error ?? d.error ?? h.error,
      };
    }, [id]),
  );
  const k = c.datos?.campo ?? null;
  const s = k?.sites.find((x) => x.id === id) ?? null;
  return (
    <>
      <Barra
        migas={[
          { texto: "Campos", a: "/campos" },
          ...(k ? [{ texto: k.name, a: `/campo/${k.id}` }] : []),
          { texto: s?.name ?? "Sitio", a: `/sitio/${id}` },
          { texto: "Sitio y equipo" },
        ]}
      />
      <Contenido ancho={1200}>
        <Aviso mensaje={c.error} />
        {c.cargando && !c.datos ? <Cargando /> : null}
        {c.datos && !s ? (
          <Aviso
            tipo="aviso"
            mensaje="No sos miembro del campo de este sitio, o el sitio no existe."
          />
        ) : null}
        {k && s && !k.can_edit ? (
          <Aviso
            tipo="aviso"
            mensaje="Solo el dueño y los editores del campo cambian el sitio y su equipo."
          />
        ) : null}
        {k && s && k.can_edit ? (
          <>
            <Titulo
              titulo={`Sitio · ${s.name}`}
              datos={<span>{k.name}</span>}
            />
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex min-w-0 flex-[3_1_520px] flex-col gap-4">
                <DatosSitio
                  key={`${s.id}-${s.lat}-${s.lng}-${s.name}`}
                  campo={k}
                  sitio={s}
                  alGuardar={c.actualizar}
                />
              </div>
              <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4">
                <EquipoDelSitio sitio={s} alCambiar={c.actualizar} />
                <Tarjeta titulo="Equipos que estuvieron">
                  {!c.datos?.pasos.length ? (
                    <p className="text-[13px] text-texto-2">Ninguno todavía.</p>
                  ) : null}
                  {(c.datos?.pasos ?? []).map((p) => (
                    <div
                      key={`${p.device_id}-${p.start_at}`}
                      className="flex items-center gap-2.5 border-t border-separador py-2 text-[13px] first:border-t-0"
                    >
                      <Link
                        to={`/equipo/${p.device_id}`}
                        className="min-w-0 flex-1 no-underline"
                      >
                        <FamiliaYCodigo
                          familia={familiaDeModelo(p.device_type)}
                          codigo={
                            aliasPropio(p.device_alias, p.device_id)
                              ? `${p.device_id} · ${aliasPropio(p.device_alias, p.device_id)}`
                              : p.device_id
                          }
                        />
                      </Link>
                      <span className="text-xs text-texto-3">
                        {p.end_at
                          ? `${fecha(p.start_at)} a ${fecha(p.end_at)}`
                          : `desde ${fecha(p.start_at)}`}
                      </span>
                    </div>
                  ))}
                </Tarjeta>
              </div>
            </div>
          </>
        ) : null}
      </Contenido>
    </>
  );
}

function DatosSitio({
  campo,
  sitio,
  alGuardar,
}: {
  campo: DetalleCampo;
  sitio: SitioCampo;
  alGuardar: () => void;
}) {
  const [nombre, setNombre] = useState(sitio.name);
  const [descripcion, setDescripcion] = useState(sitio.description ?? "");
  const [lote, setLote] = useState(sitio.plot_id ?? SIN_LOTE);
  const [punto, setPunto] = useState<Punto | null>(
    sitio.lat != null && sitio.lng != null
      ? { lat: sitio.lat, lng: sitio.lng }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [bien, setBien] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const movido = punto && (punto.lat !== sitio.lat || punto.lng !== sitio.lng);

  async function guardar(ev: FormEvent) {
    ev.preventDefault();
    if (!nombre.trim()) return setError("Escribí un nombre.");
    setGuardando(true);
    setError(null);
    setBien(false);
    const r = await editarSitio(sitio.id, {
      name: nombre.trim(),
      description: descripcion.trim() || null,
      plot_id: lote || null,
      ...(punto ? { lat: punto.lat, lng: punto.lng } : {}),
    });
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    setBien(true);
    alGuardar();
  }

  return (
    <form onSubmit={guardar} className="flex flex-col gap-4">
      <Tarjeta titulo="Ubicación">
        <UbicadorMapa
          valor={punto}
          alCambiar={(p) => {
            setPunto(p);
            setLote(loteDelPunto(campo, p) ?? SIN_LOTE);
          }}
          referencias={referencias(campo)}
          otros={otrosSitios(campo, sitio.id)}
          alto={380}
        />
        {movido ? (
          <p className="mt-2 text-xs text-aviso">
            Moviste el punto: si el equipo cambió de lugar en el campo, conviene
            crear un sitio nuevo para no mezclar las series.
          </p>
        ) : null}
      </Tarjeta>
      <Tarjeta titulo="Datos">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
          <ElegirLote
            campo={campo}
            valor={lote}
            alCambiar={setLote}
            punto={punto}
          />
          <Campo
            etiqueta="Descripción (opcional)"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="sm:col-span-2"
          />
        </div>
      </Tarjeta>
      <Aviso mensaje={error} />
      {bien ? <Aviso tipo="bien" mensaje="Sitio guardado." /> : null}
      <div>
        <Boton type="submit" icono={Save} cargando={guardando}>
          Guardar
        </Boton>
      </div>
    </form>
  );
}

function EquipoDelSitio({
  sitio,
  alCambiar,
}: {
  sitio: SitioCampo;
  alCambiar: () => void;
}) {
  const e = useConsulta(estadoEquipos);
  const [accion, setAccion] = useState<"ubicar" | "quitar" | null>(null);
  const [equipo, setEquipo] = useState("");
  const [dia, setDia] = useState(fechaArgHoy());
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const d = sitio.device;
  // Equipos que puedo ubicar: soy dueño o editor (admin ve todos; los sin dueño también).
  const elegibles = (e.datos?.equipos ?? []).filter(
    (x) =>
      x.activity !== "retired" &&
      x.id !== d?.id &&
      (x.my_role === "owner" ||
        x.my_role === "editor" ||
        x.owner_email !== null ||
        !x.claimed),
  );
  const elegido = elegibles.find((x) => x.id === equipo);

  async function ubicar(ev: FormEvent) {
    ev.preventDefault();
    if (!equipo || !dia) return;
    setGuardando(true);
    setError(null);
    if (d) {
      const q = await quitarEquipo(d.id, dia);
      if (!q.ok) {
        setGuardando(false);
        return setError(q.mensaje);
      }
    }
    const r = await ubicarEquipo(equipo, sitio.id, dia);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    setAccion(null);
    setEquipo("");
    alCambiar();
  }
  async function quitar(ev: FormEvent) {
    ev.preventDefault();
    if (!d) return;
    setGuardando(true);
    setError(null);
    const r = await quitarEquipo(d.id, dia);
    setGuardando(false);
    if (!r.ok) return setError(r.mensaje);
    setAccion(null);
    alCambiar();
  }

  return (
    <Tarjeta titulo="Equipo">
      {d ? (
        <div className="mb-3 flex flex-col gap-1 text-[13px]">
          <Link to={`/equipo/${d.id}`} className="no-underline">
            <FamiliaYCodigo
              familia={familiaDeModelo(d.type)}
              codigo={
                aliasPropio(d.alias, d.id)
                  ? `${d.id} · ${aliasPropio(d.alias, d.id)}`
                  : d.id
              }
            />
          </Link>
          <span className="text-xs text-texto-3">
            Instalado desde el {fecha(d.since)}
          </span>
        </div>
      ) : (
        <p className="mb-3 text-[13px] text-texto-2">
          El sitio no tiene equipo.
        </p>
      )}
      {accion === null ? (
        <div className="flex flex-wrap gap-2">
          <Boton icono={Cpu} onClick={() => setAccion("ubicar")}>
            {d ? "Cambiar el equipo" : "Ubicar un equipo"}
          </Boton>
          {d ? (
            <Boton
              variante="secundario"
              icono={LogOut}
              onClick={() => setAccion("quitar")}
            >
              Quitar el equipo
            </Boton>
          ) : null}
        </div>
      ) : null}
      {accion === "ubicar" ? (
        <form onSubmit={ubicar} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="equipo-sitio"
              className="text-xs font-bold tracking-wider text-texto uppercase"
            >
              Equipo
            </label>
            {e.cargando && !e.datos ? <Cargando /> : null}
            {e.datos && !elegibles.length ? (
              <p className="text-[13px] text-texto-2">
                No tenés equipos para ubicar. Vinculá uno desde Equipos.
              </p>
            ) : (
              <select
                id="equipo-sitio"
                value={equipo}
                onChange={(ev) => setEquipo(ev.target.value)}
                className="h-12 rounded-campo border border-borde bg-superficie px-3 text-[15px] text-tinta"
              >
                <option value="">Elegí un equipo</option>
                {elegibles.map((x) => (
                  <option key={x.id} value={x.id}>
                    {aliasPropio(x.alias, x.id)
                      ? `${aliasPropio(x.alias, x.id)} (${x.id})`
                      : x.id}
                    {x.site_name ? ` · ahora en ${x.site_name}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          {elegido?.site_name ? (
            <Aviso
              tipo="aviso"
              mensaje={`${elegido.id} está en «${elegido.site_name}»: se cierra esa ubicación en la fecha elegida.`}
            />
          ) : null}
          {d ? (
            <Aviso
              tipo="aviso"
              mensaje={`${d.id} sale de este sitio en la misma fecha.`}
            />
          ) : null}
          <Campo
            etiqueta="Instalado desde"
            type="date"
            value={dia}
            max={fechaArgHoy()}
            onChange={(ev) => setDia(ev.target.value)}
            ayuda="Las lecturas desde ese día pasan a este sitio."
          />
          <Aviso mensaje={error} />
          <div className="flex gap-2">
            <Boton
              type="submit"
              cargando={guardando}
              disabled={!equipo || !dia}
            >
              Ubicar
            </Boton>
            <Boton
              type="button"
              variante="texto"
              onClick={() => setAccion(null)}
            >
              Cancelar
            </Boton>
          </div>
        </form>
      ) : null}
      {accion === "quitar" && d ? (
        <form onSubmit={quitar} className="flex flex-col gap-3">
          <Campo
            etiqueta="Retirado el"
            type="date"
            value={dia}
            max={fechaArgHoy()}
            onChange={(ev) => setDia(ev.target.value)}
            ayuda={`Estaba desde el ${fecha(d.since)}. Sus datos quedan en el sitio.`}
          />
          <Aviso mensaje={error} />
          <div className="flex gap-2">
            <Boton
              type="submit"
              variante="secundario"
              icono={LogOut}
              cargando={guardando}
              disabled={!dia}
            >
              Quitar
            </Boton>
            <Boton
              type="button"
              variante="texto"
              onClick={() => setAccion(null)}
            >
              Cancelar
            </Boton>
          </div>
        </form>
      ) : null}
    </Tarjeta>
  );
}
