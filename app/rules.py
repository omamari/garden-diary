"""Work out what to do this week from the guide windows, what has already
been logged this season, last season's results and the four sensors.

Each task: dict(status, kind, item, name, title, why, action, late)
  status  go    conditions look right, do it
          wait  in the window but the sensors say hold on
          ask   we want a result or rating from you
          job   tree care that is due
  action  the event type the button should open (sow/out/harv/spray/...)
"""
import calendar
from datetime import date

from catalog import in_window, window_start

STAGE_NAMES = {"Bud swell", "Bud burst", "New growth", "Flowering", "Petal fall", "Fruit set",
               "Fruit colouring", "Ripe", "Leaf fall", "Dormant"}
MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"]
STARS = "★"


def season_of(d):
    y = d.year if d.month >= 7 else d.year - 1
    return f"{y}/{(y + 1) % 100:02d}"


def season_month(d):
    days = calendar.monthrange(d.year, d.month)[1]
    return (d.month - 7) % 12 + (d.day - 1) / days


def days_since(iso, d):
    return (d - date.fromisoformat(iso)).days


def nice_date(iso):
    d = date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%b')}"


def fmt(v):
    return "—" if v is None else f"{v:g}°"


def tasks(veg, trees, events, sensors, d):
    m = season_month(d)
    season = season_of(d)
    out_lo = sensors.get("out", {}).get("lo7")
    out_mean = sensors.get("out", {}).get("mean7")
    gh_lo = sensors.get("gh", {}).get("lo7")
    inside = sensors.get("inside", {})
    pad_t = inside.get("soil_mean7") if inside.get("soil_mean7") is not None else inside.get("soil")
    fc = sensors.get("forecast") or []
    fc_lo = min((f["low"] for f in fc[:5]), default=None)
    fc_txt = f" Forecast lows for the next {min(5, len(fc))} nights bottom out at <b>{fmt(fc_lo)}</b>." if fc_lo is not None else ""

    by_item = {}
    for e in events:
        by_item.setdefault((e["kind"], e["item"]), []).append(e)

    result = []

    for v in veg:
        vkind = v.get("kind", "veg")
        evs = by_item.get((vkind, v["id"]), [])
        this = [e for e in evs if e["season"] == season]
        past = [e for e in evs if e["season"] != season]
        types = {e["type"] for e in this}
        last_review = next((e for e in past if e["type"] == "review"), None)
        last_season = last_review["season"] if last_review else (past[0]["season"] if past else None)
        last_sow = next((e for e in past if e["type"] == "sow" and e["season"] == last_season), None)
        last_out = next((e for e in past if e["type"] == "out" and e["season"] == last_season), None)

        def history(kind_label, ev):
            bits = []
            if ev:
                bits.append(f"Last year you {kind_label} <b>{nice_date(ev['date'])}</b>")
                if last_review and last_review.get("rating"):
                    bits.append(f"and rated it {STARS * last_review['rating']}")
            return " ".join(bits) + ("." if bits else "")

        inside_start = v["where"] == "inside"
        if v.get("established"):
            # perennial already in the ground: no sowing or planting-out reminders
            continue

        # --- sowing. Keep the list short: a plant we have never grown only
        # shows for the first 6 weeks of its window; one we have grown shows
        # all window. Year-round crops only nag as a succession reminder,
        # 5 weeks after the last sowing.
        sow_len = sum(v["sow"][i + 1] - v["sow"][i] for i in range(0, len(v["sow"]), 2))
        last_any_sow = next((e for e in evs if e["type"] == "sow"), None)
        if in_window(m, v["sow"]) and "out" not in types and (
                sow_len < 11 and "sow" not in types or
                sow_len >= 11 and last_any_sow and days_since(last_any_sow["date"], d) >= 35):
            start = window_start(m, v["sow"])
            if sow_len >= 11:
                start = m  # succession: never "late"
            elif not past and m - start > 1.5:
                start = None
        else:
            start = None
        if start is not None:
            late = m - start > 1.0
            if inside_start:
                ok = pad_t is None or pad_t >= v["soil"] - 3
                why = f"Heat pad soil averaging <b>{fmt(pad_t)}</b>, wants about {v['soil']}° to germinate."
                if not ok:
                    why += " Turn the pad up or wait for a warmer week."
                title = f"Sow {v['name'].lower()} inside"
            else:
                ok = (out_mean is None or out_mean >= v["soil"] - 4) and (out_lo is None or out_lo >= v["night"] - 2)
                why = (f"Outside averaging <b>{fmt(out_mean)}</b> with a 7-night low of <b>{fmt(out_lo)}</b>; "
                       f"wants soil near {v['soil']}°" + (f" and nights above {v['night']}°." if v["night"] else "."))
                if not ok:
                    why += " Hold a week or two."
                title = f"Sow {v['name'].lower()} direct"
            h = history("sowed", last_sow)
            if sow_len >= 11:
                title = f"Sow more {v['name'].lower()}"
                h = f"Last sown <b>{nice_date(last_any_sow['date'])}</b>; a fresh batch every few weeks keeps it coming."
            result.append(dict(status="go" if ok else "wait", kind=vkind, item=v["id"], name=v["name"], title=title,
                               why=(why + " " + h).strip(), action="sow", late=late and ok, order=m - start))

        # --- planting out
        if v.get("out") and in_window(m, v["out"]) and "sow" in types and "out" not in types:
            start = window_start(m, v["out"])
            late = m - start > 1.0
            ok_out = (out_lo is None or out_lo >= v["night"]) and (fc_lo is None or fc_lo >= v["night"])
            ok_gh = gh_lo is None or gh_lo >= v["night"]
            if ok_out:
                title = f"{v['name']} can go out"
                why = f"Outside 7-night low <b>{fmt(out_lo)}</b>, fine for {v['name'].lower()} (needs {v['night']}°).{fc_txt}"
                status = "go"
            elif ok_gh:
                title = f"{v['name']} can go into the greenhouse"
                why = (f"Greenhouse 7-night low <b>{fmt(gh_lo)}</b> is fine, outside low <b>{fmt(out_lo)}</b> "
                       f"is still under the {v['night']}° {v['name'].lower()} wants.")
                status = "go"
            else:
                title = f"Hold {v['name'].lower()} inside"
                why = f"Outside low <b>{fmt(out_lo)}</b>, greenhouse low <b>{fmt(gh_lo)}</b>; wants nights above {v['night']}°.{fc_txt}"
                status = "wait"
            h = history("planted out", last_out)
            result.append(dict(status=status, kind=vkind, item=v["id"], name=v["name"], title=title,
                               why=(why + " " + h).strip(), action="out", late=late and status == "go", order=m - start))

        # --- review: in or past the harvest window, something was grown, no review yet
        grown = ("sow" in types) or ("out" in types)
        hs = v["harv"]
        past_harvest_start = any(m >= hs[i] + 0.7 for i in range(0, len(hs), 2) if hs[i] <= m)
        if grown and past_harvest_start and "review" not in types:
            first = this[-1]
            flower = vkind == "flower"
            result.append(dict(status="ask", kind=vkind, item=v["id"], name=v["name"],
                               title=f"How {'is' if flower else 'are'} the {v['name'].lower()} doing?",
                               why=f"{'Sowed' if first['type'] == 'sow' else 'Planted'} {nice_date(first['date'])}. "
                                   + ("Log the first flowers and rate the season." if flower else
                                      "Log a harvest and rate the season so next year's timing can move."),
                               action="harv", late=False, order=5))

    def is_dead(t):
        for e in by_item.get(("tree", t["id"]), []):  # newest first
            if e["type"] == "out":
                return False
            if e["type"] == "issue" and e.get("product") == "Died":
                return True
        return False
    trees = [t for t in trees if not is_dead(t)]

    # --- tender plants in pots: when can they leave the greenhouse, when must they come in
    for t in trees:
        if not t.get("shelter") or t.get("night") is None:
            continue
        evs = by_item.get(("tree", t["id"]), [])
        moves = [e for e in evs if e["type"] in ("move", "out") and e.get("area")]
        home = moves[0]["area"] if moves else (t.get("area") or "Greenhouse")
        sheltered = home in ("Greenhouse", "Office trays", "Inside", "Heat pad") or "green" in home.lower() or "inside" in home.lower()
        need = t["night"]
        if sheltered and 2 <= m < 7:  # noqa  # spring and early summer: can it go out?
            ok = out_lo is not None and out_lo >= need and (fc_lo is None or fc_lo >= need)
            if ok:
                title, status = f"{t['name']} can move out of the {home.lower().replace('office trays', 'office')}", "go"
                why = f"Outside 7-night low <b>{fmt(out_lo)}</b> and nothing colder forecast; {t['name'].lower()} is fine above {need}°.{fc_txt}"
            else:
                title, status = f"Keep {t['name'].lower()} in the {home.lower().replace('office trays', 'office')}", "wait"
                why = f"Outside 7-night low <b>{fmt(out_lo)}</b>; wants nights above {need}° before it goes out.{fc_txt}"
            result.append(dict(status=status, kind="tree", item=t["id"], name=t["name"], title=title, why=why,
                               action="move", late=False, order=0))
        elif not sheltered and (m >= 8.5 or m < 1):  # autumn and winter: time to come in?
            risk = (fc_lo is not None and fc_lo < need + 2) or (out_lo is not None and out_lo < need + 2)
            if risk:
                result.append(dict(status="go", kind="tree", item=t["id"], name=t["name"],
                                   title=f"Bring {t['name'].lower()} into the greenhouse",
                                   why=f"Outside 7-night low <b>{fmt(out_lo)}</b>; {t['name'].lower()} wants to stay above {need}°.{fc_txt}",
                                   action="move", late=False, order=0))

    # --- trees
    kind_type = {"copper": "spray", "oil": "spray", "feed": "feed", "prune": "prune", "other": "note"}
    kind_label = {"copper": "Copper on", "oil": "Oil on", "feed": "Feed the", "prune": "Prune the", "other": ""}
    for t in trees + [v for v in veg if v.get("tasks")]:
        tkind = t.get("kind", "tree")
        evs = by_item.get((tkind, t["id"]), [])
        # stage events this season (newest first), so stage-linked jobs follow the tree, not the calendar
        stages = [e for e in evs if e["type"] == "stage" and e["season"] == season]
        for task in t.get("tasks", []):
            w = task["w"]
            trig = task.get("stage")
            hit = next((e for e in stages if e.get("product") == trig), None) if trig else None
            if hit:
                sm = season_month(date.fromisoformat(hit["date"]))
                if m - sm < 1.2:  # about 5 weeks after the stage was logged
                    w = [sm, sm + 1.2]
            if not in_window(m, w):
                continue
            start = window_start(m, w)
            want = kind_type[task["kind"]]
            plants = t.get("plants") or [None]

            def done_for(pid):
                for e in evs:
                    if e["type"] != want or (want == "note" and e.get("product") in STAGE_NAMES):
                        continue
                    if pid is not None and e.get("plant") not in (None, pid):
                        continue
                    em = season_month(date.fromisoformat(e["date"]))
                    same_season = e["season"] == season or (start > m)  # window straddling July
                    if same_season and in_window(em, w) and \
                       (task["kind"] not in ("copper", "oil") or task["kind"] in (e.get("product") or "").lower()
                            or not e.get("product")):
                        return True
                return False
            left = [pl for pl in plants if not done_for(pl["id"] if pl else None)]
            if not left:
                continue
            last = next((e for e in evs if e["type"] == want and e["season"] != season), None)
            why = task["why"]
            if hit:
                why += f" Your tree reached <b>{hit.get('product').lower()}</b> on {nice_date(hit['date'])}, so this is due now even though the calendar says {MONTHS[int(task['w'][0]) % 12]}–{MONTHS[int(task['w'][1] - 0.01) % 12]}."
            else:
                stage = next((e for e in evs if e["type"] == "stage" and e["season"] == season), None)
                if stage:
                    why += f" Stage now: <b>{stage.get('product')}</b> ({nice_date(stage['date'])})."
            if last:
                why += f" Last done <b>{nice_date(last['date'])} {last['season'][:4]}</b>."
            late = m - start > 0.6
            label = kind_label[task["kind"]]
            title = f"{label} {t['name'].lower()}".strip() if label else f"{t['name']}: {task['why'].split(':')[0].rstrip('.')}"
            if plants[0] is not None and len(left) < len(plants):
                title += " · " + ", ".join(pl["name"] for pl in left)
            result.append(dict(status="job", kind=tkind, item=t["id"], name=t["name"], title=title[0].upper() + title[1:],
                               why=why, action=want, product=task["kind"], late=late, order=m - start,
                               key=f"{task['kind']}:{task['w'][0]:g}"))

    # Moves and planting out first (they are time-critical), then tree jobs, then
    # questions, then sowing (lots of those), then things to wait on.
    def weight(x):
        if x["status"] == "wait":
            return 5
        if x["action"] in ("move", "out"):
            return 0
        if x["status"] == "job":
            return 1
        if x["status"] == "ask":
            return 2
        return 3
    for x in result:
        x.setdefault("key", x["action"])
    result.sort(key=lambda x: (weight(x), -int(x["late"]), -x["order"]))
    return result
