import os
import sys

from flask import Flask, jsonify, redirect, request
from flask_cors import CORS

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from api.db import query
from api.news_search import NewsSearchService, format_article_payload, split_paragraphs

app = Flask(__name__, static_folder=None)
CORS(
    app,
    resources={r"/api/news/*": {"origins": "*"}},
    supports_credentials=True,
    allow_headers=["Content-Type", "X-FC-Session"],
)

NEWS_API_PREFIX = "/api/news/"
PYTHON_ALLOWED_PATHS = {"/", "/healthz"}
NEWS_SEARCH = NewsSearchService(query)


def ok(data=None):
    return jsonify({"success": True, "data": data, "error": None})


def err(message, code=400):
    return jsonify({"success": False, "data": None, "error": message}), code


@app.before_request
def restrict_python_service_to_news():
    path = request.path or "/"
    if path in PYTHON_ALLOWED_PATHS:
        return None
    if path.startswith(NEWS_API_PREFIX):
        return None
    if path.startswith("/api/"):
        return err(
            "This endpoint is served by the PHP backend. Python is reserved for news/NLP only.",
            410,
        )
    return None


def frontend_redirect(path=""):
    host = request.host.split(":", 1)[0]
    suffix = f"/{path}" if path else "/"
    query_string = request.query_string.decode().strip()
    if query_string:
        suffix = f"{suffix}?{query_string}"
    return redirect(f"{request.scheme}://{host}:5000{suffix}", code=302)


@app.route("/")
def index():
    return frontend_redirect()


@app.route("/healthz")
def healthz():
    return ok({"service": "news-api", "status": "ok"})


@app.route("/<path:filename>")
def static_files(filename):
    if filename.startswith("api/") or filename.startswith("backend/php/") or filename.startswith("."):
        return err("Not found", 404)
    return frontend_redirect(filename)


@app.route("/api/news/list", methods=["GET"])
def news_list():
    limit = max(1, min(30, int(request.args.get("limit", 12))))
    offset = max(0, int(request.args.get("offset", 0)))
    rows = query(
        """
        SELECT
            id, source_name, source_csv, source_domain,
            title, link, author, published_at, published_raw,
            excerpt, ''::text AS content, image_url, fallback_image_url, image_status
        FROM news_articles
        ORDER BY published_at DESC NULLS LAST, id DESC
        LIMIT %s OFFSET %s
        """,
        (limit, offset),
    ) or []

    articles = [format_article_payload(dict(row)) for row in rows]
    for article in articles:
        article["search_score"] = 0.0
        article["matched_terms"] = []

    return ok(
        {
            "articles": articles,
            "total": len(articles),
            "corpus_size": NEWS_SEARCH.corpus_size(),
            "model": "latest",
            "model_label": "Latest imported articles",
        }
    )


@app.route("/api/news/search", methods=["GET"])
def news_search():
    query_text = (request.args.get("q") or "").strip()
    if not query_text:
        return news_list()

    limit = max(1, min(30, int(request.args.get("limit", 12))))
    offset = max(0, int(request.args.get("offset", 0)))
    source = (request.args.get("source") or "").strip()
    return ok(NEWS_SEARCH.search(query_text, limit=limit, offset=offset, source=source))


@app.route("/api/news/detail", methods=["GET"])
def news_detail():
    article_id = int(request.args.get("id", 0))
    if article_id <= 0:
        return err("Article ID required")

    row = query(
        """
        SELECT
            id, source_name, source_csv, source_domain,
            title, link, author, published_at, published_raw,
            excerpt, content, image_url, fallback_image_url, image_status
        FROM news_articles
        WHERE id=%s
        LIMIT 1
        """,
        (article_id,),
        fetch="one",
    )
    if not row:
        return err("Article not found", 404)

    article = format_article_payload(dict(row))
    article["paragraphs"] = split_paragraphs(str(article.get("content") or ""))
    return ok({"article": article})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
