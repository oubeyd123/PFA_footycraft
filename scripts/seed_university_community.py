"""Seed university users plus realistic community and match activity.

Usage:
    python scripts/seed_university_community.py

This script is idempotent for the imported university cohort:
- users are upserted by email
- the cohort's seeded lineups and owned players are refreshed
- the cohort's posts, comments, likes, notifications, and match rows are rebuilt
"""

from __future__ import annotations

import csv
import json
import os
import random
import re
import unicodedata
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import bcrypt
import psycopg2
import psycopg2.extras


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "scripts" / "data" / "university_seed_users.tsv"
SEED_PASSWORD = "FootyCraft!2026"
SEED_SOURCE = "university_seed_2026"
SEED_RANDOM = 20260426

FORMATIONS = [
    "4-3-3",
    "4-2-3-1",
    "4-4-2",
    "4-1-2-1-2",
    "3-5-2",
    "4-3-2-1",
    "4-2-2-2",
    "3-4-3",
    "5-3-2",
]

FORMATION_SLOTS = {
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

QUALITY_SQL = {
    "elite": ("overall >= 84", "overall DESC, name ASC"),
    "strong": ("overall BETWEEN 78 AND 88", "overall DESC, name ASC"),
    "balanced": ("overall BETWEEN 72 AND 84", "ABS(overall - 78), name ASC"),
    "mixed": ("overall BETWEEN 66 AND 82", "ABS(overall - 74), name ASC"),
    "scrappy": ("overall BETWEEN 58 AND 76", "overall DESC, name ASC"),
}

QUALITY_LEVEL = {"elite": 1, "strong": 2, "balanced": 3, "mixed": 4, "scrappy": 5}
QUALITY_BASE_POINTS = {"elite": 24, "strong": 20, "balanced": 16, "mixed": 12, "scrappy": 8}

FORMATION_MOMENTUM = {
    "4-2-3-1": 30,
    "4-3-3": 28,
    "4-1-2-1-2": 24,
    "4-4-2": 20,
    "3-5-2": 18,
    "4-3-2-1": 15,
    "4-2-2-2": 12,
    "3-4-3": 9,
    "5-3-2": 6,
}

QUALITY_SIGNAL = {
    "elite": (255, 72),
    "strong": (215, 56),
    "balanced": (180, 42),
    "mixed": (145, 30),
    "scrappy": (115, 20),
}

POST_OPENERS = [
    "Small tweak, big difference:",
    "Tonight's test paid off:",
    "Campus grind update:",
    "Finally found a setup that clicks:",
    "After a few rough matches, this helped:",
    "Quick share from the latest run:",
]

TACTIC_NOTES = [
    "keeping the back line compact made the press much cleaner",
    "letting the fullbacks stay back stopped the cheap counters",
    "using one calmer midfielder under pressure fixed the build-up",
    "switching the press trigger to the wings gave me better recoveries",
    "moving the striker a bit wider opened the half-space runs",
    "slowing the first pass out of defense helped the team breathe",
]

COMMENT_TEMPLATES = [
    "That shape looks balanced. I would keep the midfield triangle exactly like that.",
    "Tried something close to this and the second balls were much easier to win.",
    "The spacing between the winger and fullback is the part I like most here.",
    "Good call. This is the kind of lineup that feels stable over a full session.",
    "I can see why this worked. The central overload is really clear.",
    "Nice one. I would only change the press timing a little in the first half.",
]

REPLY_TEMPLATES = [
    "That was exactly the idea. I wanted cleaner exits before forcing the tempo.",
    "Agreed. The midfield distances were the first thing I fixed.",
    "I tested that too and it helped once the match got stretched.",
    "Yes, especially when the opponent tried to trap the first pass.",
]


@dataclass
class Person:
    cohort: str
    student_id: str
    last_name: str
    first_name: str
    email: str
    username: str = ""
    user_id: int = 0
    quality: str = "balanced"
    formation: str = "4-3-3"
    lineup_id: int = 0
    lineup_name: str = ""
    rating: float = 0.0
    chemistry: int = 0
    starters: list[dict[str, Any]] | None = None
    bench: list[dict[str, Any]] | None = None
    division_level: int = 5
    division_points: int = 0
    form: list[str] | None = None
    record: dict[str, int] | None = None

    @property
    def display_name(self) -> str:
        return " ".join(part for part in [self.first_name.strip(), self.last_name.strip()] if part).strip() or self.username


def load_env() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if not line or line.strip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def get_conn():
    load_env()
    return psycopg2.connect(os.environ["DATABASE_URL"])


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value or "")
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "", ascii_value.lower())


def normalize_name_fields(first_name: str, last_name: str) -> tuple[str, str]:
    first = first_name.strip()
    last = last_name.strip()
    if first or not last:
        return first, last
    parts = last.split()
    if len(parts) >= 2:
        return parts[-1].title(), " ".join(parts[:-1]).title()
    return "", last.title()


def load_people() -> list[Person]:
    people: list[Person] = []
    with DATA_FILE.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            first_name, last_name = normalize_name_fields(
                row.get("first_name", ""),
                row.get("last_name", ""),
            )
            people.append(
                Person(
                    cohort=(row.get("cohort") or "").strip(),
                    student_id=(row.get("student_id") or "").strip(),
                    last_name=last_name,
                    first_name=first_name,
                    email=(row.get("email") or "").strip().lower(),
                )
            )
    return people


