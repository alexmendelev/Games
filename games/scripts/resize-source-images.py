#!/usr/bin/env python3
"""
Resize all images in image_source/emojis-new to 512x512 in-place.

Usage:
    python resize-source-images.py
    python resize-source-images.py --dir path/to/images
    python resize-source-images.py --dry-run
"""

import argparse
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Missing package: pillow")
    print("Install with:  pip install pillow")
    sys.exit(1)

TARGET = 512


def resize_image(path: Path, dry_run: bool) -> str:
    img = Image.open(path)
    w, h = img.size
    if w == TARGET and h == TARGET:
        return "skip"
    if not dry_run:
        img = img.convert("RGBA").resize((TARGET, TARGET), Image.LANCZOS)
        img.save(path, format="PNG", optimize=True)
    return f"{w}x{h} → {TARGET}x{TARGET}"


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    default_dir = script_dir.parent / "words" / "data" / "image_source" / "emojis-new"

    parser = argparse.ArgumentParser(description=f"Resize source images to {TARGET}x{TARGET}")
    parser.add_argument("--dir", default=str(default_dir), help="Directory containing PNG images")
    parser.add_argument("--dry-run", action="store_true", help="Show what would change without writing")
    args = parser.parse_args()

    source_dir = Path(args.dir)
    if not source_dir.exists():
        sys.exit(f"Error: directory not found: {source_dir}")

    images = sorted(source_dir.glob("*.png"))
    if not images:
        print(f"No PNG files found in {source_dir}")
        return

    print(f"{'DRY RUN — ' if args.dry_run else ''}Processing {len(images)} images in {source_dir}\n")

    resized = skipped = errors = 0
    for path in images:
        try:
            result = resize_image(path, args.dry_run)
            if result == "skip":
                print(f"  skip  {path.name}  (already {TARGET}x{TARGET})")
                skipped += 1
            else:
                print(f"  {'would resize' if args.dry_run else 'resized'}  {path.name}  {result}")
                resized += 1
        except Exception as exc:
            print(f"  ERROR {path.name}: {exc}")
            errors += 1

    print(f"\n{'Would resize' if args.dry_run else 'Resized'}: {resized}  |  Already {TARGET}x{TARGET}: {skipped}  |  Errors: {errors}")


if __name__ == "__main__":
    main()
