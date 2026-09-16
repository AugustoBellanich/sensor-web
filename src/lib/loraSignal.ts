/*
 * ============================================================
 * SEÑAL LoRa (RFM95 / SX1276, 868-915 MHz)
 * ------------------------------------------------------------
 * Dos cosas viven acá:
 *
 * 1) interpretRssi(): traduce el RSSI crudo (dBm) que reporta
 *    el gateway a una etiqueta entendible por alguien que no
 *    sabe qué es un dBm.
 *
 * 2) LORA_COVERAGE_M: radios estimados (en metros) para dibujar
 *    el área de cobertura del N01 en el mapa.
 *
 * Los umbrales de RSSI y los radios de cobertura son
 * estimaciones de referencia, no una medición del enlace real
 * de cada nodo. Se basan en:
 *
 * - Sensibilidad del receptor SX1276 en LoRa: entre -123/-126
 *   dBm (SF7, el modo más rápido) y -137 dBm (SF12, el modo
 *   más sensible pero más lento), con BW 125 kHz.
 * - Potencia de salida configurable hasta +20 dBm.
 * - Antena de 5 dBi en ambos extremos (gateway N01 y nodo).
 * - Antena a 1,5 m de altura en ambos extremos: a esa altura,
 *   el alcance real depende mucho más de qué hay "en el medio"
 *   (cultivos, ondulación del terreno) que de la potencia del
 *   equipo — el cultivo interpuesto es, en la práctica, el
 *   factor que más recorta el alcance, mucho más que una pared
 *   (que solo importa si el gateway queda dentro de una
 *   construcción; al aire libre no interviene).
 * ============================================================
 */

export interface RssiInterpretation {
  label: string;
  description: string;
  badgeClass: string;
  dotClass: string;
}

export const interpretRssi = (
  rssi: number | null | undefined,
): RssiInterpretation => {
  if (rssi == null || !Number.isFinite(rssi)) {
    return {
      label: "Sin datos",
      description: "Todavía no se recibió un valor de señal de este gateway.",
      badgeClass: "bg-slate-100 text-slate-500",
      dotClass: "bg-slate-300",
    };
  }

  if (rssi > -80) {
    return {
      label: "Excelente",
      description:
        "Señal muy fuerte. El nodo está cerca del gateway o con muy buena línea de vista.",
      badgeClass: "bg-emerald-100 text-emerald-700",
      dotClass: "bg-emerald-500",
    };
  }

  if (rssi > -95) {
    return {
      label: "Buena",
      description: "Señal sólida, con margen de sobra para no perder datos.",
      badgeClass: "bg-green-100 text-green-700",
      dotClass: "bg-green-500",
    };
  }

  if (rssi > -110) {
    return {
      label: "Regular",
      description:
        "El enlace funciona, pero con menos margen. Si empeora, podría empezar a perder lecturas.",
      badgeClass: "bg-amber-100 text-amber-700",
      dotClass: "bg-amber-500",
    };
  }

  if (rssi > -120) {
    return {
      label: "Débil",
      description:
        "Señal justa. Es esperable alguna pérdida de datos, sobre todo si hay cultivo alto interpuesto o mal tiempo.",
      badgeClass: "bg-orange-100 text-orange-700",
      dotClass: "bg-orange-500",
    };
  }

  return {
    label: "Muy débil",
    description:
      "Señal al límite de lo que el módulo puede recibir. Conviene acercar el nodo al gateway o reubicar alguno de los dos.",
    badgeClass: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
  };
};

/*
 * =========================================================
 * COBERTURA ESTIMADA (radio en metros desde el N01)
 * =========================================================
 * Un solo valor "adecuado" de referencia para dibujar el
 * círculo en el mapa, pensado para condición intermedia
 * (cultivos bajos, rastrojo, algo de ondulación de terreno).
 * No es ni el mejor ni el peor caso — es un punto medio fácil
 * de ajustar a mano acá si hace falta corregirlo con datos de
 * campo propios (se achica bastante con cultivo alto
 * interpuesto, tipo maíz o sorgo adultos).
 */

export const LORA_COVERAGE_RADIUS_M = 700;