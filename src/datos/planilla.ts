// Planilla .xlsx de las lecturas de un sitio (I17): se abre directo en Excel, Google Sheets o
// LibreOffice, con las fechas como fechas y los números como números (no texto). Mismas columnas
// que el CSV (csv.ts); una segunda hoja dice de dónde salen los datos. El archivo se arma acá
// (XML de Office Open dentro de un zip, con fflate): funciones puras, se prueban con vitest.
import { strToU8, zipSync } from "fflate";

export type Celda = string | number | Date | null | undefined;
export type Hoja = {
  nombre: string;
  columnas: string[];
  filas: Celda[][];
  anchos?: number[];
};

const xml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Caracteres de control que XML no admite.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

/** "A", "B", …, "Z", "AA"… */
export function letraColumna(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26))
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/**
 * Fecha y hora argentina como número de serie de la planilla (días desde 1899-12-30). La planilla no
 * tiene zona horaria: se guarda la hora de Argentina (UTC−3, sin horario de verano), la que se lee.
 */
export function serieArg(t: Date | number | string): number {
  const ms =
    (t instanceof Date
      ? t.getTime()
      : typeof t === "string"
        ? Date.parse(t)
        : t) -
    3 * 3600e3;
  return ms / 86400e3 + 25569;
}

function celdaXml(v: Celda, ref: string, encabezado: boolean): string {
  if (v == null || (typeof v === "number" && !Number.isFinite(v))) return "";
  if (v instanceof Date) return `<c r="${ref}" s="2"><v>${serieArg(v)}</v></c>`;
  if (typeof v === "number") return `<c r="${ref}"><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"${encabezado ? ' s="1"' : ""}><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}

function hojaXml(h: Hoja): string {
  const filas = [h.columnas, ...h.filas].map(
    (f, i) =>
      `<row r="${i + 1}">${f.map((v, j) => celdaXml(v, `${letraColumna(j)}${i + 1}`, i === 0)).join("")}</row>`,
  );
  const anchos = h.columnas
    .map(
      (c, j) =>
        `<col min="${j + 1}" max="${j + 1}" width="${h.anchos?.[j] ?? Math.max(10, Math.min(40, c.length + 2))}" customWidth="1"/>`,
    )
    .join("");
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${anchos}</cols><sheetData>${filas.join("")}</sheetData>` +
    (h.filas.length
      ? `<autoFilter ref="A1:${letraColumna(h.columnas.length - 1)}${h.filas.length + 1}"/>`
      : "") +
    "</worksheet>"
  );
}

const ESTILOS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/></numFmts>' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

/** El libro .xlsx con sus hojas, listo para bajar. */
export function libroXlsx(hojas: Hoja[]): Uint8Array {
  const n = hojas.length;
  const archivos: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
        hojas
          .map(
            (_, i) =>
              `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
          )
          .join("") +
        "</Types>",
    ),
    "_rels/.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        "</Relationships>",
    ),
    "xl/workbook.xml": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        `<sheets>${hojas.map((h, i) => `<sheet name="${xml(h.nombre.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets>` +
        (hojas[0]?.filas.length
          ? `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${xml(hojas[0].nombre.slice(0, 31))}'!$A$1:$${letraColumna(hojas[0].columnas.length - 1)}$${hojas[0].filas.length + 1}</definedName></definedNames>`
          : "") +
        "</workbook>",
    ),
    "xl/_rels/workbook.xml.rels": strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        hojas
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join("") +
        `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        "</Relationships>",
    ),
    "xl/styles.xml": strToU8(ESTILOS),
  };
  hojas.forEach(
    (h, i) =>
      (archivos[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(hojaXml(h))),
  );
  return zipSync(archivos, { level: 6 });
}
