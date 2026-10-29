// Piezas comunes de la interfaz (docs/estilo.md): botón, campo, aviso, tarjeta y espera.
// Las pantallas usan estas piezas y los tokens de estilos.css, no colores sueltos.
import { CircleAlert, CircleCheck, LoaderCircle, TriangleAlert, type LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren, ReactNode } from "react";

type BotonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: "principal" | "secundario" | "texto" | "noche";
  icono?: LucideIcon;
  cargando?: boolean;
};

const VARIANTES = {
  principal: "bg-tinta text-white hover:bg-[#1e293b] disabled:bg-[#334155]",
  secundario: "bg-white text-texto border border-borde hover:bg-superficie",
  texto: "bg-transparent text-acento-oscuro hover:underline px-1",
  noche: "bg-noche-2 text-noche-texto border border-noche-borde hover:border-[#334155]",
} as const;

export function Boton({ variante = "principal", icono: Icono, cargando, children, className = "", disabled, ...resto }: BotonProps) {
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
    </button>
  );
}

type CampoProps = InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: string; icono?: LucideIcon };

export function Campo({ etiqueta, ayuda, icono: Icono, id, className = "", ...resto }: CampoProps) {
  const campoId = id ?? `campo-${etiqueta.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={campoId} className="text-sm font-medium text-texto">
        {etiqueta}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-campo border border-borde bg-superficie px-3 focus-within:border-acento-oscuro focus-within:ring-2 focus-within:ring-acento-oscuro/20">
        {Icono ? <Icono size={16} className="shrink-0 text-texto-3" aria-hidden /> : null}
        <input id={campoId} {...resto} className="min-w-0 flex-1 bg-transparent text-[15px] text-tinta outline-none placeholder:text-texto-3" />
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
