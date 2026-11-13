// Quién tiene acceso a un equipo o a un campo, y compartir: elegir la persona (sugerencias),
// cambiar el permiso en la misma fila, quitar, e invitar un correo que todavía no tiene cuenta.
import { Clock, Send, UserRound } from "lucide-react";
import { useCallback, useState, type FormEvent, type ReactNode } from "react";

import { SelectorPersona } from "@/componentes/SelectorPersona";
import { Aviso, Boton, Tarjeta } from "@/componentes/ui";
import type { Resultado } from "@/datos/cuenta";
import { cancelarInvitacion, invitaciones, invitar, type ResultadoCompartir, type TipoObjeto } from "@/datos/personas";
import { useConsulta } from "@/datos/useConsulta";

type Rol = "owner" | "editor" | "viewer";
type Miembro = { user_id: string; full_name: string | null; email: string; role: Rol };
const ROL: Record<Rol, string> = { owner: "Dueño", editor: "Editor", viewer: "Solo ver" };

type Props = {
  titulo: ReactNode;
  tipo: TipoObjeto;
  id: string;
  miId: string;
  miembros: Miembro[];
  /** Dueño o admin: comparte, cambia permisos y quita. Si no, solo ve la lista. */
  gestiona: boolean;
  compartir: (correo: string, rol: "editor" | "viewer") => Promise<ResultadoCompartir>;
  quitar: (usuario: string) => Promise<Resultado>;
  alCambiar: () => void;
  explicacion: string;
  /** Mostrar el correo de cada persona a quien no gestiona (en un campo se oculta). */
  correosVisibles?: boolean;
};

export function Accesos({ titulo, tipo, id, miId, miembros, gestiona, compartir, quitar, alCambiar, explicacion, correosVisibles = true }: Props) {
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState<"viewer" | "editor">("viewer");
  const [enviando, setEnviando] = useState(false);
  const [sinCuenta, setSinCuenta] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: "error" | "bien"; texto: string } | null>(null);
  const inv = useConsulta(
    useCallback(
      () => (gestiona ? invitaciones(tipo, id) : Promise.resolve({ invitaciones: [], error: null })),
      [gestiona, tipo, id],
    ),
  );

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setEnviando(true);
    setMensaje(null);
    setSinCuenta(null);
    const r = await compartir(correo, rol);
    setEnviando(false);
    if (!r.ok) {
      if ("sinCuenta" in r) setSinCuenta(correo.trim().toLowerCase());
      return setMensaje({ tipo: "error", texto: r.mensaje });
    }
    setMensaje({ tipo: "bien", texto: `${correo.trim()} tiene acceso.` });
    setCorreo("");
    alCambiar();
  }

  async function dejarInvitacion() {
    if (!sinCuenta) return;
    setEnviando(true);
    const r = await invitar(tipo, id, sinCuenta, rol);
    setEnviando(false);
    if (!r.ok) return setMensaje({ tipo: "error", texto: r.mensaje });
    setMensaje({ tipo: "bien", texto: `Invitación para ${sinCuenta}: tiene acceso cuando cree su cuenta (vence en 30 días).` });
    setSinCuenta(null);
    setCorreo("");
    void inv.actualizar();
  }

  async function cambiarRol(m: Miembro, nuevo: "editor" | "viewer") {
    setMensaje(null);
    const r = await compartir(m.email, nuevo);
    if (!r.ok) setMensaje({ tipo: "error", texto: r.mensaje });
    alCambiar();
  }

  return (
    <Tarjeta titulo={titulo}>
      {miembros.map((m) => {
        const editable = gestiona && m.role !== "owner" && m.user_id !== miId;
        return (
          <div key={m.user_id} className="flex items-center gap-2.5 border-t border-separador py-2 text-[13px] first:border-t-0">
            <UserRound size={15} strokeWidth={1.9} className="shrink-0 text-texto-3" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-tinta">
                {m.full_name ?? m.email}
                {m.user_id === miId ? " (vos)" : ""}
              </span>
              {m.full_name && (gestiona || correosVisibles) ? <span className="truncate text-xs text-texto-3">{m.email}</span> : null}
            </span>
            {editable ? (
              <select
                value={m.role}
                onChange={(ev) => void cambiarRol(m, ev.target.value as "editor" | "viewer")}
                aria-label={`Permiso de ${m.full_name ?? m.email}`}
                className="h-[30px] rounded-lg border border-linea bg-white px-1.5 text-[13px] text-tinta"
              >
                <option value="viewer">Solo ver</option>
                <option value="editor">Editor</option>
              </select>
            ) : (
              <span className="text-texto-3">{ROL[m.role]}</span>
            )}
            {editable ? (
              <button
                type="button"
                onClick={async () => {
                  const r = await quitar(m.user_id);
                  if (!r.ok) setMensaje({ tipo: "error", texto: r.mensaje });
                  alCambiar();
                }}
                aria-label={`Quitar a ${m.full_name ?? m.email}`}
                className="text-xs text-error hover:underline"
              >
                Quitar
              </button>
            ) : null}
          </div>
        );
      })}
      {(inv.datos?.invitaciones ?? []).map((x) => (
        <div key={`inv-${x.id}`} className="flex items-center gap-2.5 border-t border-separador py-2 text-[13px]">
          <Clock size={15} strokeWidth={1.9} className="shrink-0 text-texto-3" aria-hidden />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-tinta">{x.email}</span>
            <span className="text-xs text-texto-3">Invitación pendiente: sin cuenta todavía</span>
          </span>
          <span className="text-texto-3">{ROL[x.role]}</span>
          <button
            type="button"
            onClick={async () => {
              const r = await cancelarInvitacion(x.id);
              if (!r.ok) setMensaje({ tipo: "error", texto: r.mensaje });
              void inv.actualizar();
            }}
            aria-label={`Cancelar la invitación a ${x.email}`}
            className="text-xs text-error hover:underline"
          >
            Cancelar
          </button>
        </div>
      ))}
      {gestiona ? (
        <>
          <form onSubmit={enviar} className="mt-3 flex flex-wrap gap-2">
            <SelectorPersona
              valor={correo}
              alCambiar={(c) => {
                setCorreo(c);
                setSinCuenta(null);
              }}
              excluir={miembros.map((m) => m.email)}
            />
            <select
              value={rol}
              onChange={(ev) => setRol(ev.target.value as "viewer" | "editor")}
              aria-label="Permiso"
              className="h-[34px] rounded-lg border border-linea bg-white px-2 text-[13px] text-tinta"
            >
              <option value="viewer">Solo ver</option>
              <option value="editor">Editor</option>
            </select>
            <Boton type="submit" variante="secundario" cargando={enviando && !sinCuenta} disabled={!correo.includes("@")}>
              Compartir
            </Boton>
          </form>
          {mensaje ? (
            <div className="mt-2">
              <Aviso tipo={mensaje.tipo} mensaje={mensaje.texto} />
            </div>
          ) : null}
          {sinCuenta ? (
            <div className="mt-2">
              <Boton variante="secundario" icono={Send} cargando={enviando} onClick={() => void dejarInvitacion()}>
                Dejar invitación ({rol === "editor" ? "Editor" : "Solo ver"})
              </Boton>
            </div>
          ) : null}
          <p className="mt-2 text-xs text-texto-3">{explicacion}</p>
        </>
      ) : null}
    </Tarjeta>
  );
}
