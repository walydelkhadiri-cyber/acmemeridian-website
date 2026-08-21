#!/usr/bin/env python3
"""
Rebuild the ACME MERIDIAN business card from the original PDF's exact geometry.

Every glyph position, font size, colour and rule is read straight out of the
source PDF, so unchanged text lands on the same coordinate it always had. Only
the email and web strings are new; those flow naturally from the original start x.

Outputs (into downloads/):
  acme-meridian-card.pdf        presentation sheet, rounded corners, 2 faces
  acme-meridian-card-print.pdf  press-ready, 2 pages, 3 mm bleed + crop marks
"""
import base64, os, re, shutil, subprocess, sys, zlib

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC    = "/Users/walyd/Downloads/carte business acme.pdf"
OUT    = os.path.join(ROOT, "downloads")
BUILD  = os.path.join(ROOT, "tools", "_build")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# ---------------------------------------------------------------- new details
NEW_EMAIL = "walyd@acmemeridian.com"
NEW_WEB   = "acmemeridian.com"

# card geometry, in the source PDF's own point units
CARD_W, CARD_H, RADIUS = 476.0, 272.0, 15.41
MM = 88.9 / CARD_W          # 1 card-point in millimetres
BACK_TOP = 312.8            # verso origin, measured down from the recto's top

# TT font id -> (css family, weight)
FONTS = {
    "TT1": ("Optima, 'Optima nova', Cinzel, Georgia, serif", 400),
    "TT2": ("'Helvetica Neue', Inter, Helvetica, Arial, sans-serif", 300),
    "TT3": ("'Helvetica Neue', Inter, Helvetica, Arial, sans-serif", 100),
    "TT4": ("'Helvetica Neue', Inter, Helvetica, Arial, sans-serif", 400),
}

# per-run ink, keyed by the run's baseline in the source file
INK = {
    55.31: ("#ffffff", 1.00), 69.81: ("#ffffff", 0.28),
    136.00: ("#ffffff", 0.36), 148.69: ("#ffffff", 0.92),
    149.60: ("#ffffff", 1.00), 164.11: ("#ffffff", 0.36),
    176.80: ("#ffffff", 0.92), 192.21: ("#ffffff", 0.36),
    204.91: ("#ffffff", 0.92),
    496.85: ("#0b0b0b", 1.00), 528.59: ("#0b0b0b", 0.45), 542.19: ("#0b0b0b", 0.32),
}

S = 0.2666666  # the source's inner text matrix scale


def read_runs(path):
    """Pull every positioned glyph out of the PDF and regroup it into text runs."""
    data = open(path, "rb").read()
    runs = {}
    for m in re.finditer(rb"stream\r?\n", data):
        start = m.end()
        chunk = data[start:data.find(b"endstream", start)]
        try:
            text = zlib.decompress(chunk).decode("latin-1").replace("\n", " ")
        except Exception:
            continue
        if "Tj" not in text:
            continue
        pat = r"BT ([-\d.]+) 0 0 ([-\d.]+) ([-\d.]+) ([-\d.]+) Tm /(\w+) 1 Tf \((.)\) Tj"
        for g in re.finditer(pat, text):
            size, x, y = float(g.group(1)), float(g.group(3)), float(g.group(4))
            runs.setdefault((round(y * S, 2), g.group(5), round(size * S, 2)), []).append(
                (x * S, g.group(6))
            )
    out = []
    for (y, font, size), glyphs in sorted(runs.items()):
        glyphs.sort()
        out.append({
            "y": y, "font": font, "size": size,
            "xs": [gx for gx, _ in glyphs],
            "text": "".join(c for _, c in glyphs).replace("\xe1", "·"),
        })
    return out


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def text_el(run, dy=0.0, replace=None):
    fam, weight = FONTS[run["font"]]
    fill, op = INK[run["y"]]
    y = round(run["y"] - dy, 3)
    common = (f'font-family="{fam}" font-weight="{weight}" '
              f'font-size="{run["size"]}" fill="{fill}" fill-opacity="{op}"')
    if replace is not None:
        # new string: natural metrics from the original start x
        return f'<text x="{run["xs"][0]}" y="{y}" {common}>{esc(replace)}</text>'
    xs = " ".join(str(round(v, 3)) for v in run["xs"])
    return f'<text x="{xs}" y="{y}" {common}>{esc(run["text"])}</text>'


