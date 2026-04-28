"""
Fast, idempotent bootstrap for local FootyCraft data.

This script is intended to run after PostgreSQL is healthy. It keeps the app
startup path fast by seeding in the background and only loading what is
missing.
"""

from __future__ import annotations

import csv
import os
import subprocess
import tempfile
from pathlib import Path

import bcrypt
import psycopg2
import psycopg2.extras


ROOT = Path(__file__).resolve().parent.parent
SHARED_DB_PATH = ROOT / ".data" / "shared-db.sql"
UNIVERSITY_DATA = ROOT / "scripts" / "data" / "university_seed_users.tsv"

DEFAULT_ADMIN = {
    "username": "admin",
    "email": "admin@footycraft.com",
    "password": "admin123",
}

LEGACY_TARGETS = {
    "users": 142,
    "players": 18423,
    "lineups": 147,
    "matches": 318,
}

LEGACY_TABLES = [
    "users",
    "players",
    "lineups",
    "lineup_slots",
    "user_players",
    "community_posts",
    "community_comments",
    "community_likes",
    "notifications",
    "matches",
    "chest_cooldowns",
    "chest_log",
    "sessions",
    "support_tickets",
    "support_messages",
    "user_challenges",
    "community_moderation_strikes",
]


def load_env() -> None:
    env_file = ROOT / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if not line or line.strip().startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def database_url() -> str:
    load_env()
    value = os.environ.get("DATABASE_URL", "").strip()
    if value:
        return value
    return "postgresql://footycraft:footycraft@db:5432/footycraft"


def get_conn():
    return psycopg2.connect(database_url())


def log(message: str) -> None:
    print(f"[seed-all] {message}", flush=True)


def run_step(label: str, args: list[str]) -> None:
    log(f"Running {label}...")
    subprocess.run(args, cwd=ROOT, check=True)


def count_rows(table: str) -> int:
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return int(cur.fetchone()[0])


def should_seed_university() -> bool:
    with UNIVERSITY_DATA.open("r", encoding="utf-8", newline="") as handle:
        emails = [(row.get("email") or "").strip().lower() for row in csv.DictReader(handle, delimiter="\t")]
    emails = [email for email in emails if email]
    if not emails:
        return False

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM users WHERE lower(email) = ANY(%s)", (emails,))
        existing = int(cur.fetchone()[0])
    return existing < len(emails)