def assign_quality(person: Person, index: int) -> str:
    score = (sum(int(ch) for ch in person.student_id if ch.isdigit()) + index) % 10
    if score in (0, 1):
        return "elite"
    if score in (2, 3):
        return "strong"
    if score in (4, 5, 6):
        return "balanced"
    if score in (7, 8):
        return "mixed"
    return "scrappy"


def assign_formation(index: int) -> str:
    return FORMATIONS[index % len(FORMATIONS)]


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
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS coins integer DEFAULT 0")
    cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamp")


def fetch_existing_usernames(cur) -> set[str]:
    cur.execute("SELECT username FROM users")
    return {str(row["username"]).lower() for row in cur.fetchall() if row.get("username")}


def build_username(person: Person, used_usernames: set[str]) -> str:
    base = slugify(f"{person.first_name}{person.last_name}") or slugify(person.email.split("@", 1)[0]) or "campususer"
    suffix = "".join(ch for ch in person.student_id if ch.isdigit())[-3:] or "001"
    candidate = f"{base[:17]}{suffix}"
    candidate = candidate[:20]
    if candidate.lower() not in used_usernames:
        used_usernames.add(candidate.lower())
        return candidate

    serial = 2
    while True:
        extra = str(serial)
        trimmed = f"{base[: max(3, 20 - len(extra))]}{extra}"[:20]
        if trimmed.lower() not in used_usernames:
            used_usernames.add(trimmed.lower())
            return trimmed
        serial += 1


def ensure_user(cur, person: Person, password_hash: str, used_usernames: set[str]) -> None:
    cur.execute("SELECT id, username FROM users WHERE email = %s LIMIT 1", (person.email,))
    existing = cur.fetchone()
    username = str(existing["username"]).strip() if existing and existing.get("username") else build_username(person, used_usernames)
    used_usernames.add(username.lower())

    person.division_level = QUALITY_LEVEL[person.quality]
    person.division_points = QUALITY_BASE_POINTS[person.quality]

    cur.execute(
        """
        INSERT INTO users (
            username, email, password_hash, division_points, division_level,
            division_matches_played, division_wins, division_draws, division_losses,
            division_goals_for, division_goals_against, division_form, division_last_outcome,
            division_last_level, division_last_points, coins, role, status, auth_provider,
            first_name, last_name, onboarding_completed_at, last_login
        )
        VALUES (%s,%s,%s,%s,%s,0,0,0,0,0,0,'[]','',%s,%s,%s,'player','active','local',%s,%s,NOW(),NOW())
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
            division_last_outcome = EXCLUDED.division_last_outcome,
            division_last_level = EXCLUDED.division_last_level,
            division_last_points = EXCLUDED.division_last_points,
            coins = EXCLUDED.coins,
            role = EXCLUDED.role,
            status = EXCLUDED.status,
            auth_provider = EXCLUDED.auth_provider,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            onboarding_completed_at = COALESCE(users.onboarding_completed_at, EXCLUDED.onboarding_completed_at),
            last_login = NOW()
        RETURNING id, username
        """,
        (
            username,
            person.email,
            password_hash,
            person.division_points,
            person.division_level,
            person.division_level,
            person.division_points,
            random.randint(650, 5200),
            person.first_name,
            person.last_name,
        ),
    )
    row = cur.fetchone()
    person.user_id = int(row["id"])
    person.username = str(row["username"])


def fetch_candidates(cur, positions: list[str], quality: str, used_ids: set[int]) -> list[dict[str, Any]]:
    where_sql, order_sql = QUALITY_SQL[quality]
    used_list = list(used_ids) or [0]
    cur.execute(
        f"""
        SELECT id, name, position, overall, pace, shooting, passing, dribbling, defending, physical, card_url, image_url, nation, club
        FROM players
        WHERE position = ANY(%s)
          AND id <> ALL(%s)
          AND {where_sql}
        ORDER BY {order_sql}
        LIMIT 60
        """,
        (positions, used_list),
    )
    rows = cur.fetchall()
    if rows:
        return rows

    cur.execute(
        """
        SELECT id, name, position, overall, pace, shooting, passing, dribbling, defending, physical, card_url, image_url, nation, club
        FROM players
        WHERE position = ANY(%s)
          AND id <> ALL(%s)
        ORDER BY overall DESC, name ASC
        LIMIT 60
        """,
        (positions, used_list),
    )
    rows = cur.fetchall()
    if rows:
        return rows

    cur.execute(
        """
        SELECT id, name, position, overall, pace, shooting, passing, dribbling, defending, physical, card_url, image_url, nation, club
        FROM players
        WHERE id <> ALL(%s)
        ORDER BY overall DESC, name ASC
        LIMIT 60
        """,
        (used_list,),
    )
    return cur.fetchall()


def pick_player(cur, slot_code: str, quality: str, used_ids: set[int], seed_offset: int) -> dict[str, Any]:
    candidates = fetch_candidates(cur, POSITION_MAP.get(slot_code, [slot_code]), quality, used_ids)
    if not candidates:
        raise RuntimeError("No players found in the database. Import players before seeding campus users.")
    return dict(candidates[seed_offset % len(candidates)])


