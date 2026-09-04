"""Extract reusable timeline decorations from the supplied design reference.

This intentionally keeps text, sample content photos, and layout primitives out of
the asset bundle. They remain dynamic UI rather than baked-in screenshot pixels.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ASSETS = {
    "month-sprig-left": (242, 185, 306, 250),
    "month-sprig-right": (547, 185, 611, 250),
    "marker-flower-pink": (146, 364, 224, 442),
    "marker-flower-cream": (146, 883, 224, 960),
    "marker-bud": (153, 1266, 207, 1347),
    "card-sprig-blossom": (638, 476, 803, 775),
    "card-sprig-pink": (615, 955, 803, 1179),
    # Stop before the floating action button; it is a code-native control.
    "card-sprig-cream": (552, 1280, 702, 1566),
}

PAPER_TEXTURE_BOX = (452, 1025, 580, 1153)


def border_background(rgb: np.ndarray) -> np.ndarray:
    """Estimate the local paper/page color from low-chroma border pixels."""
    border = np.concatenate(
        (rgb[:5].reshape(-1, 3), rgb[-5:].reshape(-1, 3), rgb[:, :5].reshape(-1, 3), rgb[:, -5:].reshape(-1, 3))
    )
    chroma = border.max(axis=1) - border.min(axis=1)
    light = border.mean(axis=1)
    candidates = border[(chroma < 24) & (light > 198)]
    if len(candidates) < 8:
        candidates = border
    return np.median(candidates, axis=0)


def remove_specks(seed: np.ndarray, minimum_area: int = 7) -> np.ndarray:
    """Drop isolated paper-grain detections before the soft mask is expanded."""
    height, width = seed.shape
    seen = np.zeros_like(seed, dtype=bool)
    cleaned = np.zeros_like(seed, dtype=bool)
    for start_y in range(height):
        for start_x in range(width):
            if seen[start_y, start_x] or not seed[start_y, start_x]:
                continue
            queue = deque(((start_x, start_y),))
            seen[start_y, start_x] = True
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for ny in range(max(0, y - 1), min(height, y + 2)):
                    for nx in range(max(0, x - 1), min(width, x + 2)):
                        if not seen[ny, nx] and seed[ny, nx]:
                            seen[ny, nx] = True
                            queue.append((nx, ny))
            if len(component) >= minimum_area:
                for x, y in component:
                    cleaned[y, x] = True
    return cleaned


def make_alpha(rgb: np.ndarray, softness: float = 1.0) -> np.ndarray:
    """Create a soft foreground mask against the warm, nearly neutral UI paper."""
    maximum = rgb.max(axis=2).astype(np.float32)
    minimum = rgb.min(axis=2).astype(np.float32)
    chroma = maximum - minimum
    light = rgb.mean(axis=2).astype(np.float32)

    # The reference uses two warm near-neutral backgrounds (page and paper).
    # Foreground seeds therefore come from botanical chroma and dark stems,
    # rather than a single global "white" threshold.
    strong = remove_specks((chroma >= 32.0) | (light <= 200.0), minimum_area=4)
    neighborhood = Image.fromarray(np.uint8(strong) * 255, "L").filter(ImageFilter.MaxFilter(11))
    support = (chroma >= 21.0) | (light <= 225.0)
    seed = (np.asarray(neighborhood) > 0) & support
    mask = Image.fromarray(np.uint8(seed) * 255, "L")
    mask = mask.filter(ImageFilter.MaxFilter(7))
    mask = mask.filter(ImageFilter.GaussianBlur(1.15 * softness))
    return np.asarray(mask)


def extract(source: Path, output_dir: Path) -> list[Path]:
    image = Image.open(source).convert("RGB")
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    for name, box in ASSETS.items():
        crop = image.crop(box)
        rgb = np.asarray(crop)
        alpha = make_alpha(rgb)
        if name == "card-sprig-cream":
            # The source's coral FAB overlaps this crop. It is a separate UI
            # control, so suppress only that saturated red region.
            red_control = (
                (rgb[:, :, 0].astype(np.int16) - rgb[:, :, 1].astype(np.int16) > 34)
                & (rgb[:, :, 0] > 175)
                & (np.indices(alpha.shape)[0] > 185)
            )
            red_control = Image.fromarray(np.uint8(red_control) * 255, "L").filter(ImageFilter.MaxFilter(9))
            alpha = np.where(np.asarray(red_control) > 0, 0, alpha)

        # Torn paper is part of the scalable card treatment, not the botanical
        # overlay. These masks remove only the detached edge fragments captured
        # beside the three card sprigs.
        yy, xx = np.indices(alpha.shape)
        if name == "card-sprig-blossom":
            alpha = np.where(yy > (320 - 0.65 * xx), 0, alpha)
            alpha = np.where((xx > 110) & (yy > 175), 0, alpha)
        elif name == "card-sprig-pink":
            alpha = np.where((xx > 120) & (yy > 180), 0, alpha)
        elif name == "card-sprig-cream":
            alpha = np.where(yy > (290 - 0.6 * xx), 0, alpha)
            alpha = np.where((xx > 110) & (yy > 155), 0, alpha)
        rgba = np.dstack((rgb, alpha))
        result = Image.fromarray(rgba, "RGBA")

        # Remove fully transparent outer padding while retaining a small safe edge.
        alpha_box = result.getchannel("A").getbbox()
        if alpha_box:
            left, top, right, bottom = alpha_box
            left = max(0, left - 2)
            top = max(0, top - 2)
            right = min(result.width, right + 2)
            bottom = min(result.height, bottom + 2)
            result = result.crop((left, top, right, bottom))

        path = output_dir / f"{name}.png"
        result.save(path, optimize=True)
        written.append(path)

    paper_path = output_dir / "paper-texture-tile.png"
    image.crop(PAPER_TEXTURE_BOX).save(paper_path, optimize=True)
    written.append(paper_path)

    return written


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output_dir", type=Path)
    args = parser.parse_args()
    for path in extract(args.source, args.output_dir):
        print(path)


if __name__ == "__main__":
    main()
