// Piezas comunes de la interfaz (docs/estilo.md). En la web el tono es más sutil que en la app
// (pantalla grande, se usa sentado): botones de 34 px en minúscula, tarjetas con borde fino y sin
// sombra, títulos de 14 px. Las pantallas de cuenta usan el botón grande, como el inicio de sesión.
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, TriangleAlert, type LucideIcon } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type PropsWithChildren, type ReactNode } from "react";

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario" | "texto" | "noche";
  /** "grande": el de las pantallas de cuenta (mayúsculas, 48 px); "chico": el de todo lo demás. */
  tamano?: "chico" | "grande";
  icono?: LucideIcon;
  /** Ícono después del texto (la flecha del botón principal de la cuenta). */
  iconoFin?: LucideIcon;
  cargando?: boolean;
};

const VARIANTES = {
  principal: "bg-tinta text-white border border-tinta hover:bg-[#1e293b] disabled:bg-[#334155]",
  secundario: "bg-white text-texto-2 border border-linea hover:bg-fondo hover:text-tinta",
  texto: "bg-transparent text-acento-oscuro hover:underline px-1",
  noche: "bg-noche-2 text-noche-texto border border-noche-borde hover:border-[#334155]",
} as const;

const TAMANOS = {
  chico: "h-[34px] gap-1.5 rounded-lg px-3 text-[13px] font-medium",
  grande: "h-12 gap-2 rounded-campo px-4 text-xs font-semibold uppercase tracking-wider",
} as const;

export function Boton({ variante = "principal", tamano = "chico", icono: Icono, iconoFin: IconoFin, cargando, children, className = "", disabled, ...resto }: BotonProps) {
  const sombra = tamano === "grande" && variante === "principal" ? "shadow-[0_8px_20px_rgba(12,74,110,0.22)]" : "";
  const tam = tamano === "chico" ? 15 : 16;
  return (
    <button
      type="button"
      {...resto}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex shrink-0 items-center justify-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${TAMANOS[tamano]} ${VARIANTES[variante]} ${sombra} ${className}`}
    >
      {cargando ? <LoaderCircle size={tam} className="animate-spin" aria-hidden /> : Icono ? <Icono size={tam} strokeWidth={1.9} aria-hidden /> : null}
      {children}
      {IconoFin && !cargando ? <IconoFin size={tam} aria-hidden /> : null}
    </button>
  );
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & {
  etiqueta: string;
  ayuda?: string;
  icono?: LucideIcon;
  /** Enlace a la derecha de la etiqueta (por ejemplo, "¿Olvidaste tu contraseña?"). */
  accion?: ReactNode;
};

/** Campo con etiqueta en mayúsculas chicas e ícono; las contraseñas traen el botón para verlas. */
export function Campo({ etiqueta, ayuda, icono: Icono, accion, id, type, className = "", ...resto }: CampoProps) {
  const campoId = id ?? `campo-${etiqueta.toLowerCase().replace(/\W+/g, "-")}`;
  const [ver, setVer] = useState(false);
  const esClave = type === "password";
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={campoId} className="text-xs font-bold tracking-wider text-texto uppercase">
          {etiqueta}
        </label>
        {accion ? <span className="text-xs font-semibold">{accion}</span> : null}
      </div>
      <div className="flex h-12 items-center gap-2.5 rounded-campo border border-borde bg-superficie px-3.5 transition-colors focus-within:border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-acento-oscuro">
        {Icono ? <Icono size={16} className="shrink-0 text-texto-3" aria-hidden /> : null}
        <input id={campoId} type={esClave && ver ? "text" : type} {...resto} className="min-w-0 flex-1 bg-transparent text-[15px] text-tinta outline-none placeholder:text-texto-3" />
        {esClave ? (
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-chico text-texto-3 hover:text-texto"
            aria-label={ver ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {ver ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
          </button>
        ) : null}
      </div>
      {ayuda ? <p className="text-xs text-texto-2">{ayuda}</p> : null}
    </div>
  );
}

const AVISOS = {
  error: { Icono: CircleAlert, caja: "border-[#fecaca] bg-white", color: "text-error" },
  aviso: { Icono: TriangleAlert, caja: "border-[#fde68a] bg-[#fffbeb] text-[#92400e]", color: "text-aviso" },
  bien: { Icono: CircleCheck, caja: "border-[#a7f3d0] bg-white", color: "text-[#047857]" },
} as const;

/** Mensaje en una caja con borde e ícono del color del mensaje. */
export function Aviso({ tipo = "error", mensaje }: { tipo?: keyof typeof AVISOS; mensaje: string | null | undefined }) {
  if (!mensaje) return null;
  const a = AVISOS[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-[10px] border px-3.5 py-2.5 text-[13px] text-texto ${a.caja}`}>
      <a.Icono size={16} className={`mt-px shrink-0 ${a.color}`} aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">{mensaje}</span>
    </div>
  );
}

