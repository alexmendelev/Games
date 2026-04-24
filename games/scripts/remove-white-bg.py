#!/usr/bin/env python3
"""
Remove white backgrounds from PNG images using BFS flood-fill from edges.
Processes only images that have no existing transparency (pure white-bg PNGs).
"""

import sys
import argparse
import collections
from pathlib import Path
from PIL import Image


def remove_white_bg(img, threshold=240):
    img = img.convert("RGBA")
    data = img.load()
    w, h = img.size

    def is_bg(x, y):
        r, g, b, a = data[x, y]
        return a > 0 and r >= threshold and g >= threshold and b >= threshold

    queue = collections.deque()
    visited = set()

    def seed(x, y):
        if (x, y) not in visited and is_bg(x, y):
            visited.add((x, y))
            queue.append((x, y))

    for x in range(w):
        seed(x, 0)
        seed(x, h - 1)
    for y in range(h):
        seed(0, y)
        seed(w - 1, y)

    while queue:
        x, y = queue.popleft()
        r, g, b, _ = data[x, y]
        data[x, y] = (r, g, b, 0)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                if is_bg(nx, ny):
                    visited.add((nx, ny))
                    queue.append((nx, ny))

    return img


def has_transparency(img):
    if img.mode != "RGBA":
        return False
    extrema = img.getextrema()
    return extrema[3][0] < 255


def process_dir(directory, threshold, dry_run, force):
    directory = Path(directory)
    pngs = sorted(directory.glob("*.png"))
    if not pngs:
        print(f"No PNGs found in {directory}")
        return

    changed = 0
    skipped = 0
    for path in pngs:
        img = Image.open(path)
        if not force and has_transparency(img):
            skipped += 1
            continue
        result = remove_white_bg(img, threshold)
        if dry_run:
            print(f"  [dry-run] would update: {path.name}")
        else:
            result.save(path, format="PNG", optimize=True)
            print(f"  updated: {path.name}")
        changed += 1

    print(f"\n{directory}: {changed} updated, {skipped} skipped (already transparent)")


def main():
    parser = argparse.ArgumentParser(description="Remove white backgrounds from PNGs")
    parser.add_argument("dirs", nargs="+", help="Directories to process")
    parser.add_argument("--threshold", type=int, default=240,
                        help="Min RGB value to treat as white (default: 240)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without saving")
    parser.add_argument("--force", action="store_true",
                        help="Process all images, even ones that already have transparency")
    args = parser.parse_args()

    for d in args.dirs:
        process_dir(d, args.threshold, args.dry_run, args.force)


if __name__ == "__main__":
    main()