def ensure_default_admin() -> None:
    password_hash = bcrypt.hashpw(DEFAULT_ADMIN["password"].encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute(
            "SELECT id, username, password_hash, role, status, timeout_until FROM users WHERE lower(email) = lower(%s) LIMIT 1",
            (DEFAULT_ADMIN["email"],),
        )
        row = cur.fetchone()

        if not row:
            cur.execute(
                """
                INSERT INTO users (username, email, password_hash, role, status)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    DEFAULT_ADMIN["username"],
                    DEFAULT_ADMIN["email"],
                    password_hash,
                    "admin",
                    "active",
                ),
            )
            conn.commit()
            log("Created default admin account.")
            return

        updates: list[str] = []
        params: list[object] = []

        stored_hash = str(row["password_hash"] or "")
        password_matches = False
        if stored_hash:
            try:
                password_matches = bcrypt.checkpw(DEFAULT_ADMIN["password"].encode("utf-8"), stored_hash.encode("utf-8"))
            except ValueError:
                password_matches = False

        if str(row["username"] or "") != DEFAULT_ADMIN["username"]:
            updates.append("username = %s")
            params.append(DEFAULT_ADMIN["username"])
        if not password_matches:
            updates.append("password_hash = %s")
            params.append(password_hash)
        if str(row["role"] or "") != "admin":
            updates.append("role = %s")
            params.append("admin")
        if str(row["status"] or "") != "active":
            updates.append("status = %s")
            params.append("active")
        if row["timeout_until"] is not None:
            updates.append("timeout_until = %s")
            params.append(None)

        if updates:
            params.append(int(row["id"]))
            cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", params)
            conn.commit()
            log("Refreshed default admin account.")
        else:
            log("Default admin account already present.")


def legacy_merge_needed() -> bool:
    for table, minimum in LEGACY_TARGETS.items():
        if count_rows(table) < minimum:
            return True
    return False


def legacy_merge_sql() -> str:
    header_lines = ["BEGIN;"]
    for table in LEGACY_TABLES:
        if table == "players":
            header_lines.append(
                """CREATE TEMP TABLE legacy_players (
    id integer,
    name text,
    nation text,
    league text,
    club text,
    "position" text,
    alt_positions text,
    overall integer,
    pace integer,
    shooting integer,
    passing integer,
    dribbling integer,
    defending integer,
    physical integer,
    rarity text,
    card_type text,
    image_url text,
    created_at timestamp,
    ea_player_id integer,
    card_url text,
    full_name text,
    gk_diving integer,
    gk_handling integer,
    gk_kicking integer,
    gk_reflexes integer,
    gk_speed integer,
    gk_positioning integer
);"""
            )
        else:
            header_lines.append(f"CREATE TEMP TABLE legacy_{table} AS SELECT * FROM public.{table} WITH NO DATA;")

    footer = r"""
CREATE TEMP TABLE legacy_user_map AS
SELECT lu.id AS legacy_user_id, u.id AS current_user_id, lower(lu.email) AS email
FROM legacy_users lu
JOIN public.users u ON lower(u.email) = lower(lu.email);

INSERT INTO public.players (
    id, name, nation, league, club, position, alt_positions, overall, pace, shooting,
    passing, dribbling, defending, physical, rarity, card_type, image_url,
    ea_player_id, card_url, full_name, created_at
)
SELECT
    lp.id, lp.name, lp.nation, lp.league, lp.club, lp.position, lp.alt_positions, lp.overall, lp.pace, lp.shooting,
    lp.passing, lp.dribbling, lp.defending, lp.physical, lp.rarity, lp.card_type, lp.image_url,
    lp.ea_player_id, lp.card_url, lp.full_name, lp.created_at
FROM legacy_players lp
WHERE NOT EXISTS (
    SELECT 1 FROM public.players p WHERE p.id = lp.id
);
SELECT setval(pg_get_serial_sequence('public.players', 'id'), COALESCE((SELECT MAX(id) FROM public.players), 1), true);

CREATE TEMP TABLE legacy_lineup_target AS
SELECT
    ll.id AS legacy_lineup_id,
    um.current_user_id,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM public.lineups l
            WHERE l.user_id = um.current_user_id AND lower(l.name) = lower(ll.name)
        ) THEN ll.name || ' (Legacy)'
        ELSE ll.name
    END AS final_name,
    ll.formation,
    ll.is_public,
    ll.views_count,
    ll.likes_count,
    ll.chemistry,
    ll.rating,
    ll.created_at,
    ll.updated_at
FROM legacy_lineups ll
JOIN legacy_user_map um ON um.legacy_user_id = ll.user_id;

INSERT INTO public.lineups (
    user_id, name, formation, is_public, views_count, likes_count, chemistry, rating, created_at, updated_at
)
SELECT
    current_user_id, final_name, formation, is_public, views_count, likes_count, chemistry, rating, created_at, updated_at
FROM legacy_lineup_target lt
WHERE NOT EXISTS (
    SELECT 1 FROM public.lineups l
    WHERE l.user_id = lt.current_user_id AND l.name = lt.final_name
);

CREATE TEMP TABLE legacy_lineup_map AS
SELECT lt.legacy_lineup_id, l.id AS current_lineup_id
FROM legacy_lineup_target lt
JOIN public.lineups l
  ON l.user_id = lt.current_user_id
 AND l.name = lt.final_name;

INSERT INTO public.lineup_slots (lineup_id, slot_code, position_required, player_id)
SELECT lm.current_lineup_id, ls.slot_code, ls.position_required, ls.player_id
FROM legacy_lineup_slots ls
JOIN legacy_lineup_map lm ON lm.legacy_lineup_id = ls.lineup_id
WHERE EXISTS (SELECT 1 FROM public.players p WHERE p.id = ls.player_id)
  AND NOT EXISTS (
      SELECT 1 FROM public.lineup_slots s
      WHERE s.lineup_id = lm.current_lineup_id AND s.slot_code = ls.slot_code
  );

INSERT INTO public.user_players (user_id, player_id, acquired_at, source, is_tradeable)
SELECT um.current_user_id, up.player_id, up.acquired_at, up.source, up.is_tradeable
FROM legacy_user_players up
JOIN legacy_user_map um ON um.legacy_user_id = up.user_id
WHERE EXISTS (SELECT 1 FROM public.players p WHERE p.id = up.player_id)
  AND NOT EXISTS (
      SELECT 1 FROM public.user_players cur
      WHERE cur.user_id = um.current_user_id
        AND cur.player_id = up.player_id
        AND COALESCE(cur.source, '') = COALESCE(up.source, '')
  );

INSERT INTO public.chest_cooldowns (user_id, chest_type, next_available_at)
SELECT um.current_user_id, cc.chest_type, cc.next_available_at
FROM legacy_chest_cooldowns cc
JOIN legacy_user_map um ON um.legacy_user_id = cc.user_id
ON CONFLICT (user_id, chest_type) DO UPDATE
SET next_available_at = EXCLUDED.next_available_at;

INSERT INTO public.chest_log (user_id, chest_type, opened_at, rewards_json)
SELECT um.current_user_id, cl.chest_type, cl.opened_at, cl.rewards_json
FROM legacy_chest_log cl
JOIN legacy_user_map um ON um.legacy_user_id = cl.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.chest_log cur
    WHERE cur.user_id = um.current_user_id
      AND cur.chest_type = cl.chest_type
      AND cur.opened_at = cl.opened_at
);

