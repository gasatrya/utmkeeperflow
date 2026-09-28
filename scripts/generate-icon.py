#!/usr/bin/env python3
"""Generate the WordPress.org UTM Keeper icons (requires Pillow for development only)."""

from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".wordpress-org"
SIZE = 1024


def link_loop(width, height, color):
    """An angled, hollow capsule representing one half of a link."""
    layer = Image.new("RGBA", (width + 64, height + 64))
    draw = ImageDraw.Draw(layer)
    draw.rounded_rectangle(
        (32, 32, width + 31, height + 31),
        radius=height // 2,
        outline=color,
        width=48,
    )
    return layer.rotate(38, resample=Image.Resampling.BICUBIC, expand=True)


def main():
    OUT.mkdir(exist_ok=True)
    image = Image.new("RGBA", (SIZE, SIZE))
    pixels = image.load()
    for y in range(SIZE):
        for x in range(SIZE):
            t = (x + y) / (2 * SIZE)
            pixels[x, y] = (
                round(22 + 12 * t),
                round(37 + 41 * t),
                round(80 + 54 * t),
                255,
            )

    mask = Image.new("L", (SIZE, SIZE))
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 1023, 1023), radius=216, fill=255)
    image.putalpha(mask)

    # A paired chain link: campaign parameters follow a visitor to the next link.
    left = link_loop(370, 236, "#FFFFFF")
    right = link_loop(370, 236, "#54E3C0")
    image.alpha_composite(left, (338 - left.width // 2, 570 - left.height // 2))
    image.alpha_composite(right, (682 - right.width // 2, 454 - right.height // 2))

    # Deliberate crossing band makes the two links read as one connected path.
    accent = Image.new("RGBA", (SIZE, SIZE))
    draw = ImageDraw.Draw(accent)
    draw.rounded_rectangle((451, 486, 585, 532), radius=23, fill="#FFFFFF")
    image = Image.alpha_composite(image, accent)

    for size in (128, 256):
        path = OUT / f"icon-{size}x{size}.png"
        image.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)
        print(f"Created {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
