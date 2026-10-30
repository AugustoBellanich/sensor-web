// Administración (admin y staff), lo mismo que la app: usuarios, salud de las redes, todos los
// equipos, alta de equipos y pedidos de baja (solo admin). La base vuelve a controlar cada permiso;
// acá solo se esconde lo que el rol no puede hacer. En la web, listas en tabla y el detalle al costado.
import {
  Activity,
  Check,
  ChevronRight,
  Copy,
  Cpu,
  Hash,
  PackagePlus,
  Search,
  Tag,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, NavLink, Navigate, useParams } from "react-router";

import { FraseEstado, IconoEstado } from "@/componentes/EstadoEquipo";
import { FamiliaYCodigo, HaceCorto } from "@/componentes/familia";
import { Barra, Contenido } from "@/componentes/Marco";
import {
  Aviso,
  Boton,
  Campo,
  Cargando,
  Segmento,
  Tarjeta,
} from "@/componentes/ui";
import {
  altaEquipo,
  cambiarEstado,
  cambiarRol,
  listarUsuarios,
  NOMBRE_ESTADO,
  NOMBRE_ROL,
  type EstadoUsuario,
  type RolUsuario,
  type Usuario,
} from "@/datos/administracion";
import { ejecutarBaja, pedidosDeBaja, textoTitularidades } from "@/datos/bajas";
import { estadoEquipos } from "@/datos/equipos";
import {
  hace,
  idValido,
  modeloDeId,
  normalizarId,
  semaforo,
} from "@/datos/estado";
import {
  aliasPropio,
  FAMILIAS,
  familiaDeModelo,
  ORDEN_FAMILIAS,
  type Familia,
} from "@/datos/familias";
import { fechaHoraArg } from "@/datos/grafico";
import {
  fraseResumen,
  nivel,
  ordenar,
  resumen,
  saludRed,
  type SaludEquipo,
} from "@/datos/salud";
import { useConsulta } from "@/datos/useConsulta";
import { useSesion } from "@/sesion/SesionContexto";

const fecha = (t: string) =>
  fechaHoraArg(t).slice(0, 10).split("-").reverse().join("/");
const COLOR_NIVEL = {
  ok: "#059669",
  aviso: "#d97706",
  grave: "#b91c1c",
  gris: "#94a3b8",
} as const;

const SECCIONES: {
  ruta: string;
  texto: string;
  icono: LucideIcon;
  soloAdmin?: boolean;
}[] = [
  { ruta: "usuarios", texto: "Usuarios", icono: Users },
  { ruta: "redes", texto: "Salud de las redes", icono: Activity },
  { ruta: "equipos", texto: "Todos los equipos", icono: Cpu },
  { ruta: "alta", texto: "Alta de equipo", icono: PackagePlus },
  { ruta: "bajas", texto: "Pedidos de baja", icono: UserX, soloAdmin: true },
];

export function Admin() {
  const { seccion = "" } = useParams();
  const { esAdmin, esAdminTotal } = useSesion();
  const visibles = SECCIONES.filter((s) => !s.soloAdmin || esAdminTotal);
  const actual = visibles.find((s) => s.ruta === seccion);
  if (esAdmin && !actual) return <Navigate to="/admin/usuarios" replace />;
  return (
    <>
      <Barra
        migas={[
          { texto: "Administración", a: "/admin/usuarios" },
          { texto: actual?.texto ?? "" },
        ]}
      />
      <Contenido>
        {!esAdmin ? (
          <Aviso mensaje="Esta sección es solo para administradores." />
        ) : (
          <>
            <nav
              aria-label="Administración"
              className="relative flex gap-1 overflow-x-auto border-b border-linea whitespace-nowrap"
            >
              {visibles.map(({ ruta, texto, icono: Icono }) => (
                <NavLink
                  key={ruta}
                  to={`/admin/${ruta}`}
                  className={({ isActive }) =>
                    `-mb-px flex h-10 items-center gap-2 border-b-2 px-3 text-[13.5px] no-underline transition-colors ${
                      isActive
                        ? "border-acento-oscuro font-medium text-tinta"
                        : "border-transparent text-texto-2 hover:text-tinta"
                    }`
                  }
                >
                  <Icono size={15} strokeWidth={1.9} aria-hidden />
                  {texto}
                </NavLink>
              ))}
            </nav>
            {seccion === "usuarios" ? <Usuarios /> : null}
            {seccion === "redes" ? <Redes /> : null}
            {seccion === "equipos" ? <TodosLosEquipos /> : null}
            {seccion === "alta" ? <Alta /> : null}
            {seccion === "bajas" ? <Bajas /> : null}
          </>
        )}
      </Contenido>
    </>
  );
}

