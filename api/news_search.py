import math
import re
import threading
from collections import Counter
from typing import Any, Dict, List, Optional, Sequence, Set

import nltk
import numpy as np
from nltk.corpus import stopwords
from nltk.stem import SnowballStemmer
from nltk.tokenize import word_tokenize

FALLBACK_IMAGE = "/frontend/assets/images/ui/news.png"


class NewsSearchService:
    def __init__(self, query_func):
        self.query = query_func
        self._lock = threading.Lock()
        self._signature: Optional[str] = None
        self._index: Optional[_ProbabilisticIndex] = None

    def corpus_size(self) -> int:
        row = self.query("SELECT COUNT(*) AS cnt FROM news_articles", fetch="one")
        return int((row or {}).get("cnt", 0))

    def search(self, query_text: str, limit: int = 12, offset: int = 0, source: str = "") -> Dict[str, Any]:
        q = (query_text or "").strip()
        if not q:
            return {
                "articles": [],
                "total": 0,
                "corpus_size": self.corpus_size(),
                "query": "",
                "tokens": [],
                "model": "probabilistic",
                "model_label": "Probabilistic BM25 / Robertson-Sparck Jones (NLTK)",
            }

        index = self._ensure_index()
        scored = index.search(q, source=source)
        total = len(scored)
        sliced = scored[offset : offset + limit]

        return {
            "articles": sliced,
            "total": total,
            "corpus_size": index.corpus_size,
            "query": q,
            "tokens": index.preprocess(q),
            "model": "probabilistic",
            "model_label": "Probabilistic BM25 / Robertson-Sparck Jones (NLTK)",
        }

    def _ensure_index(self) -> "_ProbabilisticIndex":
        signature_row = self.query(
            """
            SELECT
                COUNT(*)::bigint AS cnt,
                COALESCE(MAX(updated_at), MAX(created_at)) AS latest
            FROM news_articles
            """,
            fetch="one",
        ) or {}
        signature = f"{int(signature_row.get('cnt', 0))}:{signature_row.get('latest')}"

        if self._index is not None and self._signature == signature:
            return self._index

        with self._lock:
            if self._index is not None and self._signature == signature:
                return self._index

            rows = self.query(
                """
                SELECT
                    id, source_name, source_csv, source_domain,
                    title, link, author, published_at, published_raw,
                    excerpt, content, image_url, fallback_image_url, image_status
                FROM news_articles
                ORDER BY id ASC
                """
            ) or []
            index = _ProbabilisticIndex(rows)
            self._index = index
            self._signature = signature
            return index


