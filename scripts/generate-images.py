"""
Generates the site's raster brand assets from the "Heritage Passport" stamp
mark used throughout the design (see design plan in conversation).
Committed as the programmatic source per the launch-hygiene requirement.

Outputs:
  assets/img/apple-touch-icon.png  180x180, opaque
  assets/img/og-image.png          1200x630

Run: python3 scripts/generate-images.py
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(ROOT, "assets", "img")
os.makedirs(OUT_DIR, exist_ok=True)

INK = (31, 30, 29)
CREAM = (250, 249, 245)
BG = (240, 238, 230)
ACCENT = (193, 95, 60)

HELVETICA = "/System/Library/Fonts/HelveticaNeue.ttc"
HELVETICA_BOLD_INDEX = 1  # HelveticaNeue.ttc face index for Bold varies; verified below at runtime


def font(size, bold=False):
    try:
        return ImageFont.truetype(HELVETICA, size, index=(1 if bold else 0))
    except Exception:
        return ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf", size)


def draw_spire(draw, cx, cy, scale, color):
    """A simple three-tier shikhara/gopuram silhouette, the site's category mark."""
    tiers = [
        (0.55, 0.08),
        (0.40, 0.08),
        (0.26, 0.08),
    ]
    y = cy + scale * 0.42
    for width_frac, height_frac in tiers:
        w = scale * width_frac
        h = scale * height_frac
        draw.polygon(
            [(cx - w / 2, y), (cx + w / 2, y), (cx, y - h)],
            fill=color,
        )
        y -= h * 0.85
    # finial
    draw.polygon(
        [(cx - scale * 0.05, y), (cx + scale * 0.05, y), (cx, y - scale * 0.22)],
        fill=color,
    )
    # plinth
    plinth_w = scale * 0.68
    plinth_h = scale * 0.07
    draw.rectangle(
        [cx - plinth_w / 2, cy + scale * 0.42, cx + plinth_w / 2, cy + scale * 0.42 + plinth_h],
        fill=color,
    )


def draw_stamp_ring(draw, cx, cy, r, color, tick_count=40, tick_len=10, width=4):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=color, width=width)
    inner_r = r - tick_len - 8
    draw.ellipse([cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r], outline=color, width=2)
    for i in range(tick_count):
        angle = (2 * math.pi / tick_count) * i
        x1 = cx + math.cos(angle) * (r + 4)
        y1 = cy + math.sin(angle) * (r + 4)
        x2 = cx + math.cos(angle) * (r + 4 + tick_len)
        y2 = cy + math.sin(angle) * (r + 4 + tick_len)
        draw.line([(x1, y1), (x2, y2)], fill=color, width=3)


def draw_curved_text(base_img, text, cx, cy, radius, fnt, color, start_deg, end_deg):
    """Draws `text` along an arc from start_deg to end_deg (degrees, 0=up, clockwise)."""
    total_span = end_deg - start_deg
    n = len(text)
    if n == 0:
        return
    step = total_span / max(n - 1, 1)
    for i, ch in enumerate(text):
        angle_deg = start_deg + step * i
        angle_rad = math.radians(angle_deg - 90)
        x = cx + radius * math.cos(angle_rad)
        y = cy + radius * math.sin(angle_rad)
        ch_img = Image.new("RGBA", (60, 60), (0, 0, 0, 0))
        ch_draw = ImageDraw.Draw(ch_img)
        ch_draw.text((30, 30), ch, font=fnt, fill=color, anchor="mm")
        rotated = ch_img.rotate(-angle_deg, resample=Image.BICUBIC, center=(30, 30))
        base_img.alpha_composite(rotated, (int(x - 30), int(y - 30)))


def make_touch_icon():
    size = 180
    img = Image.new("RGB", (size, size), ACCENT)
    draw = ImageDraw.Draw(img)
    cx, cy = size / 2, size / 2
    draw_stamp_ring(draw, cx, cy, r=68, color=CREAM, tick_count=28, tick_len=6, width=4)
    draw_spire(draw, cx, cy + 4, scale=62, color=CREAM)
    img.save(os.path.join(OUT_DIR, "apple-touch-icon.png"))
    print("Wrote apple-touch-icon.png (180x180)")


def make_og_image():
    w, h = 1200, 630
    img = Image.new("RGBA", (w, h), BG + (255,))
    draw = ImageDraw.Draw(img)

    # hairline border, matches site's design language
    draw.rectangle([24, 24, w - 25, h - 25], outline=INK, width=2)

    cx, cy = 300, 315
    r = 150
    draw_stamp_ring(draw, cx, cy, r=r, color=ACCENT, tick_count=48, tick_len=9, width=5)
    draw_spire(draw, cx, cy + 10, scale=150, color=ACCENT)

    arc_font = font(34, bold=True)
    draw_curved_text(img, "BHARAT HERITAGE TRAIL", cx, cy, r - 34, arc_font, INK, start_deg=-150, end_deg=150)

    title_font = font(56, bold=True)
    sub_font = font(27, bold=False)
    small_font = font(24, bold=False)

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

    draw.text((w - 40, h - 40), "bharatheritagetrail", font=small_font, fill=(107, 104, 98), anchor="rs")

    img.convert("RGB").save(os.path.join(OUT_DIR, "og-image.png"))
    print(f"Wrote og-image.png ({w}x{h})")


if __name__ == "__main__":
    make_touch_icon()
    make_og_image()
