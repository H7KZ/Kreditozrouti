#!/bin/bash
set -euo pipefail

# ==============================================================================
# Script Name: install-docker.sh
# Description: Automates the installation of Docker Engine on Ubuntu.
#              Removes old versions, sets up repo, installs, and configures user.
#
# Usage:       sudo ./install-docker.sh
# Note:        Must be run as root.
# ==============================================================================

log() {
    echo "[$(date +'%Y-%m-%dT%H:%M:%S%z')] $1"
}

if [[ $EUID -ne 0 ]]; then
   echo "Error: This script must be run as root."
   exit 1
fi

log "Starting Docker Engine installation..."

# 1. Clean old versions
log "Removing conflicting packages..."
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

# 2. Prerequisites
log "Installing prerequisites..."
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -y -q \
    ca-certificates \
    curl \
    gnupg

# 3. GPG Key and Repo
log "Setting up Docker repository..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg --yes
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# 4. Install Docker
log "Installing Docker Engine components..."
apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -y -q \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# 5. Verification
log "Verifying installation..."
if docker run --rm hello-world > /dev/null; then
    log "Docker installed and verified successfully."
else
    echo "Error: Docker failed to run hello-world."
    exit 1
fi

# 6. Post-Install Config
CURRENT_USER=$(logname 2>/dev/null || echo "$SUDO_USER")
if [ -n "$CURRENT_USER" ]; then
    usermod -aG docker "$CURRENT_USER"
    log "User '$CURRENT_USER' added to 'docker' group."
    log "Note: You must log out and back in for group changes to apply."
else
    log "Warning: Could not detect user. Run 'sudo usermod -aG docker <user>' manually."
fi

systemctl enable docker
log "Docker installation complete."
