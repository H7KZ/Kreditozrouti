#!/usr/bin/env python3
"""Resolve one immutable source and complete image set for a manual release."""

import base64
import hashlib
import io
import json
import os
import re
import subprocess
import zipfile


SERVICES = ("api", "web", "scraper", "mcp") if os.environ.get("GITHUB_REPOSITORY", "").lower().endswith("/kreditozrouti") else ("api", "web", "scraper")
DIGEST = re.compile(r"sha256:[a-f0-9]{64}")


def require(condition, message):
    if not condition:
        raise SystemExit(message)


def command(*args):
    return subprocess.check_output(args, text=True).strip()


def api(path):
    return json.loads(command("gh", "api", path))


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate JSON key")
        result[key] = value
    return result


def resolve(ref):
    require(ref and not ref.startswith("-") and not any(ord(c) < 32 for c in ref), "invalid source ref")
    # The checkout contains all repository refs. Git resolves names locally, without shell interpolation.
    for candidate in (ref, "origin/" + ref):
        result = subprocess.run(["git", "rev-parse", "--verify", "--end-of-options", candidate + "^{commit}"], capture_output=True, text=True)
        if result.returncode == 0:
            return result.stdout.strip()
    subprocess.run(["git", "fetch", "--no-tags", "origin", ref], check=True, capture_output=True)
    return command("git", "rev-parse", "--verify", "FETCH_HEAD^{commit}")


def validate_images(images, services=SERVICES):
    require(isinstance(images, dict) and set(images) == set(services), "digests must contain every application service exactly once")
    require(all(isinstance(value, str) and DIGEST.fullmatch(value) for value in images.values()), "invalid image digest")
    return images


def promotion(repository, selected, run_id):
    def published(run):
        require(run.get("repository", {}).get("full_name") == repository, "qualification run repository mismatch")
        require(run.get("status") == "completed" and run.get("conclusion") == "success", "qualification run must be successful")
        require(run.get("path", "").split("@")[0] == ".github/workflows/deploy.yml", "qualification workflow mismatch")
        require(run.get("event") in ("push", "workflow_dispatch"), "qualification event mismatch")
        attempt = str(run.get("run_attempt", ""))
        identity = str(run.get("id", ""))
        require(re.fullmatch(r"[1-9][0-9]*", identity) and re.fullmatch(r"[1-9][0-9]*", attempt), "invalid qualification run identity")
        name = "qualified-development-release-" + attempt
        artifacts = []
        page = 1
        while True:
            batch = api(f"repos/{repository}/actions/runs/{identity}/artifacts?per_page=100&page={page}").get("artifacts", [])
            artifacts += [a for a in batch if a.get("name") == name and not a.get("expired")]
            if len(batch) < 100:
                break
            page += 1
        require(len(artifacts) == 1, "qualification artifact missing, expired or ambiguous")
        artifact = artifacts[0]
        require(str(artifact.get("workflow_run", {}).get("id")) == identity, "artifact run mismatch")
        payload = subprocess.check_output(["gh", "api", f"repos/{repository}/actions/artifacts/{artifact['id']}/zip"])
        expected_archive = artifact.get("digest", "")
        require(expected_archive == "sha256:" + hashlib.sha256(payload).hexdigest(), "qualification artifact archive checksum mismatch")
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            require(archive.namelist() == ["release-manifest.json"], "unexpected qualification artifact files")
            raw = archive.read("release-manifest.json")
        document = json.loads(raw, object_pairs_hook=unique_object)
        require(set(document) == {"schema_version", "repository", "workflow_path", "workflow_run_id", "workflow_run_attempt", "environment", "source_commit", "services"}, "unexpected qualification fields")
        require(raw == (json.dumps(document, sort_keys=True, indent=2) + "\n").encode(), "noncanonical qualification manifest")
        require(document.get("schema_version") == 1 and document.get("repository") == repository and document.get("workflow_path") == ".github/workflows/deploy.yml" and document.get("environment") == "development", "qualification identity mismatch")
        require(document.get("workflow_run_id") == identity and document.get("workflow_run_attempt") == attempt, "qualification run or attempt mismatch")
        source = document.get("source_commit", "")
        require(isinstance(source, str) and re.fullmatch(r"[a-f0-9]{40}", source), "invalid qualification source")
        require(resolve(source) == source, "qualification source absent from repository")
        validate_images(document.get("services"))
        require(not selected or source == selected, "qualification source does not match selected ref")
        return source, document["services"], raw

    if run_id:
        require(re.fullmatch(r"[1-9][0-9]*", run_id), "run_id must be a positive integer")
        return published(api(f"repos/{repository}/actions/runs/{run_id}"))
    page = 1
    while True:
        runs = api(f"repos/{repository}/actions/workflows/deploy.yml/runs?status=success&per_page=100&page={page}").get("workflow_runs", [])
        for run in runs:
            try:
                return published(run)
            except (SystemExit, ValueError, KeyError, zipfile.BadZipFile, subprocess.CalledProcessError):
                continue
        if len(runs) < 100:
            raise SystemExit("no successful qualified development release matches the selection")
        page += 1


