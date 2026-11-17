"""
Draws the Natter app icon, Android adaptive layers, splash mark and favicon:
a white speech bubble with a marigold dot on a cobalt squircle (the same
mark as src/components/brand/Logo.jsx). Re-run after changing the mark:

    python3 scripts/make-icons.py

Needs Pillow. Writes into assets/.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

COBALT = (0x2F, 0x45, 0xD8, 255)
MARIGOLD = (0xFF, 0xC9, 0x3C, 255)
WHITE = (255, 255, 255, 255)
SIZE = 1024
SS = 4  # supersampling for smooth edges


def bubble(draw, box, fill):
    """Rounded speech bubble with a tail at the bottom left, inside box (x0, y0, x1, y1)."""
    x0, y0, x1, y1 = box
    w = x1 - x0
    body_bottom = y0 + (y1 - y0) * 0.78
    draw.rounded_rectangle((x0, y0, x1, body_bottom), radius=w * 0.22, fill=fill)
    tail = [
        (x0 + w * 0.16, body_bottom - w * 0.05),
        (x0 + w * 0.42, body_bottom - w * 0.05),
        (x0 + w * 0.16, y1),
    ]
    draw.polygon(tail, fill=fill)


def mark(size, background=True, monochrome=False):
    big = size * SS
    canvas = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    if background:
        draw.rounded_rectangle((0, 0, big - 1, big - 1), radius=big * 0.3125, fill=COBALT)
    ink = WHITE if (background or not monochrome) else WHITE
    unit = big / 64
    bubble(draw, (18 * unit, 16 * unit, 46 * unit, 47 * unit), ink if not monochrome else WHITE)
    dot_r = 7 * unit
    ring = 3 * unit
    cx, cy = 47 * unit, 17 * unit
    if not monochrome:
        draw.ellipse((cx - dot_r - ring, cy - dot_r - ring, cx + dot_r + ring, cy + dot_r + ring),
                     fill=COBALT if background else (0, 0, 0, 0))
        draw.ellipse((cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r), fill=MARIGOLD)
    return canvas.resize((size, size), Image.LANCZOS)


def padded(inner_ratio, **kwargs):
    """Mark scaled to inner_ratio of a transparent SIZE canvas (adaptive icon safe zone)."""
    inner = round(SIZE * inner_ratio)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.alpha_composite(mark(inner, **kwargs), ((SIZE - inner) // 2, (SIZE - inner) // 2))
    return out


def main():
    ASSETS.mkdir(exist_ok=True)
    icon = mark(SIZE)
    flat = Image.new("RGBA", (SIZE, SIZE), COBALT)  # iOS icons must be opaque
    flat.alpha_composite(icon)
    flat.convert("RGB").save(ASSETS / "icon.png")
    padded(0.62).save(ASSETS / "splash-icon.png")
    # Android adaptive: cobalt background layer, bubble + dot foreground
    Image.new("RGBA", (SIZE, SIZE), COBALT).save(ASSETS / "android-icon-background.png")
    padded(0.66, background=False).save(ASSETS / "android-icon-foreground.png")
    padded(0.66, background=False, monochrome=True).save(ASSETS / "android-icon-monochrome.png")
    mark(48).save(ASSETS / "favicon.png")
    print("icons written to", ASSETS)


if __name__ == "__main__":
    main()
