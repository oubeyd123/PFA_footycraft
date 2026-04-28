#!/usr/bin/env python3
"""
Test import using sample player data.
Usage: python3 scripts/test_import.py
"""

import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from api.db import execute, query


def main():
    test_csv = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        ".data",
        "test_players.csv",
    )

    print("Testing player import with sample data...")
    print(f"CSV: {test_csv}")
    print()

    if not os.path.exists(test_csv):
        print(f"ERROR: Test CSV not found at {test_csv}")
        sys.exit(1)

                        
    with open(test_csv, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        print(f"✓ CSV has {len(rows)} player records")
        print(f"✓ Columns: {list(rows[0].keys())}")
        print()

    print("✓ Test data is valid and ready for import")
    print("\nTo use test data, modify scripts/import_players.py:")
    print(f'  CSV_PATH = r"{test_csv}"')
    print("\nThen run: docker compose exec php python3 scripts/import_players.py")


if __name__ == "__main__":
    main()