MONOGRAM = (
    '<g stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round">'
    '<path d="M18 88V12l52 36 52-36v76" stroke-width="9"/>'
    '<path d="M42 88l28-40 28 40" stroke-width="9"/>'
    '<path d="M53 73h34" stroke-width="7" stroke-linejoin="miter"/></g>'
)

ICONS = {  # drawn in a 10x10 box
    "mail": '<rect x="0.6" y="2.1" width="8.8" height="6.2" rx="1"/>'
            '<path d="M0.9 2.6l4.1 3.1 4.1-3.1"/>',
    "phone": '<path d="M2.1 1.1c.5-.5 1.2-.4 1.6.1l1 1.3c.3.4.3 1 -.1 1.4l-.6.6a6.4 6.4 0 0 0 2.5 2.5l.6-.6c.4-.4 1-.4 1.4-.1l1.3 1c.5.4.6 1.1.1 1.6l-.6.6c-.5.5-1.2.6-1.9.4A11 11 0 0 1 1.1 3.6c-.2-.7-.1-1.4.4-1.9z"/>',
    "globe": '<circle cx="5" cy="5" r="4.3"/><path d="M0.7 5h8.6"/>'
             '<path d="M5 .7a9 9 0 0 1 0 8.6A9 9 0 0 1 5 .7z"/>',
}


def icon(kind, cx, cy, op=0.8):
    return (f'<g transform="translate({cx-5},{cy-5})" stroke="#ffffff" fill="none" '
            f'stroke-width="0.8" stroke-opacity="{op}" stroke-linecap="round" '
            f'stroke-linejoin="round">{ICONS[kind]}</g>')


def build_faces(runs, rounded):
    by_y = {(r["y"], r["font"]): r for r in runs}
    clip = ' rx="%s"' % RADIUS if rounded else ""

    # ---------------------------------------------------------------- recto
    f = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CARD_W} {CARD_H}">']
    f.append(f'<rect width="{CARD_W}" height="{CARD_H}"{clip} fill="#0b0b0b"/>')
    f.append(f'<rect x="39.8933" y="32.64" width="50.7733" height="50.7733" rx="5.48" fill="#151515"/>')
    f.append(f'<g transform="translate(48.7334,46.0134) scale(0.238)">{MONOGRAM}</g>')
    f.append(text_el(by_y[(55.31,"TT1")]))
    f.append(text_el(by_y[(69.81,"TT3")]))
    f.append('<rect x="39.6667" y="107.6667" width="396.6667" height="0.4533" fill="url(#rule)"/>')
    f.append(text_el(by_y[(149.60,"TT1")]))
    f.append(text_el(by_y[(164.11,"TT2")]))
    for label_y, val_y, kind, replace in (
        (136.00, 148.69, "mail",  NEW_EMAIL),
        (164.11, 176.80, "phone", None),
        (192.21, 204.91, "globe", NEW_WEB),
    ):
        f.append(text_el(by_y[(label_y, "TT4")]))
        f.append(text_el(by_y[(val_y, "TT2")], replace=replace))
        f.append(icon(kind, 258.9, val_y - 3.9))
    f.append('<defs><linearGradient id="rule" x1="0" x2="1">'
             '<stop offset="0" stop-color="#fff" stop-opacity="0.30"/>'
             '<stop offset="1" stop-color="#fff" stop-opacity="0.06"/>'
             '</linearGradient></defs></svg>')
    recto = "".join(f)

    # ---------------------------------------------------------------- verso
    cx = CARD_W / 2
    b = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CARD_W} {CARD_H}">']
    b.append(f'<rect width="{CARD_W}" height="{CARD_H}"{clip} fill="#ffffff"/>')
    size = 16.60 / MM                      # verso mark, measured off the source render
    top  = 10.03 / MM
    b.append(f'<rect x="{cx-size/2:.3f}" y="{top:.3f}" width="{size:.3f}" '
             f'height="{size:.3f}" rx="{size*0.108:.3f}" fill="#151515"/>')
    sc = size / 213.33
    b.append(f'<g transform="translate({cx-size/2+37.14*sc:.3f},{top+56.19*sc:.3f}) '
             f'scale({sc:.5f})">{MONOGRAM}</g>')
    b.append(text_el(by_y[(496.85,"TT1")], dy=BACK_TOP))
    b.append(f'<rect x="{cx-11.2:.2f}" y="{37.4/MM:.2f}" width="22.4" height="0.42" '
             f'fill="#0b0b0b" fill-opacity="0.28"/>')
    b.append(text_el(by_y[(528.59,"TT2")], dy=BACK_TOP))
    b.append(text_el(by_y[(542.19,"TT2")], dy=BACK_TOP))
    b.append("</svg>")
    return recto, "".join(b)


