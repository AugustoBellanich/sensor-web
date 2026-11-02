// Ícono de un lote según lo que tiene plantado: el grupo del cultivo en la lista de la base (D-54,
// tabla crops: frutos secos, vid, cítricos…), o el tipo de actividad si el cultivo no está en la
// lista. Sirve para reconocer los lotes de un vistazo; el nombre del cultivo va siempre al lado
// (el color nunca va solo). Igual en la app (sensor-app/src/componentes/IconoCultivo.tsx).
import {
  Apple,
  Carrot,
  Cherry,
  Citrus,
  Clover,
  Grape,
  Leaf,
  Nut,
  Shapes,
  Spline,
  Trees,
  Wheat,
  type LucideIcon,
} from "lucide-react";

const GRUPOS_CULTIVO: Record<string, { icono: LucideIcon; color: string }> = {
  "Frutos secos": { icono: Nut, color: "#92400e" },
  Olivo: { icono: Leaf, color: "#4d7c0f" },
  Vid: { icono: Grape, color: "#7e22ce" },
  "Carozo y pepita": { icono: Apple, color: "#dc2626" },
  Cítricos: { icono: Citrus, color: "#ea580c" },
  "Otros frutales": { icono: Cherry, color: "#be185d" },
  "Hortalizas y aromáticas": { icono: Carrot, color: "#16a34a" },
  Extensivos: { icono: Wheat, color: "#ca8a04" },
  Forrajes: { icono: Clover, color: "#65a30d" },
  Forestal: { icono: Trees, color: "#166534" },
  Otros: { icono: Shapes, color: "#64748b" },
};

const SIN_CULTIVO = { icono: Spline, color: "#334155" };

export function IconoCultivo({ grupo, tamano = 16 }: { grupo: string | null; tamano?: number }) {
  const { icono: Icono, color } = (grupo && GRUPOS_CULTIVO[grupo]) || SIN_CULTIVO;
  return <Icono size={tamano} strokeWidth={1.9} style={{ color }} className="shrink-0" aria-hidden />;
}
