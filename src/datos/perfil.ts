// Estado de ahora de un sitio a partir de site_data_info: las capas de suelo con su estado
// hídrico y el agua útil del perfil (misma cuenta que sensor-app/src/componentes/datos/PerfilSuelo),
// y el resumen de una línea para tablas. Funciones puras: se prueban con vitest.
import { estadoHidrico, referencias, tendencia, unidadesDisponibles, type Referencias, type Tendencia, type Unidad } from "./agro";
import type { InfoSitio } from "./series";

export type Capa = {
  i: 1 | 2 | 3;
  profundidad: number | null;
  textura: string | null;
  valor: number | null;
  mv: number | null;
  refs: Referencias | null;
  aguaUtil: number | null;
  tendencia: Tendencia | null;
};

/** Humedad volumétrica si hay; si no, gravimétrica; si no, mV. */
export function unidadDelSitio(info: InfoSitio): Unidad {
  return unidadesDisponibles(info.last_b01 ? [info.last_b01] : [])[0] ?? "mv";
}

export function capasSuelo(info: InfoSitio, unidad: Unidad = unidadDelSitio(info)): Capa[] {
  const ult = info.last_b01;
  const ant = info.prev_b01;
  if (!ult) return [];
  return ([1, 2, 3] as const).map((i) => {
    const e = info.electrodes.find((x) => x.index === i);
    const valor = ult[`e${i}_${unidad}`] ?? null;
    const refs = unidad === "mv" ? null : referencias(e, unidad);
    const est = refs ? estadoHidrico(valor, refs) : null;
    return {
      i,
      profundidad: e?.depth ?? null,
      textura: e?.texture ?? null,
      valor,
      mv: ult[`e${i}_mv`] ?? null,
      refs,
      aguaUtil: est && Number.isFinite(est.aguaUtil) ? est.aguaUtil : null,
      tendencia: tendencia(valor, ant?.[`e${i}_${unidad}`], unidad),
    };
  });
}

/** Promedio del agua útil de las capas calibradas (0 % = PMP, 100 % = CC); null si ninguna. */
export function aguaPerfil(capas: Capa[]): number | null {
  const con = capas.filter((c) => c.aguaUtil != null);
  return con.length ? con.reduce((a, c) => a + c.aguaUtil!, 0) / con.length : null;
}

/** Lo principal de ahora, para una tabla: agua útil y temperatura del suelo, o aire. */
export function ahoraSitio(info: InfoSitio): { agua: number | null; temp: number | null; humedad: number | null; t: string | null } {
  if (info.last_b01) {
    return { agua: aguaPerfil(capasSuelo(info)), temp: info.last_b01.soil_temp ?? null, humedad: null, t: info.last_b01.t };
  }
  if (info.last_c01) return { agua: null, temp: info.last_c01.air_temp, humedad: info.last_c01.humidity, t: info.last_c01.t };
  return { agua: null, temp: null, humedad: null, t: null };
}
