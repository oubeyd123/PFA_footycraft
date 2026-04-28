"""Seed realistic test opponents with active lineups.

Usage:
    python scripts/seed_realistic_opponents.py

The script is idempotent: it updates the same 10 seed users and refreshes the
players it previously assigned with source='realistic_seed'.
"""

from __future__ import annotations

import os
import random
from pathlib import Path

import bcrypt
import psycopg2
import psycopg2.extras


ROOT = Path(__file__).resolve().parents[1]
SEED_PASSWORD = "FootyCraft!2026"

FORMATIONS = {
    "4-3-3": ["GK", "LB", "CB1", "CB2", "RB", "LCM", "CM", "RCM", "LW", "ST", "RW"],
    "4-4-2": ["GK", "LB", "CB1", "CB2", "RB", "LM", "LCM", "RCM", "RM", "ST1", "ST2"],
    "4-2-3-1": ["GK", "LB", "CB1", "CB2", "RB", "CDM1", "CDM2", "LAM", "CAM", "RAM", "ST"],
    "3-5-2": ["GK", "CB1", "CB2", "CB3", "LWB", "LCM", "CM", "RCM", "RWB", "ST1", "ST2"],
    "3-4-3": ["GK", "CB1", "CB2", "CB3", "LM", "LCM", "RCM", "RM", "LW", "ST", "RW"],
    "4-1-2-1-2": ["GK", "LB", "CB1", "CB2", "RB", "CDM", "LCM", "RCM", "CAM", "ST1", "ST2"],
    "5-3-2": ["GK", "LWB", "CB1", "CB2", "CB3", "RWB", "LCM", "CM", "RCM", "ST1", "ST2"],
    "4-3-2-1": ["GK", "LB", "CB1", "CB2", "RB", "LCM", "CM", "RCM", "LAM", "RAM", "ST"],
    "4-2-2-2": ["GK", "LB", "CB1", "CB2", "RB", "CDM1", "CDM2", "LAM", "RAM", "ST1", "ST2"],
}

POSITION_MAP = {
    "GK": ["GK"],
    "LB": ["LB", "LWB", "CB"],
    "CB1": ["CB", "LB", "RB"],
    "CB2": ["CB", "LB", "RB"],
    "CB3": ["CB"],
    "RB": ["RB", "RWB", "CB"],
    "LWB": ["LWB", "LB"],
    "RWB": ["RWB", "RB"],
    "CDM1": ["CDM", "CM"],
    "CDM2": ["CDM", "CM"],
    "CDM": ["CDM", "CM"],
    "LCM": ["CM", "CAM", "CDM"],
    "CM": ["CM", "CAM", "CDM"],
    "RCM": ["CM", "CAM", "CDM"],
    "LM": ["LM", "LW", "CM"],
    "RM": ["RM", "RW", "CM"],
    "CAM": ["CAM", "CM", "LW", "RW"],
    "LAM": ["CAM", "CM", "LW"],
    "RAM": ["CAM", "CM", "RW"],
    "LW": ["LW", "LM", "ST", "CAM"],
    "RW": ["RW", "RM", "ST", "CAM"],
    "ST": ["ST", "LW", "RW"],
    "ST1": ["ST", "LW", "RW"],
    "ST2": ["ST", "LW", "RW"],
}

SEED_USERS = [
    {"username": "NoahBennettFC", "first": "Noah", "last": "Bennett", "email": "noah.bennett.fc@example.test", "formation": "4-3-3", "quality": "elite", "points": 64},
    {"username": "MayaRossiXI", "first": "Maya", "last": "Rossi", "email": "maya.rossi.xi@example.test", "formation": "4-2-3-1", "quality": "strong", "points": 51},
    {"username": "EthanWalkerUTD", "first": "Ethan", "last": "Walker", "email": "ethan.walker.utd@example.test", "formation": "4-4-2", "quality": "balanced", "points": 39},
    {"username": "SofiaMartinsFC", "first": "Sofia", "last": "Martins", "email": "sofia.martins.fc@example.test", "formation": "3-5-2", "quality": "strong", "points": 45},
    {"username": "LeoHughesAFC", "first": "Leo", "last": "Hughes", "email": "leo.hughes.afc@example.test", "formation": "5-3-2", "quality": "scrappy", "points": 18},
    {"username": "AmaraOkaforSC", "first": "Amara", "last": "Okafor", "email": "amara.okafor.sc@example.test", "formation": "3-4-3", "quality": "mixed", "points": 31},
    {"username": "LucasMoreauXI", "first": "Lucas", "last": "Moreau", "email": "lucas.moreau.xi@example.test", "formation": "4-1-2-1-2", "quality": "balanced", "points": 28},
    {"username": "GraceTurnerFC", "first": "Grace", "last": "Turner", "email": "grace.turner.fc@example.test", "formation": "4-3-2-1", "quality": "elite", "points": 72},
    {"username": "DanielCostaUTD", "first": "Daniel", "last": "Costa", "email": "daniel.costa.utd@example.test", "formation": "4-2-2-2", "quality": "mixed", "points": 24},
    {"username": "HannahReedRovers", "first": "Hannah", "last": "Reed", "email": "hannah.reed.rovers@example.test", "formation": "4-3-3", "quality": "scrappy", "points": 12},
]

