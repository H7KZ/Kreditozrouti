#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# install.sh - install the kreditozrouti-reconcile boot recovery unit.
#
# Run once on the VPS, as root, from a checkout of this repository:
#
#   sudo bash deployment/boot-recovery/install.sh --user <deploy-user> [--home <home-dir>] [--print]
#
# Installs reconcile.sh root-owned under /usr/local/libexec/kreditozrouti-reconcile/,
# renders the unit for the deploy user. Activation is a separate operator step. Re-run after changing
# reconcile.sh or the deploy user. --print validates everything and writes the
# rendered unit to stdout without installing anything (no root needed).
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly SCRIPT_DIR
readonly UNIT_NAME="kreditozrouti-reconcile.service"
readonly TEMPLATE="${SCRIPT_DIR}/${UNIT_NAME}"
readonly SCRIPT_SRC="${SCRIPT_DIR}/reconcile.sh"
readonly DEST="/etc/systemd/system/${UNIT_NAME}"
readonly LIBEXEC_DIR="/usr/local/libexec/kreditozrouti-reconcile"
readonly TOOLKIT_BIN="/usr/local/bin/toolkit"

DEPLOY_USER=""
DEPLOY_HOME=""
PRINT_ONLY=0

die() { echo "ERROR: $*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --user) [[ $# -ge 2 ]] || die "--user needs a value"; DEPLOY_USER="$2"; shift 2 ;;
        --home) [[ $# -ge 2 ]] || die "--home needs a value"; DEPLOY_HOME="$2"; shift 2 ;;
        --print) PRINT_ONLY=1; shift ;;
        -h|--help) sed -n '4,13p' "${BASH_SOURCE[0]}"; exit 0 ;;
        *) die "Unknown argument: $1" ;;
    esac
done

[[ -f "$TEMPLATE" && -f "$SCRIPT_SRC" ]] || die "Template or reconcile.sh not found next to install.sh"
[[ -n "$DEPLOY_USER" ]] || die "--user <deploy-user> is required"

# --- Deploy-user validation ---------------------------------------------------
[[ "$DEPLOY_USER" =~ ^[A-Za-z_][A-Za-z0-9_.-]{0,31}$ ]] || die "Invalid deploy user: $DEPLOY_USER"
[[ "$DEPLOY_USER" != root ]] || die "The deploy user must not be root"
passwd_entry="$(getent passwd "$DEPLOY_USER")" || die "Deploy user does not exist: $DEPLOY_USER"
[[ "$(cut -d: -f3 <<<"$passwd_entry")" != 0 ]] || die "The deploy user must not have uid 0"
[[ -n "$DEPLOY_HOME" ]] || DEPLOY_HOME="$(cut -d: -f6 <<<"$passwd_entry")"
[[ "$DEPLOY_HOME" =~ ^/[A-Za-z0-9_./-]+$ && -d "$DEPLOY_HOME" && ! -L "$DEPLOY_HOME" ]] || die "Deploy home is unavailable or unsafe: $DEPLOY_HOME"
DEPLOY_HOME="$(realpath -e -- "$DEPLOY_HOME")"
[[ "$(stat -c '%U' "$DEPLOY_HOME")" == "$DEPLOY_USER" ]] || die "$DEPLOY_HOME must be owned by $DEPLOY_USER"

render() {
    sed -e "s|__USER__|${DEPLOY_USER}|g" \
        -e "s|__HOME__|${DEPLOY_HOME}|g" \
        "$TEMPLATE"
}

if [[ $PRINT_ONLY -eq 1 ]]; then
    render
    exit 0
fi

[[ $EUID -eq 0 ]] || die "Run as root (sudo)."
[[ -x "$TOOLKIT_BIN" ]] || die "$TOOLKIT_BIN is missing; install and activate the pinned toolkit first (deployment/install-toolkit.sh)"

echo "Installing ${UNIT_NAME}"
echo "  user: ${DEPLOY_USER}"
echo "  home: ${DEPLOY_HOME}"

install -d -o root -g root -m 0755 "$LIBEXEC_DIR"
install -o root -g root -m 0755 "$SCRIPT_SRC" "${LIBEXEC_DIR}/reconcile.sh"
install -o root -g root -m 0644 "$SCRIPT_DIR/../toolkit.lock" "${LIBEXEC_DIR}/toolkit.lock"
render > "$DEST"
chmod 644 "$DEST"

systemctl daemon-reload


echo "Installed disabled. Run manually with:  sudo systemctl start ${UNIT_NAME}"
echo "Check result with:                     systemctl status ${UNIT_NAME}"
