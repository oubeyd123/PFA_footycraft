"""
Import football article datasets and rebuild the probabilistic news index.

Run inside the project container or any environment with DATABASE_URL set:
    python3 scripts/import_news.py --rebuild

Resolve images for the full corpus:
    python3 scripts/import_news.py --resolve-images-all --resolve-workers 16
"""

from __future__ import annotations

import argparse
import concurrent.futures
import csv
import json
import os
import re
from collections import Counter
from datetime import datetime
from html import unescape
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin, urlparse

import psycopg2
import psycopg2.extras
import requests


ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / ".data"
DEFAULT_FALLBACK_IMAGE = "/frontend/assets/images/ui/news.png"
DATASET_FILES = [
    "tribuna_articles.csv",
    "skysports.csv",
    "live_mint.csv",
    "goal-news.csv",
    "final-articles.csv",
    "df_analyst.csv",
    "allfootball.csv",
]
SOURCE_FALLBACKS = {
    "tribuna_articles.csv": "Tribuna",
    "skysports.csv": "Sky Sports",
    "live_mint.csv": "Live Mint",
    "goal-news.csv": "Goal",
    "final-articles.csv": "Goal",
    "df_analyst.csv": "The Analyst",
    "allfootball.csv": "All Football",
}
STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "has",
    "have", "in", "into", "is", "it", "its", "of", "on", "or", "that", "the",
    "their", "this", "to", "was", "will", "with", "after", "before", "than", "then",
    "them", "they", "you", "your", "our", "about", "over", "under", "more", "most",
    "latest", "news", "football",
}
BLOCKED_STATUS_CODES = {401, 403, 429}
IMAGE_META_SELECTORS = [
    ("meta", {"property": "og:image"}),
    ("meta", {"name": "og:image"}),
    ("meta", {"property": "og:image:url"}),
    ("meta", {"name": "twitter:image"}),
    ("meta", {"property": "twitter:image"}),
]

DDL = """
CREATE TABLE IF NOT EXISTS news_articles (
    id SERIAL PRIMARY KEY,
    source_name VARCHAR(120) NOT NULL DEFAULT '',
    source_csv VARCHAR(120) NOT NULL DEFAULT '',
    source_domain VARCHAR(255) NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    link TEXT NOT NULL UNIQUE,
    author VARCHAR(255) NOT NULL DEFAULT '',
    published_at TIMESTAMP NULL,
    published_raw VARCHAR(120) NOT NULL DEFAULT '',
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    fallback_image_url TEXT NOT NULL DEFAULT '/frontend/assets/images/ui/news.png',
    image_status VARCHAR(20) NOT NULL DEFAULT 'fallback',
    document_length INTEGER NOT NULL DEFAULT 0,
    title_length INTEGER NOT NULL DEFAULT 0,
    search_term_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_terms (
    id SERIAL PRIMARY KEY,
    term VARCHAR(255) NOT NULL UNIQUE,
    doc_freq INTEGER NOT NULL DEFAULT 0,
    collection_freq INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS news_article_terms (
    article_id INTEGER NOT NULL REFERENCES news_articles(id) ON DELETE CASCADE,
    term_id INTEGER NOT NULL REFERENCES news_terms(id) ON DELETE CASCADE,
    term_freq INTEGER NOT NULL DEFAULT 0,
    title_freq INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (article_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_source_name ON news_articles(source_name);
CREATE INDEX IF NOT EXISTS idx_news_terms_term ON news_terms(term);
CREATE INDEX IF NOT EXISTS idx_news_article_terms_term_id ON news_article_terms(term_id);
CREATE INDEX IF NOT EXISTS idx_news_article_terms_article_id ON news_article_terms(article_id);
ALTER TABLE news_terms ALTER COLUMN term TYPE VARCHAR(255);
"""


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def repair_text(value: str) -> str:
    text = normalize_spaces(value)
    if not text:
        return ""

    if any(marker in text for marker in ("\u00e2\u20ac\u2122", "\u00e2\u20ac\u0153", "\u00e2\u20ac", "\u00c2", "\u00c3")):
        try:
            text = text.encode("latin1", errors="ignore").decode("utf-8", errors="ignore")
        except Exception:
            replacements = {
                "\u00e2\u20ac\u2122": "'",
                "\u00e2\u20ac\u02dc": "'",
                "\u00e2\u20ac\u0153": '"',
                "\u00e2\u20ac\u009d": '"',
                "\u00e2\u20ac\u201c": "-",
                "\u00e2\u20ac\u201d": "-",
                "\u00c2\u00a3": "\u00a3",
                "\u00c2\u20ac": "\u20ac",
                "\u00c2": "",
            }
            for bad, good in replacements.items():
                text = text.replace(bad, good)

    return normalize_spaces(text)


