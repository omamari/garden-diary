import calendar
import json
import mimetypes
import os
import re
import sqlite3
import sys
import threading
import time
import traceback
import urllib.request
from datetime import date, datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import catalog
import rules

STATIC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
DB_PATH = os.environ.get("GARDEN_DB", "garden.db")
PHOTOS = os.environ.get("GARDEN_PHOTOS", "photos")
OPTIONS = os.environ.get("GARDEN_OPTIONS", "/data/options.json")
PORT = int(os.environ.get("GARDEN_PORT", "8099"))
SUPERVISOR = os.environ.get("SUPERVISOR_TOKEN")
HA_URL = os.environ.get("GARDEN_HA_URL", "http://supervisor/core/api")
HA_TOKEN = os.environ.get("GARDEN_HA_TOKEN", SUPERVISOR)

os.makedirs(PHOTOS, exist_ok=True)


def load_options():
    try:
        with open(OPTIONS) as f:
            return json.load(f)
    except Exception:
        return {}


OPTS = load_options()
SENSORS = {
    "inside": dict(name="Inside", temp=OPTS.get("office_temperature", "sensor.air_temp_humidity_zigbee_temperature"),
                   hum=OPTS.get("office_humidity"), soil=OPTS.get("heat_pad_soil", "sensor.soil_probe_temperature")),
    "gh": dict(name="Greenhouse", temp=OPTS.get("greenhouse_temperature", "sensor.5179_3629_temperature"),
               hum=OPTS.get("greenhouse_humidity")),
    "out": dict(name="Outside", temp=OPTS.get("outside_temperature", "sensor.outside_temperature_filtered"), hum=None,
                ref=OPTS.get("outside_reference", "sensor.metservice_temperature")),
}
WEATHER = OPTS.get("weather_entity", "weather.home")
AREAS = [a.strip() for a in OPTS.get("areas", ",".join(catalog.AREAS_DEFAULT)).split(",") if a.strip()]


# ---------------------------------------------------------------- database
class DB:
    def __init__(self, path):
        self.path = path
        self.lock = threading.Lock()
        with self.conn() as c:
            c.executescript("""
            CREATE TABLE IF NOT EXISTS events (
              id INTEGER PRIMARY KEY,
              kind TEXT NOT NULL,          -- veg | tree
              item TEXT NOT NULL,          -- catalog id
              type TEXT NOT NULL,          -- sow out harv feed issue note spray prune review
              date TEXT NOT NULL,          -- YYYY-MM-DD
              season TEXT NOT NULL,        -- 2026/27
              area TEXT, variety TEXT, qty TEXT, product TEXT,
              rating INTEGER, note TEXT, photo TEXT,
              who TEXT, sensors TEXT,
              created TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ev_item ON events(kind, item, date);
            CREATE TABLE IF NOT EXISTS overrides (
              kind TEXT NOT NULL, item TEXT NOT NULL, data TEXT NOT NULL,
              PRIMARY KEY (kind, item)
            );
            """)
            cols = [r[1] for r in c.execute("PRAGMA table_info(events)")]
            if "plant" not in cols:  # individual tree within a species (e.g. which of the 3 apples)
                c.execute("ALTER TABLE events ADD COLUMN plant TEXT")

    def conn(self):
        c = sqlite3.connect(self.path, check_same_thread=False)
        c.row_factory = sqlite3.Row
        return c

    def events(self, kind=None, item=None):
        q = "SELECT * FROM events"
        args = []
        if kind:
            q += " WHERE kind=?"
            args.append(kind)
            if item:
                q += " AND item=?"
                args.append(item)
        q += " ORDER BY date DESC, id DESC"
        with self.conn() as c:
            return [row_to_event(r) for r in c.execute(q, args)]

    def add(self, e):
        cols = ["kind", "item", "type", "date", "season", "area", "variety", "qty", "product",
                "rating", "note", "photo", "who", "sensors", "created", "plant"]
        with self.lock, self.conn() as c:
            cur = c.execute(
                f"INSERT INTO events ({','.join(cols)}) VALUES ({','.join('?' * len(cols))})",
                [e.get(k) for k in cols])
            return cur.lastrowid

    def update(self, eid, fields):
        allowed = {"date", "area", "variety", "qty", "product", "rating", "note", "photo", "type", "plant"}
        fields = {k: v for k, v in fields.items() if k in allowed}
        if not fields:
            return
        if "date" in fields:
            fields["season"] = season_of(parse_date(fields["date"]))
        with self.lock, self.conn() as c:
            c.execute("UPDATE events SET " + ",".join(f"{k}=?" for k in fields) + " WHERE id=?",
                      list(fields.values()) + [eid])

    def delete(self, eid):
        with self.lock, self.conn() as c:
            r = c.execute("SELECT photo FROM events WHERE id=?", (eid,)).fetchone()
            c.execute("DELETE FROM events WHERE id=?", (eid,))
        if r and r["photo"]:
            try:
                os.remove(os.path.join(PHOTOS, r["photo"]))
            except OSError:
                pass

    def overrides(self):
        with self.conn() as c:
            out = {}
            for r in c.execute("SELECT * FROM overrides"):
                out[(r["kind"], r["item"])] = json.loads(r["data"])
            return out

    def set_override(self, kind, item, data):
        with self.lock, self.conn() as c:
            c.execute("INSERT OR REPLACE INTO overrides (kind,item,data) VALUES (?,?,?)",
                      (kind, item, json.dumps(data)))


