// Ícono de cada dato o índice (medido o calculado), el mismo en todas las pantallas: así la
// mínima, las horas de frío o el DPV se reconocen sin leer la etiqueta. Color suave, del tono de
// la variable (rojo calor, azul agua, celeste frío).
import {
  Battery,
  CalendarRange,
  CloudRain,
  Cpu,
  Database,
  Droplet,
  Droplets,
  Gauge,
  Layers,
  MoveVertical,
  Snowflake,
  Sprout,
  Sun,
  Thermometer,
  ThermometerSnowflake,
  ThermometerSun,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export const INDICE = {
  temperatura: { icono: Thermometer, color: "#dc2626" },
  humedad: { icono: Droplets, color: "#2563eb" },
  minima: { icono: ThermometerSnowflake, color: "#0284c7" },
  maxima: { icono: ThermometerSun, color: "#dc2626" },
  dpv: { icono: Gauge, color: "#0f766e" },
  rocio: { icono: Droplet, color: "#0369a1" },
  horasFrio: { icono: Snowflake, color: "#0284c7" },
  horasHelada: { icono: Snowflake, color: "#4338ca" },
  gradosDia: { icono: Sun, color: "#d97706" },
  amplitud: { icono: MoveVertical, color: "#64748b" },
  tempSuelo: { icono: Thermometer, color: "#ea580c" },
  aguaUtil: { icono: Sprout, color: "#047857" },
  riego: { icono: Droplets, color: "#0369a1" },
  lluvia: { icono: CloudRain, color: "#4338ca" },
  bateria: { icono: Battery, color: "#64748b" },
  suelo: { icono: Layers, color: "#8f6f45" },
  equipo: { icono: Cpu, color: "#64748b" },
  lecturas: { icono: Database, color: "#64748b" },
  desde: { icono: CalendarRange, color: "#64748b" },
} satisfies Record<string, { icono: LucideIcon; color: string }>;

export type ClaveIndice = keyof typeof INDICE;

export function IconoIndice({ que, tamano = 15 }: { que: ClaveIndice; tamano?: number }) {
  const { icono: Icono, color } = INDICE[que];
  return <Icono size={tamano} strokeWidth={1.9} style={{ color }} className="shrink-0" aria-hidden />;
}

/** Etiqueta con su ícono adelante. */
export function ConIcono({ que, children }: { que: ClaveIndice; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <IconoIndice que={que} tamano={14} />
      {children}
    </span>
  );
}
