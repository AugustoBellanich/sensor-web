// Estado de un equipo con un ícono que dice el tipo de problema (reloj: no llegan datos; batería;
// antena: radio o señal; alerta: lo demás; tilde: al día) y, al pasar el mouse, la frase completa.
// En listas va el ícono con dos o tres palabras; la frase entera queda en la ficha.
import { BatteryLow, BatteryWarning, CircleCheck, CircleDashed, Clock, RadioTower, TriangleAlert, type LucideIcon } from "lucide-react";

import { fraseCausa, nivel, TEXTO_ESTADO, type SaludEquipo } from "@/datos/salud";

const ICONO_CAUSA: Record<string, LucideIcon> = {
  "sin-conexion": Clock,
  "sin-conexion-gateway": Clock,
  intermitente: Clock,
  "no-sube": Clock,
  reloj: Clock,
  "bateria-critica": BatteryWarning,
  "bateria-baja": BatteryLow,
  "no-carga": BatteryLow,
  "sin-radio": RadioTower,
  "sin-escuchar": RadioTower,
  "senal-debil": RadioTower,
};

export function colorEstado(s: SaludEquipo | undefined): string {
  if (!s) return "#94a3b8";
  const n = nivel(s);
  return n === "grave" ? "#b91c1c" : n === "aviso" ? "#d97706" : n === "ok" ? "#059669" : "#94a3b8";
}

/** Ícono del estado (y, con `texto`, el título corto de la causa), con la frase al pasar el mouse. */
export function IconoEstado({ s, texto = true, retirado = false }: { s: SaludEquipo | undefined; texto?: boolean; retirado?: boolean }) {
  if (retirado || !s) {
    const t = retirado ? "Retirado" : "Sin estado";
    return (
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-texto-3" title={t}>
        <CircleDashed size={15} strokeWidth={1.9} aria-hidden />
        {texto ? t : <span className="sr-only">{t}</span>}
      </span>
    );
  }
  const causa = s.causes[0];
  const Icono = causa ? (ICONO_CAUSA[causa.code] ?? TriangleAlert) : nivel(s) === "gris" ? CircleDashed : CircleCheck;
  const color = colorEstado(s);
  const corto = causa ? causa.title : (TEXTO_ESTADO[s.state] ?? s.state);
  const frase = causa ? s.causes.map((c) => fraseCausa(c, s.type)).join(" ") : corto;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px]" style={{ color }} title={frase}>
      <Icono size={15} strokeWidth={1.9} className="shrink-0" aria-hidden />
      {texto ? <span className="truncate">{corto}</span> : <span className="sr-only">{frase}</span>}
      {s.causes.length > 1 ? <span className="text-[11px] text-texto-3">+{s.causes.length - 1}</span> : null}
    </span>
  );
}

/** La frase completa con su ícono (ficha y panel del equipo). */
export function FraseEstado({ s }: { s: SaludEquipo | undefined }) {
  if (!s) return null;
  const causa = s.causes[0];
  const Icono = causa ? (ICONO_CAUSA[causa.code] ?? TriangleAlert) : CircleCheck;
  return (
    <span className="flex items-start gap-2 text-[13px]" style={{ color: colorEstado(s) }}>
      <Icono size={15} strokeWidth={1.9} className="mt-0.5 shrink-0" aria-hidden />
      {causa ? fraseCausa(causa, s.type) : (TEXTO_ESTADO[s.state] ?? s.state)}
    </span>
  );
}
