import re
from pathlib import Path

IN_PATH = Path("emoji-db.txt")
OUT_PATH = Path("emoji-db.tsv")

def parse_blocks(text: str):
    # Split on blank lines (one or more)
    blocks = re.split(r"(?:\r?\n){2,}", text.strip())
    for b in blocks:
        lines = [ln.strip() for ln in b.splitlines() if ln.strip()]
        if len(lines) < 3:
            continue

        # Expect:
        # 0: "name"-emoji
        # 1: name
        # 2: hex id (possibly multiple code points)
        name = lines[1]
        emoji_id = lines[2].upper()

        # Basic validation: codepoints like 1F603 or "1F1FA 1F1F8"
        if not re.fullmatch(r"[0-9A-F]{4,6}(?:\s+[0-9A-F]{4,6})*", emoji_id):
            continue

        yield emoji_id, name

def main():
    text = IN_PATH.read_text(encoding="utf-8", errors="replace")
    rows = list(parse_blocks(text))

    # stdout
    for emoji_id, name in rows:
        print(f"{emoji_id}\t{name}")

    # file
    OUT_PATH.write_text(
        "".join(f"{emoji_id}\t{name}\n" for emoji_id, name in rows),
        encoding="utf-8"
    )

if __name__ == "__main__":
    main()