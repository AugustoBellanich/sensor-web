// Qué dato mostrar en las marcas de los mapas (D-96): temperatura o humedad del aire, temperatura o
// humedad del suelo (con su capa), o ninguno. Solo lecturas recientes (RECIENTE_MIN): los mapas son
// para ver lo que pasa ahora. La elección se recuerda en este navegador. Igual que la app.
import { Droplets, Thermometer } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { datosAhora, etiquetaDato, nombresCapas, VARIABLES, type Capa, type DatoAhora, type Variable } from "@/datos/datoAhora";

const CADA_MS = 5 * 60_000;
const DEL_AIRE: Variable[] = ["temp_aire", "hum_aire"];
const DEL_SUELO: Variable[] = ["temp_suelo", "hum_suelo"];

function usePreferencia<T extends string>(clave: string, inicial: T): [T, (v: T) => void] {
  const [valor, setValor] = useState<T>(() => {
    try {
      return (localStorage.getItem(`pref:${clave}`) as T | null) ?? inicial;
    } catch {
      return inicial;
    }
  });
  const guardar = useCallback(
    (v: T) => {
      setValor(v);
      try {
        localStorage.setItem(`pref:${clave}`, v);
      } catch {
        // Sin almacenamiento (modo privado): vale solo mientras la página está abierta.
      }
    },
    [clave],
  );
  return [valor, guardar];
}

/** Datos recientes de los sitios visibles, la variable elegida y la etiqueta de cada sitio. */
export function useDatoAhora() {
  const [variable, setVariable] = usePreferencia<Variable>("mapa.dato", "temp_aire");
  const [capa, setCapa] = usePreferencia<Capa>("mapa.capaSuelo", "1");
  const [datos, setDatos] = useState<Map<string, DatoAhora>>(new Map());
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    let vigente = true;
    const cargar = async () => {
      const r = await datosAhora();
      if (!vigente) return;
      if (!r.error) setDatos(r.datos);
      setAhora(Date.now());
    };
    void cargar();
    const t = setInterval(() => void cargar(), CADA_MS);
    return () => {
      vigente = false;
      clearInterval(t);
    };
  }, []);

  const etiquetas = useMemo(() => {
    const m = new Map<string, string>();
    for (const [id, d] of datos) {
      const e = etiquetaDato(d, variable, capa, ahora);
      if (e) m.set(id, e);
    }
    return m;
  }, [datos, variable, capa, ahora]);

  return { variable, setVariable, capa, setCapa, datos, etiquetas };
}

const boton = (activo: boolean) =>
  `inline-flex h-[30px] items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] ${activo ? "bg-tinta text-white" : "text-texto-2 hover:bg-fondo"}`;

/** Botones: una por variable (las que miden los equipos del mapa) y, con humedad del suelo, la capa. */
export function SelectorDato({
  tipos,
  dato,
}: {
  /** Modelos de equipo presentes en el mapa ("B01", "C01"…): decide qué variables se ofrecen. */
  tipos: string[];
  dato: ReturnType<typeof useDatoAhora>;
}) {
  const { variable, setVariable, capa, setCapa, datos } = dato;
  const hayAire = tipos.includes("C01");
  const haySuelo = tipos.includes("B01");
  const ofrecidas = VARIABLES.filter(
    (v) => v.valor === "ninguno" || (hayAire && DEL_AIRE.includes(v.valor)) || (haySuelo && DEL_SUELO.includes(v.valor)),
  );
  // Si lo elegido no se mide en este mapa, pasar a lo primero que sí (recién cuando se sabe qué hay).
  useEffect(() => {
    if (!tipos.length) return;
    if (!ofrecidas.some((v) => v.valor === variable)) setVariable(ofrecidas.find((v) => v.valor !== "ninguno")?.valor ?? "ninguno");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hayAire, haySuelo, tipos.length]);
  if (ofrecidas.length < 2) return null;
  const nombres = nombresCapas(datos.values());

  return (
    <div className="flex flex-wrap items-center gap-1" title="Solo lecturas de las últimas 2 horas">
      <div role="radiogroup" aria-label="Dato en el mapa" className="flex flex-wrap gap-1">
        {ofrecidas.map((v) => {
          const activo = variable === v.valor;
          const Icono = v.valor.startsWith("temp") ? Thermometer : Droplets;
          return (
            <button key={v.valor} type="button" role="radio" aria-checked={activo} onClick={() => setVariable(v.valor)} className={boton(activo)}>
              {v.valor !== "ninguno" ? <Icono size={14} aria-hidden /> : null}
              {v.texto}
            </button>
          );
        })}
      </div>
      {variable === "hum_suelo" ? (
        <div role="radiogroup" aria-label="Capa del suelo" className="ml-1 flex gap-1 border-l border-linea pl-2">
          {(["1", "2", "3"] as Capa[]).map((c) => (
            <button key={c} type="button" role="radio" aria-checked={capa === c} onClick={() => setCapa(c)} className={boton(capa === c)}>
              {nombres[c]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
