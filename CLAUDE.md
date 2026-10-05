# Garden Diary

Local Home Assistant add-on (slug `local_garden_diary`, sidebar "Garden") for Daniel and Bradie, mostly used on phones. Records sowing, transplanting, harvests, fertiliser and fruit tree sprays, with reminders driven by real sensor data.

## Layout
- `app/server.py`: Python standard-library web server, SQLite at `/data/garden.db`, photos at `/data/photos`
- `app/catalog.py`: vegetables, trees and perennials, flowers (Auckland timings)
- `app/rules.py`: reminder rules
- `app/static/`: `index.html`, `app.js`, `app.css`
- `config.yaml`, `build.yaml`, `Dockerfile`, `run.sh`: add-on packaging

## Deploy
Tar this folder over SSH into `/local_apps/garden_diary`, then `ha store reload; ha apps rebuild local_garden_diary`.

## Gotchas
- The base image's s6 init strips environment variables: `run.sh` reads `SUPERVISOR_TOKEN` and `TZ` from `/run/s6/container_environment/`, and the Dockerfile sets `S6_KEEP_ENV=1`.
- `config.yaml` needs `homeassistant_api: true` (and `hassio_api`).
- The history REST call needs `end_time=` or it returns only one day.
