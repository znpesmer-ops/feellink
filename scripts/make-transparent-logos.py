#!/usr/bin/env python3
"""
JPEG veya düz siyah arka planlı raster logolardan şeffaf PNG üretir.
Feellink logo-light / logo-dark için kullanılır.
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow gerekli: pip install Pillow", file=sys.stderr)
    sys.exit(1)


def remove_near_black(
    im: Image.Image,
    black_thresh: int = 34,
    feather: int = 28,
) -> Image.Image:
    """Siyah ve çok koyu arka planı şeffaf yap; kenarlarda yumuşak geçiş."""
    im = im.convert("RGBA")
    pixels = list(im.getdata())
    out: list[tuple[int, int, int, int]] = []
    for r, g, b, _ in pixels:
        m = max(r, g, b)
        if m <= black_thresh:
            out.append((r, g, b, 0))
        elif m <= black_thresh + feather:
            alpha = min(255, max(0, int(255 * (m - black_thresh) / feather)))
            out.append((r, g, b, alpha))
        else:
            out.append((r, g, b, 255))
    im2 = Image.new("RGBA", im.size)
    im2.putdata(out)
    return im2


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    logo_dir = root / "frontend" / "public" / "logo"
    pairs = [
        (logo_dir / "logo-light.png", logo_dir / "logo-light.png"),
        (logo_dir / "logo-dark.png", logo_dir / "logo-dark.png"),
    ]
    for src, dest in pairs:
        if not src.exists():
            print(f"Atlanıyor (yok): {src}", file=sys.stderr)
            continue
        img = Image.open(src)
        cleaned = remove_near_black(img)
        tmp = dest.with_suffix(".tmp.png")
        cleaned.save(tmp, format="PNG", optimize=True)
        tmp.replace(dest)
        print(f"OK: {dest} ({img.format} -> PNG RGBA)")


if __name__ == "__main__":
    main()