INSERT INTO public.notifications (user_id, type, content, is_read, link, source, created_at)
SELECT um.current_user_id, n.type, n.content, n.is_read, n.link, n.source, n.created_at
FROM legacy_notifications n
JOIN legacy_user_map um ON um.legacy_user_id = n.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.notifications cur
    WHERE cur.user_id = um.current_user_id
      AND cur.type = n.type
      AND cur.content = n.content
      AND cur.created_at = n.created_at
);

CREATE TEMP TABLE legacy_post_target AS
SELECT
    p.id AS legacy_post_id,
    um.current_user_id,
    p.content,
    p.image_url,
    p.category,
    p.likes_count,
    p.comment_count,
    lm.current_lineup_id,
    p.lineup_name,
    p.lineup_formation,
    p.lineup_snapshot,
    p.created_at,
    p.updated_at
FROM legacy_community_posts p
JOIN legacy_user_map um ON um.legacy_user_id = p.user_id
LEFT JOIN legacy_lineup_map lm ON lm.legacy_lineup_id = p.lineup_id;

INSERT INTO public.community_posts (
    user_id, content, image_url, category, likes_count, comment_count, lineup_id,
    lineup_name, lineup_formation, lineup_snapshot, created_at, updated_at
)
SELECT
    current_user_id, content, image_url, category, likes_count, comment_count, current_lineup_id,
    lineup_name, lineup_formation, lineup_snapshot, created_at, updated_at
FROM legacy_post_target pt
WHERE NOT EXISTS (
    SELECT 1 FROM public.community_posts cur
    WHERE cur.user_id = pt.current_user_id
      AND cur.content = pt.content
      AND cur.created_at = pt.created_at
);

CREATE TEMP TABLE legacy_post_map AS
SELECT pt.legacy_post_id, cur.id AS current_post_id
FROM legacy_post_target pt
JOIN public.community_posts cur
  ON cur.user_id = pt.current_user_id
 AND cur.content = pt.content
 AND cur.created_at = pt.created_at;

CREATE TEMP TABLE legacy_comment_target AS
SELECT
    c.id AS legacy_comment_id,
    pm.current_post_id,
    um.current_user_id,
    c.content,
    c.likes_count,
    c.parent_id AS legacy_parent_id,
    c.created_at,
    c.updated_at
FROM legacy_community_comments c
JOIN legacy_post_map pm ON pm.legacy_post_id = c.post_id
JOIN legacy_user_map um ON um.legacy_user_id = c.user_id;

INSERT INTO public.community_comments (
    post_id, user_id, content, likes_count, parent_id, created_at, updated_at
)
SELECT
    current_post_id, current_user_id, content, likes_count, NULL, created_at, updated_at
