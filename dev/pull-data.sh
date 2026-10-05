#!/bin/sh
# Copy the live diary from the box into local/garden.db for testing on the Mac.
# Photos are not copied. Run from the garden-diary folder.
set -e
mkdir -p local
ssh -o IdentitiesOnly=yes -i ~/.ssh/ha-finance root@192.168.1.108 \
  'curl -s --max-time 10 http://local-garden-diary:8099/api/export' > local/export.json
rm -f local/garden.db local/garden.db-wal local/garden.db-shm
python3 - <<'PY'
import json, sqlite3, sys
sys.path.insert(0, "app")
import os
os.environ["GARDEN_DB"] = "local/garden.db"
os.environ["GARDEN_OPTIONS"] = "local/options.json"
import server
x = json.load(open("local/export.json"))
c = sqlite3.connect("local/garden.db")
cols = [r[1] for r in c.execute("PRAGMA table_info(events)")]
for e in x["events"]:
    e = dict(e)
    if e.get("sensors") is not None:
        e["sensors"] = json.dumps(e["sensors"])
    c.execute(f"INSERT INTO events ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
              [e.get(k) for k in cols])
for key, data in x["overrides"].items():
    kind, item = key.split(":", 1)
    c.execute("INSERT INTO overrides (kind,item,data) VALUES (?,?,?)", (kind, item, json.dumps(data)))
c.commit()
print(len(x["events"]), "events,", len(x["overrides"]), "overrides from", x["exported"])
PY
