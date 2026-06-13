#!/usr/bin/env bash
# Sets up a swap file on Ubuntu 24.04.
# Usage: sudo ./setup-swap.sh [SIZE_GB]
# Default swap size: 4GB (recommended for a 4GB RAM VPS)

set -euo pipefail

SWAP_SIZE_GB="${1:-4}"
SWAP_FILE="/swapfile"
SWAPPINESS=10
CACHE_PRESSURE=50

# --- helpers ----------------------------------------------------------------

info()  { echo "[INFO]  $*"; }
warn()  { echo "[WARN]  $*"; }
die()   { echo "[ERROR] $*" >&2; exit 1; }

# --- preflight --------------------------------------------------------------

[[ $EUID -eq 0 ]] || die "Run as root: sudo $0"

if swapon --show | grep -q "$SWAP_FILE"; then
    warn "Swap already active at $SWAP_FILE — nothing to do."
    swapon --show
    exit 0
fi

FREE_GB=$(df -BG / | awk 'NR==2 {gsub("G",""); print $4}')
if (( FREE_GB < SWAP_SIZE_GB + 1 )); then
    die "Not enough disk space. Need $((SWAP_SIZE_GB + 1))G free, have ${FREE_GB}G."
fi

# --- create swap file -------------------------------------------------------

info "Allocating ${SWAP_SIZE_GB}G swap file at $SWAP_FILE …"
fallocate -l "${SWAP_SIZE_GB}G" "$SWAP_FILE" || {
    warn "fallocate failed, falling back to dd …"
    dd if=/dev/zero of="$SWAP_FILE" bs=1M count=$((SWAP_SIZE_GB * 1024)) status=progress
}

chmod 600 "$SWAP_FILE"
mkswap "$SWAP_FILE"
swapon "$SWAP_FILE"

# --- persist across reboots -------------------------------------------------

FSTAB_ENTRY="$SWAP_FILE none swap sw 0 0"
if ! grep -qF "$SWAP_FILE" /etc/fstab; then
    echo "$FSTAB_ENTRY" >> /etc/fstab
    info "Added swap entry to /etc/fstab."
else
    warn "$SWAP_FILE already in /etc/fstab — skipping."
fi

# --- tune kernel swap behaviour ---------------------------------------------
# vm.swappiness=10  → only use swap under real memory pressure
# vm.vfs_cache_pressure=50 → keep filesystem cache in RAM longer

SYSCTL_CONF="/etc/sysctl.d/99-swap.conf"
cat > "$SYSCTL_CONF" <<EOF
vm.swappiness = $SWAPPINESS
vm.vfs_cache_pressure = $CACHE_PRESSURE
EOF

sysctl -p "$SYSCTL_CONF" > /dev/null
info "Kernel tuning applied: swappiness=$SWAPPINESS, vfs_cache_pressure=$CACHE_PRESSURE."

# --- summary ----------------------------------------------------------------

info "Done. Current swap:"
swapon --show
echo
free -h