FROM legacy_comment_target ct
WHERE ct.legacy_parent_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.community_comments cur
    WHERE cur.post_id = ct.current_post_id
      AND cur.user_id = ct.current_user_id
      AND cur.content = ct.content
      AND cur.created_at = ct.created_at
  );

CREATE TEMP TABLE legacy_comment_map AS
SELECT ct.legacy_comment_id, cur.id AS current_comment_id
FROM legacy_comment_target ct
JOIN public.community_comments cur
  ON cur.post_id = ct.current_post_id
 AND cur.user_id = ct.current_user_id
 AND cur.content = ct.content
 AND cur.created_at = ct.created_at;

INSERT INTO public.community_comments (
    post_id, user_id, content, likes_count, parent_id, created_at, updated_at
)
SELECT
    ct.current_post_id,
    ct.current_user_id,
    ct.content,
    ct.likes_count,
    parent_map.current_comment_id,
    ct.created_at,
    ct.updated_at
FROM legacy_comment_target ct
JOIN legacy_comment_map parent_map ON parent_map.legacy_comment_id = ct.legacy_parent_id
WHERE ct.legacy_parent_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.community_comments cur
    WHERE cur.post_id = ct.current_post_id
      AND cur.user_id = ct.current_user_id
      AND cur.content = ct.content
      AND cur.created_at = ct.created_at
  );

DROP TABLE legacy_comment_map;
CREATE TEMP TABLE legacy_comment_map AS
SELECT ct.legacy_comment_id, cur.id AS current_comment_id
FROM legacy_comment_target ct
JOIN public.community_comments cur
  ON cur.post_id = ct.current_post_id
 AND cur.user_id = ct.current_user_id
 AND cur.content = ct.content
 AND cur.created_at = ct.created_at;

INSERT INTO public.community_likes (user_id, post_id, comment_id, created_at)
SELECT
    um.current_user_id,
    pm.current_post_id,
    cm.current_comment_id,
    l.created_at
FROM legacy_community_likes l
JOIN legacy_user_map um ON um.legacy_user_id = l.user_id
LEFT JOIN legacy_post_map pm ON pm.legacy_post_id = l.post_id
LEFT JOIN legacy_comment_map cm ON cm.legacy_comment_id = l.comment_id
WHERE (pm.current_post_id IS NOT NULL OR cm.current_comment_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.community_likes cur
    WHERE cur.user_id = um.current_user_id
      AND COALESCE(cur.post_id, -1) = COALESCE(pm.current_post_id, -1)
      AND COALESCE(cur.comment_id, -1) = COALESCE(cm.current_comment_id, -1)
      AND cur.created_at = l.created_at
  );

INSERT INTO public.community_moderation_strikes (user_id, content_type, content_id, reason, severity, created_at)
SELECT
    um.current_user_id,
    s.content_type,
    CASE
        WHEN s.content_type = 'post' THEN pm.current_post_id
        WHEN s.content_type = 'comment' THEN cm.current_comment_id
        ELSE s.content_id
    END AS mapped_content_id,
    s.reason,
    s.severity,
    s.created_at
FROM legacy_community_moderation_strikes s
JOIN legacy_user_map um ON um.legacy_user_id = s.user_id
LEFT JOIN legacy_post_map pm ON pm.legacy_post_id = s.content_id AND s.content_type = 'post'
LEFT JOIN legacy_comment_map cm ON cm.legacy_comment_id = s.content_id AND s.content_type = 'comment'
WHERE (
        s.content_id IS NULL
        OR s.content_type NOT IN ('post', 'comment')
        OR pm.current_post_id IS NOT NULL
        OR cm.current_comment_id IS NOT NULL
      )
  AND NOT EXISTS (
    SELECT 1 FROM public.community_moderation_strikes cur
    WHERE cur.user_id = um.current_user_id
      AND cur.content_type = s.content_type
      AND COALESCE(cur.content_id, -1) = COALESCE(
            CASE
                WHEN s.content_type = 'post' THEN pm.current_post_id
                WHEN s.content_type = 'comment' THEN cm.current_comment_id
                ELSE s.content_id
            END,
            -1
          )
      AND cur.reason = s.reason
      AND cur.created_at = s.created_at
  );

