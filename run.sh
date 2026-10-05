#!/bin/sh
set -e
# s6 drops the container environment for legacy services; pick up what we need from its folder
for k in SUPERVISOR_TOKEN TZ; do
  if [ -z "$(eval echo \$$k)" ] && [ -f "/run/s6/container_environment/$k" ]; then
    export "$k=$(cat /run/s6/container_environment/$k)"
  fi
done
export GARDEN_DB=/data/garden.db
export GARDEN_PHOTOS=/data/photos
export GARDEN_OPTIONS=/data/options.json
export GARDEN_PORT=8099
exec python3 /app/server.py
