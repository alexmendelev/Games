#!/usr/bin/env python3
"""
Generate emoji-style word images using the OpenAI image API, then resize for the game.

Pipeline:
  1. Read new-words.tsv
  2. For each entry, generate an image via OpenAI and save to image_source/emojis-new/ (high-res)
  3. Resize each source image to 160x160 and write to emojis-new/ (game-ready)
  4. Optionally append the new entries to icon-pack-manifest.tsv

Usage:
    python generate-word-images.py [options]

    # Generate everything and append to manifest:
    python generate-word-images.py --append-manifest

    # Just re-resize all existing source images (no API calls):
    python generate-word-images.py --resize-only

    # Preview without writing anything:
    python generate-word-images.py --dry-run

Requirements:
    pip install openai pillow
    Set OPENAI_API_KEY environment variable.
"""

import os
import sys
import csv
import time
import base64
import argparse
from pathlib import Path

# --- dependency check -----------------------------------------------------------

def require_packages():
    missing = []
    try:
        import openai  # noqa: F401
    except ImportError:
        missing.append("openai")
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        missing.append("pillow")
    if missing:
        print(f"Missing packages: {', '.join(missing)}")
        print(f"Install with:  pip install {' '.join(missing)}")
        sys.exit(1)

require_packages()

from openai import OpenAI          # noqa: E402
from PIL import Image              # noqa: E402

# --- prompt building -----------------------------------------------------------

# Custom subject descriptions for items that need a clearer prompt than "A <word>"
SUBJECT_OVERRIDES = {
    "seashell":    "A colorful seashell",
    "manta ray":   "A manta ray fish swimming",
    "clownfish":   "A clownfish with orange and white stripes",
    "firefly":     "A glowing firefly insect with a glowing tail",
    "ping pong":   "A ping-pong paddle and a white ball",
    "hot dog":     "A hot dog sausage in a bun",
    "ice cream":   "An ice cream cone with a scoop on top",
    "palm tree":   "A tropical palm tree with coconuts",
    "fire truck":  "A red fire truck",
    "cable car":   "A cable car gondola hanging from a wire",
    "abacus":      "A colorful wooden abacus with beads",
    "archery":     "A bow and arrow",
    "gymnastics":  "A cartoon gymnast doing a cartwheel",
    "wrestling":   "Two cartoon figures grappling in wrestling",
    "kayaking":    "A person paddling a kayak on water",
    "astronaut":   "An astronaut in a white spacesuit floating in space",
    "asteroid":    "A rocky asteroid tumbling through space",
    "satellite":   "A satellite with solar panels orbiting in space",
    "bulldozer":   "A yellow construction bulldozer",
    "snowmobile":  "A snowmobile speeding over snow",
    "gondola":     "A Venetian gondola boat on water",
    "windmill":    "A traditional windmill with spinning sails",
    "igloo":       "An igloo built from ice blocks",
    "pyramid":     "An Egyptian pyramid in the desert",
    "aquarium":    "A glass fish tank aquarium with colorful fish inside",
    "dodo":        "A dodo bird standing upright",
    "ping pong":   "A ping-pong paddle and ball",
}


def build_prompt(english: str) -> str:
    clean = english.lower().strip()
    subject = SUBJECT_OVERRIDES.get(clean, f"A {clean}")
    return (
        f"{subject}. "
        "Flat design cartoon emoji-style icon. "
        "Colorful, bold outlines, simple shapes, plain white background, "
        "centered composition, no text, no letters, no watermarks, no drop shadows, "
        "clean and friendly art style suitable for children ages 6-9."
    )


# --- image generation ----------------------------------------------------------

def generate_image_bytes(client: OpenAI, prompt: str, model: str) -> bytes:
    if model == "dall-e-3":
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            size="1024x1024",
            quality="standard",
            n=1,
            response_format="b64_json",
        )
        return base64.b64decode(response.data[0].b64_json)

    # gpt-image-1
    response = client.images.generate(
        model="gpt-image-1",
        prompt=prompt,
        size="1024x1024",
        n=1,
    )
    item = response.data[0]
    if getattr(item, "b64_json", None):
        return base64.b64decode(item.b64_json)
    if getattr(item, "url", None):
        import urllib.request
        with urllib.request.urlopen(item.url) as r:
            return r.read()
    raise ValueError("OpenAI response contained neither b64_json nor url")


# --- resize --------------------------------------------------------------------

def resize_to_game(source_path: Path, game_path: Path, size: int = 160) -> None:
    img = Image.open(source_path).convert("RGBA")
    img = img.resize((size, size), Image.LANCZOS)
    game_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(game_path, format="PNG", optimize=True)


# --- manifest ------------------------------------------------------------------

