// Ícono de cada familia de equipos (suelo, clima, receptor…), reloj corto del último dato y
// batería con ícono: los mismos criterios que la app (componentes/Familia, HaceCorto, BateriaCorta).
import {
  Battery,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Clock,
  CloudRain,
  Cpu,
  MapPin,
  RadioTower,
  Sprout,
  Thermometer,
  Waves,
  type LucideIcon,
} from "lucide-react";

import { esReciente, hace, haceCorto } from "@/datos/estado";
import { FAMILIAS, type Familia } from "@/datos/familias";

export const ICONO_FAMILIA: Record<Familia, LucideIcon> = {
  suelo: Sprout,
  clima: Thermometer,
  lluvia: CloudRain,
  agua: Waves,
  gateway: RadioTower,
  otro: Cpu,
};

/** Color con transparencia (#rrggbb + alfa 0–1). */
export const conAlfa = (hex: string, alfa: number) => `${hex}${Math.round(alfa * 255).toString(16).padStart(2, "0")}`;

/** Cuadro con el ícono de la familia; `noche` para las cabeceras oscuras (con halo). */
export function IconoFamilia({ familia, tamano = 40, noche = false, icono }: { familia: Familia | null; tamano?: number; noche?: boolean; icono?: LucideIcon }) {
  const f = familia ? FAMILIAS[familia] : null;
  const Icono = icono ?? (familia ? ICONO_FAMILIA[familia] : MapPin);
  const tono = noche ? (f?.noche ?? "#38bdf8") : (f?.color ?? "#475569");
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center border"
      style={{
        width: tamano,
        height: tamano,
        borderRadius: Math.round(tamano * 0.29),
        background: noche ? "#111827" : "#ffffff",
        borderColor: noche ? conAlfa(tono, 0.35) : "#e2e8f0",
        boxShadow: noche ? `0 0 28px ${conAlfa(tono, 0.2)}` : undefined,
        color: tono,
      }}
    >
      <Icono size={Math.round(tamano * 0.5)} />
    </span>
  );
}

/** "SUELO", "CLIMA"… en el tono de la familia, al tamaño del id que acompaña. */
export function EtiquetaFamilia({ familia }: { familia: Familia }) {
  return (
    <span className="text-[11px] font-bold tracking-[0.06em] uppercase" style={{ color: FAMILIAS[familia].color }}>
      {FAMILIAS[familia].corto}
    </span>
  );
}

/** Reloj + "3 h", "25 d"; verde con menos de una hora, gris si no. */
export function HaceCorto({ fecha }: { fecha: string | null }) {
  const corto = haceCorto(fecha);
  const fresco = esReciente(fecha);
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${fresco ? "text-ok" : "text-texto-2"}`} title={fecha ? hace(fecha) : undefined}>
      <Clock size={13} strokeWidth={2.25} className={fresco ? "text-ok" : "text-texto-3"} aria-hidden />
      <span className="sr-only">Último dato </span>
      {corto ?? "Sin datos"}
    </span>
  );
}

/** Ícono según lo que le queda + %; ámbar debajo de 25 %, rojo debajo de 10 %. */
export function BateriaCorta({ pct }: { pct: number | null | undefined }) {
  if (pct == null || !Number.isFinite(pct)) return <span className="text-[13px] text-texto-3">—</span>;
  const Icono = pct < 10 ? BatteryWarning : pct < 25 ? BatteryLow : pct < 70 ? BatteryMedium : pct > 0 ? BatteryFull : Battery;
  const color = pct < 10 ? "text-error" : pct < 25 ? "text-aviso" : "text-texto-3";
  return (
    <span className={`inline-flex items-center gap-1 text-[13px] font-medium ${pct < 10 ? "text-error" : "text-texto-2"}`}>
      <Icono size={15} strokeWidth={2.25} className={color} aria-hidden />
      <span className="sr-only">Batería </span>
      {Math.round(pct)} %
    </span>
  );
}
