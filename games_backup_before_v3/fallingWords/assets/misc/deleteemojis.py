from pathlib import Path

TSV_PATH = Path(r"C:\Users\alexm\games\games\fallingWords\assets\emoji-easy-oneword-he.tsv")
FOLDER   = Path(r"C:\Users\alexm\games\games\fallingWords\assets\openmoji-618x618-color")

# False = dry run (prints what would be deleted). True = actually delete.
DO_DELETE = True

def read_keep_set(tsv_path: Path) -> set[str]:
    keep = set()
    with tsv_path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            code = line.split("\t", 1)[0].strip().upper()
            if code:
                keep.add(f"{code}.PNG")
    return keep

def main():
    if not TSV_PATH.exists():
        raise FileNotFoundError(f"TSV not found: {TSV_PATH}")
    if not FOLDER.exists():
        raise FileNotFoundError(f"Folder not found: {FOLDER}")

    keep = read_keep_set(TSV_PATH)

    would_delete = []
    kept = 0
    skipped_non_png = 0

    for p in FOLDER.iterdir():
        if not p.is_file():
            continue
        if p.suffix.lower() != ".png":
            skipped_non_png += 1
            continue

        if p.name.upper() in keep:
            kept += 1
            continue

        would_delete.append(p)

    for p in would_delete:
        if DO_DELETE:
            p.unlink()
            print(f"DELETED: {p}")
        else:
            print(f"WOULD DELETE: {p}")

    print("\nSummary")
    print(f"Keep-list PNGs: {len(keep)}")
    print(f"Kept: {kept}")
    print(f"{'Deleted' if DO_DELETE else 'Would delete'}: {len(would_delete)}")
    print(f"Skipped non-PNG files: {skipped_non_png}")

if __name__ == "__main__":
    main()