"""Merge the seed catalog with approved rows from the Google Form response sheets.

Reads two published-to-web CSV URLs from environment variables:
  ADD_FORM_CSV      responses to the "Add a skill" form
  SUGGEST_FORM_CSV  responses to the "Suggest a change" form
Only rows whose Status column says "Published" are used. Writes data/skills.json.
Standard library only.
"""
import csv, io, json, os, re, sys, urllib.request
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def fetch_rows(url):
    if not url:
        return []
    with urllib.request.urlopen(url, timeout=30) as r:
        text = r.read().decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(text)))

def pick(row, *keys):
    """Find a column whose header starts with one of the keys (case-insensitive)."""
    for k in keys:
        for h, v in row.items():
            if h and h.strip().lower().startswith(k.lower()):
                return (v or "").strip()
    return ""

def published(row):
    return pick(row, "status").lower() == "published"

def day(stamp):
    for fmt in ("%m/%d/%Y %H:%M:%S", "%d/%m/%Y %H:%M:%S", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(stamp, fmt).strftime("%Y-%m-%d")
        except ValueError:
            pass
    return stamp.split(" ")[0] if stamp else ""

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def main():
    with open(os.path.join(ROOT, "data", "seed.json")) as f:
        skills = {slug(s["name"]): {**s, "suggestions": []} for s in json.load(f)}

    for row in fetch_rows(os.environ.get("ADD_FORM_CSV", "")):
        name = pick(row, "skill name")
        if not name or not published(row):
            continue
        who = pick(row, "your name")
        dept = pick(row, "department")
        entry = {
            "name": name,
            "category": pick(row, "category") or "General",
            "description": pick(row, "what does it do"),
            "how": pick(row, "how do you use"),
            "link": pick(row, "where can someone get"),
            "platform": pick(row, "platform"),
            "made_by": pick(row, "who made it") or who,
            "added_by": f"{who}, {dept}" if dept else who,
            "added": day(pick(row, "timestamp")),
            "limitations": pick(row, "limitations"),
            "caution": pick(row, "uses university").lower().startswith("yes"),
        }
        key = slug(name)
        if key in skills:  # a newer submission for an existing skill updates it
            old = skills[key]
            entry = {**old, **{k: v for k, v in entry.items() if v}}
            entry["updated_by"] = entry.pop("added_by")
            entry["added_by"] = old.get("added_by", "")
        entry.setdefault("suggestions", [])
        skills[key] = entry

    for row in fetch_rows(os.environ.get("SUGGEST_FORM_CSV", "")):
        key = slug(pick(row, "skill name"))
        text = pick(row, "your suggestion")
        if key in skills and text and published(row):
            who, dept = pick(row, "your name"), pick(row, "department")
            skills[key]["suggestions"].append({
                "by": f"{who}, {dept}" if dept else who,
                "text": text,
                "date": day(pick(row, "timestamp")),
            })

    out = {
        "synced": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "skills": list(skills.values()),
    }
    path = os.path.join(ROOT, "data", "skills.json")
    old = None
    if os.path.exists(path):
        with open(path) as f:
            old = json.load(f)
    if old and old.get("skills") == out["skills"]:
        print("No catalog changes.")
        return
    with open(path, "w") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(out['skills'])} skills.")

if __name__ == "__main__":
    sys.exit(main())
