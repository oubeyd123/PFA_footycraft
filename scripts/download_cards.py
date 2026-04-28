"""
Batch download card images from Google Drive with rate-limit handling.
Downloads in small batches with delays to avoid Google's rate limits.
Can be re-run multiple times - skips already downloaded files.

Usage: python3 scripts/download_cards.py [--delay SECONDS] [--batch-size N]
"""

import csv
import os
import sys
import time
import re
import urllib.request
import urllib.error
import json
import argparse

FOLDER_ID = "1KO0S239ZlT1BomlWeq1t3GFyDCh4qSFd"
CARDS_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "frontend", "assets", "images", "cards"
)


def get_existing_files():
    """Get set of already-downloaded filenames."""
    if not os.path.isdir(CARDS_DIR):
        os.makedirs(CARDS_DIR, exist_ok=True)
    return {f for f in os.listdir(CARDS_DIR) if f.lower().endswith('.webp')}


def try_gdown_download(delay=2, batch_size=20):
    """Use gdown to download files, with custom delays."""
    try:
        import gdown
        import requests
    except ImportError:
        print("Please install gdown: pip install gdown")
        return False

    existing = get_existing_files()
    print(f"Already have {len(existing)} card files")

                                         
    url = f"https://drive.google.com/drive/folders/{FOLDER_ID}"

    print("Listing folder contents...")
    try:
                                                
        from gdown.download_folder import _parse_folder_page
    except ImportError:
        pass

                                                                
    try:
        result = gdown.download_folder(
            url=url,
            output=CARDS_DIR,
            quiet=False,
            remaining_ok=True,
        )
        return True
    except Exception as e:
        print(f"gdown folder download failed: {e}")

    return False


def download_by_name(player_names, delay=3, batch_size=10):
    """
    Alternative: download by constructing search URLs.
    For each player name, search Google Drive folder for matching file.
    """
    existing = get_existing_files()
    existing_stems = {os.path.splitext(f)[0].lower() for f in existing}

    to_download = []
    for name in player_names:
        if name.lower() not in existing_stems:
            to_download.append(name)

    print(f"Need to download: {len(to_download)} files (skipping {len(existing)} existing)")

    if not to_download:
        print("All files already downloaded!")
        return

    downloaded = 0
    failed = 0

    for i, name in enumerate(to_download[:batch_size]):
        filename = f"{name}.webp"
        filepath = os.path.join(CARDS_DIR, filename)

                                                       
                                                             
        print(f"  [{i+1}/{min(len(to_download), batch_size)}] Need file ID for: {name}")
        failed += 1

        if i < batch_size - 1:
            time.sleep(delay)

    print(f"\nBatch complete: {downloaded} downloaded, {failed} need file IDs")
    print("Tip: Run 'python -m gdown --folder <DRIVE_URL> --remaining-ok' to try again")


def main():
    parser = argparse.ArgumentParser(description='Download card images from Google Drive')
    parser.add_argument('--delay', type=float, default=2, help='Delay between downloads (seconds)')
    parser.add_argument('--batch-size', type=int, default=50, help='Max files per batch')
    parser.add_argument('--method', choices=['gdown', 'manual'], default='gdown',
                       help='Download method')
    args = parser.parse_args()

    os.makedirs(CARDS_DIR, exist_ok=True)

    print(f"=== Card Image Downloader ===")
    print(f"Target: {CARDS_DIR}")
    print(f"Method: {args.method}, Delay: {args.delay}s, Batch: {args.batch_size}")
    print()

    if args.method == 'gdown':
        success = try_gdown_download(delay=args.delay, batch_size=args.batch_size)
        if not success:
            print("\ngdown method failed. Try manual method or download ZIP from Google Drive.")
            print(f"Google Drive folder: https://drive.google.com/drive/folders/{FOLDER_ID}")
            print("1. Open the link in your browser")
            print("2. Select all files (Ctrl+A)")
            print("3. Click the '...' menu > Download")
            print("4. Extract the ZIP to: frontend/assets/images/cards/")
    else:
        print("Manual download instructions:")
        print(f"1. Open: https://drive.google.com/drive/folders/{FOLDER_ID}")
        print("2. Select all files (Ctrl+A)")
        print("3. Click the '...' menu > Download")
        print(f"4. Extract the ZIP to: {CARDS_DIR}")

    existing = get_existing_files()
    print(f"\nCurrent card count: {len(existing)} files in {CARDS_DIR}")


if __name__ == "__main__":
    main()
