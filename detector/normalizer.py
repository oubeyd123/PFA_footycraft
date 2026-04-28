import re
import unicodedata


_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+", re.IGNORECASE)
_WS_RE = re.compile(r"\\s+")


def normalize(text: str) -> str:
    if not text:
        return ""

    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.lower()
    text = _NON_ALNUM_RE.sub(" ", text)
    text = _WS_RE.sub(" ", text).strip()
    return text
