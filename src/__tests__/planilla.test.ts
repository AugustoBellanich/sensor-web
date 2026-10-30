import { unzipSync, strFromU8 } from "fflate";
import { describe, expect, it } from "vitest";

import { hojasLecturas, type FilaB01 } from "@/datos/csv";
import { letraColumna, libroXlsx, serieArg } from "@/datos/planilla";

describe("planilla .xlsx", () => {
  it("letras de columna", () => {
    expect([0, 25, 26, 27, 701].map(letraColumna)).toEqual([
      "A",
      "Z",
      "AA",
      "AB",
      "ZZ",
    ]);
  });

  it("la fecha queda en hora argentina como número de serie", () => {
    // 2026-10-01 12:00 en Argentina = 15:00 UTC; 01/10/2026 es el día 46296.
    expect(serieArg("2026-10-01T15:00:00Z")).toBeCloseTo(46296.5, 6);
  });

  it("arma un libro con números como números, fecha con formato y texto escapado", () => {
    const libro = libroXlsx([
      {
        nombre: "Lecturas",
        columnas: ["Fecha", "Valor", "Nota"],
        filas: [
          [new Date("2026-10-01T15:00:00Z"), 12.5, "a & <b>"],
          [null, null, null],
        ],
      },
    ]);
    const z = unzipSync(libro);
    expect(Object.keys(z)).toEqual(
      expect.arrayContaining([
        "[Content_Types].xml",
        "xl/workbook.xml",
        "xl/styles.xml",
        "xl/worksheets/sheet1.xml",
      ]),
    );
    const hoja = strFromU8(z["xl/worksheets/sheet1.xml"]);
    expect(hoja).toContain('<c r="A2" s="2"><v>46296.5</v></c>');
    expect(hoja).toContain('<c r="B2"><v>12.5</v></c>');
    expect(hoja).toContain("a &amp; &lt;b&gt;");
    expect(hoja).toContain('<row r="3"></row>');
  });

  it("hojas del B01 con profundidades e información", () => {
    const fila: FilaB01 = {
      timestamp: "2026-10-01T15:00:00Z",
      sensor_id: "B01-AAAAAA",
      e1_mv: 900,
      e2_mv: 950,
      e3_mv: 1000,
      e1_hv: 17.5,
      e2_hv: 14,
      e3_hv: 10.8,
      e1_hg: null,
      e2_hg: null,
      e3_hg: null,
      soil_temp: 19.2,
      battery_pct: 80,
      battery_mv: 3950,
      qc_flags: null,
    };
    const [lecturas, info] = hojasLecturas(
      {
        name: "Almendro inicio",
        establishment_name: "EEA",
        plot_name: "Lote",
        device: { id: "B01-AAAAAA" },
        electrodes: [
          { index: 1, depth: 20, texture: "Franco", calibrated: true },
        ],
      },
      "B01",
      [fila],
      [],
      { 1: 20, 2: 40, 3: 60 },
      Date.parse("2026-10-01T03:00:00Z"),
      Date.parse("2026-10-02T03:00:00Z"),
    );
    expect(lecturas.columnas[2]).toBe("E1 20 cm señal (mV)");
    expect(lecturas.filas[0][2]).toBe(900);
    expect(lecturas.filas[0][14]).toBeNull();
    expect(info.filas.find((f) => f[0] === "Suelo")?.[1]).toBe(
      "Franco, calibrado",
    );
  });
});
