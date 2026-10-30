// Piezas comunes de la interfaz (docs/estilo.md): botón, campo, aviso, tarjeta y espera.
// Las pantallas usan estas piezas y los tokens de estilos.css, no colores sueltos.
import { CircleAlert, CircleCheck, Eye, EyeOff, LoaderCircle, TriangleAlert, type LucideIcon } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type PropsWithChildren, type ReactNode } from "react";

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario" | "texto" | "noche";
  icono?: LucideIcon;
  /** Ícono después del texto (la flecha del botón principal, docs/estilo.md). */
  iconoFin?: LucideIcon;
  cargando?: boolean;
};

const VARIANTES = {
  principal: "bg-tinta text-white text-xs uppercase tracking-wider shadow-[0_8px_20px_rgba(12,74,110,0.22)] hover:bg-[#1e293b] disabled:bg-[#334155]",
  secundario: "bg-white text-texto-2 text-xs uppercase tracking-wider border border-borde hover:bg-superficie hover:text-tinta",
  texto: "bg-transparent text-acento-oscuro hover:underline px-1",
  noche: "bg-noche-2 text-noche-texto border border-noche-borde hover:border-[#334155]",
} as const;

export function Boton({ variante = "principal", icono: Icono, iconoFin: IconoFin, cargando, children, className = "", disabled, ...resto }: BotonProps) {
  return (
    <button
      type="button"
      {...resto}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-campo px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTES[variante]} ${className}`}
    >
      {cargando ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : Icono ? <Icono size={16} aria-hidden /> : null}
      {children}
      {IconoFin && !cargando ? <IconoFin size={16} aria-hidden /> : null}
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
  error: { Icono: CircleAlert, borde: "border-[#fecaca]", color: "text-error" },
  aviso: { Icono: TriangleAlert, borde: "border-[#fde68a]", color: "text-aviso" },
  bien: { Icono: CircleCheck, borde: "border-[#a7f3d0]", color: "text-[#047857]" },
} as const;

/** Caja de mensaje blanca con borde e ícono del color del mensaje (sin teñir la pantalla). */
export function Aviso({ tipo = "error", mensaje }: { tipo?: keyof typeof AVISOS; mensaje: string | null | undefined }) {
  if (!mensaje) return null;
  const a = AVISOS[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-campo border bg-white px-3.5 py-3 text-sm text-texto ${a.borde}`}>
      <a.Icono size={18} className={`mt-px shrink-0 ${a.color}`} aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">{mensaje}</span>
    </div>
  );
}

export function Tarjeta({ children, className = "", titulo, derecha }: PropsWithChildren<{ className?: string; titulo?: string; derecha?: ReactNode }>) {
  return (
    <section className={`rounded-tarjeta border border-borde bg-white p-5 shadow-tarjeta ${className}`}>
      {titulo ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-tinta">{titulo}</h2>
          {derecha}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Espera con texto (criterio 22: nada de ruedas sin texto). */
export function Cargando({ texto = "Cargando…", noche = false }: { texto?: string; noche?: boolean }) {
  return (
    <p role="status" className={`flex items-center gap-2 text-sm ${noche ? "text-noche-texto-2" : "text-texto-2"}`}>
      <LoaderCircle size={16} className="animate-spin" aria-hidden />
      {texto}
    </p>
  );
}

/** Opciones como control segmentado (período, unidad, alcance). */
export function Segmento<T extends string>({
  opciones,
  valor,
  alCambiar,
  etiqueta,
  noche = false,
  chico = false,
}: {
  opciones: readonly { valor: T; texto: string }[];
  valor: T;
  alCambiar: (v: T) => void;
  etiqueta: string;
  noche?: boolean;
  chico?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className={`inline-flex gap-1 rounded-campo border p-1 ${noche ? "border-noche-borde bg-noche-2" : "border-borde bg-white"}`}>
      {opciones.map((o) => {
        const activa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={activa}
            onClick={() => alCambiar(o.valor)}
            className={`${chico ? "h-8 px-2.5 text-[13px]" : "h-9 px-3 text-sm"} rounded-[9px] transition-colors ${
              activa
                ? noche
                  ? "bg-white font-semibold text-tinta"
                  : "bg-tinta font-semibold text-white"
                : noche
                  ? "text-noche-texto hover:bg-noche-borde"
                  : "text-texto-2 hover:bg-superficie"
            }`}
          >
            {o.texto}
          </button>
        );
      })}
    </div>
  );
}
