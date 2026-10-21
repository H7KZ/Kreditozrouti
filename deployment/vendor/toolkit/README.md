# Toolkit 0.10.0 (vendored)

Pinned copy of the Infrastructure host toolkit. Every file here, `deployment/toolkit.lock`,
`deployment/verify-toolkit-pin.sh` and `deployment/install-toolkit.sh` is managed: never edit
them by hand. Re-vendor from an Infrastructure checkout instead, then commit here:

```bash
npm run toolkit:vendor -- ../<this-repository>
```

- `toolkit-0.10.0.tar.gz`: release archive, the `toolkit/` source plus `MANIFEST`
- `toolkit-0.10.0.tar.gz.sha256`: archive checksum; detects corruption, not authorship
- `toolkit.lock`: the pin (version, source commit, archive digest, contract versions)
- `validate-lock.sh`: checks an archive against a pin; called by `verify-toolkit-pin.sh`

Requires Ubuntu 26.04 amd64, Bash, Python 3, GNU tar/coreutils, flock and systemd; deploys
also need Docker Engine with the Compose plugin and rsync.

```bash
bash deployment/verify-toolkit-pin.sh                                     # pin, archive, managed copies
sudo bash deployment/install-toolkit.sh --ci-only --deploy-user deploy    # CI runner and its sudo rule
sudo bash deployment/install-toolkit.sh --deploy-user deploy --activate   # also select host CLI 0.10.0
```

CI sends the archive, checksum and lock with every operation. The root-owned runner verifies
them and runs that exact bundle; it never reads or changes the host CLI at `/opt/toolkit/current`:

```bash
sudo -n /usr/local/libexec/toolkit-run-bundle --archive "$PWD/toolkit-0.10.0.tar.gz" \
  --checksum "$PWD/toolkit-0.10.0.tar.gz.sha256" --lock "$PWD/toolkit.lock" -- version
```

Installing never deploys apps, enables timers, restarts Docker or applies host policy.
Guides: https://github.com/H7KZ/Infrastructure/tree/main/docs/toolkit
