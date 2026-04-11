from __future__ import annotations

import argparse
import locale
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


LOG_DIR_DEFAULT = Path(r"C:\tmp")


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


@dataclass
class CommandResult:
    name: str
    argv: list[str]
    returncode: int
    output: str
    started_at: datetime
    ended_at: datetime

    @property
    def succeeded(self) -> bool:
        return self.returncode == 0


def now_stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def console(message: str) -> None:
    print(message, flush=True)


def clean_output(text: str) -> str:
    text = ANSI_RE.sub("", text)
    replacements = {
        "│": "|",
        "┃": "|",
        "║": "|",
        "›": ">",
        "✓": "[PASS]",
        "✘": "[FAIL]",
        "×": "x",
    }
    for source, target in replacements.items():
        text = text.replace(source, target)
    return text


def decode_output(data: bytes) -> str:
    candidates = []
    encodings = [
        "utf-8",
        "utf-8-sig",
        locale.getpreferredencoding(False) or "utf-8",
        "cp65001",
        "cp1252",
        "cp1255",
    ]
    seen = set()
    for encoding in encodings:
        if not encoding or encoding in seen:
            continue
        seen.add(encoding)
        try:
            text = data.decode(encoding)
        except UnicodeDecodeError:
            text = data.decode(encoding, errors="replace")
        score = text.count("\ufffd") + text.count("Γ") + text.count("╫") + text.count("â")
        candidates.append((score, text))
    candidates.sort(key=lambda item: item[0])
    return clean_output(candidates[0][1] if candidates else data.decode("utf-8", errors="replace"))


def run_command(name: str, argv: list[str], cwd: Path) -> CommandResult:
    started_at = datetime.now()
    console(f"[start] {name}: {' '.join(argv)}")
    env = os.environ.copy()
    env["CI"] = "1"
    env["NO_COLOR"] = "1"
    env["FORCE_COLOR"] = "0"
    env["npm_config_color"] = "false"
    env["PLAYWRIGHT_FORCE_TTY"] = "0"
    env["TERM"] = "dumb"
    completed = subprocess.run(
        argv,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=False,
        shell=False,
        env=env,
    )
    ended_at = datetime.now()
    duration = ended_at - started_at
    console(f"[done]  {name}: exit={completed.returncode} duration={duration}")
    return CommandResult(
        name=name,
        argv=argv,
        returncode=completed.returncode,
        output=decode_output(completed.stdout),
        started_at=started_at,
        ended_at=ended_at,
    )


