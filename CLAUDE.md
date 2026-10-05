# Garden Diary

Local Home Assistant add-on (slug `local_garden_diary`, sidebar "Garden") for Daniel and Bradie, mostly used on phones. Records sowing, transplanting, harvests, fertiliser and fruit tree sprays, with reminders driven by real sensor data.

## Layout
- `app/server.py`: Python standard-library web server, SQLite at `/data/garden.db`, photos at `/data/photos`
- `app/catalog.py`: vegetables, trees and perennials, flowers (Auckland timings)
- `app/rules.py`: reminder rules
- `app/static/`: `index.html`, `app.js`, `app.css`
- `config.yaml`, `build.yaml`, `Dockerfile`, `run.sh`: add-on packaging

## Deploy
From `~/home-assistant`:

```bash
COPYFILE_DISABLE=1 tar czf - --exclude .git --exclude __pycache__ --exclude 'plan-draft.*' garden-diary | ssh -o IdentitiesOnly=yes -i ~/.ssh/ha-finance root@192.168.1.108 'tar xzf - -C /local_apps/garden_diary --strip-components=1 && ha store reload && ha apps rebuild local_garden_diary'
```

`COPYFILE_DISABLE=1` stops macOS adding `._` files to the archive. The panel is at http://homeassistant.local:8123/local_garden_diary (not `/hassio/ingress/...`).

## Testing locally
Click-testing the live site in the browser pane prompts Daniel for every click (the app won't save approval for home-network addresses), so test on the Mac instead:
1. `dev/pull-data.sh` copies the live diary into `local/garden.db` (git ignores `local/`; photos are not copied).
2. Start the `garden-diary` server from `.claude/launch.json` with `preview_start`, then use http://localhost:8099 at 375px wide.

Sensor cards show "no token" locally. Check the live site with page loads and screenshots only, no clicks.

## Gotchas
- The base image's s6 init strips environment variables: `run.sh` reads `SUPERVISOR_TOKEN` and `TZ` from `/run/s6/container_environment/`, and the Dockerfile sets `S6_KEEP_ENV=1`.
- `config.yaml` needs `homeassistant_api: true` (and `hassio_api`).
- The history REST call needs `end_time=` or it returns only one day.
