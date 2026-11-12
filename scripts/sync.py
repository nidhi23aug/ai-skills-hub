"""Build data/skills.json from the Google Doc catalog.

The Apps Script copies the "AI Skills Hub Catalog" Google Doc to data/catalog-doc.txt.
Doc layout: a category name on its own line, then one "- " bullet per skill:
    - Skill name - short description - Added by Name, Department https://link
A "Suggestions" heading holds bullets like:
    - Skill name: the suggestion - Suggested by Name, Department
data/seed.json adds curated details (description, who made it) for known skills.
Standard library only.
"""
import json, os, re
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
URL = re.compile(r"https?://[^\s<>()\]]+")
SPLIT = re.compile(r"\s+[-–—]\s*|\s*[-–—]\s+|\s*[-–—]$")
BULLET = re.compile(r"^\s*[-*•]\s?")

def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def parse(text):
    skills, suggestions, category = [], [], None
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if not BULLET.match(line):
            category = line
            continue
        body = BULLET.sub("", line).strip()
        if not body:
            continue
        if category and category.lower().startswith("suggestion"):
            name, _, rest = body.partition(":")
            parts = [p.strip() for p in SPLIT.split(rest) if p and p.strip()]
            by = next((p[len("suggested by"):].strip() for p in parts if p.lower().startswith("suggested by")), "")
            words = " - ".join(p for p in parts if not p.lower().startswith("suggested by"))
            if name.strip() and words:
                suggestions.append({"skill": name.strip(), "text": words, "by": by})
            continue
        urls = URL.findall(body)
        rest = URL.sub("", body).replace("<", "").replace(">", "").strip()
        parts = [p.strip() for p in SPLIT.split(rest) if p and p.strip()]
        if not parts:
            continue
        added_by = next((p[len("added by"):].strip() for p in parts[1:] if p.lower().startswith("added by")), "")
        desc = " - ".join(p for p in parts[1:] if not p.lower().startswith("added by"))
        skills.append({
            "name": parts[0],
            "category": category or "General",
            "description": desc,
            "link": urls[0].rstrip(".,") if urls else "",
            "added_by": added_by,
        })
    return skills, suggestions

def main():
    with open(os.path.join(ROOT, "data", "seed.json")) as f:
        seed = {slug(s["name"]): s for s in json.load(f)}
    doc_path = os.path.join(ROOT, "data", "catalog-doc.txt")
    if os.path.exists(doc_path):
        with open(doc_path, encoding="utf-8") as f:
            items, suggestions = parse(f.read())
    else:
        items, suggestions = list(seed.values()), []

    catalog = []
    for item in items:
        s = seed.get(slug(item["name"]), {})
        catalog.append({
            "name": item["name"],
            "category": item["category"],
            # curated seed text wins for known skills; the doc's text is used for new ones
            "description": s.get("description") or item.get("description", ""),
            "link": item.get("link") or s.get("link", ""),
            "made_by": s.get("made_by", ""),
            "suggested_by": s.get("suggested_by", ""),
            "added_by": item.get("added_by") or s.get("added_by", ""),
            "caution": bool(s.get("caution")),
            "suggestions": [x for x in suggestions if slug(x["skill"]) == slug(item["name"])],
        })

    path = os.path.join(ROOT, "data", "skills.json")
    if os.path.exists(path):
        with open(path) as f:
            if json.load(f).get("skills") == catalog:
                print("No catalog changes.")
                return
    with open(path, "w") as f:
        json.dump({"synced": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), "skills": catalog}, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print(f"Wrote {len(catalog)} skills.")

if __name__ == "__main__":
    main()