def normalize_text(value: str) -> str:
    value = repair_text(value).lower()
    value = re.sub(r"[^a-z0-9\s]+", " ", value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def tokenize(value: str) -> list[str]:
    normalized = normalize_text(value)
    if not normalized:
        return []

    tokens = []
    for token in normalized.split(" "):
        if len(token) < 2 or len(token) > 64 or token in STOPWORDS:
            continue
        tokens.append(token)
    return tokens


def parse_published_at(value: str) -> tuple[datetime | None, str]:
    raw = repair_text(value)
    if not raw:
        return None, raw

    lower = raw.lower()
    if "not found" in lower:
        return None, raw

    cleaned = re.sub(r"^(updated|published)\s*:\s*", "", raw, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+[A-Z]{2,4}$", "", cleaned)

    for pattern in (
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%d %H:%M:%S",
        "%d %b %Y, %I:%M %p",
        "%d %b %Y",
    ):
        try:
            return datetime.strptime(cleaned, pattern), raw
        except ValueError:
            pass

    try:
        return datetime.fromisoformat(cleaned.replace("Z", "+00:00")).replace(tzinfo=None), raw
    except ValueError:
        pass

    if re.fullmatch(r"\d{1,2}\s+[A-Za-z]{3}", cleaned):
        try:
            return datetime.strptime(f"{cleaned} 2024", "%d %b %Y"), raw
        except ValueError:
            pass

    return None, raw


def excerpt_from_content(content: str, limit: int = 280) -> str:
    compact = repair_text(content)
    if len(compact) <= limit:
        return compact
    return compact[: limit - 3].rstrip() + "..."


def source_domain(link: str) -> str:
    try:
        return urlparse(link).netloc.lower().strip()
    except Exception:
        return ""


def pick_source_name(row: dict[str, str], dataset_name: str) -> str:
    candidate = repair_text(row.get("source", ""))
    if candidate:
        return candidate
    return SOURCE_FALLBACKS.get(dataset_name, dataset_name.replace(".csv", ""))


def normalize_row(row: dict[str, str], dataset_name: str) -> dict[str, object] | None:
    title = repair_text(row.get("title", ""))
    link = normalize_spaces(row.get("link", ""))
    content = repair_text(row.get("content", ""))
    author = repair_text(row.get("author", ""))
    published_value = row.get("publish_time") or row.get("publish-time") or ""

    if not title or not link or not content:
        return None

    published_at, published_raw = parse_published_at(published_value)
    return {
        "source_name": pick_source_name(row, dataset_name),
        "source_csv": dataset_name,
        "source_domain": source_domain(link),
        "title": title,
        "link": link,
        "author": author[:255],
        "published_at": published_at,
        "published_raw": published_raw[:120],
        "excerpt": excerpt_from_content(content),
        "content": content,
        "image_url": None,
        "fallback_image_url": DEFAULT_FALLBACK_IMAGE,
        "image_status": "fallback",
    }


def iter_articles() -> Iterable[dict[str, object]]:
    for dataset_name in DATASET_FILES:
        path = DATA_DIR / dataset_name
        if not path.exists():
            continue
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for raw_row in reader:
                row = {str(key or "").strip(): (value or "") for key, value in raw_row.items()}
                article = normalize_row(row, dataset_name)
                if article is not None:
                    yield article


def ensure_tables(cur) -> None:
    cur.execute(DDL)


def truncate_news_tables(cur) -> None:
    cur.execute("TRUNCATE TABLE news_article_terms, news_terms, news_articles RESTART IDENTITY CASCADE")


def batch(iterable, size: int):
    chunk = []
    for item in iterable:
        chunk.append(item)
        if len(chunk) >= size:
            yield chunk
            chunk = []
    if chunk:
        yield chunk


def upsert_articles(cur, rows: list[dict[str, object]]) -> None:
    if not rows:
        return

    deduped_by_link: dict[str, dict[str, object]] = {}
    for row in rows:
        link = str(row["link"])
        existing = deduped_by_link.get(link)
        if existing is None or len(str(row.get("content", ""))) > len(str(existing.get("content", ""))):
            deduped_by_link[link] = row

    payload = [
        (
            row["source_name"],
            row["source_csv"],
            row["source_domain"],
            row["title"],
            row["link"],
            row["author"],
            row["published_at"],
            row["published_raw"],
            row["excerpt"],
            row["content"],
            row["image_url"],
            row["fallback_image_url"],
            row["image_status"],
        )
        for row in deduped_by_link.values()
    ]

    psycopg2.extras.execute_values(
        cur,
        """
        INSERT INTO news_articles (
            source_name, source_csv, source_domain, title, link, author,
            published_at, published_raw, excerpt, content, image_url,
            fallback_image_url, image_status
        ) VALUES %s
        ON CONFLICT (link) DO UPDATE SET
            source_name = CASE WHEN news_articles.source_name = '' THEN EXCLUDED.source_name ELSE news_articles.source_name END,
            source_csv = EXCLUDED.source_csv,
            source_domain = CASE WHEN news_articles.source_domain = '' THEN EXCLUDED.source_domain ELSE news_articles.source_domain END,
            title = CASE WHEN LENGTH(EXCLUDED.title) > LENGTH(news_articles.title) THEN EXCLUDED.title ELSE news_articles.title END,
            author = CASE WHEN news_articles.author = '' THEN EXCLUDED.author ELSE news_articles.author END,
            published_at = COALESCE(news_articles.published_at, EXCLUDED.published_at),
            published_raw = CASE WHEN news_articles.published_raw = '' THEN EXCLUDED.published_raw ELSE news_articles.published_raw END,
            excerpt = CASE WHEN LENGTH(EXCLUDED.excerpt) > LENGTH(news_articles.excerpt) THEN EXCLUDED.excerpt ELSE news_articles.excerpt END,
            content = CASE WHEN LENGTH(EXCLUDED.content) > LENGTH(news_articles.content) THEN EXCLUDED.content ELSE news_articles.content END,
            updated_at = NOW()
        """,
        payload,
        page_size=500,
    )


def rebuild_index(conn) -> None:
    print("Rebuilding probabilistic term index...")
    with conn.cursor() as cur:
        cur.execute("TRUNCATE TABLE news_article_terms, news_terms RESTART IDENTITY")
        cur.execute("SELECT id, title, content FROM news_articles ORDER BY id")
        article_rows = cur.fetchall()
    conn.commit()

    doc_freq: Counter[str] = Counter()
    collection_freq: Counter[str] = Counter()
    article_term_payload: list[tuple[int, Counter[str], Counter[str]]] = []
    article_metric_updates: list[tuple[int, int, int, int]] = []

    for article_id, title, content in article_rows:
        title_tokens = tokenize(title or "")
        content_tokens = tokenize(content or "")
        all_tokens = title_tokens + content_tokens
        term_counts = Counter(all_tokens)
        title_counts = Counter(title_tokens)

        for term, freq in term_counts.items():
            doc_freq[term] += 1
            collection_freq[term] += freq

        article_term_payload.append((article_id, term_counts, title_counts))
        article_metric_updates.append((len(all_tokens), len(title_tokens), len(term_counts), article_id))

    with conn.cursor() as cur:
        psycopg2.extras.execute_batch(
            cur,
            """
            UPDATE news_articles
            SET document_length = %s,
                title_length = %s,
                search_term_count = %s,
                updated_at = NOW()
            WHERE id = %s
            """,
            article_metric_updates,
            page_size=500,
        )
    conn.commit()

    term_rows = [(term, doc_freq[term], collection_freq[term]) for term in sorted(doc_freq)]
    with conn.cursor() as cur:
        for rows in batch(term_rows, 3000):
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO news_terms (term, doc_freq, collection_freq)
                VALUES %s
                """,
                rows,
                page_size=3000,
            )
        conn.commit()

    with conn.cursor() as cur:
        cur.execute("SELECT id, term FROM news_terms")
        term_id_by_value = {term: term_id for term_id, term in cur.fetchall()}

    with conn.cursor() as cur:
        insert_rows: list[tuple[int, int, int, int]] = []
        for article_id, term_counts, title_counts in article_term_payload:
            for term, term_freq in term_counts.items():
                term_id = term_id_by_value.get(term)
                if term_id is None:
                    continue
                insert_rows.append((article_id, term_id, term_freq, title_counts.get(term, 0)))

            if len(insert_rows) >= 8000:
                psycopg2.extras.execute_values(
                    cur,
                    """
                    INSERT INTO news_article_terms (article_id, term_id, term_freq, title_freq)
                    VALUES %s
                    """,
                    insert_rows,
                    page_size=4000,
                )
                insert_rows = []
                conn.commit()

        if insert_rows:
            psycopg2.extras.execute_values(
                cur,
                """
                INSERT INTO news_article_terms (article_id, term_id, term_freq, title_freq)
                VALUES %s
                """,
                insert_rows,
                page_size=4000,
            )
            conn.commit()

    print(f"  indexed {len(term_rows):,} unique terms")


def normalize_image_candidate(base_url: str, candidate: str | None) -> str | None:
    value = normalize_spaces(unescape(candidate or ""))
    if not value or value.startswith("data:"):
        return None

    if value.startswith("//"):
        value = "https:" + value
    elif value.startswith("/"):
        value = urljoin(base_url, value)

    if not value.startswith(("http://", "https://")):
        return None

    lower = value.lower()
    if any(fragment in lower for fragment in ("logo", "icon", "avatar", "sprite", "apple-touch", "favicon")):
        return None
    if lower.endswith(".svg"):
        return None
    return value


def json_image_candidates(payload) -> list[str]:
    candidates: list[str] = []
    if isinstance(payload, dict):
        for key, value in payload.items():
            lowered = str(key).lower()
            if lowered in {"image", "imageurl", "thumbnailurl"}:
                if isinstance(value, str):
                    candidates.append(value)
                elif isinstance(value, list):
                    candidates.extend(str(item) for item in value if isinstance(item, str))
                elif isinstance(value, dict):
                    candidates.extend(json_image_candidates(value))
            else:
                candidates.extend(json_image_candidates(value))
    elif isinstance(payload, list):
        for item in payload:
            candidates.extend(json_image_candidates(item))
    return candidates


def extract_image_from_html(link: str, html: str) -> str | None:
    meta_patterns = [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+property=["\']og:image:url["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']twitter:image["\']',
        r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)["\']',
    ]
    for pattern in meta_patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            candidate = normalize_image_candidate(link, match.group(1))
            if candidate:
                return candidate

    for script_match in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        raw = script_match.group(1).strip()
        if not raw:
            continue
        try:
            payload = json.loads(raw)
        except Exception:
            continue
        for candidate in json_image_candidates(payload):
            normalized = normalize_image_candidate(link, candidate)
            if normalized:
                return normalized

    img_patterns = [
        r'<img[^>]+data-src=["\']([^"\']+)["\']',
        r'<img[^>]+data-lazy-src=["\']([^"\']+)["\']',
        r'<img[^>]+src=["\']([^"\']+)["\']',
        r'<img[^>]+srcset=["\']([^"\']+)["\']',
    ]
    for pattern in img_patterns:
        for match in re.finditer(pattern, html, flags=re.IGNORECASE):
            candidate = match.group(1)
            if "srcset" in pattern:
                candidate = normalize_spaces(candidate.split(",")[0].split(" ")[0])
            normalized = normalize_image_candidate(link, candidate)
            if normalized:
                return normalized

    fallback_patterns = [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'"image"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp))"',
        r'"thumbnailUrl"\s*:\s*"([^"]+\.(?:jpg|jpeg|png|webp))"',
    ]
    for pattern in fallback_patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            candidate = normalize_image_candidate(link, match.group(1))
            if candidate:
                return candidate

    return None


def extract_image(link: str) -> tuple[str, str | None]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
    }

    try:
        response = requests.get(link, headers=headers, timeout=8)
    except Exception:
        return "missing", None

    if response.status_code in BLOCKED_STATUS_CODES:
        return "blocked", None

    if response.status_code >= 400:
        return "missing", None

    image = extract_image_from_html(link, response.text)
    if image:
        return "resolved", image
    return "missing", None


def resolve_image_job(row: tuple[int, str]) -> tuple[int, str, str | None]:
    article_id, link = row
    status, image = extract_image(link)
    return article_id, status, image


def resolve_images(conn, limit: int | None, workers: int, retry_missing: bool) -> dict[str, int]:
    with conn.cursor() as cur:
        sql = """
            SELECT id, link
            FROM news_articles
            WHERE COALESCE(image_url, '') = ''
        """
        params: list[object] = []
        if not retry_missing:
            sql += " AND image_status <> 'missing'"
        sql += " ORDER BY published_at DESC NULLS LAST, id DESC"
        if limit is not None and limit > 0:
            sql += " LIMIT %s"
            params.append(limit)
        cur.execute(sql, params)
        rows = cur.fetchall()

    if not rows:
        return {"resolved": 0, "missing": 0, "blocked": 0}

    results: list[tuple[int, str, str | None]] = []
    counts = {"resolved": 0, "missing": 0, "blocked": 0}

    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        futures = [pool.submit(resolve_image_job, row) for row in rows]
        for index, future in enumerate(concurrent.futures.as_completed(futures), start=1):
            article_id, status, image = future.result()
            counts[status] = counts.get(status, 0) + 1
            results.append((article_id, status, image))
            if index % 250 == 0 or index == len(rows):
                print(
                    f"  image enrichment {index:,}/{len(rows):,} "
                    f"(resolved {counts.get('resolved', 0):,}, blocked {counts.get('blocked', 0):,})",
                    end="\r",
                )

    print()

    with conn.cursor() as cur:
        for article_id, status, image in results:
            if status == "resolved" and image:
                cur.execute(
                    "UPDATE news_articles SET image_url = %s, image_status = 'resolved', updated_at = NOW() WHERE id = %s",
                    (image, article_id),
                )
            else:
                cur.execute(
                    "UPDATE news_articles SET image_status = %s, updated_at = NOW() WHERE id = %s",
                    (status, article_id),
                )
        conn.commit()

    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Import football news datasets and rebuild the probabilistic index.")
    parser.add_argument("--rebuild", action="store_true", help="Clear existing news tables before import.")
    parser.add_argument(
        "--if-empty",
        action="store_true",
        help="Import only when the news_articles table is empty.",
    )
    parser.add_argument(
        "--resolve-images-limit",
        type=int,
        default=0,
        help="Attempt to resolve OG and article images for up to N imported articles after indexing.",
    )
    parser.add_argument(
        "--resolve-images-all",
        action="store_true",
        help="Attempt image enrichment for every article still missing a thumbnail.",
    )
    parser.add_argument(
        "--resolve-workers",
        type=int,
        default=12,
        help="Parallel workers for thumbnail enrichment.",
    )
    parser.add_argument(
        "--retry-missing",
        action="store_true",
        help="Retry rows previously marked as missing.",
    )
    args = parser.parse_args()

    conn = get_conn()
    try:
        with conn.cursor() as cur:
            ensure_tables(cur)
            if args.rebuild:
                print("Clearing existing news corpus...")
                truncate_news_tables(cur)
            elif args.if_empty:
                cur.execute("SELECT COUNT(*) FROM news_articles")
                existing_articles = cur.fetchone()[0]
                if existing_articles > 0:
                    print(f"News corpus already loaded: {existing_articles:,} articles. Skipping import.")
                    conn.commit()
                    return
            conn.commit()

        total_rows = 0
        for rows in batch(iter_articles(), 500):
            with conn.cursor() as cur:
                upsert_articles(cur, rows)
            conn.commit()
            total_rows += len(rows)
            print(f"  imported {total_rows:,} rows", end="\r")

        print(f"\nImported article rows: {total_rows:,}")
        rebuild_index(conn)

        resolve_limit = None if args.resolve_images_all else (args.resolve_images_limit if args.resolve_images_limit > 0 else None)
        if args.resolve_images_all or args.resolve_images_limit > 0:
            counts = resolve_images(conn, resolve_limit, args.resolve_workers, args.retry_missing)
            attempted = sum(counts.values())
            print(
                f"Resolved article images: {counts.get('resolved', 0):,} / {attempted:,} attempted "
                f"(blocked {counts.get('blocked', 0):,}, missing {counts.get('missing', 0):,})"
            )

        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM news_articles")
            article_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM news_terms")
            term_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM news_article_terms")
            posting_count = cur.fetchone()[0]
            cur.execute(
                """
                SELECT COUNT(*)
                FROM news_articles
                WHERE COALESCE(image_url, '') <> ''
                  AND image_url <> fallback_image_url
                """
            )
            image_count = cur.fetchone()[0]

        print(f"News articles in DB: {article_count:,}")
        print(f"Indexed terms:       {term_count:,}")
        print(f"Posting rows:        {posting_count:,}")
        print(f"Real thumbnails:     {image_count:,}")
        print("News import complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
