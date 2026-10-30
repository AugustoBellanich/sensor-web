import { describe, expect, it } from "vitest";

import { csvB01, csvC01, nombreArchivo } from "@/datos/csv";
import { calidadWifi, duracion } from "@/datos/estado";
import {
  banda,
  elegirIntervalo,
  etiquetaCorta,
  extremos,
  fechaHoraArg,
  marcasEje,
  marcasTiempo,
  masCercano,
  rango,
  textoIntervalo,
  trazo,
} from "@/datos/grafico";

const H = 3600e3;
const ident = (v: number) => v;

describe("fechas en hora argentina", () => {
  it("convierte a UTC-3 sin depender del teléfono", () => {
    expect(fechaHoraArg("2026-09-01T03:10:00Z")).toBe("2026-09-01 00:10:00");
    expect(etiquetaCorta(Date.parse("2026-09-01T02:30:00Z"), true)).toBe("31/08 23:30");
    expect(etiquetaCorta(Date.parse("2026-09-01T03:00:00Z"), false)).toBe("01/09");
  });
});

describe("períodos e intervalos", () => {
  it("elige el intervalo más corto que no pasa de 300 puntos", () => {
    expect(elegirIntervalo(24 * H)).toBe(600);
    expect(elegirIntervalo(7 * 24 * H)).toBe(3600);
    expect(elegirIntervalo(30 * 24 * H)).toBe(3 * 3600);
    expect(elegirIntervalo(90 * 24 * H)).toBe(12 * 3600);
    expect(elegirIntervalo(5 * 365 * 24 * H)).toBe(7 * 86400);
  });
  it("arma el rango del período", () => {
    const ahora = Date.parse("2026-10-04T12:00:00Z");
    expect(rango("7d", ahora)).toEqual({ desde: ahora - 7 * 24 * H, hasta: ahora, intervalo: 3600 });
    expect(rango("todo", ahora, "2026-09-01T03:00:00Z")?.desde).toBe(Date.parse("2026-09-01T03:00:00Z"));
    expect(rango("todo", ahora, null)).toBeNull();
  });
  it("nombra el intervalo", () => {
    expect(textoIntervalo(600)).toBe("10 min");
    expect(textoIntervalo(3600)).toBe("1 hora");
    expect(textoIntervalo(10800)).toBe("3 horas");
    expect(textoIntervalo(86400)).toBe("1 día");
  });
});

describe("escalas", () => {
  it("marcas lindas que cubren el rango", () => {
    expect(marcasEje(803, 1022)).toEqual([800, 850, 900, 950, 1000, 1050]);
    expect(marcasEje(14.2, 23.9)).toEqual([14, 16, 18, 20, 22, 24]);
    const iguales = marcasEje(50, 50);
    expect(iguales[0]).toBeLessThan(50);
    expect(iguales[iguales.length - 1]).toBeGreaterThan(50);
  });
  it("extremos sin nulos", () => {
    expect(extremos([3, null, 1], [null, 7])).toEqual({ min: 1, max: 7 });
    expect(extremos([null], [])).toBeNull();
  });
  it("marcas de tiempo a medianoche argentina", () => {
    const desde = Date.parse("2026-09-27T15:00:00Z");
    const hasta = Date.parse("2026-10-04T15:00:00Z");
    const m = marcasTiempo(desde, hasta, 4);
    expect(m.length).toBeGreaterThan(0);
    for (const t of m) expect(fechaHoraArg(t).slice(11)).toBe("00:00:00");
  });
});

describe("trazos", () => {
  it("corta la línea donde falta un valor o hay un hueco largo", () => {
    const t = [0, 10, 20, 30, 100];
    expect(trazo(t, [1, 2, null, 4, 5], ident, ident, 15)).toBe("M0.0 1.0 L10.0 2.0 M30.0 4.0 M100.0 5.0");
  });
  it("banda mínimo–máximo por tramo continuo", () => {
    const d = banda([0, 10, 20], [1, 2, 3], [4, 5, 6], ident, ident, 15);
    expect(d).toBe("M0.0 4.0 L10.0 5.0 L20.0 6.0 L20.0 3.0 L10.0 2.0 L0.0 1.0 Z");
    expect(banda([0, 100], [1, 2], [3, 4], ident, ident, 15)).toBe(""); // dos puntos sueltos: sin área
  });
  it("punto más cercano", () => {
    expect(masCercano([0, 10, 20, 30], 14)).toBe(1);
    expect(masCercano([0, 10, 20, 30], 16)).toBe(2);
    expect(masCercano([0, 10], 99)).toBe(1);
    expect(masCercano([], 5)).toBe(-1);
  });
});

describe("CSV", () => {
  const fila = {
    timestamp: "2026-09-01T03:10:00+00:00",
    sensor_id: "B01-24E4F6",
    e1_mv: 1008,
    e2_mv: 843,
    e3_mv: 0,
    e1_hv: null,
    e2_hv: null,
    e3_hv: null,
    e1_hg: null,
    e2_hg: null,
    e3_hg: null,
    soil_temp: 18.56,
    battery_pct: 95,
    battery_mv: null,
    qc_flags: ["e3_sin_medicion", "e1_sin_calibracion"],
  };
  it("B01: encabezado con profundidades, crudos tal cual y control de calidad", () => {
    const csv = csvB01([fila], { 1: 20, 2: 40, 3: 60 });
    expect(csv.startsWith("﻿")).toBe(true);
    const [enc, l1] = csv.slice(1).trim().split("\r\n");
    expect(enc.split(",").slice(0, 6)).toEqual(["fecha_hora_arg", "fecha_hora_utc", "equipo", "e1_20cm_mv", "e2_40cm_mv", "e3_60cm_mv"]);
    expect(l1).toBe("2026-09-01 00:10:00,2026-09-01T03:10:00.000Z,B01-24E4F6,1008,843,0,,,,,,,18.56,95,,e3_sin_medicion|e1_sin_calibracion");
  });
  it("C01 y comillas cuando hace falta", () => {
    const csv = csvC01([{ timestamp: "2026-09-01T03:00:00Z", sensor_id: "C01-X", air_temp: 12.5, humidity: 50, battery_pct: null, battery_mv: null, qc_flags: ["a,b"] }]);
    expect(csv.trim().split("\r\n")[1]).toBe('2026-09-01 00:00:00,2026-09-01T03:00:00.000Z,C01-X,12.5,50,,,"a,b"');
  });
  it("nombre del archivo sin acentos", () => {
    expect(nombreArchivo("Dirección (gateway)", Date.parse("2026-09-01T03:00:00Z"), Date.parse("2026-10-04T12:00:00Z"))).toBe(
      "direccion-gateway_2026-09-01_2026-10-04.csv",
    );
  });
});

describe("gateway", () => {
  it("señal WiFi en palabras", () => {
    expect(calidadWifi(-52)).toBe("buena");
    expect(calidadWifi(-65)).toBe("aceptable");
    expect(calidadWifi(-78)).toBe("débil");
    expect(calidadWifi(-90)).toBe("muy débil");
    expect(calidadWifi(null)).toBeNull();
  });
  it("duración legible", () => {
    expect(duracion(42605)).toBe("11 h 50 min");
    expect(duracion(3 * 86400 + 4 * 3600)).toBe("3 d 4 h");
    expect(duracion(45)).toBe("45 s");
    expect(duracion(null)).toBe("—");
  });
});

describe("fechaHoraArg con fecha sola", () => {
  it("no corre el día", () => {
    expect(fechaHoraArg("2026-08-01")).toBe("2026-08-01 00:00:00");
  });
});
