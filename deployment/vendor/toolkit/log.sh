#!/usr/bin/env bash
# Managed by toolkit vendoring (Toolkit repository, docs/conventions.md). Do not edit this copy.
#
# Shared logging for repository scripts. Source it, then use:
#   log_info "message"     deploy.sh: message
#   log_ok "message"       deploy.sh: ok: message
#   log_warn "message"     deploy.sh: warning: message
#   log_error "message"    deploy.sh: error: message
#   log_step "title"       deploy.sh: == title ==
#   die "message"          log_error, then exit 1 (die 2 "message" for usage errors)
# Everything goes to stderr so stdout stays data. Inside GitHub Actions, warnings and errors are
# also annotations. Set LOG_TAG to override the script name prefix.

LOG_TAG="${LOG_TAG:-$(basename -- "${BASH_SOURCE[1]:-$0}")}"

_log_line() {
  printf '%s: %s\n' "$LOG_TAG" "$1" >&2
}

log_info() { _log_line "$*"; }
log_ok() { _log_line "ok: $*"; }
log_step() { _log_line "== $* =="; }

log_warn() {
  if [[ "${GITHUB_ACTIONS:-}" == true ]]; then
    printf '::warning title=%s::%s\n' "$LOG_TAG" "$*" >&2
  else
    _log_line "warning: $*"
  fi
}

log_error() {
  if [[ "${GITHUB_ACTIONS:-}" == true ]]; then
    printf '::error title=%s::%s\n' "$LOG_TAG" "$*" >&2
  else
    _log_line "error: $*"
  fi
}

die() {
  local status=1
  if [[ "${1:-}" =~ ^[0-9]+$ && $# -gt 1 ]]; then
    status="$1"
    shift
  fi
  log_error "$*"
  exit "$status"
}
