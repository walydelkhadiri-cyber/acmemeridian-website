#!/usr/bin/env python3
"""Vector logo sheet for Acme Meridian, generated from the same monogram geometry
as the business card. Five pages: the two lock-ups, the mark on its own, and the
reversed variants."""
import os, shutil, subprocess

ROOT   = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT    = os.path.join(ROOT, "downloads", "acme-meridian-logo.pdf")
BUILD  = os.path.join(ROOT, "tools", "_logo")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

WORDMARK = "Optima, 'Optima nova', Cinzel, Georgia, serif"
LABEL    = "'Helvetica Neue', Helvetica, Arial, sans-serif"


def mono(stroke):
    return (f'<g stroke="{stroke}" fill="none" stroke-linecap="round" stroke-linejoin="round">'
            '<path d="M18 88V12l52 36 52-36v76" stroke-width="9"/>'
            '<path d="M42 88l28-40 28 40" stroke-width="9"/>'
            '<path d="M53 73h34" stroke-width="7" stroke-linejoin="miter"/></g>')


def squircle(bg, stroke, size):
    """The mark inside its container, at the card's exact 10.8% corner radius."""
    return (f'<svg viewBox="0 0 213.33 213.33" style="width:{size}mm;height:{size}mm">'
            f'<rect width="213.33" height="213.33" rx="23.03" fill="{bg}"/>'
            f'<g transform="translate(37.14,56.19)">{mono(stroke)}</g></svg>')


def bare(stroke, size):
    return (f'<svg viewBox="12 6 116 88" style="width:{size}mm;height:{size*88/116:.2f}mm">'
            f'{mono(stroke)}</svg>')


def page(bg, fg, body, label):
    return f"""<section style="background:{bg}">
  <div class="art">{body}</div>
  <p class="lbl" style="color:{fg}">{label}</p>
</section>"""


def main():
    shutil.rmtree(BUILD, ignore_errors=True); os.makedirs(BUILD)
    DIM = "rgba(11,11,11,.45)"; DIMW = "rgba(255,255,255,.45)"

    lockup_light = (f'<div class="lock">{squircle("#151515", "#ffffff", 25)}'
                    f'<span style="color:#0b0b0b">Acme Meridian</span></div>')
    lockup_dark  = (f'<div class="lock">{squircle("#ffffff", "#0b0b0b", 25)}'
                    f'<span style="color:#ffffff">Acme Meridian</span></div>')

    pages = [
        page("#ffffff", DIM,  lockup_light,               "Primary lock-up &middot; on light"),
        page("#0b0b0b", DIMW, lockup_dark,                "Primary lock-up &middot; reversed"),
        page("#ffffff", DIM,  squircle("#151515", "#ffffff", 78), "App mark &middot; on light"),
        page("#ffffff", DIM,  bare("#0b0b0b", 105),       "Monogram &middot; black"),
        page("#0b0b0b", DIMW, bare("#ffffff", 105),       "Monogram &middot; white"),
    ]

    html = f"""<meta charset="utf-8"><style>
@page {{ size: 297mm 210mm; margin: 0 }}
html,body {{ margin:0 }}
section {{ width:297mm; height:210mm; page-break-after:always; position:relative;
          display:flex; align-items:center; justify-content:center; }}
section:last-child {{ page-break-after:auto }}
.art {{ display:flex; align-items:center; justify-content:center }}
.lock {{ display:flex; align-items:center; gap:9mm }}
.lock span {{ font-family:{WORDMARK}; font-size:17mm; text-transform:uppercase;
             letter-spacing:.17em; padding-left:.17em; white-space:nowrap; line-height:1 }}
.lbl {{ position:absolute; left:0; right:0; bottom:14mm; margin:0; text-align:center;
       font-family:{LABEL}; font-size:2.6mm; text-transform:uppercase;
       letter-spacing:.62em; padding-left:.62em }}
</style>{''.join(pages)}"""

    p = os.path.join(BUILD, "logo.html"); open(p, "w").write(html)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--no-pdf-header-footer",
                    "--print-to-pdf=" + OUT, "file://" + p], check=True, capture_output=True)
    print("built", OUT)


if __name__ == "__main__":
    main()