def ensure_lineup(cur, person: Person) -> None:
    person.lineup_name = f"{person.display_name or person.username} XI"
    cur.execute(
        "SELECT id FROM lineups WHERE user_id = %s AND name = %s LIMIT 1",
        (person.user_id, person.lineup_name),
    )
    row = cur.fetchone()
    if row:
        person.lineup_id = int(row["id"])
        cur.execute(
            "UPDATE lineups SET formation = %s, is_public = TRUE, updated_at = NOW() WHERE id = %s",
            (person.formation, person.lineup_id),
        )
    else:
        cur.execute(
            """
            INSERT INTO lineups (user_id, name, formation, is_public)
            VALUES (%s,%s,%s,TRUE)
            RETURNING id
            """,
            (person.user_id, person.lineup_name, person.formation),
        )
        person.lineup_id = int(cur.fetchone()["id"])

    cur.execute("DELETE FROM lineup_slots WHERE lineup_id = %s", (person.lineup_id,))
    for slot_code in FORMATION_SLOTS[person.formation]:
        cur.execute(
            """
            INSERT INTO lineup_slots (lineup_id, slot_code, position_required)
            VALUES (%s,%s,%s)
            """,
            (person.lineup_id, slot_code, POSITION_MAP.get(slot_code, [slot_code])[0]),
        )


def seed_user_players(cur, person: Person, person_index: int) -> None:
    used_ids: set[int] = set()
    starters: list[dict[str, Any]] = []
    starter_overalls: list[int] = []

    for slot_index, slot_code in enumerate(FORMATION_SLOTS[person.formation]):
        player = pick_player(cur, slot_code, person.quality, used_ids, person_index * 11 + slot_index * 3)
        used_ids.add(int(player["id"]))
        starter_overalls.append(int(player["overall"]))
        player["slot_code"] = slot_code
        starters.append(player)
        cur.execute(
            "UPDATE lineup_slots SET player_id = %s WHERE lineup_id = %s AND slot_code = %s",
            (player["id"], person.lineup_id, slot_code),
        )

    cur.execute("DELETE FROM user_players WHERE user_id = %s AND source = %s", (person.user_id, SEED_SOURCE))
    for player_id in sorted(used_ids):
        cur.execute(
            """
            INSERT INTO user_players (user_id, player_id, source, is_tradeable)
            VALUES (%s,%s,%s,FALSE)
            """,
            (person.user_id, player_id, SEED_SOURCE),
        )

    cur.execute(
        """
        SELECT id, name, position, overall, pace, shooting, passing, dribbling, defending, physical, card_url, image_url, nation, club
        FROM players
        WHERE id <> ALL(%s)
        ORDER BY overall DESC, id ASC
        LIMIT 60
        """,
        (list(used_ids) or [0],),
    )
    reserve_pool = cur.fetchall()
    bench: list[dict[str, Any]] = []
    for offset in range(8):
        player = dict(reserve_pool[(person_index * 5 + offset * 2) % len(reserve_pool)])
        bench.append(player)
        cur.execute(
            """
            INSERT INTO user_players (user_id, player_id, source, is_tradeable)
            VALUES (%s,%s,%s,FALSE)
            """,
            (person.user_id, int(player["id"]), SEED_SOURCE),
        )

    person.rating = round(sum(starter_overalls) / max(1, len(starter_overalls)), 1)
    person.chemistry = max(8, min(33, round((person.rating - 56) * 1.1)))
    person.starters = starters
    person.bench = bench

    cur.execute(
        "UPDATE lineups SET chemistry = %s, rating = %s, updated_at = NOW() WHERE id = %s",
        (person.chemistry, person.rating, person.lineup_id),
    )
    cur.execute(
        """
        INSERT INTO chest_cooldowns (user_id, chest_type, next_available_at)
        VALUES (%s,'bronze',NOW()),(%s,'silver',NOW()),(%s,'gold',NOW())
        ON CONFLICT (user_id, chest_type) DO UPDATE SET next_available_at = EXCLUDED.next_available_at
        """,
        (person.user_id, person.user_id, person.user_id),
    )
    cur.execute("UPDATE users SET active_lineup_id = %s WHERE id = %s", (person.lineup_id, person.user_id))


def build_lineup_snapshot(person: Person) -> str:
    slots = []
    for player in person.starters or []:
        slots.append(
            {
                "slot_code": player["slot_code"],
                "position_required": POSITION_MAP.get(player["slot_code"], [player["slot_code"]])[0],
                "player_id": int(player["id"]),
                "name": player["name"],
                "overall": int(player["overall"]),
                "position": player["position"],
                "nation": player.get("nation", ""),
                "club": player.get("club", ""),
                "pace": int(player.get("pace") or 0),
                "shooting": int(player.get("shooting") or 0),
                "passing": int(player.get("passing") or 0),
                "dribbling": int(player.get("dribbling") or 0),
                "defending": int(player.get("defending") or 0),
                "physical": int(player.get("physical") or 0),
                "card_url": player.get("card_url") or "",
                "image_url": player.get("image_url") or "",
            }
        )
    return json.dumps(
        {
            "id": person.lineup_id,
            "name": person.lineup_name,
            "formation": person.formation,
            "slots": slots,
        },
        ensure_ascii=False,
        separators=(",", ":"),
    )


