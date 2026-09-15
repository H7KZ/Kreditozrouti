# Handoff: monitoring audit findings from Ohlídáme (2026-09-15)

Ohlídáme's monitoring stack is vendored 1:1 from this repo (see Ohlídáme's `deployment/CLAUDE.md`:
"vendored 1:1 from Kreditožrouti's ... setup"). Two audit passes there just turned up a few things
worth checking here, since the same drift/bug classes could exist in this repo too. None of this
has been applied here — it's inspiration for a `/grill-me`-style session to evaluate against this
repo's actual current state, not a to-do list to blindly copy.

## 1. Dead exporter references (found + removed in Ohlídáme)

Ohlídáme had `mysqld-exporter` / `redis-exporter` referenced across docker-compose, `deploy.sh`,
Prometheus `alerts.yml` + `alerts.test.yml`, and two Grafana dashboards — but the containers
weren't actually running, so `ServiceDown`/`MySQLDown`/`RedisDown` alerts fired constantly on
`up{}` that could never exist, and the MySQL/Redis dashboard panels showed permanent "No data".

**Worth checking here:** are `mysqld-exporter`/`redis-exporter` (or any other exporter) actually
deployed in this repo's compose files, actively scraped, and genuinely producing data on the
MySQL/Redis dashboard panels — or is there similar drift between what's defined in config and
what's actually running on the VPS? If a dashboard panel or alert has shown "No data" for a while
without anyone noticing, that's the smell to chase.

## 2. Grid-position overflow bug (found + fixed in Ohlídáme's frontend.json)

Ohlídáme's `frontend.json` dashboard had a timeseries panel with `gridPos.x=20, w=24` — on a
24-column Grafana grid that's `44 > 24`, silently overlapping the panels above/below it. Nothing
threw an error; it just rendered wrong.

**Worth checking here:** worth a pass over this repo's dashboard JSON files' `gridPos` values
(`x + w <= 24`, no unintended overlaps) — this is an easy mistake to introduce when hand-editing
dashboard JSON and easy to miss visually if the panel above happens to be short.

## 3. Alert gap-check method (process, not a specific finding)

When checking whether to add new alert coverage (e.g. "is there an alert for X being down"), the
audit in Ohlídáme first verified the target container actually exposes `prometheus.io/scrape` +
a `/metrics` endpoint before adding an `up{}`-based rule — Umami/umami-db there carry no scrape
label, so an `up{}` alert for them would be permanently broken (either never fire or always
false-fire via `absent()`). Generic per-project `ContainerOOMKilled`/`ContainerRestartLoop` rules
already cover crash/OOM for every labeled container regardless, so no new rule was added.

**Worth checking here:** same method applies to any "should we alert on X" question — check the
scrape label exists before writing an `up{}`-based rule, and check whether a generic
container-level rule already covers the failure mode before adding a specific one.

## 4. Things audited and found genuinely fine (no action, just for context)

- Umami wiring (postgres:18 volume path, `grafana_ro` grant in `deploy.sh`, 13-month retention
  cron, per-env `UMAMI_WEBSITE_ID`, Grafana postgres datasource actually queried by dashboards)
  matched its own documented design exactly — nothing to fix, but a reasonable checklist if this
  repo's Umami setup has drifted from its own docs.
- Alert rule duplication (`ServiceDown` per service, `OriginProbeFailing` per service) was
  deliberately left un-deduped rather than templated with label-matching tricks, because the
  promtool test cases compare annotations exactly and the verbose style was judged clearer/safer
  than a clever regex. Same trade-off likely applies here if this repo has the same duplication.
- Web vitals dashboard showing "no samples" was traced to genuinely unverified Faro/Umami traffic
  through Cloudflare, not a config bug — worth ruling out the same explanation here before
  assuming a RUM dashboard is broken.

## Suggested next step

Run this through `/grill-me` against this repo's actual `deployment/monitoring/` state — don't
assume any of the above applies here without checking; Ohlídáme's copy may already have diverged
from this repo's in ways that make some of these moot (or reveal repo-specific issues that its
own audit didn't have a reason to look for).
