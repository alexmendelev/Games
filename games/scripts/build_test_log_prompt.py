from __future__ import annotations

import argparse
import re
from pathlib import Path


LOG_GLOB = "playwright-plugin-diagnostic-*.log"


def latest_log_path(log_dir: Path) -> Path:
    matches = sorted(log_dir.glob(LOG_GLOB), key=lambda path: path.stat().st_mtime, reverse=True)
    if not matches:
        raise FileNotFoundError(f"No log files matching {LOG_GLOB!r} found in {log_dir}")
    return matches[0]


def find_first(lines: list[str], pattern: str) -> str | None:
    regex = re.compile(pattern)
    for line in lines:
        if regex.search(line):
            return line.strip()
    return None


def collect_failed_tests(lines: list[str]) -> list[str]:
    failed = []
    capture = False
    for line in lines:
        stripped = line.rstrip()
        if re.search(r"^\s*\d+\s+failed\b", stripped):
            capture = True
            continue
        if not capture:
            continue
        if not stripped.strip():
            continue
        if re.search(r"^\s*\d+\s+did not run\b", stripped):
            break
        if re.search(r"^\s*\[chromium\]\s+", stripped):
            failed.append(re.sub(r"^\s*", "", stripped))
    return failed


def collect_failure_reasons(lines: list[str], limit: int = 6) -> list[str]:
    reasons = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if (
            stripped.startswith("Error: ")
            or stripped.startswith("browserType.launch: ")
            or stripped.startswith("Test timeout of ")
        ):
            if stripped not in reasons:
                reasons.append(stripped)
        if len(reasons) >= limit:
            break
    return reasons


def extract_summary_counts(text: str) -> tuple[str | None, str | None, str | None]:
    passed = failed = did_not_run = None

    passed_match = re.search(r"(\d+)\s+passed\b", text)
    failed_match = re.search(r"(\d+)\s+failed\b", text)
    skipped_match = re.search(r"(\d+)\s+did not run\b", text)

    if passed_match:
        passed = passed_match.group(1)
    if failed_match:
        failed = failed_match.group(1)
    if skipped_match:
        did_not_run = skipped_match.group(1)

    return passed, failed, did_not_run


def build_prompt(log_path: Path, text: str) -> str:
    lines = text.splitlines()
    passed, failed, did_not_run = extract_summary_counts(text)
    launched = "yes" if "LAUNCHED" in text else "no"
    spawn_eperm = "yes" if "spawn EPERM" in text else "no"

    node_line = find_first(lines, r"\bv\d+\.\d+\.\d+\b")
    playwright_line = find_first(lines, r"Playwright Version|Version \d+\.\d+|\bplaywright\b")
    defender_mode = find_first(lines, r"AMRunningMode\s*:")

    failed_tests = collect_failed_tests(lines)
    failure_reasons = collect_failure_reasons(lines)

    summary_parts = []
    if passed is not None:
        summary_parts.append(f"passed={passed}")
    if failed is not None:
        summary_parts.append(f"failed={failed}")
    if did_not_run is not None:
        summary_parts.append(f"did_not_run={did_not_run}")
    summary_line = ", ".join(summary_parts) if summary_parts else "no aggregate counts found"

    result = [
        "Use this log summary to diagnose the Playwright environment and failing tests.",
        f"Log file: {log_path}",
        "",
        "Environment:",
        f"- direct_playwright_launch_worked: {launched}",
        f"- spawn_eperm_seen: {spawn_eperm}",
    ]

    if node_line:
        result.append(f"- node: {node_line}")
    if playwright_line:
        result.append(f"- playwright: {playwright_line}")
    if defender_mode:
        result.append(f"- defender: {defender_mode}")

    result.extend(
        [
            "",
            f"Test summary: {summary_line}",
            "",
            "Failed tests:",
        ]
    )

    if failed_tests:
        for item in failed_tests[:20]:
            result.append(f"- {item}")
    else:
        result.append("- none captured")

    result.extend(
        [
            "",
            "Key failure messages:",
        ]
    )

    if failure_reasons:
        for item in failure_reasons:
            result.append(f"- {item}")
    else:
        result.append("- none captured")

    result.extend(
        [
            "",
            "Task:",
            "Identify which failures are environment issues, which are stale tests, and which are likely real regressions.",
            "Prioritize the smallest set of code or test changes needed to get the suite green.",
        ]
    )

    return "\n".join(result)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Read a Playwright diagnostic log and emit a short prompt with relevant information."
    )
    parser.add_argument(
        "logfile",
        nargs="?",
        help="Path to the log file. If omitted, uses the latest matching log from C:\\tmp.",
    )
    parser.add_argument(
        "--log-dir",
        default=r"C:\tmp",
        help="Directory to search when logfile is omitted. Default: C:\\tmp",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    if args.logfile:
        log_path = Path(args.logfile)
    else:
        log_path = latest_log_path(Path(args.log_dir))

    text = log_path.read_text(encoding="utf-8", errors="replace")
    print(build_prompt(log_path, text))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
