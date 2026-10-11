#!/usr/bin/env python3
"""Package deployment contents and the complete app digest set for toolkit release."""

import base64
import hashlib
import json
import os
import re
import stat
import sys
import tarfile
from pathlib import Path


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def main():
    require(len(sys.argv) == 3, "usage: package-release.py <deployment-directory> <incoming-directory>")
    source, incoming = (Path(value).resolve(strict=True) for value in sys.argv[1:])
    repository = os.environ["GITHUB_REPOSITORY"]
    slug = repository.split("/")[-1].lower()
    require(repository.lower() in ("h7kz/ohlidame", "h7kz/kreditozrouti"), "unexpected repository")
    target = os.environ["TARGET_ENVIRONMENT"]
    require(target in ("production", "development", "monitoring"), "invalid environment")
    commit = os.environ["SOURCE_COMMIT"]
    require(re.fullmatch(r"[a-f0-9]{40}", commit), "source_commit must be a full SHA")
    run, attempt = os.environ["GITHUB_RUN_ID"], os.environ["GITHUB_RUN_ATTEMPT"]
    require(all(re.fullmatch(r"[1-9][0-9]*", value) for value in (run, attempt)), "invalid workflow identity")
    lock = (source / "toolkit.lock").read_text(encoding="utf-8")
    versions = re.findall(r"^TOOLKIT_VERSION=([0-9]+\.[0-9]+\.[0-9]+)$", lock, re.M)
    require(len(versions) == 1, "invalid toolkit version pin")
    require(tuple(map(int, versions[0].split("."))) >= (0, 8, 1), "snapshot API requires toolkit >=0.8.1; await reviewed repin")
    app_services = ["api", "web", "scraper"] + (["mcp"] if slug == "kreditozrouti" else [])
    services = [] if target == "monitoring" else app_services.copy()
    if slug == "ohlidame" and target == "development":
        services.append("test-eshop")
    prefix = repository.lower()
    images, variables, digests = {}, {}, {}
    if target != "monitoring":
        variables.update(IMAGE_REGISTRY="ghcr.io", IMAGE_PREFIX=prefix)
        for service in services:
            key = service.upper().replace("-", "_")
            digest = os.environ.get(key + "_DIGEST", "")
            require(re.fullmatch(r"sha256:[a-f0-9]{64}", digest), f"complete release requires {service} digest")
            digests[service] = digest
            images[service] = f"ghcr.io/{prefix}/{service}@{digest}"
            # Existing Compose files concatenate the reference suffix to repository/service.
            variables[key + "_IMAGE_REFERENCE"] = "@" + digest
            variables[key + "_IMAGE_TAG"] = commit
        domain = os.environ["APP_DOMAIN"]
        require(re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?", domain), "DOMAIN must be a hostname")
        health = [f"https://{domain}/", f"https://{domain}/api/health"]
        if slug == "kreditozrouti":
            health.append(f"https://{domain}/mcp/health")
    else:
        # Monitoring readiness is checked inside the network by the post-deploy hook.
        health = []
    project = slug + ("-dev" if target == "development" else "-monitoring" if target == "monitoring" else "")
    manifest = {
        "schema_version": 1,
        "repository": slug,
        "environment": target,
        "release_id": f"{commit}-{run}-{attempt}",
        "source_commit": commit,
        "project": project,
        "compose_files": [f"{target}/networks.yml", f"{target}/volumes.yml", f"{target}/docker-compose.{target}.yml"],
        "images": images,
        "health_urls": health,
        "environment_variables": variables,
    }
    encoded = os.environ.get("QUALIFICATION_B64", "")
    if target == "production":
        require(encoded, "production requires the validated development qualification")
        raw = base64.b64decode(encoded, validate=True)
        require(base64.b64encode(raw).decode("ascii") == encoded, "noncanonical qualification encoding")
        checksum = os.environ.get("QUALIFICATION_SHA256", "")
        require(re.fullmatch(r"[a-f0-9]{64}", checksum) and hashlib.sha256(raw).hexdigest() == checksum, "qualification artifact checksum mismatch")
        document = json.loads(raw)
        require(set(document) == {"schema_version", "repository", "workflow_path", "workflow_run_id", "workflow_run_attempt", "environment", "source_commit", "services"}, "unexpected qualification fields")
        require(raw == (json.dumps(document, sort_keys=True, indent=2) + "\n").encode("utf-8"), "noncanonical qualification JSON")
        expected_workflow = ".github/workflows/deploy.yml" if slug == "ohlidame" else ".github/workflows/deploy-all.yml"
        require(document.get("schema_version") == 1 and document.get("repository") == repository and document.get("environment") == "development" and document.get("workflow_path") == expected_workflow, "qualification identity mismatch")
        require(document.get("source_commit") == commit, "qualification source mismatch")
        require(all(isinstance(document.get(key), str) and re.fullmatch(r"[1-9][0-9]*", document[key]) for key in ("workflow_run_id", "workflow_run_attempt")), "invalid qualification run identity")
        require(document.get("services") == {key: digests[key] for key in app_services}, "production must promote every qualified application digest together")
        manifest["qualification"] = document
    else:
        require(not encoded and not os.environ.get("QUALIFICATION_SHA256"), "qualification is production-only")
    if target == "monitoring":
        manifest.update(runtime_directories=["monitoring/.secrets"], prepare_script="monitoring/prepare.sh", post_deploy_script="monitoring/post-deploy.sh")
    # Only the selected Compose model and its support files enter the archive.
    members = [source / "toolkit.lock", source / "deploy.sh"]
    members += [source / target] + sorted((source / target).rglob("*"))
    for path in members:
        relative = path.relative_to(source)
        require(all(part not in (".", "..", ".env", ".secrets", ".generated", "__pycache__") and not part.startswith(".env.") for part in relative.parts), "secret/generated path in deployment bundle")
        require(not any(ord(char) < 32 or char in "\\:" for char in relative.as_posix()), "unsafe archive path")
        mode = path.lstat().st_mode
        require(stat.S_ISREG(mode) or stat.S_ISDIR(mode), "archive supports only regular files/directories; symlinks forbidden")
    archive = incoming / "release.tar.gz"
    require(not any((incoming / name).exists() for name in ("release.tar.gz", "release.sha256", "manifest.json")), "incoming packet already exists")
    with tarfile.open(archive, "x:gz", format=tarfile.USTAR_FORMAT) as output:
        for path in members:
            info = output.gettarinfo(str(path), arcname=path.relative_to(source).as_posix())
            info.uid = info.gid = 0
            info.uname = info.gname = ""
            # Hooks execute as the deploy user even when the checkout was made on Windows.
            info.mode = 0o755 if info.isdir() or path.suffix == ".sh" else 0o644
            if info.isfile():
                with path.open("rb") as contents:
                    output.addfile(info, contents)
            else:
                output.addfile(info)
    (incoming / "release.sha256").write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + "  release.tar.gz\n", encoding="ascii")
    (incoming / "manifest.json").write_text(json.dumps(manifest, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        output.write(f"toolkit_version={versions[0]}\n")


if __name__ == "__main__":
    main()
