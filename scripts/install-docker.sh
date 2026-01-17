#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Name: install-docker.sh
# Description: Automates the installation of Docker Engine on Ubuntu/Debian.
#              Removes conflicting packages, sets up official repository,
#              installs Docker, and configures user permissions.
#
# Usage:       sudo ./install-docker.sh [OPTIONS]
#
# Options:
#   -u, --user <username>   Add specific user to docker group
#   -s, --skip-test         Skip the hello-world verification test
#   -h, --help              Show help message
#
# Requirements:
#   - Must be run as root (sudo)
#   - Ubuntu 20.04+ or Debian 11+
#   - Internet connection
#
# Note: Log out and back in after installation for group changes to apply.
# ==============================================================================

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

readonly SCRIPT_NAME="$(basename "$0")"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# ------------------------------------------------------------------------------
# Functions
# ------------------------------------------------------------------------------

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%dT%H:%M:%S%z')]${NC} $1" >&2
}

usage() {
    cat << EOF
Usage: sudo $SCRIPT_NAME [OPTIONS]

Options:
    -u, --user <username>   Add specific user to docker group
    -s, --skip-test         Skip the hello-world verification test
    -h, --help              Show this help message

Examples:
    sudo $SCRIPT_NAME
    sudo $SCRIPT_NAME --user deploy
    sudo $SCRIPT_NAME --skip-test

Note: You must log out and back in for group changes to take effect.
EOF
    exit 1
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root."
        log_error "Use: sudo $SCRIPT_NAME"
        exit 1
    fi
}

detect_os() {
    if [[ -f /etc/os-release ]]; then
        # shellcheck source=/dev/null
        . /etc/os-release
        echo "$ID"
    else
        log_error "Cannot detect OS. /etc/os-release not found."
        exit 1
    fi
}

get_codename() {
    if [[ -f /etc/os-release ]]; then
        # shellcheck source=/dev/null
        . /etc/os-release
        echo "$VERSION_CODENAME"
    else
        log_error "Cannot detect OS codename."
        exit 1
    fi
}

remove_old_packages() {
    log "Removing conflicting packages..."

    local packages=(
        docker
        docker-engine
        docker.io
        containerd
        runc
        docker-compose
        docker-compose-plugin
    )

    for pkg in "${packages[@]}"; do
        if dpkg -l "$pkg" &>/dev/null; then
            apt-get remove -y "$pkg" || true
        fi
    done
}

install_prerequisites() {
    log "Installing prerequisites..."

    apt-get update -q

    DEBIAN_FRONTEND=noninteractive apt-get install -y -q \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
}

setup_repository() {
    local os="$1"

    log "Setting up Docker repository..."

    # Create keyring directory
    install -m 0755 -d /etc/apt/keyrings

    # Download and install GPG key
    local gpg_url="https://download.docker.com/linux/$os/gpg"
    local gpg_path="/etc/apt/keyrings/docker.gpg"

    curl -fsSL "$gpg_url" | gpg --dearmor -o "$gpg_path" --yes
    chmod a+r "$gpg_path"

    # Add repository
    local arch
    arch=$(dpkg --print-architecture)
    local codename
    codename=$(get_codename)

    echo "deb [arch=$arch signed-by=$gpg_path] https://download.docker.com/linux/$os $codename stable" \
        | tee /etc/apt/sources.list.d/docker.list > /dev/null
}

install_docker() {
    log "Installing Docker Engine..."

    apt-get update -q

    DEBIAN_FRONTEND=noninteractive apt-get install -y -q \
        docker-ce \
        docker-ce-cli \
        containerd.io \
        docker-buildx-plugin \
        docker-compose-plugin
}

verify_installation() {
    log "Verifying installation..."

    if docker run --rm hello-world > /dev/null 2>&1; then
        log_success "Docker installed and verified successfully."
        return 0
    else
        log_error "Docker verification failed."
        return 1
    fi
}

configure_user() {
    local user="$1"

    if [[ -n "$user" ]]; then
        if id "$user" &>/dev/null; then
            usermod -aG docker "$user"
            log_success "User '$user' added to 'docker' group."
        else
            log_warning "User '$user' does not exist. Skipping group configuration."
        fi
    fi
}

detect_current_user() {
    # Try multiple methods to detect the user who ran sudo
    local user=""

    if [[ -n "${SUDO_USER:-}" ]]; then
        user="$SUDO_USER"
    elif command -v logname &>/dev/null; then
        user=$(logname 2>/dev/null) || true
    fi

    echo "$user"
}

# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

main() {
    local target_user=""
    local skip_test=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -u|--user)
                target_user="$2"
                shift 2
                ;;
            -s|--skip-test)
                skip_test=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                log_error "Unknown parameter: $1"
                usage
                ;;
        esac
    done

    # Check root
    check_root

    log "=========================================="
    log "Docker Engine Installation"
    log "=========================================="

    # Detect OS
    local os
    os=$(detect_os)

    case "$os" in
        ubuntu|debian)
            log "Detected OS: $os"
            ;;
        *)
            log_error "Unsupported OS: $os"
            log_error "This script supports Ubuntu and Debian only."
            exit 1
            ;;
    esac

    # Installation steps
    remove_old_packages
    install_prerequisites
    setup_repository "$os"
    install_docker

    # Verify (unless skipped)
    if [[ "$skip_test" != true ]]; then
        verify_installation
    fi

    # Configure user
    if [[ -z "$target_user" ]]; then
        target_user=$(detect_current_user)
    fi

    if [[ -n "$target_user" ]]; then
        configure_user "$target_user"
    else
        log_warning "Could not detect user. Run manually:"
        log_warning "  sudo usermod -aG docker <username>"
    fi

    # Enable service
    systemctl enable docker
    systemctl start docker

    log_success "=========================================="
    log_success "Docker Installation Complete"
    log_success "=========================================="
    log "Docker version: $(docker --version)"
    log "Compose version: $(docker compose version)"
    log ""
    log_warning "Note: Log out and back in for group changes to apply."
}

main "$@"
