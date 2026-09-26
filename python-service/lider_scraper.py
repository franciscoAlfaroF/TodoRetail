from curl_cffi import requests
import json
from bs4 import BeautifulSoup
from typing import List, Dict

def find_products(obj, results):
    if isinstance(obj, dict):
        if "priceInfo" in obj and "name" in obj:
            results.append(obj)
        for k, v in obj.items():
            find_products(v, results)
    elif isinstance(obj, list):
        for item in obj:
            find_products(item, results)

def search_lider(query: str) -> List[Dict]:
    url = f"https://www.lider.cl/supermercado/search?query={query}"
    
    # chrome110 is supported by curl_cffi 0.5.x
    try:
        response = requests.get(url, impersonate="chrome110", timeout=15)
        
        if response.status_code != 200:
            print(f"Error Lider: Status {response.status_code}")
            return []

        soup = BeautifulSoup(response.text, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        
        if not script:
            return []
            
        data = json.loads(script.string)
        results = []
        find_products(data, results)
        
        extracted = []
        seen_names = set()
        
        for item in results:
            try:
                price = item.get('priceInfo', {}).get('currentPrice', {}).get('price')
                name = item.get('name')
                item_id = item.get('id', '')
                
                # Filter out duplicates and invalid items
                if price and name and name not in seen_names:
                    seen_names.add(name)
                    extracted.append({
                        "supermarket": "Lider",
                        "name": name,
                        "price": price,
                        "url": f"https://www.lider.cl/supermercado/product/sku/{item_id}" if item_id else ""
                    })
                    
                    # Stop if we reach 50 products
                    if len(extracted) >= 50:
                        break
            except Exception:
                continue
                
        return extracted

    except Exception as e:
        print(f"Error scraping Lider: {e}")
        return []
