# Toolkit 0.12.0 (vendored)

Pinned copy of the Toolkit release this repository runs. Every file here plus
`deployment/toolkit` and `deployment/toolkit.lock` is managed: never edit them by hand.
Repin from a Toolkit checkout, then commit here:

```bash
npm run vendor -- ../<this-repository>
```

- `toolkit-0.12.0.tar.gz`: release archive, the `toolkit/` source plus `MANIFEST`
- `toolkit-0.12.0.tar.gz.sha256`: archive checksum; detects corruption, not authorship
- `toolkit.lock`: the pin (version, source commit, archive digest, contract versions)
- `validate-lock.sh`: checks an archive against a pin; used by `deployment/toolkit`
- `log.sh`: shared logging for this repository's scripts (`source` it)

Everything runs through `deployment/toolkit`, which executes exactly this release and never a
toolkit installed on the host. Requires Ubuntu 26.04 amd64, Bash, Python 3, GNU tar/coreutils,
flock, rsync and systemd; deploys also need Docker Engine with the Compose plugin.

```bash
deployment/toolkit verify                                   # pin, archive, managed files
deployment/toolkit help                                     # every command
sudo deployment/toolkit install --deploy-user deploy        # loader, sudo rule, units (never enabled)
sudo deployment/toolkit doctor                              # what is installed, enabled, failing
```

Guides: https://github.com/H7KZ/Toolkit/tree/main/docs