def row_to_event(r):
    e = dict(r)
    e["sensors"] = json.loads(e["sensors"]) if e.get("sensors") else None
    return e


def parse_date(s):
    return date.fromisoformat(s[:10])


def season_of(d):
    y = d.year if d.month >= 7 else d.year - 1
    return f"{y}/{(y + 1) % 100:02d}"


def season_month(d):
    """Jul 1 = 0.0 ... Jun 30 = 11.97"""
    days = calendar.monthrange(d.year, d.month)[1]
    return (d.month - 7) % 12 + (d.day - 1) / days


def today():
    return datetime.now().date()


db = DB(DB_PATH)


# ---------------------------------------------------------------- Home Assistant
_cache = {"t": 0, "data": None}
_cache_lock = threading.Lock()


def ha_get(path):
    req = urllib.request.Request(f"{HA_URL}/{path}", headers={"Authorization": f"Bearer {HA_TOKEN}"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def fnum(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def sensor_summary(force=False):
    """Current value plus the last 7 days for each growing spot. Cached 10 min."""
    with _cache_lock:
        if not force and _cache["data"] and time.time() - _cache["t"] < 600:
            return _cache["data"]
    out = {}
    if not HA_TOKEN:
        return {k: dict(name=v["name"], now=None, error="no token") for k, v in SENSORS.items()}
    ids = [v["temp"] for v in SENSORS.values()] + [v[k] for v in SENSORS.values() for k in ("hum", "soil", "ref") if v.get(k)]
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=7)).strftime("%Y-%m-%dT%H:%M:%SZ")
    end = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        # without end_time the history endpoint only returns one day
        hist = ha_get(f"history/period/{start}?end_time={end}&filter_entity_id={','.join(ids)}&minimal_response&no_attributes&significant_changes_only=0")
    except Exception as ex:
        hist = []
        print("history failed:", ex, file=sys.stderr)
    series = {}
    for lst in hist:
        if not lst:
            continue
        eid = lst[0].get("entity_id")
        pts = []
        for p in lst:
            v = fnum(p.get("state"))
            if v is None:
                continue
            ts = p.get("last_changed") or p.get("last_updated")
            pts.append((datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp(), v))
        series[eid] = pts
    for key, s in SENSORS.items():
        pts = series.get(s["temp"], [])
        d = dict(name=s["name"], entity=s["temp"])
        try:
            st = ha_get(f"states/{s['temp']}")
            d["now"] = fnum(st.get("state"))
            d["unit"] = st.get("attributes", {}).get("unit_of_measurement", "°C")
        except Exception as ex:
            d["now"] = pts[-1][1] if pts else None
            d["error"] = str(ex)[:80]
        if s.get("hum"):
            try:
                d["hum"] = fnum(ha_get(f"states/{s['hum']}").get("state"))
            except Exception:
                d["hum"] = None
        if s.get("soil"):
            spts = series.get(s["soil"], [])
            try:
                d["soil"] = fnum(ha_get(f"states/{s['soil']}").get("state"))
            except Exception:
                d["soil"] = spts[-1][1] if spts else None
            if spts:
                sv = [v for _, v in spts]
                d["soil_lo7"], d["soil_hi7"], d["soil_mean7"] = round(min(sv), 1), round(max(sv), 1), round(sum(sv) / len(sv), 1)
        if s.get("ref"):
            # Metservice (or whatever reference) alongside the garden sensor, plus the
            # average gap between them over the week so we know how cold the sensor reads
            rpts = series.get(s["ref"], [])
            try:
                d["ref"] = fnum(ha_get(f"states/{s['ref']}").get("state"))
            except Exception:
                d["ref"] = rpts[-1][1] if rpts else None
            if rpts and pts:
                d["ref_lo7"] = round(min(v for _, v in rpts), 1)
                d["offset"] = round(sum(v for _, v in rpts) / len(rpts) - sum(v for _, v in pts) / len(pts), 1)
        vals = [v for _, v in pts]
        if vals:
            d["lo7"] = round(min(vals), 1)
            d["hi7"] = round(max(vals), 1)
            d["mean7"] = round(sum(vals) / len(vals), 1)
            # nightly lows: min per local calendar day
            days = {}
            for t, v in pts:
                dd = datetime.fromtimestamp(t).date().isoformat()
                days[dd] = min(days.get(dd, v), v)
            d["daily_lo"] = [days[k] for k in sorted(days)]
            # ~36 point sparkline of means over equal time buckets
            t0, t1 = pts[0][0], max(pts[-1][0], pts[0][0] + 1)
            n = 36
            buckets = [[] for _ in range(n)]
            for t, v in pts:
                i = min(n - 1, int((t - t0) / (t1 - t0) * n))
                buckets[i].append(v)
            spark, last = [], None
            for b in buckets:
                if b:
                    last = round(sum(b) / len(b), 1)
                if last is not None:
                    spark.append(last)
            d["spark"] = spark
        out[key] = d
    out["forecast"] = forecast_lows()
    with _cache_lock:
        _cache["t"] = time.time()
        _cache["data"] = out
    return out


def forecast_lows():
    """Next nights' forecast lows from the weather entity, [(date, low), ...]."""
    try:
        req = urllib.request.Request(
            f"{HA_URL}/services/weather/get_forecasts?return_response",
            data=json.dumps({"entity_id": WEATHER, "type": "daily"}).encode(),
            headers={"Authorization": f"Bearer {HA_TOKEN}", "Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=20) as r:
            resp = json.load(r)
        fc = resp.get("service_response", {}).get(WEATHER, {}).get("forecast", [])
        out = []
        for f in fc[:7]:
            lo = f.get("templow")
            if lo is None:
                continue
            out.append(dict(date=f.get("datetime", "")[:10], low=lo, high=f.get("temperature"), cond=f.get("condition")))
        return out
    except Exception as ex:
        print("forecast failed:", ex, file=sys.stderr)
        return []


def sensor_snapshot():
    s = sensor_summary()
    snap = {k: v.get("now") for k, v in s.items() if k != "forecast"}
    snap["soil"] = s.get("inside", {}).get("soil")
    return snap


# ---------------------------------------------------------------- catalog with overrides
def merged_catalog():
    ov = db.overrides()
    veg = []
    seen = set()
    for v in catalog.VEG:
        d = dict(v)
        d.update(ov.get(("veg", v["id"]), {}))
        seen.add(v["id"])
        veg.append(d)
    for (kind, item), data in ov.items():
        if kind == "veg" and item not in seen and data.get("name"):
            d = dict(id=item, where="direct", sow=[], harv=[], night=0, soil=10, tip="")
            d.update(data)
            veg.append(d)
    trees = []
    seen = set()
    for t in catalog.TREES:
        d = dict(t)
        d.update(ov.get(("tree", t["id"]), {}))
        seen.add(t["id"])
        trees.append(d)
    for (kind, item), data in ov.items():
        if kind == "tree" and item not in seen and data.get("name"):
            d = dict(id=item, tasks=[])
            d.update(data)
            trees.append(d)
    flowers = []
    seen = set()
    for f in catalog.FLOWERS:
        d = dict(f)
        d.update(ov.get(("flower", f["id"]), {}))
        seen.add(f["id"])
        flowers.append(d)
    for (kind, item), data in ov.items():
        if kind == "flower" and item not in seen and data.get("name"):
            d = dict(id=item, where="direct", sow=[], harv=[], night=0, soil=10, tip="", colour="#d94f7a")
            d.update(data)
            flowers.append(d)
    veg = [v for v in veg if not v.get("hidden")]
    trees = [t for t in trees if not t.get("hidden")]
    flowers = [f for f in flowers if not f.get("hidden")]
    group_of = {i: g for g, ids in catalog.GROUPS.items() for i in ids}
    for v in veg:
        v["kind"] = "veg"
        v.setdefault("group", group_of.get(v["id"], "annual"))
    for f in flowers:
        f["kind"] = "flower"
    for t in trees:
        t.setdefault("group", "perennial" if t["id"] in catalog.TREE_PERENNIALS else "tree")
    return veg, trees, flowers


def state():
    veg, trees, flowers = merged_catalog()
    events = db.events()
    d = today()
    sensors = sensor_summary()
    tasks = rules.tasks(veg + flowers, trees, events, sensors, d)
    # drop jobs the user dismissed: "never", or skipped for this season
    ov = db.overrides()
    season = season_of(d)
    tasks = [t for t in tasks
             if ov.get((t["kind"], t["item"]), {}).get("dismiss", {}).get(t["key"]) not in ("never", season)]
    return dict(
        today=d.isoformat(),
        season=season_of(d),
        season_month=round(season_month(d), 3),
        areas=AREAS,
        inside_areas=catalog.INSIDE_AREAS,
        sensors=sensors,
        veg=veg,
        flowers=flowers,
        trees=trees,
        events=events,
        tasks=tasks,
        types=catalog.EVENT_TYPES,
        stages=catalog.STAGES,
    )


# ---------------------------------------------------------------- HTTP
class Handler(BaseHTTPRequestHandler):
    server_version = "GardenDiary/0.1"

    def log_message(self, fmt, *args):
        if os.environ.get("GARDEN_LOG"):
            super().log_message(fmt, *args)

    # helpers
    def send_json(self, obj, code=200):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def send_file(self, path, cache="no-cache"):
        if not os.path.isfile(path):
            return self.send_json({"error": "not found"}, 404)
        ctype = mimetypes.guess_type(path)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype == "application/javascript":
            ctype += "; charset=utf-8"
        with open(path, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.end_headers()
        self.wfile.write(body)

    def body_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        return json.loads(self.rfile.read(n) or b"{}")

    def who(self):
        return (self.headers.get("X-Remote-User-Display-Name")
                or self.headers.get("X-Remote-User-Name") or "").strip() or None

    def route(self):
        p = urlparse(self.path).path
        # strip any ingress prefix so both direct and ingress access work
        m = re.search(r"/(api/.*|photos/.*|static/.*)$", p)
        return "/" + m.group(1) if m else p

    def do_GET(self):
        try:
            p = self.route()
            if p.startswith("/api/state"):
                return self.send_json(state())
            if p == "/api/sensors":
                return self.send_json(sensor_summary(force="refresh" in self.path))
            if p == "/api/export":
                return self.send_json(dict(exported=datetime.now().isoformat(), events=db.events(),
                                           overrides={f"{k[0]}:{k[1]}": v for k, v in db.overrides().items()}))
            if p.startswith("/photos/"):
                name = os.path.basename(p)
                return self.send_file(os.path.join(PHOTOS, name), cache="max-age=31536000")
            if p.startswith("/static/"):
                return self.send_file(os.path.join(STATIC, os.path.basename(p)))
            if p.startswith("/api/"):
                return self.send_json({"error": "not found"}, 404)
            return self.send_file(os.path.join(STATIC, "index.html"))
        except Exception:
            traceback.print_exc()
            self.send_json({"error": "server error"}, 500)

    def do_POST(self):
        try:
            p = self.route()
            if p == "/api/events":
                e = self.body_json()
                return self.send_json(self.create_event(e), 201)
            if p == "/api/photos":
                n = int(self.headers.get("Content-Length") or 0)
                if n > 12_000_000:
                    return self.send_json({"error": "photo too large"}, 413)
                data = self.rfile.read(n)
                ctype = self.headers.get("Content-Type", "image/jpeg").split(";")[0]
                ext = {"image/png": "png", "image/webp": "webp"}.get(ctype, "jpg")
                name = f"{datetime.now().strftime('%Y%m%d-%H%M%S')}-{os.urandom(3).hex()}.{ext}"
                with open(os.path.join(PHOTOS, name), "wb") as f:
                    f.write(data)
                return self.send_json({"photo": name}, 201)
            if p == "/api/dismiss":
                b = self.body_json()
                cur = db.overrides().get((b["kind"], b["item"]), {})
                dis = cur.get("dismiss", {})
                if b.get("until"):
                    dis[b["key"]] = "never" if b["until"] == "never" else season_of(today())
                else:
                    dis.pop(b["key"], None)
                cur["dismiss"] = dis
                db.set_override(b["kind"], b["item"], cur)
                return self.send_json({"ok": True})
            if p == "/api/plants":
                d = self.body_json()
                kind = d.pop("kind", "veg")
                item = d.pop("id", None) or re.sub(r"[^a-z0-9]+", "_", d.get("name", "").lower()).strip("_")
                if not item:
                    return self.send_json({"error": "name required"}, 400)
                db.set_override(kind, item, d)
                return self.send_json({"id": item}, 201)
            return self.send_json({"error": "not found"}, 404)
        except Exception:
            traceback.print_exc()
            self.send_json({"error": "server error"}, 500)

    def do_PUT(self):
        try:
            p = self.route()
            m = re.match(r"/api/events/(\d+)$", p)
            if m:
                db.update(int(m.group(1)), self.body_json())
                return self.send_json({"ok": True})
            m = re.match(r"/api/plants/(veg|tree|flower)/([a-z0-9_]+)$", p)
            if m:
                kind, item = m.groups()
                cur = db.overrides().get((kind, item), {})
                cur.update(self.body_json())
                db.set_override(kind, item, cur)
                return self.send_json({"ok": True})
            return self.send_json({"error": "not found"}, 404)
        except Exception:
            traceback.print_exc()
            self.send_json({"error": "server error"}, 500)

    def do_DELETE(self):
        try:
            m = re.match(r"/api/events/(\d+)$", self.route())
            if m:
                db.delete(int(m.group(1)))
                return self.send_json({"ok": True})
            return self.send_json({"error": "not found"}, 404)
        except Exception:
            traceback.print_exc()
            self.send_json({"error": "server error"}, 500)

    def create_event(self, e):
        if e.get("type") not in catalog.EVENT_TYPES:
            raise ValueError("bad type")
        d = parse_date(e.get("date") or today().isoformat())
        rec = dict(
            kind=e.get("kind", "veg"), item=e["item"], type=e["type"], date=d.isoformat(),
            season=season_of(d), area=e.get("area"), variety=e.get("variety"), qty=e.get("qty"),
            product=e.get("product"), rating=e.get("rating"), note=e.get("note"), photo=e.get("photo"),
            who=self.who(), sensors=json.dumps(sensor_snapshot()) if d == today() else None,
            created=datetime.now().isoformat(timespec="seconds"),
        )
        # one entry per individual plant picked (e.g. two of the three apples)
        plants = e.get("plants") or [e.get("plant")]
        ids = [db.add(dict(rec, plant=pl)) for pl in plants]
        # one spray/feed/prune can apply to several trees at once
        for extra in e.get("also") or []:
            r2 = dict(rec, item=extra)
            ids.append(db.add(r2))
        return {"ids": ids}


def main():
    print(f"Garden Diary on :{PORT}, db {DB_PATH}, photos {PHOTOS}, HA {'yes' if HA_TOKEN else 'NO TOKEN'}", flush=True)
    print("tz:", os.environ.get("TZ"), "token:", bool(SUPERVISOR), flush=True)
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    srv.daemon_threads = True
    srv.serve_forever()


if __name__ == "__main__":
    main()