CREATE TEMP TABLE legacy_ticket_target AS
SELECT
    t.id AS legacy_ticket_id,
    um.current_user_id,
    t.subject,
    t.status,
    t.created_at,
    t.updated_at,
    t.last_message_at,
    t.closed_at
FROM legacy_support_tickets t
JOIN legacy_user_map um ON um.legacy_user_id = t.user_id;

INSERT INTO public.support_tickets (
    user_id, subject, status, created_at, updated_at, last_message_at, closed_at
)
SELECT
    current_user_id, subject, status, created_at, updated_at, last_message_at, closed_at
FROM legacy_ticket_target tt
WHERE NOT EXISTS (
    SELECT 1 FROM public.support_tickets cur
    WHERE cur.user_id = tt.current_user_id
      AND cur.subject = tt.subject
      AND cur.created_at = tt.created_at
);

CREATE TEMP TABLE legacy_ticket_map AS
SELECT tt.legacy_ticket_id, cur.id AS current_ticket_id
FROM legacy_ticket_target tt
JOIN public.support_tickets cur
  ON cur.user_id = tt.current_user_id
 AND cur.subject = tt.subject
 AND cur.created_at = tt.created_at;

INSERT INTO public.support_messages (
    ticket_id, sender_user_id, sender_role, message, created_at
)
SELECT
    tm.current_ticket_id,
    um.current_user_id,
    sm.sender_role,
    sm.message,
    sm.created_at
FROM legacy_support_messages sm
JOIN legacy_ticket_map tm ON tm.legacy_ticket_id = sm.ticket_id
JOIN legacy_user_map um ON um.legacy_user_id = sm.sender_user_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.support_messages cur
    WHERE cur.ticket_id = tm.current_ticket_id
      AND cur.sender_user_id = um.current_user_id
      AND cur.message = sm.message
      AND cur.created_at = sm.created_at
);

INSERT INTO public.user_challenges (
    user_id, challenge_id, progress, progress_json, completed, completed_at, reward_claimed
)
SELECT
    um.current_user_id, uc.challenge_id, uc.progress, uc.progress_json, uc.completed, uc.completed_at, uc.reward_claimed
FROM legacy_user_challenges uc
JOIN legacy_user_map um ON um.legacy_user_id = uc.user_id
ON CONFLICT (user_id, challenge_id) DO UPDATE SET
    progress = EXCLUDED.progress,
    progress_json = EXCLUDED.progress_json,
    completed = EXCLUDED.completed,
    completed_at = EXCLUDED.completed_at,
    reward_claimed = EXCLUDED.reward_claimed;

INSERT INTO public.matches (
    user_id, opponent_user_id, lineup_id, opponent_lineup_id, result, score_for, score_against,
    stats_json, events_json, match_type, match_stage, is_forfeit, created_at
)
SELECT
    um.current_user_id,
    oum.current_user_id,
    lm.current_lineup_id,
    olm.current_lineup_id,
    m.result,
    m.score_for,
    m.score_against,
    m.stats_json,
    m.events_json,
    m.match_type,
    m.match_stage,
    m.is_forfeit,
    m.created_at
FROM legacy_matches m
JOIN legacy_user_map um ON um.legacy_user_id = m.user_id
LEFT JOIN legacy_user_map oum ON oum.legacy_user_id = m.opponent_user_id
LEFT JOIN legacy_lineup_map lm ON lm.legacy_lineup_id = m.lineup_id
LEFT JOIN legacy_lineup_map olm ON olm.legacy_lineup_id = m.opponent_lineup_id
WHERE lm.current_lineup_id IS NOT NULL
  AND (m.opponent_user_id IS NULL OR oum.current_user_id IS NOT NULL)
  AND (m.opponent_lineup_id IS NULL OR olm.current_lineup_id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM public.matches cur
    WHERE cur.user_id = um.current_user_id
      AND COALESCE(cur.opponent_user_id, -1) = COALESCE(oum.current_user_id, -1)
      AND cur.created_at = m.created_at
      AND cur.result = m.result
      AND cur.score_for = m.score_for
      AND cur.score_against = m.score_against
  );