// ------------------------------------------------------------------ usuarios

const ROLES: RolUsuario[] = ["user", "staff", "admin"];
const ESTADOS: EstadoUsuario[] = ["active", "suspended", "disabled"];
const QUE_PUEDE: Record<RolUsuario, string> = {
  user: "Usa sus equipos y los que le comparten.",
  staff:
    "Ve todo, da de alta equipos y suspende usuarios comunes. No cambia roles.",
  admin: "Control total, incluido cambiar roles.",
};

function Usuarios() {
  const c = useConsulta(useCallback(() => listarUsuarios(), []));
  const [busqueda, setBusqueda] = useState("");
  const [elegido, setElegido] = useState<string | null>(null);
  const q = busqueda.trim().toLowerCase();
  const lista = (c.datos?.usuarios ?? []).filter(
    (u) =>
      !q ||
      u.email.toLowerCase().includes(q) ||
      (u.full_name ?? "").toLowerCase().includes(q),
  );
  const u = c.datos?.usuarios.find((x) => x.id === elegido) ?? null;
  return (
    <div className="flex flex-wrap items-start gap-4">
      <Tarjeta sinRelleno className="min-w-0 flex-[3_1_620px]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3.5">
          <span className="text-[13px] text-texto-2">
            {lista.length === 1 ? "1 usuario" : `${lista.length} usuarios`}
          </span>
          <Buscador
            valor={busqueda}
            alCambiar={setBusqueda}
            texto="Nombre o correo"
          />
        </div>
        <Aviso mensaje={c.error} />
        {c.cargando && !c.datos ? <Cargando /> : null}
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px] [&_td]:whitespace-nowrap">
            <thead>
              <tr className="border-y border-separador text-left text-xs text-texto-3">
                <th className="px-[18px] py-2 font-normal">Persona</th>
                <th className="py-2 font-normal">Rol</th>
                <th className="py-2 font-normal">Estado</th>
                <th className="py-2 text-right font-normal">Equipos</th>
                <th className="py-2 pr-[18px] pl-6 font-normal">
                  Último ingreso
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.map((x) => (
                <tr
                  key={x.id}
                  onClick={() => setElegido(x.id)}
                  className={`cursor-pointer border-t border-separador first:border-t-0 hover:bg-fondo ${x.id === elegido ? "bg-[#f0f9ff]" : ""}`}
                >
                  <td className="max-w-[320px] px-[18px] py-2">
                    <button
                      type="button"
                      onClick={() => setElegido(x.id)}
                      className="flex w-full min-w-0 flex-col text-left"
                    >
                      <span className="truncate font-medium text-tinta">
                        {x.full_name ?? x.email}
                      </span>
                      {x.full_name ? (
                        <span className="truncate text-xs text-texto-3">
                          {x.email}
                        </span>
                      ) : null}
                    </button>
                  </td>
                  <td className="py-2 text-texto-2">{NOMBRE_ROL[x.role]}</td>
                  <td
                    className={`py-2 ${x.status === "active" ? "text-texto-2" : "text-aviso"}`}
                  >
                    {NOMBRE_ESTADO[x.status]}
                  </td>
                  <td className="py-2 text-right text-texto-2">
                    {x.devices_owned}
                  </td>
                  <td className="py-2 pr-[18px] pl-6 text-texto-3">
                    {x.last_sign_in_at ? hace(x.last_sign_in_at) : "Nunca"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Tarjeta>
      <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-4 lg:sticky lg:top-[84px]">
        {u ? (
          <FichaUsuario key={u.id} u={u} alCambiar={c.actualizar} />
        ) : (
          <Tarjeta>
            <p className="text-[13px] text-texto-2">
              Elegí una persona para ver o cambiar su rol y su estado.
            </p>
          </Tarjeta>
        )}
      </div>
    </div>
  );
}

function FichaUsuario({ u, alCambiar }: { u: Usuario; alCambiar: () => void }) {
  const { esAdminTotal, sesion } = useSesion();
  const soyYo = u.id === sesion?.user.id;
  const puedeEstado = !soyYo && (esAdminTotal || u.role === "user");
  const [pendiente, setPendiente] = useState<{
    texto: string;
    accion: () => Promise<{ ok: boolean; mensaje?: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  return (
    <>
      <Tarjeta titulo={u.full_name ?? u.email}>
        <p className="text-[13px] text-texto-2">{u.email}</p>
        <p className="mt-1 text-xs text-texto-3">
          Cuenta creada {u.created_at ? hace(u.created_at) : "—"} · último
          ingreso {u.last_sign_in_at ? hace(u.last_sign_in_at) : "nunca"} ·
          dueño de{" "}
          {u.devices_owned === 1 ? "1 equipo" : `${u.devices_owned} equipos`}
        </p>
      </Tarjeta>
      <Tarjeta titulo="Rol">
        <Bloqueable activo={esAdminTotal && !soyYo}>
          <Segmento
            etiqueta="Rol"
            opciones={ROLES.map((r) => ({ valor: r, texto: NOMBRE_ROL[r] }))}
            valor={u.role}
            alCambiar={(r) =>
              r !== u.role &&
              setPendiente({
                texto: `${u.email} pasa a ser ${NOMBRE_ROL[r]}.`,
                accion: () => cambiarRol(u.id, r),
              })
            }
          />
        </Bloqueable>
        <p className="mt-2 text-xs text-texto-3">{QUE_PUEDE[u.role]}</p>
        {soyYo ? (
          <p className="mt-1 text-xs text-texto-3">
            No podés cambiar tu propio rol.
          </p>
        ) : null}
        {!esAdminTotal && !soyYo ? (
          <p className="mt-1 text-xs text-texto-3">
            Solo un administrador cambia roles.
          </p>
        ) : null}
      </Tarjeta>
      <Tarjeta titulo="Estado">
        <Bloqueable activo={puedeEstado}>
          <Segmento
            etiqueta="Estado"
            opciones={ESTADOS.map((s) => ({
              valor: s,
              texto: NOMBRE_ESTADO[s],
            }))}
            valor={u.status === "pending" ? "active" : u.status}
            alCambiar={(s) =>
              s !== u.status &&
              setPendiente({
                texto: `${u.email} queda ${NOMBRE_ESTADO[s].toLowerCase()}.`,
                accion: () => cambiarEstado(u.id, s),
              })
            }
          />
        </Bloqueable>
        {u.status === "pending" ? (
          <p className="mt-2 text-xs text-texto-3">
            Pendiente: todavía no confirmó el correo.
          </p>
        ) : null}
      </Tarjeta>
      {pendiente ? (
        <div className="flex flex-col gap-3 rounded-xl border border-[#fde68a] bg-[#fffbeb] p-4">
          <p className="text-[13px] text-[#92400e]">{pendiente.texto}</p>
          <div className="flex gap-2">
            <Boton
              cargando={trabajando}
              onClick={async () => {
                setTrabajando(true);
                setError(null);
                const r = await pendiente.accion();
                setTrabajando(false);
                setPendiente(null);
                if (!r.ok) setError(r.mensaje ?? "No se pudo cambiar.");
                alCambiar();
              }}
            >
              Sí, cambiar
            </Boton>
            <Boton variante="secundario" onClick={() => setPendiente(null)}>
              Cancelar
            </Boton>
          </div>
        </div>
      ) : null}
      <Aviso mensaje={error} />
      {esAdminTotal && !soyYo && u.role === "user" ? (
        <div className="self-start">
          <BajaCuenta
            usuario={u.id}
            nombre={u.full_name || u.email}
            alTerminar={alCambiar}
          />
        </div>
      ) : null}
    </>
  );
}

function Bloqueable({
  activo,
  children,
}: {
  activo: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={activo ? "" : "pointer-events-none opacity-60"}
      aria-disabled={!activo}
    >
      {children}
    </div>
  );
}

const ESPERA_S = 10;

/** "Dar de baja la cuenta" (D-46), como en la app: explica qué pasa y habilita el sí después de 10 s. */
function BajaCuenta({
  usuario,
  nombre,
  deshabilitado,
  alTerminar,
}: {
  usuario: string;
  nombre: string;
  deshabilitado?: boolean;
  alTerminar: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [espera, setEspera] = useState(ESPERA_S);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  useEffect(() => {
    if (!abierto || espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [abierto, espera]);
  if (!abierto) {
    return (
      <Boton
        variante="secundario"
        icono={UserX}
        disabled={deshabilitado}
        onClick={() => {
          setError(null);
          setEspera(ESPERA_S);
          setAbierto(true);
        }}
      >
        Dar de baja la cuenta
      </Boton>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[#fecaca] bg-white p-4">
      <p className="text-[13px] font-semibold text-tinta">
        ¿Dar de baja la cuenta de {nombre}?
      </p>
      <p className="text-[13px] text-texto-2">
        Se borra su acceso; lo que cargó queda, sin autor. No se puede deshacer.
      </p>
      <Aviso mensaje={error} />
      <div className="flex gap-2">
        <Boton
          icono={UserX}
          cargando={trabajando}
          disabled={espera > 0}
          className="!bg-error !border-error"
          onClick={async () => {
            setTrabajando(true);
            const r = await ejecutarBaja(usuario);
            setTrabajando(false);
            if (!r.ok) return setError(r.mensaje);
            setAbierto(false);
            alTerminar();
          }}
        >
          {espera > 0 ? `Esperá ${espera} s` : "Sí, dar de baja"}
        </Boton>
        <Boton variante="secundario" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ redes

function Redes() {
  const c = useConsulta(useCallback(() => saludRed(), []));
  const equipos = useMemo(() => c.datos?.equipos ?? [], [c.datos]);
  const campos = useMemo(() => {
    const grupos = new Map<
      string,
      { id: string | null; nombre: string; equipos: SaludEquipo[] }
    >();
    for (const e of equipos) {
      const clave = e.establishment_id ?? "";
      if (!grupos.has(clave))
        grupos.set(clave, {
          id: e.establishment_id,
          nombre: e.establishment_name ?? "Sin campo",
          equipos: [],
        });
      grupos.get(clave)!.equipos.push(e);
    }
    return [...grupos.values()]
      .map((g) => ({ ...g, r: resumen(g.equipos) }))
      .sort(
        (a, b) =>
          b.r.graves - a.r.graves ||
          b.r.problemas - a.r.problemas ||
          a.nombre.localeCompare(b.nombre),
      );
  }, [equipos]);
  const total = resumen(equipos);
  const conProblemas = ordenar(equipos).filter(
    (e) => nivel(e) === "aviso" || nivel(e) === "grave",
  );
  return (
    <>
      <Aviso mensaje={c.error} />
      {c.cargando && !c.datos ? <Cargando /> : null}
      <section className="flex flex-wrap items-stretch gap-y-2.5 rounded-xl border border-linea bg-white px-1 py-3.5">
        <h2 className="self-center px-3.5 text-[13px] font-semibold text-tinta">
          Todas las redes
        </h2>
        <Numero titulo="Campos" valor={campos.filter((x) => x.id).length} />
        <Numero titulo="Receptores" valor={total.gateways} />
        <Numero titulo="Sensores" valor={total.sensores} />
        <Numero
          titulo="Con problemas"
          valor={total.problemas}
          color={
            total.graves
              ? COLOR_NIVEL.grave
              : total.problemas
                ? COLOR_NIVEL.aviso
                : undefined
          }
        />
      </section>
      <div className="flex flex-wrap items-start gap-4">
        <Tarjeta titulo="Por campo" className="min-w-0 flex-[2_1_340px]">
          {campos.map((g) => {
            const n = g.r.graves
              ? "grave"
              : g.r.problemas
                ? "aviso"
                : g.r.total
                  ? "ok"
                  : "gris";
            const fila = (
              <>
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: COLOR_NIVEL[n] }}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium text-tinta">
                    {g.nombre}
                  </span>
                  <span className="text-xs text-texto-3">
                    {fraseResumen(g.r)}
                  </span>
                </span>
                {g.id ? (
                  <ChevronRight
                    size={16}
                    className="text-texto-3"
                    aria-hidden
                  />
                ) : null}
              </>
            );
            return g.id ? (
              <Link
                key={g.id}
                to={`/campo/${g.id}`}
                className="flex items-center gap-3 border-t border-separador py-2.5 text-[13px] no-underline first:border-t-0 hover:bg-fondo"
              >
                {fila}
              </Link>
            ) : (
              <div
                key="sin-campo"
                className="flex items-center gap-3 border-t border-separador py-2.5 text-[13px] first:border-t-0"
              >
                {fila}
              </div>
            );
          })}
        </Tarjeta>
        <Tarjeta
          titulo={`Equipos con problemas (${conProblemas.length})`}
          className="min-w-0 flex-[3_1_560px]"
        >
          {c.datos && !conProblemas.length ? (
            <p className="text-[13px] text-texto-2">
              Todos los equipos están bien.
            </p>
          ) : null}
          {conProblemas.map((e) => (
            <Link
              key={e.device_id}
              to={`/equipo/${e.device_id}`}
              className="flex flex-col gap-1 border-t border-separador py-2.5 text-[13px] no-underline first:border-t-0 hover:bg-fondo"
            >
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <FamiliaYCodigo
                  familia={familiaDeModelo(e.type)}
                  codigo={
                    aliasPropio(e.alias, e.device_id)
                      ? `${e.device_id} · ${aliasPropio(e.alias, e.device_id)}`
                      : e.device_id
                  }
                />
                <span className="text-xs text-texto-3">
                  {[e.site_name, e.establishment_name]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="ml-auto">
                  <HaceCorto fecha={e.last_reading_at} />
                </span>
              </span>
              <FraseEstado s={e} />
            </Link>
          ))}
        </Tarjeta>
      </div>
    </>
  );
}

function Numero({
  titulo,
  valor,
  color,
}: {
  titulo: string;
  valor: number;
  color?: string;
}) {
  return (
    <div className="flex min-w-[120px] flex-[1_1_120px] flex-col border-l border-separador px-4">
      <span className="text-xs text-texto-3">{titulo}</span>
      <span
        className="text-[17px] font-semibold text-tinta"
        style={color ? { color } : undefined}
      >
        {valor.toLocaleString("es-AR")}
      </span>
    </div>
  );
}

// ------------------------------------------------------------------ todos los equipos

type Filtro = "todos" | "problemas" | "libres" | Familia;

function TodosLosEquipos() {
  const c = useConsulta(
    useCallback(async () => {
      const [e, s] = await Promise.all([estadoEquipos(), saludRed()]);
      return {
        equipos: e.equipos,
        salud: new Map(s.equipos.map((x) => [x.device_id, x])),
        error: e.error ?? s.error,
      };
    }, []),
  );
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const q = busqueda.trim().toLowerCase();
  const todos = c.datos?.equipos ?? [];
  const lista = todos.filter((e) => {
    if (
      q &&
      !`${e.id} ${e.alias ?? ""} ${e.owner_email ?? ""} ${e.owner_name ?? ""} ${e.site_name ?? ""} ${e.establishment_name ?? ""}`
        .toLowerCase()
        .includes(q)
    )
      return false;
    const ultimo =
      e.type === "N01"
        ? (e.gateway_last_heartbeat ?? e.last_reading_at)
        : e.last_reading_at;
    if (filtro === "problemas") return semaforo(ultimo, e.type) !== "al-dia";
    if (filtro === "libres") return !e.claimed;
    if (filtro !== "todos") return familiaDeModelo(e.type) === filtro;
    return true;
  });
  const familias = ORDEN_FAMILIAS.filter((f) =>
    todos.some((e) => familiaDeModelo(e.type) === f),
  );
  return (
    <Tarjeta sinRelleno>
      <div className="flex flex-wrap items-center justify-between gap-3 px-[18px] py-3.5">
        <div className="relative max-w-full overflow-x-auto">
          <Segmento
            etiqueta="Filtro"
            opciones={[
              { valor: "todos", texto: "Todos" },
              { valor: "problemas", texto: "Atrasados o sin datos" },
              { valor: "libres", texto: "Sin dueño" },
              ...familias.map((f) => ({ valor: f, texto: FAMILIAS[f].corto })),
            ]}
            valor={filtro}
            alCambiar={setFiltro}
          />
        </div>
        <span className="flex items-center gap-3">
          <span className="text-[13px] text-texto-2">
            {lista.length === 1 ? "1 equipo" : `${lista.length} equipos`}
          </span>
          <Buscador
            valor={busqueda}
            alCambiar={setBusqueda}
            texto="Id, alias, dueño o campo"
          />
        </span>
      </div>
      <Aviso mensaje={c.error} />
      {c.cargando && !c.datos ? <Cargando /> : null}
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13px] [&_td]:whitespace-nowrap">
          <thead>
            <tr className="border-y border-separador text-left text-xs text-texto-3">
              <th className="px-[18px] py-2 font-normal">Equipo</th>
              <th className="py-2 font-normal">Dueño</th>
              <th className="py-2 font-normal">Campo y sitio</th>
              <th className="py-2 font-normal">Dato</th>
              <th className="py-2 pr-[18px] font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((e) => (
              <tr
                key={e.id}
                className="border-t border-separador first:border-t-0 hover:bg-fondo"
              >
                <td className="px-[18px] py-2">
                  <Link to={`/equipo/${e.id}`} className="no-underline">
                    <FamiliaYCodigo
                      familia={familiaDeModelo(e.type)}
                      codigo={
                        aliasPropio(e.alias, e.id)
                          ? `${e.id} · ${aliasPropio(e.alias, e.id)}`
                          : e.id
                      }
                    />
                  </Link>
                </td>
                <td className="max-w-[220px] truncate py-2 text-texto-2">
                  {e.claimed ? (
                    (e.owner_name ?? e.owner_email ?? "—")
                  ) : (
                    <span className="text-texto-3">Sin dueño</span>
                  )}
                </td>
                <td className="max-w-[260px] truncate py-2 text-texto-2">
                  {[e.establishment_name, e.site_name]
                    .filter(Boolean)
                    .join(" · ") || (
                    <span className="text-texto-3">Sin ubicar</span>
                  )}
                </td>
                <td className="py-2">
                  <HaceCorto
                    fecha={
                      e.type === "N01"
                        ? (e.gateway_last_heartbeat ?? e.last_reading_at)
                        : e.last_reading_at
                    }
                  />
                </td>
                <td className="py-2 pr-[18px]">
                  <IconoEstado
                    s={c.datos?.salud.get(e.id)}
                    retirado={e.activity === "retired"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Tarjeta>
  );
}

function Buscador({
  valor,
  alCambiar,
  texto,
}: {
  valor: string;
  alCambiar: (v: string) => void;
  texto: string;
}) {
  return (
    <label className="flex h-[34px] w-[200px] items-center sm:w-[240px] gap-2 rounded-lg border border-linea bg-white px-2.5 text-[13px] focus-within:ring-2 focus-within:ring-acento-oscuro">
      <Search size={15} className="shrink-0 text-texto-3" aria-hidden />
      <input
        value={valor}
        onChange={(e) => alCambiar(e.target.value)}
        placeholder={texto}
        aria-label="Buscar"
        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-texto-3"
      />
    </label>
  );
}

// ------------------------------------------------------------------ alta

function Alta() {
  const [id, setId] = useState("");
  const [alias, setAlias] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<{ id: string; codigo: string } | null>(
    null,
  );
  const [copiado, setCopiado] = useState(false);
  const limpio = normalizarId(id);

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setCargando(true);
    setError(null);
    const r = await altaEquipo(id, alias);
    setCargando(false);
    if (r.ok) setHecho({ id: r.id, codigo: r.codigo });
    else setError(r.mensaje);
  }

  return (
    <div className="max-w-[560px]">
      {hecho ? (
        <Tarjeta titulo="Equipo dado de alta">
          <p className="font-mono text-[13px] text-texto-2">{hecho.id}</p>
          <p className="mt-3 text-xs font-bold tracking-wider text-texto uppercase">
            Código de vinculación
          </p>
          <p className="py-3 text-center font-mono text-[32px] font-bold tracking-[0.2em] text-tinta select-all">
            {hecho.codigo}
          </p>
          <Aviso
            tipo="aviso"
            mensaje="Anotalo o copialo ahora: la base guarda solo una versión cifrada y no se puede volver a mostrar. Si se pierde, se genera otro desde la ficha del equipo."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Boton
              icono={copiado ? Check : Copy}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    `Equipo ${hecho.id}\nCódigo de vinculación: ${hecho.codigo}`,
                  );
                  setCopiado(true);
                } catch {
                  setCopiado(false);
                }
              }}
            >
              {copiado ? "Copiado" : "Copiar"}
            </Boton>
            <Boton
              variante="secundario"
              onClick={() => {
                setHecho(null);
                setCopiado(false);
                setId("");
                setAlias("");
              }}
            >
              Dar de alta otro
            </Boton>
            <Link
              to={`/equipo/${hecho.id}`}
              className="inline-flex h-[34px] items-center px-2 text-[13px] font-medium text-acento-oscuro no-underline hover:underline"
            >
              Ver ficha
            </Link>
          </div>
        </Tarjeta>
      ) : (
        <Tarjeta titulo="Alta de equipo">
          <p className="mb-4 text-[13px] text-texto-2">
            Se da de alta cuando el equipo sale del taller, ya probado. El id es
            el nombre Bluetooth sin «SEN-» (B01-A1B2C3).
          </p>
          <form onSubmit={enviar} className="flex flex-col gap-4">
            <Aviso mensaje={error} />
            <Campo
              etiqueta="Id del equipo"
              icono={Hash}
              value={id}
              onChange={(e) => setId(e.target.value.toUpperCase())}
              placeholder="B01-A1B2C3"
              ayuda={
                limpio && idValido(limpio)
                  ? `Modelo: ${modeloDeId(limpio)}`
                  : undefined
              }
            />
            <Campo
              etiqueta="Alias (opcional)"
              icono={Tag}
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="Ej.: Banco 1, Finca El Alto norte"
            />
            <div>
              <Boton
                type="submit"
                icono={PackagePlus}
                cargando={cargando}
                disabled={!idValido(limpio)}
              >
                Dar de alta
              </Boton>
            </div>
          </form>
        </Tarjeta>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ bajas

function Bajas() {
  const c = useConsulta(pedidosDeBaja);
  const pedidos = c.datos?.pedidos ?? [];
  return (
    <>
      <Aviso mensaje={c.error} />
      {c.cargando && !c.datos ? <Cargando /> : null}
      {c.datos && !pedidos.length ? (
        <Tarjeta>
          <p className="text-[13px] text-texto-2">No hay pedidos pendientes.</p>
        </Tarjeta>
      ) : null}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(360px,1fr))]">
        {pedidos.map((p) => {
          const falta = textoTitularidades(p.sole_ownerships);
          return (
            <Tarjeta key={p.request_id} titulo={p.full_name || p.email}>
              <p className="text-[13px] text-texto-2">
                {p.email} · pedido el {fecha(p.requested_at)}
              </p>
              {p.reason ? (
                <p className="mt-2 text-[13px] text-tinta">«{p.reason}»</p>
              ) : null}
              {falta ? (
                <div className="mt-3">
                  <Aviso tipo="aviso" mensaje={falta} />
                </div>
              ) : null}
              <div className="mt-2 flex flex-col">
                {p.sole_ownerships.establishments.map((e) => (
                  <Link
                    key={e.id}
                    to={`/campo/${e.id}`}
                    className="flex items-center justify-between border-t border-separador py-2 text-[13px] text-acento-oscuro no-underline first:border-t-0 hover:underline"
                  >
                    Campo «{e.name}» · pasar a otra persona
                    <ChevronRight size={15} aria-hidden />
                  </Link>
                ))}
                {p.sole_ownerships.devices.map((d) => (
                  <Link
                    key={d.id}
                    to={`/equipo/${d.id}`}
                    className="flex items-center justify-between border-t border-separador py-2 text-[13px] text-acento-oscuro no-underline first:border-t-0 hover:underline"
                  >
                    Equipo {d.id} · pasar a otra persona
                    <ChevronRight size={15} aria-hidden />
                  </Link>
                ))}
              </div>
              <div className="mt-3">
                <BajaCuenta
                  usuario={p.user_id}
                  nombre={p.full_name || p.email}
                  deshabilitado={!!falta}
                  alTerminar={c.actualizar}
                />
              </div>
            </Tarjeta>
          );
        })}
      </div>
    </>
  );
}
