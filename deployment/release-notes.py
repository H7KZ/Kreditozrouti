#!/usr/bin/env python3
"""Print GitHub Release notes for a production release from the Conventional Commits since the previous tag.

Usage: release-notes.py VERSION SOURCE_COMMIT (from a checkout with full history and tags).
The previous release is the newest `v<digit>…` tag reachable from SOURCE_COMMIT's parents.
"""

import os
import re
import subprocess
import sys

SUBJECT = re.compile(r"(?P<type>[a-z]+)(?:\((?P<scope>[^)]*)\))?(?P<breaking>!)?: (?P<description>.+)")
SECTIONS = (("breaking", "Breaking changes"), ("feat", "Features"), ("fix", "Fixes"), ("perf", "Performance"), ("other", "Other changes"))
LIMIT = 300


def git(*args):
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True, encoding="utf-8", errors="replace").stdout


def previous_tag(source):
    done = subprocess.run(["git", "describe", "--tags", "--abbrev=0", "--match", "v[0-9]*", f"{source}^"], capture_output=True, text=True, encoding="utf-8")
    return done.stdout.strip() if done.returncode == 0 else ""


def notes(version, source):
    previous = previous_tag(source)
    span = f"{previous}..{source}" if previous else source
    log = git("log", "--no-merges", "--format=%H%x1f%s%x1f%b%x1e", span)
    groups = {key: [] for key, _ in SECTIONS}
    for record in filter(None, (r.strip("\n") for r in log.split("\x1e"))):
        sha, subject, body = (record.split("\x1f") + ["", ""])[:3]
        match = SUBJECT.fullmatch(subject.strip())
        if match is None:
            groups["other"].append(f"- {subject.strip()} ({sha[:8]})")
            continue
        scope = f"**{match['scope']}:** " if match["scope"] else ""
        line = f"- {scope}{match['description']} ({sha[:8]})"
        if match["breaking"] or re.search(r"^BREAKING[ -]CHANGE:", body, re.M):
            groups["breaking"].append(line)
        elif match["type"] in groups:
            groups[match["type"]].append(line)
        else:
            groups["other"].append(f"- {match['type']}: {scope}{match['description']} ({sha[:8]})")

    server = os.environ.get("GITHUB_SERVER_URL", "https://github.com")
    repository = os.environ.get("GITHUB_REPOSITORY", "")
    out = [f"Production release `{version}` of `{source[:12]}`."]
    if previous and repository:
        out.append(f"Changes since `{previous}`: {server}/{repository}/compare/{previous}...{source}")
    elif not previous:
        out.append("First tagged release; the list covers the whole history.")
    shown = 0
    for key, title in SECTIONS:
        if not groups[key]:
            continue
        out += ["", f"## {title}", ""]
        for line in groups[key]:
            if shown == LIMIT:
                break
            out.append(line)
            shown += 1
    total = sum(len(lines) for lines in groups.values())
    if total == 0:
        out += ["", "No commits since the previous release (same source redeployed)."]
    elif total > shown:
        out += ["", f"... and {total - shown} more commits."]
    return "\n".join(out) + "\n"


def main():
    if len(sys.argv) != 3 or not re.fullmatch(r"\d{4}\.\d{2}\.\d{2}-[1-9][0-9]*", sys.argv[1]) or not re.fullmatch(r"[0-9a-f]{40}", sys.argv[2]):
        raise SystemExit("usage: release-notes.py VERSION(YYYY.MM.DD-N) SOURCE_COMMIT(40-hex)")
    sys.stdout.write(notes(sys.argv[1], sys.argv[2]))


if __name__ == "__main__":
    main()
