from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Preserve full-size words icons and regenerate smaller runtime PNGs."
    )
    parser.add_argument(
        "--runtime-dir",
        default="games/words/data/emojis-new",
        help="Directory containing the runtime PNG icons.",
    )
    parser.add_argument(
        "--source-dir",
        default="games/words/data/image_source/emojis-new",
        help="Directory used to preserve the original full-size PNG icons.",
    )
    parser.add_argument(
        "--size",
        type=int,
        default=160,
        help="Target square size for regenerated runtime icons.",
    )
    return parser.parse_args()


def ensure_source_copy(runtime_dir: Path, source_dir: Path) -> list[Path]:
    source_dir.mkdir(parents=True, exist_ok=True)
    runtime_pngs = sorted(runtime_dir.glob("*.png"))
    source_pngs = sorted(source_dir.glob("*.png"))

    if not source_pngs:
        for png in runtime_pngs:
            shutil.copy2(png, source_dir / png.name)
        return runtime_pngs

    missing = [png.name for png in runtime_pngs if not (source_dir / png.name).exists()]
    if missing:
        raise RuntimeError(
            "Source directory already exists but is missing files: " + ", ".join(missing[:10])
        )

    return sorted(source_dir.glob("*.png"))


def resize_icon(src_path: Path, dst_path: Path, size: int) -> None:
    with Image.open(src_path) as image:
        rgba = image.convert("RGBA")
        resized = rgba.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(dst_path, format="PNG", optimize=True)


def main() -> int:
    args = parse_args()
    runtime_dir = Path(args.runtime_dir)
    source_dir = Path(args.source_dir)
    size = int(args.size)

    if size <= 0:
        raise ValueError("--size must be positive")
    if not runtime_dir.exists():
        raise FileNotFoundError(f"Runtime directory not found: {runtime_dir}")

    source_pngs = ensure_source_copy(runtime_dir, source_dir)
    if not source_pngs:
        raise RuntimeError(f"No PNG icons found in {runtime_dir}")

    total_before = 0
    total_after = 0
    for src_path in source_pngs:
        dst_path = runtime_dir / src_path.name
        total_before += src_path.stat().st_size
        resize_icon(src_path, dst_path, size)
        total_after += dst_path.stat().st_size

    print(f"Preserved originals: {len(source_pngs)} icons in {source_dir}")
    print(f"Regenerated runtime icons: {runtime_dir} at {size}x{size}")
    print(f"Total size before: {total_before} bytes")
    print(f"Total size after:  {total_after} bytes")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
