"""Extract reusable profile-page artwork from the high-resolution source art."""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


LEFT_BOX = (45, 135, 650, 875)
RIGHT_BOX = (950, 135, 1545, 875)
HEART_BOX = (640, 340, 960, 435)
PAPER_BOX = (710, 720, 966, 976)


def remove_small_components(binary: np.ndarray, minimum_area: int) -> np.ndarray:
    height, width = binary.shape
    seen = np.zeros_like(binary, dtype=bool)
    cleaned = np.zeros_like(binary, dtype=bool)
    for start_y in range(height):
        for start_x in range(width):
            if seen[start_y, start_x] or not binary[start_y, start_x]:
                continue
            queue = deque(((start_x, start_y),))
            seen[start_y, start_x] = True
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for ny in range(max(0, y - 1), min(height, y + 2)):
                    for nx in range(max(0, x - 1), min(width, x + 2)):
                        if not seen[ny, nx] and binary[ny, nx]:
                            seen[ny, nx] = True
                            queue.append((nx, ny))
            if len(component) >= minimum_area:
                for x, y in component:
                    cleaned[y, x] = True
    return cleaned


def keep_largest_component(binary: np.ndarray) -> np.ndarray:
    height, width = binary.shape
    seen = np.zeros_like(binary, dtype=bool)
    largest: list[tuple[int, int]] = []
    for start_y in range(height):
        for start_x in range(width):
            if seen[start_y, start_x] or not binary[start_y, start_x]:
                continue
            queue = deque(((start_x, start_y),))
            seen[start_y, start_x] = True
            component: list[tuple[int, int]] = []
            while queue:
                x, y = queue.popleft()
                component.append((x, y))
                for ny in range(max(0, y - 1), min(height, y + 2)):
                    for nx in range(max(0, x - 1), min(width, x + 2)):
                        if not seen[ny, nx] and binary[ny, nx]:
                            seen[ny, nx] = True
                            queue.append((nx, ny))
            if len(component) > len(largest):
                largest = component
    kept = np.zeros_like(binary, dtype=bool)
    for x, y in largest:
        kept[y, x] = True
    return kept


def botanical_alpha(rgb: np.ndarray) -> np.ndarray:
    """Select colored flowers, leaves, and stems while rejecting warm paper."""
    maximum = rgb.max(axis=2).astype(np.float32)
    minimum = rgb.min(axis=2).astype(np.float32)
    chroma = maximum - minimum

    strong = chroma >= 34.0
    strong_mask = Image.fromarray(np.uint8(strong) * 255, "L").filter(ImageFilter.MaxFilter(13))
    support = chroma >= 19.0
    alpha = remove_small_components((np.asarray(strong_mask) > 0) & support, minimum_area=14)

    mask = Image.fromarray(np.uint8(alpha) * 255, "L")
    mask = mask.filter(ImageFilter.MaxFilter(9))
    mask = mask.filter(ImageFilter.GaussianBlur(1.4))
    return np.asarray(mask)


def ellipse_alpha(size: tuple[int, int], ellipse: tuple[int, int, int, int]) -> np.ndarray:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(ellipse, fill=255)
    return np.asarray(mask.filter(ImageFilter.GaussianBlur(1.1)))


def save_trimmed(rgba: np.ndarray, path: Path, padding: int = 3) -> None:
    image = Image.fromarray(rgba, "RGBA")
    box = image.getchannel("A").getbbox()
    if box:
        left, top, right, bottom = box
        image = image.crop(
            (
                max(0, left - padding),
                max(0, top - padding),
                min(image.width, right + padding),
                min(image.height, bottom + padding),
            )
        )
    image.save(path, optimize=True)


def extract(source: Path, output_dir: Path) -> list[Path]:
    source_image = Image.open(source).convert("RGB")
    output_dir.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []

    compositions = (
        (
            "archive-left-portrait-floral.png",
            LEFT_BOX,
            # Global portrait oval (220, 145, 645, 646), translated to crop.
            (175, 10, 600, 511),
        ),
        (
            "archive-right-portrait-floral.png",
            RIGHT_BOX,
            # Global portrait oval (955, 145, 1345, 650), translated to crop.
            (5, 10, 395, 515),
        ),
    )

    for filename, box, portrait_ellipse in compositions:
        crop = source_image.crop(box)
        rgb = np.asarray(crop)
        portrait = ellipse_alpha(crop.size, portrait_ellipse)
        florals = botanical_alpha(rgb)
        floral_regions = keep_largest_component(florals > 20)
        florals = np.where(floral_regions, florals, 0)
        yy, xx = np.indices(florals.shape)
        if filename.startswith("archive-left"):
            florals = np.where(((yy > 680) & (xx < 250)) | ((yy > 625) & (xx < 120)), 0, florals)
        else:
            florals = np.where(((yy < 82) & (xx < 350)) | ((yy < 48) & (xx < 430)), 0, florals)
        alpha = np.maximum(portrait, florals)
        path = output_dir / filename
        save_trimmed(np.dstack((rgb, alpha)), path)
        written.append(path)

    heart_crop = source_image.crop(HEART_BOX)
    heart_rgb = np.asarray(heart_crop)
    red = heart_rgb[:, :, 0].astype(np.int16)
    green = heart_rgb[:, :, 1].astype(np.int16)
    blue = heart_rgb[:, :, 2].astype(np.int16)
    heart_seed = (red - green > 14) & (red - blue > 22) & (red < 246)
    heart_seed = Image.fromarray(np.uint8(heart_seed) * 255, "L").filter(ImageFilter.MaxFilter(3))
    heart_seed = remove_small_components(np.asarray(heart_seed) > 0, minimum_area=24)
    heart_mask = Image.fromarray(np.uint8(heart_seed) * 255, "L")
    heart_mask = heart_mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    heart_path = output_dir / "archive-heart-connector.png"
    save_trimmed(np.dstack((heart_rgb, np.asarray(heart_mask))), heart_path, padding=2)
    written.append(heart_path)

    paper_path = output_dir / "archive-paper-texture-tile.png"
    source_image.crop(PAPER_BOX).save(paper_path, optimize=True)
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