def chrome_pdf(html_path, pdf_path):
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    "--print-to-pdf=" + pdf_path, "file://" + html_path],
                   check=True, capture_output=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    shutil.rmtree(BUILD, ignore_errors=True)
    os.makedirs(BUILD)
    runs = read_runs(SRC)

    # ------------------------------------------------ presentation sheet
    recto, verso = build_faces(runs, rounded=True)
    sheet = f"""<meta charset="utf-8"><style>
@page {{ size: 215.9mm 279.4mm; margin: 0 }}
html,body {{ margin:0; background:#fff }}
.page {{ width:215.9mm; height:279.4mm; padding-top:24.0mm; box-sizing:border-box }}
.card {{ width:167.9mm; margin:0 auto 14.4mm;
        filter: drop-shadow(0 2.5mm 6mm rgba(0,0,0,.16)); }}
.card svg {{ display:block; width:100%; height:auto; border-radius:5.44mm }}
</style><div class="page">
<div class="card">{recto}</div><div class="card">{verso}</div></div>"""
    p = os.path.join(BUILD, "sheet.html"); open(p, "w").write(sheet)
    chrome_pdf(p, os.path.join(OUT, "acme-meridian-card.pdf"))

    # ------------------------------------------------ press-ready, square trim
    recto_p, verso_p = build_faces(runs, rounded=False)
    BLEED, SLUG = 3.0, 5.0
    pw, ph = 88.9 + 2 * (BLEED + SLUG), 50.8 + 2 * (BLEED + SLUG)
    marks = []
    def bar(x, y, w, h):
        return (f'<div style="position:absolute;left:{x:.3f}mm;top:{y:.3f}mm;'
                f'width:{w:.3f}mm;height:{h:.3f}mm;background:#000"></div>')
    bl, bt = SLUG, SLUG                                    # bleed box
    br, bb = SLUG + 88.9 + 2 * BLEED, SLUG + 50.8 + 2 * BLEED
    T = 0.15                                               # mark thickness
    for cx, right in ((SLUG + BLEED, False), (SLUG + BLEED + 88.9, True)):
        for cy, low in ((SLUG + BLEED, False), (SLUG + BLEED + 50.8, True)):
            # arms live entirely in the slug, never over bleed or artwork
            marks.append(bar(br if right else 0, cy - T / 2, SLUG, T))
            marks.append(bar(cx - T / 2, bb if low else 0, T, SLUG))
    marks = "".join(marks)

    def press_page(svg, bg):
        return f"""<div class="page"><div class="bleed" style="background:{bg}">{svg}</div>{marks}</div>"""

    press = f"""<meta charset="utf-8"><style>
@page {{ size: {pw}mm {ph}mm; margin: 0 }}
html,body {{ margin:0 }}
.page {{ position:relative; width:{pw}mm; height:{ph}mm; page-break-after:always;
        background:#fff; overflow:hidden }}
.page:last-child {{ page-break-after:auto }}
.bleed {{ position:absolute; left:{SLUG}mm; top:{SLUG}mm;
         width:{88.9+2*BLEED}mm; height:{50.8+2*BLEED}mm; overflow:hidden }}
.bleed svg {{ position:absolute; left:{BLEED}mm; top:{BLEED}mm;
             width:88.9mm; height:50.8mm; display:block }}
</style>{press_page(recto_p,'#0b0b0b')}{press_page(verso_p,'#ffffff')}"""
    p = os.path.join(BUILD, "press.html"); open(p, "w").write(press)
    chrome_pdf(p, os.path.join(OUT, "acme-meridian-card-print.pdf"))

    # ------------------------------------------------ svg copies for the website
    # Glyph x-positions are absolute, so the layout survives font fallback on
    # machines without Optima / Helvetica Neue.
    def webify(svg):
        return (svg.replace("Optima, 'Optima nova', Cinzel, Georgia, serif",
                            "Optima,'Optima nova','Cinzel V',Georgia,serif")
                   .replace("'Helvetica Neue', Inter, Helvetica, Arial, sans-serif",
                            "'Helvetica Neue','Inter V',Helvetica,Arial,sans-serif"))
    open(os.path.join(ROOT, "assets", "card-front.svg"), "w").write(webify(recto))
    open(os.path.join(ROOT, "assets", "card-back.svg"), "w").write(webify(verso))
    print("built:", *sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
