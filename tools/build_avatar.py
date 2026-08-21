#!/usr/bin/env python3
"""Square profile pictures for the Acme Meridian mailbox.

Google crops avatars to a circle, so everything is composed inside the inscribed
circle with margin to spare. Two variants: with the wordmark, and mark-only.
"""
import os, shutil, subprocess
from PIL import Image, ImageDraw

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT    = os.path.join(ROOT, "downloads")
BUILD  = os.path.join(ROOT, "tools", "_avatar")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
S      = 1024

MONO = ('<g stroke="#fff" fill="none" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="M18 88V12l52 36 52-36v76" stroke-width="9"/>'
        '<path d="M42 88l28-40 28 40" stroke-width="9"/>'
        '<path d="M53 73h34" stroke-width="7" stroke-linejoin="miter"/></g>')


def mark(w):
    return (f'<svg viewBox="12 6 116 88" style="width:{w}px;height:{w*88/116:.1f}px">'
            f'{MONO}</svg>')


def html(body):
    return f"""<meta charset="utf-8"><style>
html,body{{margin:0;background:#0b0b0b}}
.a{{width:{S}px;height:{S}px;background:#0b0b0b;display:flex;flex-direction:column;
   align-items:center;justify-content:center;gap:72px}}
.w{{font-family:Optima,'Optima nova',Cinzel,Georgia,serif;color:#fff;font-size:68px;
   text-transform:uppercase;letter-spacing:.17em;padding-left:.17em;line-height:1;
   white-space:nowrap}}
</style><div class="a">{body}</div>"""


def shoot(body, name):
    p = os.path.join(BUILD, "a.html"); open(p, "w").write(html(body))
    out = os.path.join(OUT, name)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    f"--window-size={S},{S}", f"--screenshot={out}", "file://" + p],
                   check=True, capture_output=True)
    Image.open(out).convert("RGB").save(out, optimize=True)
    return out


def circle_check(path):
    """Fail loudly if any ink falls outside the circle Google will crop to."""
    im = Image.open(path).convert("L")
    px = im.load()
    r = S / 2
    worst = 0.0
    for y in range(0, S, 2):
        for x in range(0, S, 2):
            if px[x, y] > 60:                       # ink
                d = (((x - r) ** 2 + (y - r) ** 2) ** 0.5) / r
                worst = max(worst, d)
    return worst


def main():
    shutil.rmtree(BUILD, ignore_errors=True); os.makedirs(BUILD)
    a = shoot(mark(410) + '<div class="w">Acme Meridian</div>',
              "acme-meridian-avatar.png")
    b = shoot(mark(600), "acme-meridian-avatar-mark.png")
    for f in (a, b):
        w = circle_check(f)
        print(f"  {os.path.basename(f)}: encre la plus éloignée = {w*100:.0f}% du rayon",
              "OK" if w < 0.94 else "!! DÉBORDE DU CERCLE")


if __name__ == "__main__":
    main()