class _ProbabilisticIndex:
    K1 = 1.5
    B = 0.75

    def __init__(self, rows: Sequence[Dict[str, Any]]):
        _ensure_nltk_resources()
        self.rows: List[Dict[str, Any]] = [dict(r) for r in rows]
        self.stop_words = set(stopwords.words("english")) | {
            "latest",
            "news",
            "football",
        }
        self.stemmer = SnowballStemmer("english")
        self.postings: Dict[str, List[tuple[int, int]]] = {}
        self.idf: Dict[str, float] = {}
        self.doc_lengths = np.zeros(0, dtype=np.float32)
        self.avg_doc_length = 0.0
        self.doc_term_sets: List[Set[str]] = []
        self.corpus_size = len(self.rows)
        self._fit()

    def preprocess(self, text: str) -> List[str]:
        text = _normalize_text(text)
        if not text:
            return []
        try:
            tokens = word_tokenize(text)
        except LookupError:
            tokens = re.findall(r"[a-z]+", text)

        out: List[str] = []
        for tok in tokens:
            if not tok.isalpha():
                continue
            if tok in self.stop_words:
                continue
            out.append(self.stemmer.stem(tok))
        return out

    def search(self, query_text: str, source: str = "") -> List[Dict[str, Any]]:
        if self.corpus_size == 0 or not self.postings:
            return []

        q_tokens = self.preprocess(query_text)
        if not q_tokens:
            return []

        scores = np.zeros(self.corpus_size, dtype=np.float32)
        query_terms = Counter(q_tokens)
        norm_lengths = 1.0 - self.B + self.B * (self.doc_lengths / max(self.avg_doc_length, 1.0))

        for term, qtf in query_terms.items():
            postings = self.postings.get(term)
            if not postings:
                continue

            term_idf = self.idf.get(term, 0.0)
            if term_idf <= 0.0:
                continue

            for doc_idx, tf in postings:
                numerator = tf * (self.K1 + 1.0)
                denominator = tf + self.K1 * norm_lengths[doc_idx]
                if denominator <= 0.0:
                    continue
                scores[doc_idx] += float(term_idf * (numerator / denominator) * qtf)

        source_lc = source.strip().lower()
        q_set = set(q_tokens)
        ranked_ids = np.argsort(scores)[::-1]
        max_score = float(np.max(scores)) if scores.size else 0.0

        ranked: List[Dict[str, Any]] = []
        for doc_idx in ranked_ids:
            score = float(scores[doc_idx])
            if score <= 0:
                continue

            row = self.rows[int(doc_idx)]
            if source_lc and str(row.get("source_name", "")).strip().lower() != source_lc:
                continue

            payload = format_article_payload(row)
            payload["search_score"] = round(score, 4)
            payload["search_score_percent"] = round((score / max_score) * 100.0, 1) if max_score > 0 else 0.0
            payload["matched_terms"] = sorted(q_set.intersection(self.doc_term_sets[int(doc_idx)]))[:20]
            ranked.append(payload)

        return ranked

    def _fit(self) -> None:
        if self.corpus_size == 0:
            return

        tokenized: List[List[str]] = []
        for row in self.rows:
            title = str(row.get("title") or "")
            excerpt = str(row.get("excerpt") or "")
            content = str(row.get("content") or "")
            text = f"{title} {title} {excerpt} {content}"
            tokens = self.preprocess(text)
            tokenized.append(tokens)

        df = Counter()
        term_sets: List[Set[str]] = []
        doc_lengths = np.zeros(self.corpus_size, dtype=np.float32)
        postings: Dict[str, List[tuple[int, int]]] = {}

        for d_idx, tokens in enumerate(tokenized):
            counts: Counter[str] = Counter(tokens)
            term_set = set(counts.keys())
            term_sets.append(term_set)
            doc_lengths[d_idx] = float(len(tokens))

            for term in term_set:
                df[term] += 1
            for term, count in counts.items():
                postings.setdefault(term, []).append((d_idx, int(count)))

        if not postings:
            return

        n_docs = float(self.corpus_size)
        self.doc_term_sets = term_sets
        self.doc_lengths = doc_lengths
        self.avg_doc_length = float(np.mean(doc_lengths)) if np.any(doc_lengths) else 0.0
        self.postings = postings
        self.idf = {
            term: math.log(1.0 + ((n_docs - freq + 0.5) / (freq + 0.5)))
            for term, freq in df.items()
        }


def _normalize_text(value: str) -> str:
    repaired = _repair_text(value)
    lowered = repaired.lower()
    lowered = re.sub(r"[^a-z\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered)
    return lowered.strip()


def _repair_text(value: str) -> str:
    text = (value or "").strip()
    if not text:
        return ""
    if not re.search(r"[\u00C2\u00C3\u00E2\u20AC]", text):
        return text
    try:
        return text.encode("windows-1252", errors="ignore").decode("utf-8", errors="ignore") or text
    except Exception:
        return text


def split_paragraphs(content: str) -> List[str]:
    text = _repair_text(content).strip()
    if not text:
        return []

    blocks = [b.strip() for b in re.split(r"\n{2,}", text) if b.strip()]
    if len(blocks) > 1:
        return blocks

    compact = re.sub(r"\s+", " ", text)
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+(?=[A-Z0-9"\"])', compact) if s.strip()]
    if len(sentences) <= 4:
        return [compact]

    out: List[str] = []
    for i in range(0, len(sentences), 3):
        out.append(" ".join(sentences[i : i + 3]))
    return out


def format_article_payload(row: Dict[str, Any]) -> Dict[str, Any]:
    data = dict(row)
    data["title"] = _repair_text(str(data.get("title") or ""))
    data["author"] = _repair_text(str(data.get("author") or ""))
    data["source_name"] = _repair_text(str(data.get("source_name") or ""))

    excerpt = _repair_text(str(data.get("excerpt") or "")).strip()
    content = _repair_text(str(data.get("content") or "")).strip()
    if not excerpt:
        excerpt = content[:220].rstrip() + ("..." if len(content) > 220 else "") if content else "No description available."

    image = str(data.get("image_url") or "").strip() or str(data.get("fallback_image_url") or "").strip() or FALLBACK_IMAGE

    data["excerpt"] = excerpt
    data["image_url"] = image
    data["display_image"] = image
    data.setdefault("search_score", 0.0)
    data.setdefault("matched_terms", [])
    return data


def _ensure_nltk_resources() -> None:
    resources = [
        ("tokenizers/punkt", "punkt"),
        ("corpora/stopwords", "stopwords"),
    ]
    for path, name in resources:
        try:
            nltk.data.find(path)
        except LookupError:
            try:
                nltk.download(name, quiet=True)
            except Exception:
                pass
