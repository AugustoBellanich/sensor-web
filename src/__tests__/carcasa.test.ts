import { describe, expect, it } from "vitest";

import { textoCarcasa } from "@/datos/equipos";

describe("textoCarcasa", () => {
  it("coma decimal, un decimal y la antigüedad", () => {
    expect(textoCarcasa({ temperatura: 28.44, momento: "x" }, () => "hace 3 h")).toBe("28,4 °C · hace 3 h");
    expect(textoCarcasa({ temperatura: -2, momento: "x" }, () => "recién")).toBe("-2,0 °C · recién");
  });
});