def cleanup_existing_activity(cur, seed_user_ids: list[int]) -> None:
    if not seed_user_ids:
        return

    cur.execute(
        """
        DELETE FROM community_likes
        WHERE user_id = ANY(%s)
           OR post_id IN (SELECT id FROM community_posts WHERE user_id = ANY(%s))
           OR comment_id IN (
                SELECT id FROM community_comments
                WHERE user_id = ANY(%s)
                   OR post_id IN (SELECT id FROM community_posts WHERE user_id = ANY(%s))
           )
        """,
        (seed_user_ids, seed_user_ids, seed_user_ids, seed_user_ids),
    )
    cur.execute(
        "DELETE FROM community_comments WHERE user_id = ANY(%s) OR post_id IN (SELECT id FROM community_posts WHERE user_id = ANY(%s))",
        (seed_user_ids, seed_user_ids),
    )
    cur.execute("DELETE FROM community_posts WHERE user_id = ANY(%s)", (seed_user_ids,))
    cur.execute("DELETE FROM matches WHERE user_id = ANY(%s)", (seed_user_ids,))
    cur.execute("DELETE FROM notifications WHERE user_id = ANY(%s) AND source = %s", (seed_user_ids, SEED_SOURCE))


def refresh_public_lineup_signal(cur, people: list[Person]) -> None:
    if not people:
        return

    seed_user_ids = [person.user_id for person in people if person.user_id]
    if seed_user_ids:
        cur.execute("UPDATE lineups SET is_public = TRUE WHERE user_id = ANY(%s)", (seed_user_ids,))

    ranked_people = sorted(
        [person for person in people if person.lineup_id],
        key=lambda person: (-person.division_points, -person.rating, -person.chemistry, person.username),
    )

    now = datetime.utcnow()
    for rank, person in enumerate(ranked_people, start=1):
        base_views, base_likes = QUALITY_SIGNAL.get(person.quality, QUALITY_SIGNAL["balanced"])
        formation_bonus = FORMATION_MOMENTUM.get(person.formation, 0)
        standout = max((int(player.get("overall") or 0) for player in (person.starters or [])), default=0)
        views = base_views + formation_bonus + max(0, person.division_points - 8) * 4 + max(0, standout - 74) * 3 + ((rank - 1) % 7) * 9
        likes = min(
            views - 2,
            base_likes + formation_bonus // 3 + max(0, person.chemistry - 16) + ((rank - 1) % 5) * 3,
        )
        updated_at = now - timedelta(days=(rank - 1) % 36, hours=(rank * 3) % 23, minutes=(rank * 11) % 59)
        cur.execute(
            """
            UPDATE lineups
            SET is_public = TRUE,
                views_count = %s,
                likes_count = %s,
                updated_at = %s
            WHERE id = %s
            """,
            (max(42, views), max(6, likes), updated_at, person.lineup_id),
        )


def attacker_names(person: Person) -> list[str]:
    attackers = [
        player["name"]
        for player in (person.starters or [])
        if str(player.get("position") or "").upper() in {"ST", "LW", "RW", "CAM", "LM", "RM"}
    ]
    return attackers or [player["name"] for player in (person.starters or [])[:3]]


def create_post_content(author: Person, random_gen: random.Random) -> tuple[str, str, bool]:
    stars = attacker_names(author)
    opener = random_gen.choice(POST_OPENERS)
    note = random_gen.choice(TACTIC_NOTES)
    if random_gen.random() < 0.45:
        category = "tactics"
        content = (
            f"{opener} switched {author.display_name.split()[0] or author.username} into a {author.formation} and "
            f"{note}. {stars[0]} has been the reference point, while {stars[min(1, len(stars) - 1)]} keeps finding the second run."
        )
        attach_lineup = True
    else:
        category = "general"
        content = (
            f"{opener} two good sessions in a row with {stars[0]} leading the line. "
            f"The campus leaderboard is getting tight, but this squad finally feels stable in possession."
        )
        attach_lineup = random_gen.random() < 0.35
    return content, category, attach_lineup