QUALITY_SQL = {
    "elite": ("overall >= 82", "overall DESC, name ASC"),
    "strong": ("overall BETWEEN 76 AND 86", "overall DESC, name ASC"),
    "balanced": ("overall BETWEEN 68 AND 82", "ABS(overall - 75), name ASC"),
    "mixed": ("overall BETWEEN 62 AND 86", "ABS(overall - 72), name ASC"),
    "scrappy": ("overall BETWEEN 55 AND 74", "overall DESC, name ASC"),
}

QUALITY_DIVISION = {"elite": 1, "strong": 2, "balanced": 3, "mixed": 4, "scrappy": 5}
QUALITY_CYCLE_POINTS = {"elite": 14, "strong": 12, "balanced": 9, "mixed": 7, "scrappy": 5}


def load_env() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        if not line or line.strip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def get_conn():
    load_env()
    return psycopg2.connect(os.environ["DATABASE_URL"])


def ensure_profile_columns(cur) -> None:
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider character varying(20)")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name character varying(50)")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name character varying(50)")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_level integer DEFAULT 5")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_matches_played integer DEFAULT 0")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_wins integer DEFAULT 0")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_draws integer DEFAULT 0")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_losses integer DEFAULT 0")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_goals_for integer DEFAULT 0")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_goals_against integer DEFAULT 0")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_form text DEFAULT '[]'")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_last_outcome text DEFAULT ''")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_last_level integer DEFAULT 5")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS division_last_points integer DEFAULT 0")


def fetch_candidates(cur, positions, quality, used_ids):
    where_sql, order_sql = QUALITY_SQL[quality]
    used_ids = list(used_ids) or [0]
    cur.execute(
        f"""
        SELECT id, name, position, overall
        FROM players
        WHERE position = ANY(%s)
          AND id <> ALL(%s)
          AND {where_sql}
        ORDER BY {order_sql}
        LIMIT 40
        """,
        (positions, used_ids),
    )
    rows = cur.fetchall()
    if rows:
        return rows

    cur.execute(
        """
        SELECT id, name, position, overall
        FROM players
        WHERE position = ANY(%s)
          AND id <> ALL(%s)
        ORDER BY overall DESC, name ASC
        LIMIT 40
        """,
        (positions, used_ids),
    )
    rows = cur.fetchall()
    if rows:
        return rows

    cur.execute(
        """
        SELECT id, name, position, overall
        FROM players
        WHERE id <> ALL(%s)
        ORDER BY overall DESC, name ASC
        LIMIT 40
        """,
        (used_ids,),
    )
    return cur.fetchall()


def pick_player(cur, slot_code, quality, used_ids, seed_offset):
    candidates = fetch_candidates(cur, POSITION_MAP.get(slot_code, [slot_code]), quality, used_ids)
    if not candidates:
        raise RuntimeError("No players found in the database. Import players before seeding opponents.")
    return candidates[seed_offset % len(candidates)]


def ensure_user(cur, person, password_hash):
    division_level = QUALITY_DIVISION[person["quality"]]
    cycle_points = QUALITY_CYCLE_POINTS[person["quality"]]
    cur.execute(
        """
        INSERT INTO users (
            username, email, password_hash, division_points,
            division_level, division_matches_played, division_wins, division_draws,
            division_losses, division_goals_for, division_goals_against, division_form,
            auth_provider, first_name, last_name
        )
        VALUES (%s,%s,%s,%s,%s,0,0,0,0,0,0,'[]','local',%s,%s)
        ON CONFLICT (email) DO UPDATE SET
            username = EXCLUDED.username,
            password_hash = EXCLUDED.password_hash,
            division_points = EXCLUDED.division_points,
            division_level = EXCLUDED.division_level,
            division_matches_played = EXCLUDED.division_matches_played,
            division_wins = EXCLUDED.division_wins,
            division_draws = EXCLUDED.division_draws,
            division_losses = EXCLUDED.division_losses,
            division_goals_for = EXCLUDED.division_goals_for,
            division_goals_against = EXCLUDED.division_goals_against,
            division_form = EXCLUDED.division_form,
            auth_provider = EXCLUDED.auth_provider,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name
        RETURNING id
        """,
        (
            person["username"],
            person["email"],
            password_hash,
            cycle_points,
            division_level,
            person["first"],
            person["last"],
        ),
    )
    return cur.fetchone()["id"]


