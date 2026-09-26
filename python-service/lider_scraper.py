from curl_cffi import requests
from typing import List, Dict

def search_lider(query: str) -> List[Dict]:
    url = f"https://apps.lider.cl/catalogo/rest/custom/search?query={query}&limit=5"
    
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Origin": "https://www.lider.cl",
        "Referer": "https://www.lider.cl/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, impersonate="chrome120", timeout=10)
        
        if response.status_code != 200:
            print(f"Error Lider: Status {response.status_code}")
            return []

        data = response.json()
        results = []
        
        for item in data.get("products", []):
            results.append({
                "supermarket": "Lider",
                "name": item.get("displayName", "Producto sin nombre"),
                "price": item.get("price", {}).get("BasePriceSales", 0),
                "url": f"https://www.lider.cl/supermercado/product/sku/{item.get('sku')}"
            })
            
        return results

    except Exception as e:
        print(f"Error scraping Lider: {e}")
        return []
