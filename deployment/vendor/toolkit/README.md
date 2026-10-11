# Toolkit 0.9.1

Ubuntu 26.04 amd64. Requires Bash, Python 3, GNU tar/coreutils, flock, systemd;
release deployment also requires Docker Engine + Compose plugin and rsync.
Docker, proxy, app secrets and app services are configured separately.
Obtain this bundle through a trusted channel; SHA-256 detects corruption, not authorship.

```bash
sha256sum -c toolkit-0.9.1.tar.gz.sha256
tar -xzf toolkit-0.9.1.tar.gz
# Choose your deployment account. Host CLI stays inactive by default.
sudo bash toolkit/packaging/install.sh --archive "$PWD/toolkit-0.9.1.tar.gz" \
  --checksum "$PWD/toolkit-0.9.1.tar.gz.sha256" --deploy-user "YOUR_DEPLOY_USER"
# Add --activate to select this version for manual admin/boot commands.
# Use --ci-only to install just the CI runner and optional account permission.
sudo /opt/toolkit/releases/0.9.1/bin/toolkit activate 0.9.1
sudo install -d -m 0755 /etc/toolkit
sudo cp toolkit/config/host.conf.example /etc/toolkit/host.conf
sudoedit /etc/toolkit/host.conf
toolkit validate --config /etc/toolkit/host.conf
toolkit plan --config /etc/toolkit/host.conf
sudo toolkit apply --config /etc/toolkit/host.conf --module swap
sudo toolkit apply --config /etc/toolkit/host.conf --module docker-logs
```

Only swap and Docker log policy are supported provisioning modules. Configuration is
literal KEY=value; no shell expansion. Inspect toolkit/README.md for options/limits.
Installation never deploys apps, enables timers, restarts Docker or applies host policy.

CI sends this archive, checksum and toolkit.lock with each operation, including rollback:

```bash
sudo -n /usr/local/libexec/toolkit-run-bundle --archive "$PWD/toolkit-0.9.1.tar.gz" \
  --checksum "$PWD/toolkit-0.9.1.tar.gz.sha256" --lock "$PWD/toolkit.lock" -- version
```

The runner verifies/stages private code and runs that bundle. It never reads or changes
/opt/toolkit/current. Both processes share /run/lock/toolkit and /var/lib/toolkit.
Deploy accounts are trusted root-equivalent identities; bundle checks are integrity checks.
SOURCE_COMMIT identifies a reproducible Git commit containing only the toolkit subtree
(fixed packaging identity/date), so staged source can be packaged before its repo commit.
