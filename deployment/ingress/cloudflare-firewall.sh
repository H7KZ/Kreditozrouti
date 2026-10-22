#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# cloudflare-firewall.sh
#
# Restricts :80 and :443 to Cloudflare's edge ranges using nftables.
#
# Why this matters more than any Traefik setting: if your origin IP is
# reachable directly, an attacker skips Cloudflare entirely - no WAF, no DDoS
# absorption, no bot management, and your rate limits key off a spoofable
# header. Origin IPs leak constantly (old DNS records, mail headers, TLS
# certificate transparency logs, a misconfigured subdomain).
#
# This drops those packets at the kernel, before Traefik allocates a
# connection. It is strictly stronger than the cloudflare-only@file middleware,
# which still costs you a TLS handshake per attempt.
#
# Usage:
#   sudo bash ./cloudflare-firewall.sh --dry-run   # print the ruleset only
#   sudo deployment/toolkit with-lock --repository kreditozrouti --environment ingress --host-window --action maintenance -- bash deployment/ingress/cloudflare-firewall.sh
#
# Standalone servers only (this repository's own ingress): enable the commented RECONCILE_BEFORE
# and cloudflare-firewall job lines in deployment/toolkit.conf. Toolkit then runs it without
# arguments, under the repository lock and host window, at boot (before containers are reconciled)
# and weekly (Cloudflare does change these ranges); `toolkit install` generates both.
# On a shared host that already runs Infrastructure's firewall, do NOT enable it here.
#
# IMPORTANT: this locks out direct access, including your own. Make sure SSH is
# on a different port and is not covered by these rules (it is not, by default
# - only 80 and 443 are touched). Also add any monitoring probes to
# EXTRA_ALLOWED before running.
# ==============================================================================

readonly TABLE="inet cloudflare_origin"
readonly V4_URL="https://www.cloudflare.com/ips-v4"
readonly V6_URL="https://www.cloudflare.com/ips-v6"

# Extra sources allowed to hit 80/443 directly: uptime monitors, a bastion,
# your own IP for debugging. Space separated CIDRs.
EXTRA_ALLOWED_V4="${EXTRA_ALLOWED_V4:-}"
EXTRA_ALLOWED_V6="${EXTRA_ALLOWED_V6:-}"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

command -v nft >/dev/null 2>&1 || { echo "nftables (nft) is not installed" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl is not installed" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "python3 is not installed" >&2; exit 1; }

fetch() {
    curl -fsSL --max-time 15 --retry 3 "$1" | grep -E '^[0-9a-fA-F:.]+/[0-9]+$'
}

v4="$(fetch "$V4_URL")" || { echo "Failed to fetch Cloudflare IPv4 ranges" >&2; exit 1; }
v6="$(fetch "$V6_URL")" || { echo "Failed to fetch Cloudflare IPv6 ranges" >&2; exit 1; }

# Sanity check before we lock ourselves out of our own web ports.
[[ $(wc -l <<<"$v4") -ge 10 ]] || { echo "Suspiciously few IPv4 ranges; aborting" >&2; exit 1; }
[[ $(wc -l <<<"$v6") -ge 5  ]] || { echo "Suspiciously few IPv6 ranges; aborting" >&2; exit 1; }

cidr_list() {
    python3 -c 'import ipaddress,sys
family=int(sys.argv[1]); networks=set()
for token in sys.stdin.read().split():
    network=ipaddress.ip_network(token, strict=False)
    if network.version != family: raise ValueError("CIDR address family mismatch")
    networks.add(network)
print(",".join(str(network) for network in ipaddress.collapse_addresses(networks)))' "$1"
}
v4_list="$(printf '%s\n%s\n' "$v4" "$EXTRA_ALLOWED_V4" | cidr_list 4)"
v6_list="$(printf '%s\n%s\n' "$v6" "$EXTRA_ALLOWED_V6" | cidr_list 6)"

# Filter locally addressed ingress BEFORE Docker DNAT (priority -100).
# INPUT alone misses published bridge ports: they traverse FORWARD instead.
read -r -d '' RULES <<EOF || true
table ${TABLE} {
    set cf_v4 {
        type ipv4_addr
        flags interval
        elements = { ${v4_list} }
    }
    set cf_v6 {
        type ipv6_addr
        flags interval
        elements = { ${v6_list} }
    }
    chain prerouting {
        type filter hook prerouting priority -110; policy accept;

        # Never interfere with established traffic or loopback.
        ct state established,related accept
        iif lo accept

        # Docker's own bridges must keep working.
        iifname "docker0" accept
        iifname "br-*" accept

        # Do not constrain ordinary routed traffic or container egress.
        fib daddr type != local accept

        # HTTP/HTTPS, TCP and QUIC over UDP.
        tcp dport { 80, 443 } ip  saddr @cf_v4 accept
        tcp dport { 80, 443 } ip6 saddr @cf_v6 accept
        udp dport 443         ip  saddr @cf_v4 accept
        udp dport 443         ip6 saddr @cf_v6 accept

        # Anything else aimed at the web ports is dropped silently. DROP, not
        # REJECT: a scanner learns nothing from a timeout.
        tcp dport { 80, 443 } drop
        udp dport 443 drop
    }
}
EOF

if [[ $DRY_RUN -eq 1 ]]; then
    printf '%s\n' "$RULES"
    exit 0
fi

# Validate and replace in ONE transaction. A rejected update leaves the old
# protection intact, including when another process changes it after the check.
rules_file="$(mktemp)"
trap 'rm -f -- "$rules_file"' EXIT
tables="$(nft list tables)"
if grep -Fxq "table $TABLE" <<<"$tables"; then
    printf 'delete table %s\n' "$TABLE" >"$rules_file"
fi
printf '%s\n' "$RULES" >>"$rules_file"
nft --check --file "$rules_file"
nft --file "$rules_file"

echo "Applied: $(wc -l <<<"$v4") IPv4 and $(wc -l <<<"$v6") IPv6 Cloudflare ranges."
echo "Ports 80/443 now accept traffic from Cloudflare only."
echo
echo "Persist across reboots with one of:"
echo "  nft list ruleset > /etc/nftables.conf   (if you manage nftables directly)"
echo "  or rely on deployment/toolkit.conf: it re-applies this script at boot and weekly."
