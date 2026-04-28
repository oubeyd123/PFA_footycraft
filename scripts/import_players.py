"""
Import EA FC 26 players from CSV into the FootyCraft database.
Usage: python3 scripts/import_players.py
"""

import argparse
import csv
import os
import sys
import random
import bcrypt

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.db import execute, query

CSV_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    ".data", "FC26_20250921_1772412238157.csv"
)

BATCH_SIZE = 1000


def get_rarity(ovr: int) -> str:
    if ovr >= 88:
        return "legend"
    elif ovr >= 82:
        return "epic"
    elif ovr >= 72:
        return "rare"
    return "common"


def safe_int(val, default=50) -> int:
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def parse_primary_position(pos_str: str) -> str:
    if not pos_str:
        return "CM"
    first = pos_str.split(",")[0].strip()
    return first if first else "CM"


def build_player_row(row: dict) -> dict | None:
    try:
        ovr = safe_int(row.get("overall", 0))
        if ovr < 1:
            return None

        primary_pos = parse_primary_position(row.get("player_positions", "CM"))
        alt_positions_raw = row.get("player_positions", "")
        alt_positions = ", ".join(
            p.strip() for p in alt_positions_raw.split(",") if p.strip()
        )

        rarity = get_rarity(ovr)

        return {
            "ea_player_id": safe_int(row.get("player_id", 0)),
            "name":         (row.get("short_name") or row.get("long_name") or "Unknown").strip(),
            "nation":       (row.get("nationality_name") or "Unknown").strip(),
            "league":       (row.get("league_name") or "Unknown").strip(),
            "club":         (row.get("club_name") or "Unknown").strip(),
            "position":     primary_pos,
            "alt_positions":alt_positions,
            "overall":      ovr,
            "pace":         safe_int(row.get("pace")),
            "shooting":     safe_int(row.get("shooting")),
            "passing":      safe_int(row.get("passing")),
            "dribbling":    safe_int(row.get("dribbling")),
            "defending":    safe_int(row.get("defending")),
            "physical":     safe_int(row.get("physic")),
            "rarity":       rarity,
            "card_type":    rarity,
            "image_url":    (row.get("player_face_url") or "").strip() or None,
        }
    except Exception as e:
        print(f"  [skip] row parse error: {e}")
        return None


def ensure_ea_player_id_column():
    existing = query(
        "SELECT column_name FROM information_schema.columns "
        "WHERE table_name='players' AND column_name='ea_player_id'"
    )
    if not existing:
        execute("ALTER TABLE players ADD COLUMN ea_player_id INTEGER")
        print("  Added ea_player_id column to players table.")


def players_already_loaded() -> int:
    existing = query("SELECT COUNT(*) AS cnt FROM players", fetch="one")
    return int(dict(existing)["cnt"]) if existing else 0


def clear_non_icon_players():
    print("Clearing non-icon players from database...")
    execute(
        "DELETE FROM user_players WHERE player_id IN "
        "(SELECT id FROM players WHERE rarity != 'icon')"
    )
    execute(
        "UPDATE lineup_slots SET player_id = NULL WHERE player_id IN "
        "(SELECT id FROM players WHERE rarity != 'icon')"
    )
    execute("UPDATE lineups SET chemistry = 0, rating = 0")
    execute("DELETE FROM players WHERE rarity != 'icon'")
    print("  Done. Icon players preserved.")


def batch_insert(players: list[dict]):
    if not players:
        return 0

    cols = [
        "ea_player_id", "name", "nation", "league", "club", "position",
        "alt_positions", "overall", "pace", "shooting", "passing",
        "dribbling", "defending", "physical", "rarity", "card_type", "image_url"
    ]

    values_sql = []
    params = []
    for p in players:
        values_sql.append("(" + ",".join(["%s"] * len(cols)) + ")")
        for c in cols:
            params.append(p.get(c))

    sql = (
        f"INSERT INTO players ({','.join(cols)}) VALUES {','.join(values_sql)} "
        f"ON CONFLICT DO NOTHING"
    )
    execute(sql, tuple(params))
    return len(players)


