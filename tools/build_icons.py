#!/usr/bin/env python3
"""Rasterise the AM monogram into every icon the site needs, plus the OG cover.

Chrome renders the SVG so the shapes stay identical to the card artwork; PIL
only assembles the multi-resolution .ico at the end.
"""
import os, shutil, subprocess
from PIL import Image

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
BUILD  = os.path.join(ROOT, "tools", "_icons")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

MONOGRAM = ('<g stroke="#fff" fill="none" stroke-linecap="round" stroke-linejoin="round">'
            '<path d="M18 88V12l52 36 52-36v76" stroke-width="9"/>'
            '<path d="M42 88l28-40 28 40" stroke-width="9"/>'
            '<path d="M53 73h34" stroke-width="7" stroke-linejoin="miter"/></g>')

# monogram box inside the 213.33 icon square, matching the card exactly
MARK = f'<g transform="translate(37.14,56.19)">{MONOGRAM}</g>'


def shoot(html, out, w, h, transparent=True):
    p = os.path.join(BUILD, "s.html")
    open(p, "w").write(html)
    cmd = [CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
           f"--window-size={w},{h}", f"--screenshot={out}"]
    if transparent:
        cmd.append("--default-background-color=00000000")
    cmd.append("file://" + p)
    subprocess.run(cmd, check=True, capture_output=True)


def icon_html(size, squircle=True, bg="#151515", pad=0.0):
    """pad shrinks the mark inside a full-bleed square (for apple-touch-icon)."""
    rx = 23.03 if squircle else 0
    scale = 1 - 2 * pad
    return f"""<meta charset="utf-8"><style>html,body{{margin:0;background:transparent}}
svg{{display:block;width:{size}px;height:{size}px}}</style>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 213.33 213.33">
<rect width="213.33" height="213.33" rx="{rx}" fill="{bg}"/>
<g transform="translate({213.33*(1-scale)/2},{213.33*(1-scale)/2}) scale({scale})">{MARK}</g>
</svg>"""


def main():
    shutil.rmtree(BUILD, ignore_errors=True)
    os.makedirs(BUILD)

    # favicon.svg — the squircle mark, shipped as a real file (not a data: URI)
    open(os.path.join(ASSETS, "..", "favicon.svg"), "w").write(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 213.33 213.33">'
        '<rect width="213.33" height="213.33" rx="23.03" fill="#151515"/>'
        + MARK + "</svg>")

    png = {}
    for s in (16, 32, 48, 96, 192, 512):
        out = os.path.join(BUILD, f"i{s}.png")
        shoot(icon_html(s), out, s, s)
        png[s] = out

    for s, name in ((16, "favicon-16.png"), (32, "favicon-32.png"),
                    (48, "favicon-48.png"), (96, "favicon-96.png"),
                    (192, "icon-192.png"), (512, "icon-512.png")):
        Image.open(png[s]).save(os.path.join(ASSETS, name))
    Image.open(png[512]).convert("RGB").save(os.path.join(ASSETS, "logo.png"))

    # apple-touch-icon: opaque, square, iOS masks it itself
    out = os.path.join(BUILD, "apple.png")
    shoot(icon_html(180, squircle=False, bg="#0b0b0b", pad=0.13), out, 180, 180,
          transparent=False)
    Image.open(out).convert("RGB").save(os.path.join(ASSETS, "apple-touch-icon.png"))

    # multi-resolution .ico
    Image.open(png[48]).save(os.path.join(ROOT, "favicon.ico"),
                             sizes=[(16, 16), (32, 32), (48, 48)])

    # ---------------------------------------------------------------- OG cover
    fonts = os.path.join(ASSETS, "fonts")
    og = f"""<meta charset="utf-8"><style>
@font-face{{font-family:Cinzel;src:url('{fonts}/cinzel-var.woff2')format('woff2');font-weight:100 900}}
@font-face{{font-family:InterV;src:url('{fonts}/inter-var.woff2')format('woff2');font-weight:100 900}}
html,body{{margin:0}}
.w{{width:1200px;height:630px;background:#0b0b0b;display:flex;flex-direction:column;
   align-items:center;justify-content:center;gap:38px;font-family:InterV,sans-serif}}
svg{{width:132px;height:132px}}
h1{{font-family:Optima,Cinzel,serif;font-weight:400;font-size:76px;letter-spacing:.17em;
   color:#fff;margin:0;padding-left:.17em}}
.r{{width:64px;height:1px;background:rgba(255,255,255,.28)}}
p{{font-size:19px;letter-spacing:.42em;color:rgba(255,255,255,.5);margin:0;padding-left:.42em;
  text-transform:uppercase;font-weight:300}}
</style><div class="w">
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 213.33 213.33">
<rect width="213.33" height="213.33" rx="23.03" fill="#151515"/>{MARK}</svg>
<h1>ACME MERIDIAN</h1><div class="r"></div>
<p>Software &middot; Worldwide</p></div>"""
    out = os.path.join(BUILD, "og.png")
    shoot(og, out, 1200, 630, transparent=False)
    Image.open(out).convert("RGB").save(os.path.join(ASSETS, "og-cover.png"),
                                        quality=95, optimize=True)
    print("icons built")


if __name__ == "__main__":
    main()