def write_raw_log(log_path: Path, repo_root: Path, results: list[CommandResult]) -> None:
    lines: list[str] = []
    lines.append(f"Run started: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"Repo root: {repo_root}")
    lines.append(f"Python: {sys.executable}")
    lines.append(f"Python version: {sys.version}")
    lines.append("")
    for result in results:
        lines.append(f"=== {result.name} ===")
        lines.append(f"cwd: {repo_root}")
        lines.append(f"command: {' '.join(result.argv)}")
        lines.append(f"started_at: {result.started_at.isoformat(timespec='seconds')}")
        lines.append(f"ended_at: {result.ended_at.isoformat(timespec='seconds')}")
        lines.append(f"returncode: {result.returncode}")
        lines.append("--- output ---")
        lines.append(result.output.rstrip())
        lines.append("")
    log_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def extract_playwright_counts(text: str) -> tuple[str | None, str | None, str | None]:
    passed = failed = did_not_run = None
    match = re.search(r"(\d+)\s+passed\b", text)
    if match:
        passed = match.group(1)
    match = re.search(r"(\d+)\s+failed\b", text)
    if match:
        failed = match.group(1)
    match = re.search(r"(\d+)\s+did not run\b", text)
    if match:
        did_not_run = match.group(1)
    return passed, failed, did_not_run


def collect_failed_tests(text: str) -> list[str]:
    lines = text.splitlines()
    failed: list[str] = []
    capture = False
    for line in lines:
        if re.search(r"^\s*\d+\s+failed\b", line):
            capture = True
            continue
        if not capture:
            continue
        if re.search(r"^\s*\d+\s+did not run\b", line):
            break
        if re.search(r"^\s*\[chromium\]\s+", line):
            failed.append(line.strip())
    return failed


def collect_error_blocks(text: str, limit: int = 8) -> list[str]:
    lines = text.splitlines()
    items: list[str] = []
    for idx, line in enumerate(lines):
        stripped = line.strip()
        if not (
            stripped.startswith("Error: ")
            or stripped.startswith("Test timeout of ")
            or stripped.startswith("browserType.launch: ")
        ):
            continue
        block = [stripped]
        for extra in lines[idx + 1 : idx + 4]:
            extra = extra.rstrip()
            if not extra.strip():
                break
            if extra.startswith("    ") or extra.startswith("      "):
                block.append(extra.strip())
            else:
                break
        text_block = " | ".join(block)
        if text_block not in items:
            items.append(text_block)
        if len(items) >= limit:
            break
    return items


def build_prompt(repo_root: Path, results: list[CommandResult], raw_log_path: Path) -> str:
    logic_results = [result for result in results if result.name != E2E_TEST[0]]
    e2e_result = next((result for result in results if result.name == E2E_TEST[0]), None)

    logic_passed = [result.name for result in logic_results if result.succeeded]
    logic_failed = [result.name for result in logic_results if not result.succeeded]

    lines: list[str] = []
    lines.append("Use this test summary to diagnose failures and decide the next smallest fixes.")
    lines.append(f"Repo: {repo_root}")
    lines.append(f"Raw log: {raw_log_path}")
    lines.append("")
    lines.append("Logic tests:")
    lines.append(f"- passed: {', '.join(logic_passed) if logic_passed else 'none'}")
    lines.append(f"- failed: {', '.join(logic_failed) if logic_failed else 'none'}")

    if e2e_result is None:
        lines.append("")
        lines.append("Playwright:")
        lines.append("- not run")
        return "\n".join(lines)

    passed, failed, did_not_run = extract_playwright_counts(e2e_result.output)
    failed_tests = collect_failed_tests(e2e_result.output)
    error_blocks = collect_error_blocks(e2e_result.output)

    lines.append("")
    lines.append("Playwright:")
    lines.append(f"- returncode: {e2e_result.returncode}")
    lines.append(f"- passed: {passed or 'unknown'}")
    lines.append(f"- failed: {failed or 'unknown'}")
    lines.append(f"- did_not_run: {did_not_run or 'unknown'}")

    lines.append("")
    lines.append("Failed Playwright tests:")
    if failed_tests:
        for item in failed_tests[:20]:
            lines.append(f"- {item}")
    else:
        lines.append("- none captured")

    lines.append("")
    lines.append("Key error messages:")
    if error_blocks:
        for item in error_blocks:
            lines.append(f"- {item}")
    else:
        lines.append("- none captured")

    lines.append("")
    lines.append("Task:")
    lines.append("Classify the failures into stale tests, flaky waits, and likely real regressions.")
    lines.append("Recommend the minimum code or test changes needed to get the suite green.")

    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the repo test suite, save a raw log, and emit a short prompt summary.")
    parser.add_argument(
        "--repo-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Repository root. Defaults to the parent of this script directory.",
    )
    parser.add_argument(
        "--log-dir",
        default=str(LOG_DIR_DEFAULT),
        help=r"Directory for raw logs and prompt files. Default: C:\tmp",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    log_dir = Path(args.log_dir).resolve()
    log_dir.mkdir(parents=True, exist_ok=True)

    results: list[CommandResult] = []
    console(f"Repo root: {repo_root}")
    console(f"Log dir: {log_dir}")
    console("Running logic tests...")
    for name, argv in LOGIC_TESTS:
        results.append(run_command(name, argv, repo_root))
    console("Running Playwright suite...")
    results.append(run_command(E2E_TEST[0], E2E_TEST[1], repo_root))

    stamp = now_stamp()
    raw_log_path = log_dir / f"test-run-{stamp}.log"
    prompt_path = log_dir / f"test-prompt-{stamp}.txt"

    write_raw_log(raw_log_path, repo_root, results)
    prompt_text = build_prompt(repo_root, results, raw_log_path)
    prompt_path.write_text(prompt_text + "\n", encoding="utf-8")

    console(f"Raw log: {raw_log_path}")
    console(f"Prompt: {prompt_path}")
    console("")
    console(prompt_text)

    if any(not result.succeeded for result in results):
        console("Completed with failures.")
        return 1
    console("Completed successfully.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
