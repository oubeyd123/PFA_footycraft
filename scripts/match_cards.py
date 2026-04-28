"""
Match downloaded card images (.webp) to players in the DB and set card_url.
Also populates full_name from the CSV long_name column.

Usage: python3 scripts/match_cards.py
  (must run inside Docker or with DATABASE_URL set)
"""

import csv
import os
import sys
import re
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.db import execute, query

CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".data", "FC26_20250921_1772412238157.csv"
)

CARDS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend", "assets", "images", "cards"
)

CARD_URL_PREFIX = "/frontend/assets/images/cards/"


def normalize(s):
    """Normalize a string: lowercase, strip accents, collapse whitespace."""
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = s.lower().strip()
    s = re.sub(r'\s+', ' ', s)
    return s


def build_csv_lookup():
    """Build lookup tables from the CSV for name matching."""
    if not os.path.exists(CSV_PATH):
        print(f"CSV not found: {CSV_PATH}")
        return {}, {}

                                                                               
    long_name_map = {}
                                    
    id_to_long = {}

    with open(CSV_PATH, encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = int(row.get('player_id', 0) or 0)
            short = (row.get('short_name') or '').strip()
            long_name = (row.get('long_name') or '').strip()

            if pid and long_name:
                id_to_long[pid] = long_name
                key = normalize(long_name)
                long_name_map.setdefault(key, []).append((pid, short, long_name))

    print(f"  CSV lookup: {len(id_to_long)} players with long names")
    return long_name_map, id_to_long


def match_filename_to_player(filename_stem, long_name_map, db_players):
    """
    Try to match a card filename (e.g. 'Aaron Ramsdale') to a player.
    Returns (ea_player_id, confidence) or (None, 0).
    """
    norm_fn = normalize(filename_stem)

                                                   
    if norm_fn in long_name_map:
        entries = long_name_map[norm_fn]
        if len(entries) == 1:
            return entries[0][0], 1.0
                                                             
        for pid, short, long in entries:
            if pid in db_players:
                return pid, 0.95

                                                                        
    parts = filename_stem.split()
    if len(parts) >= 2:
        first = parts[0]
        last = ' '.join(parts[1:])
        initial = first[0] + '.'
        short_guess = f"{initial} {last}"
        norm_guess = normalize(short_guess)

        for pid, (db_name, db_ea_id) in db_players.items():
            if normalize(db_name) == norm_guess:
                return db_ea_id, 0.9

                                                                 
    for key, entries in long_name_map.items():
        if norm_fn in key or key.startswith(norm_fn):
            if len(entries) == 1:
                return entries[0][0], 0.8

                                                         
    if len(parts) >= 2:
        last_norm = normalize(parts[-1])
        first_char = normalize(parts[0])[0] if parts[0] else ''
        candidates = []
        for pid, (db_name, db_ea_id) in db_players.items():
            db_norm = normalize(db_name)
            db_parts = db_norm.split()
            if len(db_parts) >= 2:
                db_last = db_parts[-1]
                db_first_c = db_parts[0][0] if db_parts[0] else ''
                if db_last == last_norm and db_first_c == first_char:
                    candidates.append((db_ea_id, pid))
        if len(candidates) == 1:
            return candidates[0][0], 0.7

    return None, 0


def main():
    print("=== Card Image Matcher ===\n")

                                                  
    print("Step 1: Populating full_name from CSV...")
    long_name_map, id_to_long = build_csv_lookup()

    if id_to_long:
                                      
        empty_count = query(
            "SELECT COUNT(*) as cnt FROM players WHERE (full_name IS NULL OR full_name = '') AND ea_player_id IS NOT NULL",
            fetch='one'
        )
        empty_count = dict(empty_count)['cnt'] if empty_count else 0
        print(f"  Players needing full_name update: {empty_count}")

        if empty_count > 0:
                                             
            updated = 0
            batch = []
            for ea_id, long_name in id_to_long.items():
                batch.append((long_name, ea_id))
                if len(batch) >= 500:
                    execute(
                        "UPDATE players SET full_name = data.fn FROM "
                        "(VALUES " + ",".join(["(%s, %s)"] * len(batch)) + ") AS data(fn, eid) "
                        "WHERE players.ea_player_id = data.eid::int AND (players.full_name IS NULL OR players.full_name = '')",
                        tuple(v for pair in batch for v in pair)
                    )
                    updated += len(batch)
                    batch = []
                    print(f"  ...updated {updated} full_names", end='\r')

            if batch:
                execute(
                    "UPDATE players SET full_name = data.fn FROM "
                    "(VALUES " + ",".join(["(%s, %s)"] * len(batch)) + ") AS data(fn, eid) "
                    "WHERE players.ea_player_id = data.eid::int AND (players.full_name IS NULL OR players.full_name = '')",
                    tuple(v for pair in batch for v in pair)
                )
                updated += len(batch)

            print(f"\n  Updated {updated} player full_names")

                                   
    print(f"\nStep 2: Scanning card images in {CARDS_DIR}...")
    if not os.path.isdir(CARDS_DIR):
        print(f"  Cards directory not found!")
        return

    card_files = [f for f in os.listdir(CARDS_DIR) if f.lower().endswith('.webp')]
    print(f"  Found {len(card_files)} card images")

    if not card_files:
        print("  No card images to match.")
        return

                                          
    print("\nStep 3: Loading DB players...")
    rows = query("SELECT id, name, ea_player_id, full_name FROM players")
                                     
    db_players = {}
    ea_to_dbid = {}
    fullname_to_dbid = {}
    for r in rows:
        r = dict(r)
        db_players[r['id']] = (r['name'], r['ea_player_id'])
        if r['ea_player_id']:
            ea_to_dbid[r['ea_player_id']] = r['id']
        if r['full_name']:
            fn_key = normalize(r['full_name'])
            fullname_to_dbid.setdefault(fn_key, []).append(r['id'])
    print(f"  Loaded {len(db_players)} players")

                                         
    print("\nStep 4: Matching card files to players...")
    matched = 0
    unmatched = []
    updates = []

    for card_file in card_files:
        stem = os.path.splitext(card_file)[0]
                                             
        clean_stem = re.sub(r'_\d+$', '', stem)
        norm_stem = normalize(clean_stem)

        card_url = CARD_URL_PREFIX + card_file

                                                                              
        if norm_stem in fullname_to_dbid:
            db_ids = fullname_to_dbid[norm_stem]
            for db_id in db_ids:
                updates.append((card_url, db_id))
            matched += 1
            continue

                                 
        ea_id, confidence = match_filename_to_player(clean_stem, long_name_map, db_players)
        if ea_id and ea_id in ea_to_dbid:
            db_id = ea_to_dbid[ea_id]
            updates.append((card_url, db_id))
            matched += 1
        else:
            unmatched.append(card_file)

    print(f"  Matched: {matched}/{len(card_files)}")
    if unmatched:
        print(f"  Unmatched: {', '.join(unmatched[:10])}{'...' if len(unmatched) > 10 else ''}")

                                   
    if updates:
        print(f"\nStep 5: Updating card_url for {len(updates)} players...")
        for card_url, db_id in updates:
            execute("UPDATE players SET card_url = %s WHERE id = %s", (card_url, db_id))
        print(f"  Done! Updated {len(updates)} players with card_url")

             
    total_with_cards = query("SELECT COUNT(*) as cnt FROM players WHERE card_url IS NOT NULL AND card_url != ''", fetch='one')
    total_with_images = query("SELECT COUNT(*) as cnt FROM players WHERE image_url IS NOT NULL AND image_url != ''", fetch='one')
    total = query("SELECT COUNT(*) as cnt FROM players", fetch='one')
    print(f"\n=== Summary ===")
    print(f"  Total players: {dict(total)['cnt']}")
    print(f"  With card_url: {dict(total_with_cards)['cnt']}")
    print(f"  With image_url: {dict(total_with_images)['cnt']}")
    print(f"  (Players without card_url will show face photo from image_url)")


if __name__ == "__main__":
    main()
