# Runbooks

Step-by-step operating procedures. Each starts with when to use it and ends with how to verify. Toolkit mechanics (locks,
snapshots, units) are in the [Toolkit docs](https://github.com/H7KZ/Toolkit/tree/main/docs); the shared rules every
repository follows are the [repository standard](https://github.com/H7KZ/Toolkit/blob/main/docs/standard.md).

| Runbook                                           | Use it to                                                                                                                    |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| [Fresh server](fresh-server.md)                   | Take a clean Ubuntu VPS to a running system (shared or standalone ingress), restore data, cut over, decommission the old VPS |
| [Deploy and release](deploy-and-release.md)       | Ship code: workflows, inputs, promote, stage and activate, monitoring, ingress                                               |
| [Rollback and recovery](rollback-and-recovery.md) | Roll back a release, reconcile after a reboot, recover from data loss                                                        |
| [Backups](backups.md)                             | Set up, verify, drill and restore the encrypted B2 backups                                                                   |
| [Add a service](add-a-service.md)                 | Add a container service, a setting or an environment                                                                         |
| [Secrets and config](secrets-and-config.md)       | Find, set and rotate every GitHub secret, variable and web setting                                                           |
| [Split to own server](split-to-own-server.md)     | Move to a dedicated server and take over ingress, or move back                                                               |
| [Dependency updates](dependency-updates.md)       | Understand Dependabot here, review a bump, handle a major, move the toolkit pin                                              |
| [Troubleshooting](troubleshooting.md)             | Symptom, cause, fix                                                                                                          |