def insert_community_activity(cur, people: list[Person], random_gen: random.Random) -> None:
    post_ids: list[int] = []
    comment_ids: list[int] = []
    featured_authors = people[: min(48, len(people))]
    active_pool = people[: min(72, len(people))]
    now = datetime.utcnow()

    for index, author in enumerate(featured_authors):
        content, category, attach_lineup = create_post_content(author, random_gen)
        created_at = now - timedelta(days=(index % 18), hours=(index * 3) % 23, minutes=(index * 11) % 57)
        lineup_snapshot = build_lineup_snapshot(author) if attach_lineup else None
        cur.execute(
            """
            INSERT INTO community_posts (
                user_id, content, image_url, category, likes_count, comment_count,
                lineup_id, lineup_name, lineup_formation, lineup_snapshot, created_at, updated_at
            )
            VALUES (%s,%s,NULL,%s,0,0,%s,%s,%s,%s,%s,%s)
            RETURNING id
            """,
            (
                author.user_id,
                content,
                category,
                author.lineup_id if attach_lineup else None,
                author.lineup_name if attach_lineup else "",
                author.formation if attach_lineup else "",
                lineup_snapshot,
                created_at,
                created_at,
            ),
        )
        post_id = int(cur.fetchone()["id"])
        post_ids.append(post_id)

        comment_authors = [person for person in active_pool if person.user_id != author.user_id]
        random_gen.shuffle(comment_authors)
        thread_count = 2 + (index % 3)
        previous_comment_id: int | None = None
        for offset in range(thread_count):
            commenter = comment_authors[offset]
            if previous_comment_id and offset == thread_count - 1 and random_gen.random() < 0.45:
                comment_text = random_gen.choice(REPLY_TEMPLATES)
                parent_id = previous_comment_id
            else:
                comment_text = random_gen.choice(COMMENT_TEMPLATES)
                parent_id = None
            comment_time = created_at + timedelta(minutes=12 * (offset + 1))
            cur.execute(
                """
                INSERT INTO community_comments (post_id, user_id, content, likes_count, parent_id, created_at, updated_at)
                VALUES (%s,%s,%s,0,%s,%s,%s)
                RETURNING id
                """,
                (post_id, commenter.user_id, comment_text, parent_id, comment_time, comment_time),
            )
            comment_id = int(cur.fetchone()["id"])
            comment_ids.append(comment_id)
            previous_comment_id = comment_id
            if author.user_id != commenter.user_id:
                cur.execute(
                    """
                    INSERT INTO notifications (user_id, type, content, link, source, created_at)
                    VALUES (%s,'reaction',%s,'#community',%s,%s)
                    """,
                    (
                        author.user_id,
                        f"{commenter.username} commented on your post.",
                        SEED_SOURCE,
                        comment_time,
                    ),
                )

        likers = [person for person in active_pool if person.user_id != author.user_id]
        random_gen.shuffle(likers)
        for liker in likers[: 3 + (index % 5)]:
            like_time = created_at + timedelta(minutes=random_gen.randint(5, 180))
            cur.execute(
                "INSERT INTO community_likes (user_id, post_id, created_at) VALUES (%s,%s,%s)",
                (liker.user_id, post_id, like_time),
            )
            cur.execute(
                """
                INSERT INTO notifications (user_id, type, content, link, source, created_at)
                VALUES (%s,'reaction',%s,'#community',%s,%s)
                """,
                (
                    author.user_id,
                    f"{liker.username} liked your post.",
                    SEED_SOURCE,
                    like_time,
                ),
            )

    if comment_ids:
        random_gen.shuffle(comment_ids)
        liker_pool = people[: min(84, len(people))]
        for comment_id in comment_ids[: min(96, len(comment_ids))]:
            liker = random_gen.choice(liker_pool)
            cur.execute(
                """
                INSERT INTO community_likes (user_id, comment_id, created_at)
                SELECT %s, %s, %s
                WHERE NOT EXISTS (
                    SELECT 1 FROM community_likes WHERE user_id = %s AND comment_id = %s
                )
                """,
                (
                    liker.user_id,
                    comment_id,
                    now - timedelta(hours=random_gen.randint(1, 72)),
                    liker.user_id,
                    comment_id,
                ),
            )

    cur.execute(
        """
        UPDATE community_posts p
        SET likes_count = COALESCE(src.likes_count, 0),
            comment_count = COALESCE(src.comment_count, 0)
        FROM (
            SELECT cp.id,
                   (SELECT COUNT(*) FROM community_likes cl WHERE cl.post_id = cp.id) AS likes_count,
                   (SELECT COUNT(*) FROM community_comments cc WHERE cc.post_id = cp.id) AS comment_count
            FROM community_posts cp
            WHERE cp.user_id = ANY(%s)
        ) src
        WHERE p.id = src.id
        """,
        ([person.user_id for person in people],),
    )
    cur.execute(
        """
        UPDATE community_comments c
        SET likes_count = COALESCE(src.likes_count, 0)
        FROM (
            SELECT cc.id, (SELECT COUNT(*) FROM community_likes cl WHERE cl.comment_id = cc.id) AS likes_count
            FROM community_comments cc
            WHERE cc.user_id = ANY(%s)
               OR cc.post_id IN (SELECT id FROM community_posts WHERE user_id = ANY(%s))
        ) src
        WHERE c.id = src.id
        """,
        ([person.user_id for person in people], [person.user_id for person in people]),
    )


def choose_scorers(person: Person) -> list[dict[str, Any]]:
    attackers = [
        player
        for player in (person.starters or [])
        if str(player.get("position") or "").upper() in {"ST", "LW", "RW", "CAM", "LM", "RM"}
    ]
    return attackers or (person.starters or [])[:4]


def build_preview_block(person: Person, random_gen: random.Random) -> dict[str, Any]:
    starters = person.starters or []
    attackers = [player for player in starters if player["position"] in {"ST", "LW", "RW"}]
    midfielders = [player for player in starters if player["position"] in {"CM", "CAM", "CDM", "LM", "RM"}]
    defenders = [player for player in starters if player["position"] in {"CB", "LB", "RB", "LWB", "RWB", "GK"}]
    attack = round(sum(int(player["overall"]) for player in attackers or starters[:3]) / max(1, len(attackers or starters[:3])), 1)
    midfield = round(sum(int(player["overall"]) for player in midfielders or starters[3:7]) / max(1, len(midfielders or starters[3:7])), 1)
    defense = round(sum(int(player["overall"]) for player in defenders or starters[7:]) / max(1, len(defenders or starters[7:])), 1)
    return {
        "attack": attack,
        "midfield": midfield,
        "defense": defense,
        "win_chance": random_gen.randint(34, 47),
    }


