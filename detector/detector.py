from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from normalizer import normalize


def _load_bad_terms(path: Path) -> list[str]:
    if not path.is_file():
        return []

    terms: list[str] = []
    for raw in path.read_text(encoding="utf-8", errors="ignore").splitlines():
        raw = raw.strip()
        if not raw or raw.startswith("#"):
            continue
        t = normalize(raw)
        if t:
            terms.append(t)
    return sorted(set(terms))


@dataclass(frozen=True)
class DetectionResult:
    violation: bool
    matches: list[str]


class BadWordDetector:
    def __init__(self, terms: list[str]):
        self._terms = terms

    @classmethod
    def from_badlist(cls, badlist_path: Path) -> "BadWordDetector":
        return cls(_load_bad_terms(badlist_path))

    def detect(self, text: str) -> DetectionResult:
        normalized = normalize(text)
        if not normalized or not self._terms:
            return DetectionResult(False, [])

        tokens = set(normalized.split())
        matches: list[str] = []

        for term in self._terms:
            if " " in term:
                if term in normalized:
                    matches.append(term)
            else:
                if term in tokens:
                    matches.append(term)

        matches = sorted(set(matches))
        return DetectionResult(len(matches) > 0, matches)
