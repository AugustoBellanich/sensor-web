// Campo de correo con sugerencias: al tocarlo muestra las personas con las que ya compartís algo;
// admin y staff, además, buscan entre todas las cuentas. Siempre se puede escribir un correo nuevo.
// Combobox accesible (patrón ARIA 1.2): flechas para moverse, Enter elige, Esc cierra.
import { Mail, UserRound } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { buscarPersonas, type Persona } from "@/datos/personas";
import { useSesion } from "@/sesion/SesionContexto";

type Props = {
  valor: string;
  alCambiar: (correo: string) => void;
  /** "chico": en una fila con otros controles (34 px, sin etiqueta visible). "campo": con etiqueta, como Campo. */
  tamano?: "chico" | "campo";
  etiqueta?: string;
  placeholder?: string;
  /** Correos que no se sugieren (quienes ya tienen acceso). */
  excluir?: string[];
  disabled?: boolean;
};

export function SelectorPersona({
  valor,
  alCambiar,
  tamano = "chico",
  etiqueta = "Correo de la persona",
  placeholder = "Nombre o correo",
  excluir = [],
  disabled,
}: Props) {
  const { esAdmin } = useSesion();
  const id = useId();
  const listaId = `${id}-lista`;
  const [abierto, setAbierto] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [activo, setActivo] = useState(-1);
  const [buscando, setBuscando] = useState(false);
  const pedido = useRef(0);
  const fuera = new Set(excluir.map((c) => c.toLowerCase()));
  const visibles = personas.filter((p) => !fuera.has(p.correo.toLowerCase()));

  useEffect(() => {
    if (!abierto) return;
    const n = ++pedido.current;
    const t = setTimeout(async () => {
      const r = await buscarPersonas(valor, esAdmin);
      if (n !== pedido.current) return;
      setPersonas(r.personas);
      setActivo(-1);
      setBuscando(false);
    }, 250);
    return () => clearTimeout(t);
  }, [valor, abierto, esAdmin]);

  function elegir(p: Persona) {
    alCambiar(p.correo);
    setAbierto(false);
    setActivo(-1);
  }

  function teclas(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      if (!abierto) return setAbierto(true);
      setActivo((a) => Math.min(a + 1, visibles.length - 1));
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActivo((a) => Math.max(a - 1, -1));
    } else if (ev.key === "Enter" && abierto && activo >= 0 && visibles[activo]) {
      ev.preventDefault(); // elige; no envía el formulario
      elegir(visibles[activo]);
    } else if (ev.key === "Escape" && abierto) {
      ev.preventDefault();
      setAbierto(false);
    }
  }

  const mostrarLista = abierto && (visibles.length > 0 || !buscando);
  const entrada = (
    <input
      id={id}
      type="email"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={mostrarLista}
      aria-controls={listaId}
      aria-activedescendant={activo >= 0 ? `${listaId}-${activo}` : undefined}
      aria-label={tamano === "chico" ? etiqueta : undefined}
      autoComplete="off"
      value={valor}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(ev) => {
        alCambiar(ev.target.value);
        setBuscando(true);
        setAbierto(true);
      }}
      onFocus={() => {
        setBuscando(true);
        setAbierto(true);
      }}
      onBlur={() => setAbierto(false)}
      onKeyDown={teclas}
      className={
        tamano === "chico"
          ? "h-[34px] w-full min-w-0 rounded-lg border border-linea px-2.5 text-[13px] text-tinta outline-none focus:border-acento-oscuro"
          : "min-w-0 flex-1 bg-transparent text-[15px] text-tinta outline-none placeholder:text-texto-3"
      }
    />
  );

  const lista = mostrarLista ? (
    <ul
      id={listaId}
      role="listbox"
      aria-label="Personas sugeridas"
      className="absolute top-full right-0 left-0 z-20 mt-1 max-h-64 overflow-auto rounded-lg border border-linea bg-white py-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)]"
    >
      {visibles.length === 0 ? (
        <li className="px-3 py-2 text-xs text-texto-3" role="presentation">
          {valor.trim()
            ? "Sin coincidencias: se usa el correo escrito."
            : esAdmin
              ? "Escribí al menos 2 letras para buscar entre todas las cuentas."
              : "Todavía no compartís nada con nadie: escribí el correo."}
        </li>
      ) : (
        visibles.map((p, i) => (
          <li
            key={p.id}
            id={`${listaId}-${i}`}
            role="option"
            aria-selected={i === activo}
            onMouseDown={(ev) => ev.preventDefault()} // no pierde el foco antes de elegir
            onClick={() => elegir(p)}
            onMouseEnter={() => setActivo(i)}
            className={`flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[13px] ${i === activo ? "bg-fondo" : ""}`}
          >
            <UserRound size={15} strokeWidth={1.9} className="shrink-0 text-texto-3" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-tinta">{p.nombre ?? p.correo}</span>
              {p.nombre ? <span className="truncate text-xs text-texto-3">{p.correo}</span> : null}
            </span>
            {p.detalle ? <span className="shrink-0 text-xs text-texto-3">{p.detalle}</span> : null}
          </li>
        ))
      )}
    </ul>
  ) : null;

  if (tamano === "chico") {
    return (
      <div className="relative min-w-0 flex-[1_1_200px]">
        {entrada}
        {lista}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-xs font-bold tracking-wider text-texto uppercase">
        {etiqueta}
      </label>
      <div className="relative">
        <div className="flex h-12 items-center gap-2.5 rounded-campo border border-borde bg-superficie px-3.5 transition-colors focus-within:border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-acento-oscuro">
          <Mail size={16} className="shrink-0 text-texto-3" aria-hidden />
          {entrada}
        </div>
        {lista}
      </div>
    </div>
  );
}