def reassign_bot_lineups():
    try:
        from api.app import FORMATIONS, POSITION_MAP, _calc_chemistry
    except ImportError as exc:
        print(f"  Skipping bot lineup reassignment: {exc}")
        return

    print("Reassigning bot lineup slots with new players...")
    bots = query(
        "SELECT u.id, u.active_lineup_id, l.formation "
        "FROM users u JOIN lineups l ON l.id = u.active_lineup_id "
        "WHERE u.email LIKE '%%@bots.fc'"
    )
    if not bots:
        print("  No bots found.")
        return

    all_players = query("SELECT id, position FROM players WHERE rarity != 'icon' ORDER BY RANDOM()")
    if not all_players:
        print("  No players to assign.")
        return

    for bot in bots:
        bot = dict(bot)
        lin_id   = bot["active_lineup_id"]
        formation = bot["formation"]
        slots    = FORMATIONS.get(formation, FORMATIONS["4-3-3"])
        players_pool = [dict(p) for p in all_players]
        random.shuffle(players_pool)
        used_ids = set()

        execute("UPDATE lineup_slots SET player_id = NULL WHERE lineup_id = %s", (lin_id,))

        for slot_code in slots:
            pos_opts   = POSITION_MAP.get(slot_code, [slot_code])
            candidates = [p for p in players_pool if p["id"] not in used_ids and p["position"] in pos_opts]
            if not candidates:
                candidates = [p for p in players_pool if p["id"] not in used_ids]
            if candidates:
                chosen = candidates[0]
                used_ids.add(chosen["id"])
                execute(
                    "UPDATE lineup_slots SET player_id=%s WHERE lineup_id=%s AND slot_code=%s",
                    (chosen["id"], lin_id, slot_code)
                )

        chem, rating = _calc_chemistry(lin_id)
        execute("UPDATE lineups SET chemistry=%s, rating=%s WHERE id=%s", (chem, rating, lin_id))

    print(f"  Reassigned {len(bots)} bot lineups.")


def main():
    parser = argparse.ArgumentParser(description="Import EA FC 26 players into the FootyCraft database.")
    parser.add_argument(
        "--if-empty",
        action="store_true",
        help="Skip the import when the players table already contains rows.",
    )
    args = parser.parse_args()

    print(f"FootyCraft — EA FC 26 Player Import")
    print(f"CSV: {CSV_PATH}")
    print()

    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV file not found at {CSV_PATH}")
        sys.exit(1)

    ensure_ea_player_id_column()
    if args.if_empty:
        existing_count = players_already_loaded()
        if existing_count > 0:
            print(f"Players already loaded: {existing_count:,}. Skipping import.")
            return

    clear_non_icon_players()

    print("Reading and importing players from CSV...")
    total_read = 0
    total_inserted = 0
    total_skipped = 0
    batch = []

    with open(CSV_PATH, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_read += 1
            p = build_player_row(row)
            if p is None:
                total_skipped += 1
                continue
            batch.append(p)

            if len(batch) >= BATCH_SIZE:
                inserted = batch_insert(batch)
                total_inserted += inserted
                batch = []
                print(f"  ...imported {total_inserted} players so far", end="\r")

    if batch:
        inserted = batch_insert(batch)
        total_inserted += inserted

    print(f"\n  Read: {total_read}  |  Inserted: {total_inserted}  |  Skipped: {total_skipped}")
    print()

    counts = query("SELECT rarity, COUNT(*) as cnt FROM players WHERE rarity != 'icon' GROUP BY rarity ORDER BY cnt DESC")
    print("Player rarity breakdown:")
    for r in (counts or []):
        r = dict(r)
        print(f"  {r['rarity']:8s}: {r['cnt']:,}")

    icons = query("SELECT COUNT(*) as cnt FROM players WHERE rarity = 'icon'", fetch="one")
    print(f"  {'icon':8s}: {dict(icons)['cnt']:,}  (preserved)")
    print()

    reassign_bot_lineups()

    total = query("SELECT COUNT(*) as cnt FROM players", fetch="one")
    print(f"\nTotal players in DB: {dict(total)['cnt']:,}")
    print("Import complete!")


if __name__ == "__main__":
    main()
