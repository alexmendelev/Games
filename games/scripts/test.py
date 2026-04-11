from __future__ import annotations

import argparse
import os
import re
import subprocess
from datetime import datetime
from pathlib import Path
from time import monotonic


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LOG_DIR = Path(r"C:\tmp")
LOGIC_TESTS = [
    ("math", ["node", "scripts/test-math-difficulty-manager.js"]),
    ("clocks", ["node", "scripts/test-clocks-difficulty-manager.js"]),
    ("equations", ["node", "scripts/test-equations-difficulty-manager.js"]),
    ("multiply", ["node", "scripts/test-multiply-difficulty-manager.js"]),
    ("shapes", ["node", "scripts/test-shapes-difficulty-manager.js"]),
    ("words", ["node", "scripts/test-words-difficulty-manager.js"]),
]
E2E_TEST = ("e2e", ["cmd", "/c", "npm", "run", "test:e2e"])
ANSI_RE = re.compile(r"\x1b\[[0-9;?]*[ -/]*[@-~]")
FAILED_TEST_RE = re.compile(r"^\s*\[chromium\]\s+(?:>|›|│|\|)\s+(.+?)\s*$")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run repo tests, capture a raw log, and emit a short failure triage prompt."
    )
    parser.add_argument(
        "--log-dir",
        default=str(DEFAULT_LOG_DIR),
        help=r"Directory for the raw log and prompt output. Default: C:\tmp",
    )
    return parser.parse_args()


def clean_output(text: str) -> str:
    text = ANSI_RE.sub("", text)
    replacements = {
        "âœ“": "PASS",
        "âœ˜": "FAIL",
        "›": ">",
        "â€º": ">",
        "│": ">",
        "â”‚": ">",
        "â”œÃ¹": ">",
        "â””": "-",
        "â”€": "-",
        "Î“Ã¶Ã‡": "-",
        "Ã—": "x",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def decode_output(raw: bytes) -> str:
    for encoding in ("utf-8", "utf-8-sig", "cp1255", "cp1252"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def now_stamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def append_log(log_lines: list[str], text: str) -> None:
    for line in text.splitlines():
        log_lines.append(f"[{now_stamp()}] {line}")


def format_duration(seconds: float) -> str:
    whole = int(seconds)
    hours, rem = divmod(whole, 3600)
    minutes, secs = divmod(rem, 60)
    micros = int(round((seconds - whole) * 1_000_000))
    return f"{hours}:{minutes:02d}:{secs:02d}.{micros:06d}"


def run_command(
    name: str,
    command: list[str],
    log_lines: list[str],
    env: dict[str, str],
) -> tuple[int, float]:
    print(f"[start] {name}: {' '.join(command)}", flush=True)
    start = monotonic()
    process = subprocess.run(
        command,
        cwd=REPO_ROOT,
        capture_output=True,
        env=env,
    )
    duration = monotonic() - start

    stdout_text = clean_output(decode_output(process.stdout))
    stderr_text = clean_output(decode_output(process.stderr))
    if stdout_text:
        append_log(log_lines, stdout_text)
    if stderr_text:
        append_log(log_lines, stderr_text)

    print(
        f"[done]  {name}: exit={process.returncode} duration={format_duration(duration)}",
        flush=True,
    )
    return process.returncode, duration


def extract_count(text: str, label: str) -> str | None:
    matches = re.findall(rf"(\d+)\s+{re.escape(label)}\b", text)
    return matches[-1] if matches else None


def collect_failed_tests(text: str) -> list[str]:
    lines = [line.strip() for line in text.splitlines()]
    failed: list[str] = []
    summary_start = None

    for index, line in enumerate(lines):
        if re.search(r"^\d+\s+failed\b", line):
            summary_start = index

    if summary_start is None:
        return failed

    for line in lines[summary_start + 1:]:
        if re.search(r"^\d+\s+(?:flaky|passed|did not run)\b", line):
            break
        match = FAILED_TEST_RE.match(line)
        if match:
            failed.append(match.group(1))

    return failed


def collect_key_messages(text: str, limit: int = 3) -> list[str]:
    messages: list[str] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith("Test timeout of "):
            if stripped not in messages:
                messages.append(stripped)
        elif stripped.startswith("Error: ") and stripped not in messages:
            messages.append(stripped)
        if len(messages) >= limit:
            break
    return messages


def build_prompt(
    raw_log_path: Path,
    logic_passed: list[str],
    logic_failed: list[str],
    e2e_returncode: int,
    e2e_text: str,
) -> str:
    passed = extract_count(e2e_text, "passed") or "unknown"
    failed = extract_count(e2e_text, "failed") or "unknown"
    did_not_run = extract_count(e2e_text, "did not run") or "unknown"
    failed_tests = collect_failed_tests(e2e_text)
    key_messages = collect_key_messages(e2e_text)

    lines = [
        "Use this test summary to diagnose failures and decide the next smallest fixes.",
        f"Repo: {REPO_ROOT}",
        f"Raw log: {raw_log_path}",
        "",
        "Logic tests:",
        f"- passed: {', '.join(logic_passed) if logic_passed else 'none'}",
        f"- failed: {', '.join(logic_failed) if logic_failed else 'none'}",
        "",
        "Playwright:",
        f"- returncode: {e2e_returncode}",
        f"- passed: {passed}",
        f"- failed: {failed}",
        f"- did_not_run: {did_not_run}",
        "",
        "Failed Playwright tests:",
    ]

    if failed_tests:
        for item in failed_tests:
            lines.append(f"- {item}")
    else:
        lines.append("- none captured")

    if key_messages:
        lines.append("")
        lines.append("Key failure messages:")
        for item in key_messages:
            lines.append(f"- {item}")

    lines.extend(
        [
            "",
            "Task:",
            "Classify the failures into stale tests, flaky waits, and likely real regressions.",
            "Recommend the minimum code or test changes needed to get the suite green.",
        ]
    )

    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    log_dir = Path(args.log_dir)
    log_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    raw_log_path = log_dir / f"test-run-{stamp}.log"
    prompt_path = log_dir / f"test-prompt-{stamp}.txt"

    env = os.environ.copy()
    env["CI"] = "1"
    env["NO_COLOR"] = "1"
    env["FORCE_COLOR"] = "0"
    env["PLAYWRIGHT_FORCE_TTY"] = "0"

    print(f"Repo root: {REPO_ROOT}", flush=True)
    print(f"Log dir: {log_dir}", flush=True)

    log_lines: list[str] = []
    logic_passed: list[str] = []
    logic_failed: list[str] = []

    print("Running logic tests...", flush=True)
    for name, command in LOGIC_TESTS:
        returncode, _ = run_command(name, command, log_lines, env)
        if returncode == 0:
            logic_passed.append(name)
        else:
            logic_failed.append(name)

    print("Running Playwright suite...", flush=True)
    e2e_returncode, _ = run_command(E2E_TEST[0], E2E_TEST[1], log_lines, env)

    raw_text = "\n".join(log_lines).rstrip() + "\n"
    raw_log_path.write_text(raw_text, encoding="utf-8")

    prompt_text = build_prompt(raw_log_path, logic_passed, logic_failed, e2e_returncode, raw_text)
    prompt_path.write_text(prompt_text + "\n", encoding="utf-8")

    print(f"Raw log: {raw_log_path}", flush=True)
    print(f"Prompt: {prompt_path}", flush=True)
    print("", flush=True)
    print(prompt_text, flush=True)

    if logic_failed or e2e_returncode != 0:
        print("Completed with failures.", flush=True)
        return 1

    print("Completed successfully.", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