/** Tarjeta blanca de borde fino; título de 14 px con algo a la derecha (un enlace, un control). */
export function Tarjeta({ children, className = "", titulo, derecha, sinRelleno = false }: PropsWithChildren<{ className?: string; titulo?: ReactNode; derecha?: ReactNode; sinRelleno?: boolean }>) {
  return (
    <section className={`rounded-xl border border-linea bg-white ${sinRelleno ? "" : "px-[18px] py-4"} ${className}`}>
      {titulo ? (
        <div className={`mb-3 flex flex-wrap items-center justify-between gap-2.5 ${sinRelleno ? "px-[18px] pt-4" : ""}`}>
          <h2 className="text-sm font-semibold text-tinta">{titulo}</h2>
          {derecha}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Título de la pantalla (20 px) con una línea de datos debajo y acciones a la derecha. */
export function Titulo({ titulo, icono, datos, acciones }: { titulo: ReactNode; icono?: ReactNode; datos?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {icono}
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight text-tinta">{titulo}</h1>
          {datos ? <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-texto-2">{datos}</div> : null}
        </div>
      </div>
      {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
    </div>
  );
}

/** Ícono chico + texto, para la línea de datos de un título. */
export function Dato({ icono: Icono, children }: PropsWithChildren<{ icono: LucideIcon }>) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icono size={14} strokeWidth={1.9} className="text-texto-3" aria-hidden />
      {children}
    </span>
  );
}

/** Fila etiqueta / valor dentro de una tarjeta, con separador fino. */
export function FilaDato({ icono: Icono, etiqueta, children }: PropsWithChildren<{ icono?: LucideIcon; etiqueta: string }>) {
  return (
    <div className="flex items-center gap-2.5 border-t border-separador py-2 text-[13px] first:border-t-0">
      {Icono ? <Icono size={15} strokeWidth={1.9} className="shrink-0 text-texto-3" aria-hidden /> : null}
      <span className="flex-1 text-texto-3">{etiqueta}</span>
      <span className="text-right text-tinta">{children}</span>
    </div>
  );
}

/** Estado en una frase con un punto de color (ok, aviso, error, gris). */
export function Estado({ tipo, children }: PropsWithChildren<{ tipo: "ok" | "aviso" | "error" | "gris" }>) {
  const color = { ok: "text-[#047857] bg-[#047857]", aviso: "text-aviso bg-aviso", error: "text-error bg-error", gris: "text-texto-3 bg-texto-3" }[tipo].split(" ");
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] ${color[0]}`}>
      <span aria-hidden className={`h-1.5 w-1.5 shrink-0 rounded-full ${color[1]}`} />
      {children}
    </span>
  );
}

/** Espera con texto (criterio 22: nada de ruedas sin texto). */
export function Cargando({ texto = "Cargando…", noche = false }: { texto?: string; noche?: boolean }) {
  return (
    <p role="status" className={`flex items-center gap-2 text-[13px] ${noche ? "text-noche-texto-2" : "text-texto-2"}`}>
      <LoaderCircle size={15} className="animate-spin" aria-hidden />
      {texto}
    </p>
  );
}

/** Opciones como control segmentado (período, unidad, alcance): píldora gris, la elegida en blanco. */
export function Segmento<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
}: {
  opciones: readonly { valor: T; texto: ReactNode }[];
  valor: T;
  alCambiar: (v: T) => void;
  etiqueta: string;
  noche?: boolean;
  chico?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="inline-flex gap-0.5 rounded-[9px] bg-[#eef1f5] p-[3px]">
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => alCambiar(o.valor)}
            className={`h-7 rounded-md px-2.5 text-[12.5px] transition-colors ${activa ? "bg-white font-semibold text-tinta shadow-[0_1px_2px_rgba(15,23,42,0.1)]" : "text-texto-2 hover:text-tinta"}`}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
