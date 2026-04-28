"""
Link Google Drive card images to players in the database.

Reads drive_card_mapping.json (pre-built via API), matches filenames to
DB players by full_name / CSV long_name, and sets card_url.

Usage:  python3 scripts/link_drive_cards.py
Env:    DATABASE_URL must be set
"""

import csv
import json
import os
import re
import sys
import unicodedata

FOLDER_ID = "1KO0S239ZlT1BomlWeq1t3GFyDCh4qSFd"
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH  = os.path.join(BASE, ".data", "FC26_20250921_1772412238157.csv")
MAPPING   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "drive_card_mapping.json")

                                                                                   
CDN_TPL = "https://drive.google.com/thumbnail?id={fid}&sz=w400"


                                                                       
def norm(s):
    """Lower-case, strip accents, strip punctuation, collapse whitespace."""
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
                                                                           
    s = re.sub(r"['\-\.,]", "", s)
    return re.sub(r"\s+", " ", s.lower().strip())


def get_db():
    import psycopg2
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        raise RuntimeError("DATABASE_URL not set")
    return psycopg2.connect(url)


                                                                       
def fetch_mapping_via_api():
    """Use a Google API key scraped from the Drive page to list all files."""
    try:
        import requests
    except ImportError:
        import urllib.request, urllib.parse
        requests = None

    def _get(url):
        if requests:
            return requests.get(url, timeout=30).json()
        with urllib.request.urlopen(url, timeout=30) as r:
            return json.loads(r.read())

                                             
    folder_url = f"https://drive.google.com/drive/folders/{FOLDER_ID}?usp=sharing"
    if requests:
        page = requests.get(folder_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30).text
    else:
        req = urllib.request.Request(folder_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            page = r.read().decode()

    keys = list(set(re.findall(r'"(AIzaSy[a-zA-Z0-9_-]{30,40})"', page)))
    print(f"  Found {len(keys)} API keys")

    for key in keys:
        files = {}
        token = None
        page_num = 0
        try:
            while True:
                page_num += 1
                api = (
                    f"https://www.googleapis.com/drive/v3/files"
                    f"?q=%27{FOLDER_ID}%27+in+parents"
                    f"&pageSize=1000&fields=nextPageToken,files(id,name)&key={key}"
                )
                if token:
                    api += f"&pageToken={token}"
                data = _get(api)
                if "error" in data:
                    break
                for f in data.get("files", []):
                    if f["name"].endswith(".webp"):
                        files[f["id"]] = f["name"]
                token = data.get("nextPageToken")
                if not token:
                    break
            if files:
                print(f"  API listed {len(files)} files in {page_num} pages")
                mapping = [{"id": k, "name": v} for k, v in sorted(files.items(), key=lambda x: x[1])]
                with open(MAPPING, "w", encoding="utf-8") as fp:
                    json.dump(mapping, fp, ensure_ascii=False, indent=2)
                return mapping
        except Exception:
            continue

    raise RuntimeError("Could not list Drive files via API")


                                                                       
def main():
    print("=== Link Drive Card Images ===")

                                             
    if os.path.exists(MAPPING):
        with open(MAPPING, encoding="utf-8") as f:
            mapping = json.load(f)
        print(f"  Loaded {len(mapping)} entries from {MAPPING}")
    else:
        print("  Mapping file not found, fetching via API...")
        mapping = fetch_mapping_via_api()

                                                                  
    drive_lookup = {}
    for entry in mapping:
        name = entry["name"]
        base = name.rsplit(".webp", 1)[0]
                                                         
        clean = re.sub(r'_\d+$', '', base)
        key = norm(clean)
        if key not in drive_lookup:
            drive_lookup[key] = entry["id"]
                                                   
        drive_lookup[norm(base)] = entry["id"]
    print(f"  {len(drive_lookup)} unique normalized names in Drive")

                                                               
    csv_lookup = {}                                              
    csv_fullname = {}                                         
    csv_shortname = {}                                         
    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pid = row.get("player_id", "").strip()
                ln  = row.get("long_name", "").strip()
                sn  = row.get("short_name", "").strip()
                if pid and ln:
                    key = norm(ln)
                    csv_lookup.setdefault(key, []).append(pid)
                    csv_fullname[pid] = ln
                if pid and sn:
                    csv_shortname[pid] = sn
        print(f"  CSV: {len(csv_fullname)} players loaded")
    else:
        print(f"  WARNING: CSV not found at {CSV_PATH}")

                                 
    conn = get_db()
    cur  = conn.cursor()

                                                        
    cur.execute("SELECT COUNT(*) FROM players WHERE full_name IS NOT NULL AND full_name != ''")
    fn_count = cur.fetchone()[0]
    if fn_count == 0 and csv_fullname:
        print("  Populating full_name from CSV...")
        for pid, fn in csv_fullname.items():
            cur.execute(
                "UPDATE players SET full_name = %s WHERE ea_player_id = %s AND (full_name IS NULL OR full_name = '')",
                (fn, pid)
            )
        conn.commit()
        cur.execute("SELECT COUNT(*) FROM players WHERE full_name IS NOT NULL AND full_name != ''")
        fn_count = cur.fetchone()[0]
        print(f"  Populated {fn_count} full_names")

                      
    cur.execute("SELECT id, ea_player_id, name, full_name FROM players")
    players = cur.fetchall()
    print(f"  DB: {len(players)} players")

                                                         
    matched = 0
    batch = []
    for pid, ea_id, name, full_name in players:
        fid = None

                                           
        if full_name:
            fid = drive_lookup.get(norm(full_name))

                                                            
        if not fid and ea_id and str(ea_id) in csv_fullname:
            ln = csv_fullname[str(ea_id)]
            fid = drive_lookup.get(norm(ln))

                                                           
        if not fid and ea_id and str(ea_id) in csv_shortname:
            sn = csv_shortname[str(ea_id)]
            fid = drive_lookup.get(norm(sn))

                                                                     
        if not fid and name:
            fid = drive_lookup.get(norm(name))

                                                      
                                                           
                                                                    
        if not fid and full_name:
            parts = full_name.strip().split()
            if len(parts) >= 2:
                                  
                first_last = f"{parts[0]} {parts[-1]}"
                fid = drive_lookup.get(norm(first_last))
                                                                
                if not fid and len(parts) >= 3:
                    first_two_last = f"{parts[0]} {parts[1]} {parts[-1]}"
                    fid = drive_lookup.get(norm(first_two_last))

                                                                          
                                                                  
        if not fid and full_name:
            parts = full_name.strip().split()
            if len(parts) >= 3:
                for mid in parts[1:-1]:
                    fid = drive_lookup.get(norm(f"{parts[0]} {mid}"))
                    if fid:
                        break

        if fid:
            url = CDN_TPL.format(fid=fid)
            batch.append((url, pid))
            matched += 1

                  
    if batch:
        print(f"  Updating card_url for {matched} players...")
        cur.executemany("UPDATE players SET card_url = %s WHERE id = %s", batch)
        conn.commit()

    cur.close()
    conn.close()
    print(f"  Done! Matched {matched}/{len(players)} players to Drive cards")


if __name__ == "__main__":
    main()
