# Genera src/datos/munsell.ts: colores sRGB de las hojas Munsell de suelos (10R a 5Y y N), por renotación.
import colour, json, warnings
warnings.filterwarnings("ignore")
hues = ["10R","2.5YR","5YR","7.5YR","10YR","2.5Y","5Y"]
out = {}
for h in hues:
    for v in [2,2.5,3,4,5,6,7,8]:
        for c in [1,2,3,4,6,8]:
            k = f"{h} {v:g}/{c}"
            try:
                xyY = colour.munsell_colour_to_xyY(k)
                XYZ = colour.xyY_to_XYZ(xyY)
                rgb = colour.XYZ_to_sRGB(XYZ, illuminant=colour.CCS_ILLUMINANTS["CIE 1931 2 Degree Standard Observer"]["C"])
                rgb = [max(0,min(1,x)) for x in rgb]
                out[k] = "#%02x%02x%02x" % tuple(round(x*255) for x in rgb)
            except Exception:
                pass
for v in [2,2.5,3,4,5,6,7,8]:
    xyY = colour.munsell_colour_to_xyY(f"N{v:g}")
    rgb = colour.XYZ_to_sRGB(colour.xyY_to_XYZ(xyY), illuminant=colour.CCS_ILLUMINANTS["CIE 1931 2 Degree Standard Observer"]["C"])
    out[f"N {v:g}/"] = "#%02x%02x%02x" % tuple(round(max(0,min(1,x))*255) for x in rgb)
print(len(out), out["10YR 4/3"], out["7.5YR 5/4"])
lines = ",\n".join(f'  "{k}": "{v}"' for k,v in out.items())
open("src/datos/munsell.ts","w").write(
"// Generado con colour-science 0.4.7 (renotación Munsell, iluminante C → sRGB) por gen/munsell.py;\n"
"// matices de las hojas de suelo (10R a 5Y y neutros). No editar a mano.\n"
"export const MUNSELL: Record<string, string> = {\n" + lines + ",\n};\n")
