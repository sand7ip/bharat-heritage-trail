"""
Generates the site's raster brand assets from the one master logo
(assets/img/logo.png -- the user-provided mark, background already keyed
to transparent) so every place the mark appears uses the exact same art.

Outputs:
  assets/favicon.png               64x64, transparent
  assets/img/apple-touch-icon.png  180x180, opaque (Apple requires no
                                    transparency)
  assets/img/og-image.png          1200x630

Run: python3 scripts/generate-images.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, "assets")
OUT_DIR = os.path.join(ASSETS, "img")
os.makedirs(OUT_DIR, exist_ok=True)

INK = (31, 30, 29)
CREAM = (250, 249, 245)
BG = (240, 238, 230)
ACCENT = (193, 95, 60)

LOGO_PATH = os.path.join(ASSETS, "img", "logo.png")

HELVETICA = "/System/Library/Fonts/HelveticaNeue.ttc"


def font(size, bold=False):
    try:
        return ImageFont.truetype(HELVETICA, size, index=(1 if bold else 0))
    except Exception:
        return ImageFont.truetype(
            "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
            size,
        )


def load_logo(size):
    logo = Image.open(LOGO_PATH).convert("RGBA")
    return logo.resize((size, size), Image.LANCZOS)


def make_favicon():
    size = 64
    logo = load_logo(size)
    logo.save(os.path.join(ASSETS, "favicon.png"))
    print("Wrote favicon.png (64x64)")


def make_touch_icon():
    size = 180
    img = Image.new("RGBA", (size, size), CREAM + (255,))
    logo = load_logo(size)
    img.alpha_composite(logo)
    img.convert("RGB").save(os.path.join(OUT_DIR, "apple-touch-icon.png"))
    print("Wrote apple-touch-icon.png (180x180)")


def make_og_image():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), BG + (255,))
    draw = ImageDraw.Draw(img)

    # hairline border, matches site's design language
    draw.rectangle([24, 24, w - 25, h - 25], outline=INK, width=2)

    logo_size = 200
    logo = load_logo(logo_size)
    logo_x, logo_y = 90, 115
    img.alpha_composite(logo, (logo_x, logo_y))

    draw = ImageDraw.Draw(img)
    title_font = font(56, bold=True)
    sub_font = font(27, bold=False)

    tx = 560
    max_right = w - 56
    for line in ["Track the heritage", "sites you've", "actually seen."]:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        assert tx + (bbox[2] - bbox[0]) <= max_right, f"line too wide: {line!r}"
    draw.text((tx, 195), "Track the heritage", font=title_font, fill=INK)
    draw.text((tx, 270), "sites you've", font=title_font, fill=INK)
    draw.text((tx, 345), "actually seen.", font=title_font, fill=INK)

    sub_lines = ["45 UNESCO World Heritage Sites", "12 Jyotirlingas · 4 Char Dham"]
    for i, line in enumerate(sub_lines):
        bbox = draw.textbbox((0, 0), line, font=sub_font)
        assert tx + (bbox[2] - bbox[0]) <= max_right, f"subline too wide: {line!r}"
        draw.text((tx, 445 + i * 40), line, font=sub_font, fill=(107, 104, 98))

    small_font = font(24, bold=False)
    draw.text((w - 40, h - 40), "bharatheritagetrail", font=small_font, fill=(107, 104, 98), anchor="rs")

    img.convert("RGB").save(os.path.join(OUT_DIR, "og-image.png"))
    print(f"Wrote og-image.png ({w}x{h})")


if __name__ == "__main__":
    make_favicon()
    make_touch_icon()
    make_og_image()
