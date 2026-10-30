// Marcas de los sitios en los mapas: un círculo blanco con el ícono de la familia en su color y,
// si hay, el dato de ahora debajo (agua útil o temperatura). Alrededor de cada receptor, el radio en
// el que hoy recibe a los sensores (unos 600 m, según lo medido en campo; depende del sitio).
import L from "leaflet";
import { renderToStaticMarkup } from "react-dom/server";

import { ICONO_FAMILIA } from "@/componentes/familia";
import { FAMILIAS, type Familia } from "@/datos/familias";

/** Alcance típico del receptor medido en campo (m). Depende del terreno y la antena. */
export const RADIO_RECEPTOR_M = 600;

const cache = new Map<string, L.DivIcon>();

export function marcaSitio(familia: Familia | null, etiqueta: string | null, activo = false): L.DivIcon {
  const clave = `${familia}|${etiqueta}|${activo}`;
  const hecha = cache.get(clave);
  if (hecha) return hecha;
  const color = familia ? FAMILIAS[familia].color : "#64748b";
  const Icono = familia ? ICONO_FAMILIA[familia] : null;
  const tam = activo ? 34 : 28;
  const svg = Icono ? renderToStaticMarkup(<Icono size={Math.round(tam * 0.55)} color={color} strokeWidth={2.2} />) : "";
  const html = `
    <div class="marca-sitio${activo ? " activa" : ""}" style="--color:${color};--tam:${tam}px">
      <span class="marca-circulo">${svg}</span>
      ${etiqueta ? `<span class="marca-dato">${etiqueta}</span>` : ""}
    </div>`;
  const icono = L.divIcon({ html, className: "", iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] });
  cache.set(clave, icono);
  return icono;
}