INSERT INTO public.sessions (session_token, user_id, created_at, expires_at)
SELECT s.session_token, um.current_user_id, s.created_at, s.expires_at
FROM legacy_sessions s
JOIN legacy_user_map um ON um.legacy_user_id = s.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.sessions cur WHERE cur.session_token = s.session_token
);

COMMIT;
"""

    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".sql", delete=False) as handle:
        handle.write("\n".join(header_lines))
        handle.write("\n")
        with SHARED_DB_PATH.open("r", encoding="utf-8", errors="ignore") as source:
            for line in source:
                for table in LEGACY_TABLES:
                    needle = f"INSERT INTO public.{table} "
                    if line.startswith(needle):
                        handle.write(line.replace(f"INSERT INTO public.{table}", f"INSERT INTO legacy_{table}", 1))
                        break
        handle.write(footer)
        return handle.name


def merge_legacy_snapshot() -> None:
    if not SHARED_DB_PATH.exists():
        log("Legacy snapshot not found. Skipping legacy merge.")
        return

    log("Merging legacy extras from shared snapshot...")
    sql_path = legacy_merge_sql()
    try:
        try:
            subprocess.run(
                ["psql", database_url(), "-q", "-v", "ON_ERROR_STOP=1", "-f", sql_path],
                cwd=ROOT,
                check=True,
            )
        except subprocess.CalledProcessError as e:
            log(f"Legacy snapshot merge failed (schema mismatch or data conflict). Skipping. Error: {e}")
    finally:
        try:
            os.unlink(sql_path)
        except OSError:
            pass


PLATFORM_USERS = [
    # Support staff
    {
        "username": "support_sarah",
        "email": "sarah.support@footycraft.com",
        "password": "support123",
        "role": "support",
        "first_name": "Sarah",
        "last_name": "Martin",
    },
    {
        "username": "support_omar",
        "email": "omar.support@footycraft.com",
        "password": "support123",
        "role": "support",
        "first_name": "Omar",
        "last_name": "Hassan",
    },
    # Regular test players
    {
        "username": "yassine_player",
        "email": "yassine@footycraft.com",
        "password": "player123",
        "role": "player",
        "first_name": "Yassine",
        "last_name": "Saidi",
    },
    {
        "username": "alex_player",
        "email": "alex@footycraft.com",
        "password": "player123",
        "role": "player",
        "first_name": "Alex",
        "last_name": "Johnson",
    },
    {
        "username": "maria_player",
        "email": "maria@footycraft.com",
        "password": "player123",
        "role": "player",
        "first_name": "Maria",
        "last_name": "Garcia",
    },
]


def seed_platform_users() -> None:
    """Seed support and test player accounts."""
    with get_conn() as conn, conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        created = 0
        for user in PLATFORM_USERS:
            cur.execute(
                "SELECT id FROM users WHERE lower(email) = lower(%s) LIMIT 1",
                (user["email"],),
            )
            if cur.fetchone():
                continue

            password_hash = bcrypt.hashpw(
                user["password"].encode("utf-8"), bcrypt.gensalt()
            ).decode("utf-8")

            cur.execute(
                """
                INSERT INTO users (username, email, password_hash, role, status, first_name, last_name)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user["username"],
                    user["email"],
                    password_hash,
                    user["role"],
                    "active",
                    user.get("first_name", ""),
                    user.get("last_name", ""),
                ),
            )
            created += 1

        conn.commit()
        if created:
            log(f"Seeded {created} platform user(s) (support + test players).")
        else:
            log("Platform users already present. Skipping.")


def main() -> None:
    log("Starting fast data bootstrap.")
    run_step("player import", ["python3", "scripts/import_players.py", "--if-empty"])
    run_step("news import", ["python3", "scripts/import_news.py", "--if-empty"])

    if should_seed_university():
        run_step("university seed", ["python3", "scripts/seed_university_community.py"])
    else:
        log("University seed already present. Skipping.")

    ensure_default_admin()
    seed_platform_users()

    if legacy_merge_needed():
        merge_legacy_snapshot()
    else:
        log("Legacy extras already present. Skipping.")

    log("Data bootstrap complete.")


if __name__ == "__main__":
    main()