def main():
    env = os.environ
    repository = env["GITHUB_REPOSITORY"]
    require(repository.lower() in ("h7kz/kreditozrouti", "h7kz/ohlidame"), "unexpected repository")
    target = env.get("TARGET_ENVIRONMENT", "development")
    mode = env.get("RELEASE_MODE", "reuse")
    require(target in ("production", "development"), "unsupported app environment")
    require(mode in ("build", "reuse", "existing", "promote"), "unsupported release mode")
    services = SERVICES + (("test-eshop",) if repository.lower().endswith("/ohlidame") and target == "development" else ())
    selected_ref, run_id = env.get("SOURCE_REF", ""), env.get("PROMOTE_RUN_ID", "")
    tag, encoded_images = env.get("IMAGE_TAG", ""), env.get("IMAGE_DIGESTS", "")
    require(not run_id or mode == "promote", "run_id is promote-only")
    require(not encoded_images or mode == "existing", "digests are existing-only")
    require(not tag or mode in ("reuse", "existing"), "image_tag is reuse/existing-only")
    require(not (tag and encoded_images), "choose image_tag or digests")
    require(env.get("NO_CACHE", "false") != "true" or mode in ("build", "reuse"), "no_cache requires build/reuse")
    source = resolve(selected_ref or env["GITHUB_SHA"]) if mode != "promote" or selected_ref else ""
    images, raw = {}, b""
    if mode == "promote":
        source, images, raw = promotion(repository, source, run_id)
        tag = f"{target}-{source}"
    else:
        tag = tag or f"{target}-{source}"
        require(re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}", tag), "invalid image_tag")
        if encoded_images:
            images = validate_images(json.loads(encoded_images, object_pairs_hook=unique_object), services)
        elif mode in ("reuse", "existing"):
            for service in services:
                reference = f"ghcr.io/{repository.lower()}/{service}:{tag}"
                result = subprocess.run(["docker", "buildx", "imagetools", "inspect", reference, "--format", "{{json .Manifest}}"], text=True, capture_output=True)
                if result.returncode == 0:
                    value = json.loads(result.stdout).get("digest", "")
                    require(isinstance(value, str) and DIGEST.fullmatch(value), f"invalid registry digest for {service}")
                    images[service] = value
                elif mode == "existing":
                    raise SystemExit(f"existing mode requires a published {service} image at {tag}")
    outputs = {"source_commit": source, "mode": mode, "image_tag": tag, "manifest_b64": base64.b64encode(raw).decode(), "manifest_sha256": hashlib.sha256(raw).hexdigest() if raw else ""}
    outputs.update({service.replace("-", "_") + "_digest": images.get(service, "") for service in services})
    with open(env["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
        for key, value in outputs.items():
            output.write(f"{key}={value}\n")
    if env.get("GITHUB_STEP_SUMMARY"):
        with open(env["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
            summary.write(f"Source: `{source}`\n\nTarget: `{target}`; mode: `{mode}`; lookup tag: `{tag}`\n\n")
            if raw:
                qualification = json.loads(raw)
                summary.write(f"Qualified run: {qualification['workflow_run_id']} attempt {qualification['workflow_run_attempt']}\n\n")
            summary.write("| Service | Selected digest |\n| --- | --- |\n")
            for service in services:
                summary.write(f"| {service} | {images.get(service, 'build from selected source')} |\n")
    print(f"Resolved source={source} target={target} mode={mode} existing_images={','.join(images)}")


if __name__ == "__main__":
    main()
