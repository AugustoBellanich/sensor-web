// Cargar las esquinas de un perímetro o de un lote desde un archivo (KML, KMZ, GeoJSON) o escritas
// a mano (grados decimales). Las esquinas van al editor de dibujo: se ven y se ajustan antes de
// guardar. Si el archivo trae varios polígonos, se elige uno.
import { FileUp, ListPlus } from "lucide-react";
import { useRef, useState } from "react";

import { Aviso, Boton, Tarjeta } from "@/componentes/ui";
import type { Punto } from "@/datos/geo";
import { importarArchivo, leerCoordenadas, type PoligonoImportado } from "@/datos/importarPoligono";

export function ImportarPoligono({ alCargar, deshabilitado = false }: { alCargar: (puntos: Punto[], origen: string) => void; deshabilitado?: boolean }) {
  const entrada = useRef<HTMLInputElement>(null);
  const [opciones, setOpciones] = useState<PoligonoImportado[]>([]);
  const [archivo, setArchivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [escribiendo, setEscribiendo] = useState(false);
  const [texto, setTexto] = useState("");

  async function leerArchivo(f: File | undefined) {
    if (!f) return;
    setError(null);
    setOpciones([]);
    const r = importarArchivo(f.name, new Uint8Array(await f.arrayBuffer()));
    if (r.error) return setError(r.error);
    if (r.poligonos.length === 1) return alCargar(r.poligonos[0]!.puntos, `${r.poligonos[0]!.nombre} (${f.name})`);
    setArchivo(f.name);
    setOpciones(r.poligonos);
  }

  function usarTexto() {
    const r = leerCoordenadas(texto);
    if (r.error) return setError(r.error);
    setError(null);
    setEscribiendo(false);
    alCargar(r.puntos, "coordenadas escritas");
  }

  return (
    <Tarjeta titulo="Cargar desde archivo o coordenadas">
      <p className="text-[13px] text-texto-2">
        KML o KMZ (Google Earth, Mis mapas) o GeoJSON (QGIS). Reemplaza lo dibujado; después se puede ajustar en el mapa.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={entrada}
          type="file"
          accept=".kml,.kmz,.geojson,.json"
          className="hidden"
          onChange={(e) => {
            void leerArchivo(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <Boton type="button" variante="secundario" icono={FileUp} disabled={deshabilitado} onClick={() => entrada.current?.click()}>
          Importar archivo
        </Boton>
        <Boton type="button" variante="secundario" icono={ListPlus} disabled={deshabilitado} onClick={() => setEscribiendo((x) => !x)}>
          Escribir coordenadas
        </Boton>
      </div>
      {opciones.length ? (
        <div className="mt-3">
          <p className="text-xs text-texto-3">{archivo} tiene {opciones.length} polígonos: elegí uno.</p>
          <div className="mt-1.5 flex max-h-56 flex-col overflow-y-auto rounded-lg border border-linea">
            {opciones.map((p, i) => (
              <button
                key={i}
                type="button"
                className="flex items-center justify-between gap-2 border-t border-separador px-3 py-2 text-left text-[13px] text-tinta first:border-t-0 hover:bg-[#fafbfc]"
                onClick={() => {
                  setOpciones([]);
                  alCargar(p.puntos, `${p.nombre} (${archivo})`);
                }}
              >
                <span className="min-w-0 truncate">{p.nombre}</span>
                <span className="shrink-0 text-xs text-texto-3">{p.puntos.length} esquinas</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {escribiendo ? (
        <div className="mt-3 flex flex-col gap-2">
          <label className="text-xs text-texto-3" htmlFor="coordenadas">
            Una esquina por línea, en grados decimales: latitud, longitud (como las copia Google Maps).
          </label>
          <textarea
            id="coordenadas"
            rows={6}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={"-28.4696, -65.7795\n-28.4701, -65.7781\n-28.4712, -65.7790"}
            className="w-full rounded-lg border border-linea px-3 py-2 font-mono text-[12.5px] text-tinta outline-none focus:border-acento"
          />
          <Boton type="button" onClick={usarTexto} disabled={!texto.trim()}>
            Usar estas coordenadas
          </Boton>
        </div>
      ) : null}
      {error ? (
        <div className="mt-3">
          <Aviso mensaje={error} />
        </div>
      ) : null}
    </Tarjeta>
  );
}
