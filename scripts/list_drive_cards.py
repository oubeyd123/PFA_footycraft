"""
List all card images from Google Drive folder and build a mapping file.
Uses gdown internals to get folder listing, then stores file_id -> filename mapping.
"""
import json
import os
import re
import sys
import requests

FOLDER_ID = "1KO0S239ZlT1BomlWeq1t3GFyDCh4qSFd"
OUTPUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                            "scripts", "drive_card_mapping.json")

def list_drive_folder(folder_id):
    """Scrape Google Drive folder page to get all file IDs and names."""
    url = f"https://drive.google.com/drive/folders/{folder_id}"
    session = requests.Session()
    
                                               
    try:
        from gdown.download_folder import _parse_folder_page, _get_directory_structure
    except ImportError:
        pass
    
                                                              
    try:
        import gdown
                                                         
        from gdown._url import _is_google_drive_url
        print("Using gdown to list folder contents...")
    except ImportError:
        print("gdown not available, using manual scraping...")
    
                                                           
                                                                        
    all_files = []
    page_token = None
    
    while True:
        api_url = f"https://drive.google.com/drive/folders/{folder_id}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        resp = session.get(api_url, headers=headers)
        text = resp.text
        
                                                           
                                                                        
                                             
        
                                                   
                                                                
        pattern = r'\["([a-zA-Z0-9_-]{25,60})"\s*,\s*"([^"]+\.webp)"'
        matches = re.findall(pattern, text)
        
        if matches:
            for file_id, filename in matches:
                all_files.append({"id": file_id, "name": filename})
            print(f"  Found {len(matches)} files from page scraping")
        
                                                           
        pattern2 = r'"([^"]+\.webp)"\s*,\s*[^,]*,\s*"([a-zA-Z0-9_-]{25,60})"'
        matches2 = re.findall(pattern2, text)
        if matches2:
            seen_ids = {f['id'] for f in all_files}
            for filename, file_id in matches2:
                if file_id not in seen_ids:
                    all_files.append({"id": file_id, "name": filename})
                    seen_ids.add(file_id)
            print(f"  Found {len(matches2)} additional files from alt pattern")
        
        if not all_files:
                                                                                      
                                                           
            data_patterns = [
                r'\\x22([a-zA-Z0-9_-]{25,60})\\x22,\\x22([^\\]+\.webp)\\x22',
                r'\\"([a-zA-Z0-9_-]{25,60})\\",\\"([^\\]+\.webp)\\"',
            ]
            for dp in data_patterns:
                dm = re.findall(dp, text)
                if dm:
                    seen_ids = {f['id'] for f in all_files}
                    for file_id, filename in dm:
                        if file_id not in seen_ids:
                            all_files.append({"id": file_id, "name": filename})
                            seen_ids.add(file_id)
                    print(f"  Found {len(dm)} files from escaped pattern")
                    break
        
        break                             
    
    return all_files


def list_drive_folder_gdown(folder_id):
    """Use gdown's internal API to list all files in a folder."""
    try:
        import gdown
        from gdown import download_folder as df_module
        
                                                    
        url = f"https://drive.google.com/drive/folders/{folder_id}"
        
                                                
                                                            
        import tempfile
        import io
        
                                           
        print("Using gdown to enumerate folder contents (this may take a moment)...")
        
                                       
        result = gdown.download_folder(
            url=url,
            output=tempfile.mkdtemp(),
            skip_download=True,                             
            quiet=True,
        )
        return result
    except TypeError:
                                                    
        pass
    except Exception as e:
        print(f"gdown folder listing error: {e}")
    
    return None


def main():
    print(f"Listing Google Drive folder: {FOLDER_ID}")
    
                           
    files = list_drive_folder_gdown(FOLDER_ID)
    
    if not files:
                                            
        print("Trying HTML scraping approach...")
        files = list_drive_folder(FOLDER_ID)
    
    if not files:
        print("Could not list folder via scraping.")
        print("Falling back to reading already-downloaded files + CSV matching...")
                                                                
        cards_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cards")
        if os.path.isdir(cards_dir):
            files = []
            for fn in os.listdir(cards_dir):
                if fn.endswith('.webp'):
                    files.append({"name": fn, "local": True})
            print(f"  Found {len(files)} locally downloaded card files")
    
    print(f"\nTotal files found: {len(files)}")
    
                  
    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        json.dump(files, f, ensure_ascii=False, indent=2)
    print(f"Saved mapping to: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