def ensure_lineup(cur, user_id, person):
    lineup_name = f"{person['first']} {person['last']} XI"
    cur.execute(
        "SELECT id FROM lineups WHERE user_id=%s AND name=%s LIMIT 1",
        (user_id, lineup_name),
    )
    row = cur.fetchone()
    if row:
        lineup_id = row["id"]
        cur.execute(
            "UPDATE lineups SET formation=%s, is_public=TRUE, updated_at=NOW() WHERE id=%s",
            (person["formation"], lineup_id),
        )
    else:
        cur.execute(
            """
            INSERT INTO lineups (user_id, name, formation, is_public)
            VALUES (%s,%s,%s,TRUE)
            RETURNING id
            """,
            (user_id, lineup_name, person["formation"]),
        )
        lineup_id = cur.fetchone()["id"]

    valid_slots = FORMATIONS[person["formation"]]
    cur.execute("DELETE FROM lineup_slots WHERE lineup_id=%s", (lineup_id,))
    for slot_code in valid_slots:
        cur.execute(
            """
            INSERT INTO lineup_slots (lineup_id, slot_code, position_required)
            VALUES (%s,%s,%s)
            """,
            (lineup_id, slot_code, POSITION_MAP.get(slot_code, [slot_code])[0]),
        )
    return lineup_id


def seed_user_players(cur, user_id, lineup_id, person, person_index):
    used_ids = set()
    starter_overalls = []
    for slot_index, slot_code in enumerate(FORMATIONS[person["formation"]]):
        player = pick_player(cur, slot_code, person["quality"], used_ids, person_index * 7 + slot_index * 3)
        used_ids.add(player["id"])
        starter_overalls.append(player["overall"])
        cur.execute(
            "UPDATE lineup_slots SET player_id=%s WHERE lineup_id=%s AND slot_code=%s",
            (player["id"], lineup_id, slot_code),
        )

    cur.execute("DELETE FROM user_players WHERE user_id=%s AND source='realistic_seed'", (user_id,))
    for player_id in sorted(used_ids):
        cur.execute(
            """
            INSERT INTO user_players (user_id, player_id, source, is_tradeable)
            VALUES (%s,%s,'realistic_seed',FALSE)
            """,
            (user_id, player_id),
        )

    cur.execute(
        """
        SELECT id FROM players
        WHERE id <> ALL(%s)
        ORDER BY RANDOM()
        LIMIT 8
        """,
        (list(used_ids) or [0],),
    )
    for row in cur.fetchall():
        cur.execute(
            """
            INSERT INTO user_players (user_id, player_id, source, is_tradeable)
            VALUES (%s,%s,'realistic_seed',FALSE)
            """,
            (user_id, row["id"]),
        )

    rating = round(sum(starter_overalls) / max(1, len(starter_overalls)), 1)
    chemistry = max(5, min(33, round((rating - 55) * 1.15)))
    cur.execute(
        "UPDATE lineups SET chemistry=%s, rating=%s, updated_at=NOW() WHERE id=%s",
        (chemistry, rating, lineup_id),
    )
    return rating, chemistry


def main():
    random.seed(20260407)
    password_hash = bcrypt.hashpw(SEED_PASSWORD.encode(), bcrypt.gensalt()).decode()

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            ensure_profile_columns(cur)
            seeded = []
            for index, person in enumerate(SEED_USERS):
                user_id = ensure_user(cur, person, password_hash)
                lineup_id = ensure_lineup(cur, user_id, person)
                rating, chemistry = seed_user_players(cur, user_id, lineup_id, person, index)
                cur.execute("UPDATE users SET active_lineup_id=%s WHERE id=%s", (lineup_id, user_id))
                for chest_type in ("bronze", "silver", "gold"):
                    cur.execute(
                        """
                        INSERT INTO chest_cooldowns (user_id, chest_type, next_available_at)
                        VALUES (%s,%s,NOW())
                        ON CONFLICT (user_id, chest_type) DO NOTHING
                        """,
                        (user_id, chest_type),
                    )
                seeded.append((person["username"], person["formation"], rating, chemistry))
        conn.commit()

    print(f"Seeded {len(seeded)} realistic opponents.")
    print(f"Shared seed password: {SEED_PASSWORD}")
    for username, formation, rating, chemistry in seeded:
        print(f"- {username}: {formation}, {rating} OVR, {chemistry} chemistry")


if __name__ == "__main__":
    main()