def load_manifest_filenames(manifest_path: Path) -> set:
    if not manifest_path.exists():
        return set()
    with open(manifest_path, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        return {row.get("filename", "").strip() for row in reader}


def append_to_manifest(manifest_path: Path, rows: list, existing: set, dry_run: bool) -> None:
    new_rows = [r for r in rows if r["filename"] not in existing]
    if not new_rows:
        print("manifest: nothing new to append")
        return
    print(f"manifest: appending {len(new_rows)} entries → {manifest_path}")
    if dry_run:
        for r in new_rows:
            print(f"  + {r['filename']}")
        return
    with open(manifest_path, "a", encoding="utf-8", newline="") as f:
        for r in new_rows:
            f.write(f"{r['filename']}\t{r['category']}\t{r['english']}\t{r['hebrew']}\t{r['russian']}\n")


# --- main ----------------------------------------------------------------------

def main() -> None:
    script_dir = Path(__file__).resolve().parent
    data_dir   = script_dir.parent / "words" / "data"

    parser = argparse.ArgumentParser(
        description="Generate word images with OpenAI and resize for the game.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--input",       default=str(data_dir / "new-words.tsv"),
                        help="TSV file with new words (default: words/data/new-words.tsv)")
    parser.add_argument("--source-dir",  default=str(data_dir / "image_source" / "emojis-new"),
                        help="Directory for high-res source images (512×512 or 1024×1024)")
    parser.add_argument("--game-dir",    default=str(data_dir / "emojis-new"),
                        help="Directory for 160×160 game images")
    parser.add_argument("--manifest",    default=str(data_dir / "emojis-new" / "icon-pack-manifest.tsv"),
                        help="Main manifest file to optionally update")
    parser.add_argument("--model",       default="gpt-image-1", choices=["gpt-image-1", "dall-e-3"],
                        help="OpenAI image model (default: gpt-image-1)")
    parser.add_argument("--delay",       type=float, default=3.0,
                        help="Seconds to wait between API calls (default: 3)")
    parser.add_argument("--resize-only", action="store_true",
                        help="Skip generation; only resize existing source images")
    parser.add_argument("--append-manifest", action="store_true",
                        help="Append new entries to icon-pack-manifest.tsv after processing")
    parser.add_argument("--dry-run",     action="store_true",
                        help="Print what would happen without writing files or calling the API")
    args = parser.parse_args()

    input_path   = Path(args.input)
    source_dir   = Path(args.source_dir)
    game_dir     = Path(args.game_dir)
    manifest_path = Path(args.manifest)

    if not input_path.exists():
        sys.exit(f"Error: input file not found: {input_path}")

    if not args.dry_run:
        source_dir.mkdir(parents=True, exist_ok=True)
        game_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    with open(input_path, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row in reader:
            rows.append(dict(row))

    print(f"Loaded {len(rows)} entries from {input_path.name}")
    if args.dry_run:
        print("DRY RUN — no files will be written, no API calls made\n")

    # Build OpenAI client only when needed
    client = None
    if not args.resize_only and not args.dry_run:
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            sys.exit("Error: OPENAI_API_KEY environment variable is not set")
        client = OpenAI(api_key=api_key)

    n_generated = n_resized = n_skip_gen = n_skip_rsz = n_errors = 0

    for i, row in enumerate(rows):
        filename   = row["filename"]
        english    = row["english"]
        source_img = source_dir / filename
        game_img   = game_dir   / filename
        tag        = f"[{i+1:3d}/{len(rows)}]"

        # ── Generation ──────────────────────────────────────────────────────────
        if not args.resize_only:
            if source_img.exists():
                print(f"{tag} skip-gen   {filename}")
                n_skip_gen += 1
            else:
                prompt = build_prompt(english)
                print(f"{tag} generate  {filename}")
                print(f"             \"{prompt}\"")
                if not args.dry_run:
                    try:
                        data = generate_image_bytes(client, prompt, args.model)
                        source_img.write_bytes(data)
                        print(f"             saved {len(data)//1024} KB → {source_img.name}")
                        n_generated += 1
                    except Exception as exc:
                        print(f"             ERROR: {exc}")
                        n_errors += 1
                        continue
                    if i < len(rows) - 1:
                        time.sleep(args.delay)

        # ── Resize ──────────────────────────────────────────────────────────────
        if not source_img.exists():
            if args.resize_only:
                print(f"{tag} missing    {source_img.name} (no source image, skipping)")
            continue

        if game_img.exists() and not args.resize_only:
            print(f"{tag} skip-rsz   {filename}")
            n_skip_rsz += 1
        else:
            print(f"{tag} resize     {filename}  →  {game_img}")
            if not args.dry_run:
                try:
                    resize_to_game(source_img, game_img)
                    n_resized += 1
                except Exception as exc:
                    print(f"             ERROR resizing: {exc}")
                    n_errors += 1

    # ── Summary ─────────────────────────────────────────────────────────────────
    print()
    print("=" * 60)
    if args.dry_run:
        print("DRY RUN complete — nothing was written")
    else:
        print(f"Generated : {n_generated}")
        print(f"Resized   : {n_resized}")
        print(f"Skipped   : gen={n_skip_gen}  resize={n_skip_rsz}")
        print(f"Errors    : {n_errors}")

    if args.append_manifest:
        print()
        existing = load_manifest_filenames(manifest_path)
        append_to_manifest(manifest_path, rows, existing, args.dry_run)


if __name__ == "__main__":
    main()