def build_player_stat_rows(
    person: Person,
    team_tag: str,
    goals_by_player: dict[int, int],
    assists_by_player: dict[int, int],
    total_shots: int,
    total_xg: float,
    possession: int,
    result: str,
    random_gen: random.Random,
) -> list[dict[str, Any]]:
    players = person.starters or []
    rows: list[dict[str, Any]] = []
    pass_base = 28 + (possession // 2)
    for index, player in enumerate(players):
        player_id = int(player["id"])
        goals = goals_by_player.get(player_id, 0)
        assists = assists_by_player.get(player_id, 0)
        is_attacker = player["position"] in {"ST", "LW", "RW", "CAM", "LM", "RM"}
        shots = goals + (1 if is_attacker and total_shots > len(players) // 2 and random_gen.random() < 0.5 else 0)
        if is_attacker:
            shots += random_gen.randint(0, 2)
        xg = round((total_xg / max(1, total_shots)) * shots if total_shots else 0, 2)
        passes = pass_base + random_gen.randint(-10, 18)
        accuracy = max(62, min(96, 72 + random_gen.randint(-6, 16)))
        rating = 6.0 + random_gen.uniform(-0.4, 0.55) + goals * 0.55 + assists * 0.3
        if result == "W":
            rating += 0.25
        elif result == "L":
            rating -= 0.2
        rows.append(
            {
                "team": team_tag,
                "player_id": player_id,
                "slot_code": player["slot_code"],
                "name": player["name"],
                "position": player["position"],
                "rating": round(max(5.6, min(9.4, rating)), 1),
                "goals": goals,
                "assists": assists,
                "shots": shots,
                "xg": round(xg, 2),
                "passes": passes,
                "accuracy": accuracy,
                "touches": passes + random_gen.randint(8, 32),
                "dribbles": random_gen.randint(0, 6 if is_attacker else 3),
                "card_url": player.get("card_url") or "",
                "image_url": player.get("image_url") or "",
                "overall": int(player["overall"]),
            }
        )
    return rows


def mirror_events(events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    mirrored = []
    for event in events:
        cloned = dict(event)
        if cloned.get("team") == "user":
            cloned["team"] = "opponent"
        elif cloned.get("team") == "opponent":
            cloned["team"] = "user"
        mirrored.append(cloned)
    return mirrored


def simulate_fixture(
    home: Person,
    away: Person,
    created_at: datetime,
    current_points: dict[int, int],
    current_form: dict[int, list[str]],
    current_record: dict[int, dict[str, int]],
    random_gen: random.Random,
) -> list[tuple[int, dict[str, Any], list[dict[str, Any]], str, int, int, str, str | None, bool]]:
    home_preview = build_preview_block(home, random_gen)
    away_preview = build_preview_block(away, random_gen)

    home_edge = (home.rating + home.chemistry * 0.18) - (away.rating + away.chemistry * 0.18)
    home_score = max(0, int(round(random_gen.gauss(1.55 + home_edge / 20, 0.95))))
    away_score = max(0, int(round(random_gen.gauss(1.25 - home_edge / 22, 0.9))))
    home_score = min(home_score, 5)
    away_score = min(away_score, 5)

    if home_score == away_score and abs(home_edge) > 3 and random_gen.random() < 0.5:
        if home_edge > 0:
            home_score += 1
        else:
            away_score += 1

    if home_score > away_score:
        home_result, away_result = "W", "L"
    elif home_score < away_score:
        home_result, away_result = "L", "W"
    else:
        home_result = away_result = "D"

    home_dp = 3 if home_result == "W" else 1 if home_result == "D" else 0
    away_dp = 3 if away_result == "W" else 1 if away_result == "D" else 0
    current_points[home.user_id] += home_dp
    current_points[away.user_id] += away_dp
    current_form[home.user_id].append(home_result)
    current_form[away.user_id].append(away_result)

    home_record = current_record[home.user_id]
    away_record = current_record[away.user_id]
    home_record["wins"] += 1 if home_result == "W" else 0
    home_record["draws"] += 1 if home_result == "D" else 0
    home_record["losses"] += 1 if home_result == "L" else 0
    home_record["gf"] += home_score
    home_record["ga"] += away_score
    away_record["wins"] += 1 if away_result == "W" else 0
    away_record["draws"] += 1 if away_result == "D" else 0
    away_record["losses"] += 1 if away_result == "L" else 0
    away_record["gf"] += away_score
    away_record["ga"] += home_score

    home_possession = max(38, min(62, 50 + int(round(home_edge)) + random_gen.randint(-4, 4)))
    away_possession = 100 - home_possession
    home_shots = max(home_score + 3, home_score * 2 + random_gen.randint(2, 7))
    away_shots = max(away_score + 3, away_score * 2 + random_gen.randint(2, 6))
    home_on_target = max(home_score, min(home_shots, home_score + random_gen.randint(1, 4)))
    away_on_target = max(away_score, min(away_shots, away_score + random_gen.randint(1, 4)))
    home_xg = round(max(0.35, home_score * 0.72 + random_gen.uniform(0.25, 1.15)), 2)
    away_xg = round(max(0.25, away_score * 0.68 + random_gen.uniform(0.2, 1.0)), 2)

    home_scorers = choose_scorers(home)
    away_scorers = choose_scorers(away)
    home_goals: dict[int, int] = defaultdict(int)
    away_goals: dict[int, int] = defaultdict(int)
    home_assists: dict[int, int] = defaultdict(int)
    away_assists: dict[int, int] = defaultdict(int)
    events: list[dict[str, Any]] = []

    minute_pool = sorted(random_gen.sample(range(5, 89), k=max(4, home_score + away_score + 4)))
    minute_index = 0
    for side, total_goals, scorers, goal_map, assist_map in (
        ("user", home_score, home_scorers, home_goals, home_assists),
        ("opponent", away_score, away_scorers, away_goals, away_assists),
    ):
        for _ in range(total_goals):
            scorer = dict(random_gen.choice(scorers))
            assister_pool = [row for row in (home.starters if side == "user" else away.starters) or [] if int(row["id"]) != int(scorer["id"])]
            assister = dict(random_gen.choice(assister_pool)) if assister_pool else scorer
            goal_map[int(scorer["id"])] += 1
            assist_map[int(assister["id"])] += 1 if int(assister["id"]) != int(scorer["id"]) else 0
            minute = minute_pool[minute_index % len(minute_pool)]
            minute_index += 1
            leading_score = sum(home_goals.values()) if side == "user" else sum(away_goals.values())
            conceded = sum(away_goals.values()) if side == "user" else sum(home_goals.values())
            commentary = (
                f"{scorer['name']} finishes the move after good service from {assister['name']}. "
                f"The attacking side now sees the game at {leading_score}-{conceded}."
            )
            events.append(
                {
                    "minute": minute,
                    "type": "goal",
                    "team": side,
                    "player": scorer["name"],
                    "player_id": int(scorer["id"]),
                    "assist": assister["name"],
                    "assist_player_id": int(assister["id"]),
                    "commentary": commentary,
                }
            )

    filler_types = ["save", "miss", "corner", "atmosphere"]
    for minute in minute_pool[minute_index:]:
        team = random_gen.choice(["user", "opponent", "neutral"])
        player_pool = (home.starters if team == "user" else away.starters) if team != "neutral" else []
        player_name = random_gen.choice(player_pool)["name"] if player_pool else ""
        event_type = random_gen.choice(filler_types)
        if event_type == "save":
            commentary = f"{player_name or 'The goalkeeper'} makes a sharp intervention to keep the match under control."
        elif event_type == "miss":
            commentary = f"{player_name or 'A forward'} cannot keep the effort on frame and the chance goes begging."
        elif event_type == "corner":
            commentary = f"Corner to the {'home' if team == 'user' else 'away' if team == 'opponent' else 'attacking'} side as pressure builds."
        else:
            commentary = "Both teams are trading small spells of control without forcing the decisive break."
        events.append(
            {
                "minute": minute,
                "type": event_type,
                "team": team,
                "player": player_name,
                "commentary": commentary,
            }
        )

    events = sorted(events, key=lambda item: (int(item.get("minute", 0)), item.get("type", "")))
    home_player_stats = build_player_stat_rows(home, "user", home_goals, home_assists, home_shots, home_xg, home_possession, home_result, random_gen)
    away_player_stats = build_player_stat_rows(away, "opponent", away_goals, away_assists, away_shots, away_xg, away_possession, away_result, random_gen)

    match_type = random_gen.choices(
        ["quickmatch", "season", "tournament"],
        weights=[0.6, 0.25, 0.15],
        k=1,
    )[0]
    match_stage = None
    if match_type == "tournament":
        match_stage = random_gen.choice(["Quarter-Final", "Semi-Final", "Final"])

    home_stats = {
        "mode": match_type,
        "stage": match_stage,
        "opponent": away.username,
        "xg_for": home_xg,
        "xg_against": away_xg,
        "possession": home_possession,
        "opp_possession": away_possession,
        "shots": home_shots,
        "shots_on_target": home_on_target,
        "opp_shots": away_shots,
        "opp_shots_on_target": away_on_target,
        "corners": random_gen.randint(2, 8),
        "opp_corners": random_gen.randint(2, 8),
        "fouls": random_gen.randint(8, 18),
        "opp_fouls": random_gen.randint(8, 18),
        "pass_accuracy": random_gen.randint(71, 88),
        "opp_pass_accuracy": random_gen.randint(69, 86),
        "preview": {
            "user": home_preview,
            "opponent": away_preview,
            "draw_chance": random_gen.randint(18, 24),
        },
        "cards": random_gen.randint(0, 3),
        "opp_cards": random_gen.randint(0, 3),
        "player_stats": home_player_stats + away_player_stats,
        "substitutions": [],
        "lineups": {
            "home": {
                "team": home.username,
                "formation": home.formation,
                "overall": home.rating,
                "match_rating": round(sum(row["rating"] for row in home_player_stats) / max(1, len(home_player_stats)), 1),
                "players": home_player_stats,
            },
            "away": {
                "team": away.username,
                "formation": away.formation,
                "overall": away.rating,
                "match_rating": round(sum(row["rating"] for row in away_player_stats) / max(1, len(away_player_stats)), 1),
                "players": away_player_stats,
            },
        },
        "dp_change": home_dp,
        "new_points": current_points[home.user_id],
        "new_rank": home.division_level,
    }
    away_stats = {
        **home_stats,
        "opponent": home.username,
        "xg_for": away_xg,
        "xg_against": home_xg,
        "possession": away_possession,
        "opp_possession": home_possession,
        "shots": away_shots,
        "shots_on_target": away_on_target,
        "opp_shots": home_shots,
        "opp_shots_on_target": home_on_target,
        "preview": {
            "user": away_preview,
            "opponent": home_preview,
            "draw_chance": home_stats["preview"]["draw_chance"],
        },
        "cards": home_stats["opp_cards"],
        "opp_cards": home_stats["cards"],
        "player_stats": away_player_stats + home_player_stats,
        "lineups": {
            "home": home_stats["lineups"]["away"],
            "away": home_stats["lineups"]["home"],
        },
        "dp_change": away_dp,
        "new_points": current_points[away.user_id],
        "new_rank": away.division_level,
    }

    return [
        (home.user_id, home_stats, events, home_result, home_score, away_score, match_type, match_stage, False),
        (away.user_id, away_stats, mirror_events(events), away_result, away_score, home_score, match_type, match_stage, False),
    ]


def insert_match_activity(cur, people: list[Person], random_gen: random.Random) -> None:
    current_points = {person.user_id: QUALITY_BASE_POINTS[person.quality] for person in people}
    current_form: dict[int, list[str]] = {person.user_id: [] for person in people}
    current_record: dict[int, dict[str, int]] = {
        person.user_id: {"wins": 0, "draws": 0, "losses": 0, "gf": 0, "ga": 0}
        for person in people
    }
    now = datetime.utcnow()

    rounds = 2
    for round_index in range(rounds):
        shuffled = people[:]
        random_gen.shuffle(shuffled)
        for pair_index in range(0, len(shuffled) - 1, 2):
            home = shuffled[pair_index]
            away = shuffled[pair_index + 1]
            created_at = now - timedelta(days=16 - round_index * 4, hours=(pair_index // 2) % 18, minutes=(pair_index * 7) % 55)
            rows = simulate_fixture(home, away, created_at, current_points, current_form, current_record, random_gen)
            for user_id, stats, events, result, score_for, score_against, match_type, match_stage, is_forfeit in rows:
                lineup_id = home.lineup_id if user_id == home.user_id else away.lineup_id
                opponent_user_id = away.user_id if user_id == home.user_id else home.user_id
                opponent_lineup_id = away.lineup_id if user_id == home.user_id else home.lineup_id
                cur.execute(
                    """
                    INSERT INTO matches (
                        user_id, opponent_user_id, lineup_id, opponent_lineup_id, result,
                        score_for, score_against, stats_json, events_json, match_type, match_stage,
                        is_forfeit, created_at
                    )
                    VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    """,
                    (
                        user_id,
                        opponent_user_id,
                        lineup_id,
                        opponent_lineup_id,
                        result,
                        score_for,
                        score_against,
                        json.dumps(stats, ensure_ascii=False, separators=(",", ":")),
                        json.dumps(events, ensure_ascii=False, separators=(",", ":")),
                        match_type,
                        match_stage,
                        is_forfeit,
                        created_at,
                    ),
                )

    for person in people:
        record = current_record[person.user_id]
        form = current_form[person.user_id][-5:]
        person.form = form
        person.record = record
        person.division_points = current_points[person.user_id]
        cur.execute(
            """
            UPDATE users
            SET division_points = %s,
                division_level = %s,
                division_matches_played = %s,
                division_wins = %s,
                division_draws = %s,
                division_losses = %s,
                division_goals_for = %s,
                division_goals_against = %s,
                division_form = %s,
                division_last_outcome = %s,
                division_last_level = %s,
                division_last_points = %s,
                last_login = NOW()
            WHERE id = %s
            """,
            (
                person.division_points,
                person.division_level,
                record["wins"] + record["draws"] + record["losses"],
                record["wins"],
                record["draws"],
                record["losses"],
                record["gf"],
                record["ga"],
                json.dumps(form),
                form[-1] if form else "",
                person.division_level,
                person.division_points,
                person.user_id,
            ),
        )


def main() -> None:
    random.seed(SEED_RANDOM)
    random_gen = random.Random(SEED_RANDOM)
    people = load_people()
    password_hash = bcrypt.hashpw(SEED_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            ensure_profile_columns(cur)
            used_usernames = fetch_existing_usernames(cur)

            for index, person in enumerate(people):
                person.quality = assign_quality(person, index)
                person.formation = assign_formation(index)
                ensure_user(cur, person, password_hash, used_usernames)
                ensure_lineup(cur, person)
                seed_user_players(cur, person, index)

            seed_user_ids = [person.user_id for person in people]
            cleanup_existing_activity(cur, seed_user_ids)
            insert_community_activity(cur, people, random_gen)
            insert_match_activity(cur, people, random_gen)
            refresh_public_lineup_signal(cur, people)

        conn.commit()

    print(f"Seeded {len(people)} university users with password: {SEED_PASSWORD}")
    print("Refreshed public lineups, community activity, notifications, and match history.")
    for person in people[:10]:
        print(
            f"- {person.username}: {person.formation}, {person.rating} OVR, "
            f"{person.chemistry} chemistry, {person.division_points} pts"
        )


if __name__ == "__main__":
    main()
