from __future__ import annotations

import json
import sys
from pathlib import Path

from detector import BadWordDetector


def _read_input_text() -> str:
    raw = sys.stdin.read()
    if not raw:
        return ""

    raw = raw.strip()
    if not raw:
        return ""

    if raw.startswith("{") and raw.endswith("}"):
        try:
            obj = json.loads(raw)
            if isinstance(obj, dict):
                return str(obj.get("text", ""))
        except Exception:
            pass

    return raw


def main() -> int:
    badlist_path = Path(__file__).with_name("bad.txt")
    detector = BadWordDetector.from_badlist(badlist_path)

    text = _read_input_text()
    res = detector.detect(text)

    sys.stdout.write(
        json.dumps(
            {"violation": res.violation, "matches": res.matches},
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
